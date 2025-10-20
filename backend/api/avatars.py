"""Avatar management API endpoints for Tavus integration."""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from services.tavus_client import get_tavus_client
from memory import store
from observability.langfuse import trace_event

router = APIRouter()
tavus = get_tavus_client()


@router.get("/replicas")
async def list_replicas():
    """Get list of available Tavus replicas."""
    trace_event("avatars.list_replicas")
    
    # First try Tavus API
    result = await tavus.get_replicas()
    if result.get("error"):
        # Return empty list with warning
        return {
            "replicas": [],
            "warning": result.get("error"),
            "note": "Tavus API unavailable; no replicas available"
        }
    
    return {
        "replicas": result.get("replicas", []),
        "error": None
    }


@router.get("/avatars")
async def list_avatars():
    """Get list of stored avatars from database."""
    trace_event("avatars.list_stored")
    
    from sqlmodel import Session, select
    with Session(store.get_engine()) as s:
        avatars = s.exec(select(store.Avatar)).all()
        return {
            "avatars": [
                {
                    "id": a.id,
                    "replicaId": a.replica_id,
                    "name": a.name,
                    "thumbnailUrl": a.thumbnail_url,
                    "createdAt": a.created_at.isoformat()
                }
                for a in avatars
            ]
        }


@router.post("/replicas")
async def create_replica(replica_data: dict):
    """
    Create a new Tavus replica from video upload.
    
    Request body:
    {
        "name": "Avatar name",
        "videoUrl": "https://..."
    }
    """
    trace_event("avatars.create_replica", replica_name=replica_data.get("name"))
    
    if not replica_data.get("name") or not replica_data.get("videoUrl"):
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: name, videoUrl"
        )
    
    result = await tavus.create_replica(
        name=replica_data.get("name"),
        video_url=replica_data.get("videoUrl")
    )
    
    if result.get("error"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create replica: {result.get('error')}"
        )
    
    replica_id = result.get("replica_id")
    
    # Store in database
    from sqlmodel import Session
    import uuid
    avatar = store.Avatar(
        id=str(uuid.uuid4()),
        replica_id=replica_id,
        name=replica_data.get("name"),
        thumbnail_url=replica_data.get("thumbnailUrl")
    )
    with Session(store.get_engine()) as s:
        s.add(avatar)
        s.commit()
    
    trace_event("avatars.replica_created", replica_id=replica_id)
    
    return {
        "replicaId": replica_id,
        "status": result.get("status", "pending"),
        "error": None
    }


@router.delete("/avatars/{avatar_id}")
async def delete_avatar(avatar_id: str):
    """Delete an avatar from the database."""
    trace_event("avatars.delete", avatar_id=avatar_id)
    
    from sqlmodel import Session
    with Session(store.get_engine()) as s:
        avatar = s.get(store.Avatar, avatar_id)
        if not avatar:
            raise HTTPException(status_code=404, detail="Avatar not found")
        s.delete(avatar)
        s.commit()
    
    return {"error": None, "status": "deleted"}
