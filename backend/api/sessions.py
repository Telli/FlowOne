from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio
import time
import httpx

from memory.store import get_agent, create_session, add_message
from services.pipecat_runtime import SessionManager
from services.gemini_flash import generate_agent_reply
from observability.langfuse import trace_event
from settings import get_settings

# Shared utilities (tolerant import for different run contexts)
try:
    from backend.api.utils import is_duplicate_room_error
except Exception:  # pragma: no cover - fallback for alternate import paths
    try:
        from api.utils import is_duplicate_room_error  # type: ignore
    except Exception:
        def is_duplicate_room_error(status_code: int, data):
            return (
                status_code == 400 and isinstance(data, dict)
                and data.get("error") == "invalid-request-error"
                and "already exists" in (data.get("info") or "")
            )


router = APIRouter()
session_manager = SessionManager()


class CreateSessionRequest(BaseModel):
    agentId: str
    enableAvatar: bool = False

class PostMessageRequest(BaseModel):
    text: str


async def create_daily_room_for_avatar(session_id: str) -> str:
    """Create a Daily.co room for avatar streaming."""
    settings = get_settings()
    api_key = settings.DAILY_API_KEY

    # If Daily API key is not configured, do not create a room
    # Return None so callers can gracefully skip avatar streaming
    if not api_key or api_key == "your_daily_api_key_here":
        print(f"[Sessions] WARNING: DAILY_API_KEY not configured; skipping Daily room for session {session_id}")
        return None

    room_name = f"flowone-{session_id}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Determine desired privacy for avatar rooms (default public)
            privacy = (settings.DAILY_AVATAR_PRIVACY or "public").lower()
            if privacy not in ("public", "private"):
                privacy = "public"

            # Check if room already exists
            try:
                resp = await client.get(f"https://api.daily.co/v1/rooms/{room_name}", headers=headers)
                if resp.status_code == 200:
                    print(f"[Sessions] Daily.co room already exists: {room_name}")
                    return room_name
            except Exception as e_check:
                print(f"[Sessions] Warning checking Daily.co room existence: {e_check}")

            # Create room
            exp = int(time.time()) + 60 * 60  # 1 hour expiry
            room_payload = {
                "name": room_name,
                "privacy": privacy,
                "properties": {
                    "exp": exp,
                    # Harden room for headless/bot participants
                    "enable_prejoin_ui": False,
                    # For public rooms, no knocking; for private rooms, allow knocking
                    "enable_knocking": False if privacy == "public" else True,
                    # Start with mic ON for audio streaming
                    "start_audio_off": False,
                    # Start with video OFF (toggle if needed)
                    "start_video_off": True,
                },
            }
            resp = await client.post("https://api.daily.co/v1/rooms", headers=headers, json=room_payload)
            if resp.status_code in (200, 201):
                print(f"[Sessions] Created Daily.co room: {room_name} ({privacy})")
                return room_name
            if resp.status_code == 400:
                try:
                    data = resp.json()
                except Exception:
                    data = {}
                if is_duplicate_room_error(resp.status_code, data):
                    print(f"[Sessions] Daily.co room already exists (400): {room_name}")
                    return room_name

            print(f"[Sessions] Unexpected Daily.co response {resp.status_code}: {resp.text}")
            return room_name
    except Exception as e:
        print(f"[Sessions] Error creating Daily.co room: {e}")
        # Return mock room name as fallback
        return f"flowone-{session_id}"


@router.post("")
async def create_session_ep(body: CreateSessionRequest):
    agent = get_agent(body.agentId)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session_id = create_session(body.agentId)

    # Create Daily.co room if avatar is enabled
    room = None
    if body.enableAvatar:
        room = await create_daily_room_for_avatar(session_id)
        print(f"[Sessions] Session {session_id} created with avatar enabled, room: {room}")

    await session_manager.spawn_async(session_id, agent.to_card(), enable_avatar=body.enableAvatar, room=room)
    trace_id = trace_event("session.create", sessionId=session_id, agentId=body.agentId, enableAvatar=body.enableAvatar, room=room)
    return {"sessionId": session_id, "trace_id": trace_id, "room": room}


@router.websocket("/{session_id}/events")
async def ws_events(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        async for event in session_manager.events(session_id):
            await ws.send_json(event)
    except WebSocketDisconnect:
        await session_manager.close_async(session_id)


@router.post("/{session_id}/messages")
async def post_message(session_id: str, body: PostMessageRequest):
    """Process user message and generate agent response via LLM."""
    try:
        # Record user message in database
        add_message(session_id, role="user", text=body.text)

        # Emit user message event to WebSocket clients
        trace_id_user = trace_event("session.text_message.user", sessionId=session_id, text=body.text[:100])
        await session_manager.emit(session_id, {"type": "speech.final", "from": "user", "text": body.text})

        # Process message through session's LLM
        # The session will emit agent.speech event via WebSocket
        success = await session_manager.process_message(session_id, body.text)

        if not success:
            # Session not found or error occurred
            trace_id_agent = trace_event("session.text_message.error", sessionId=session_id, error="Session not found")
            return {"ok": False, "error": "Session not found", "trace_id_user": trace_id_user, "trace_id_agent": trace_id_agent}

        trace_id_agent = trace_event("session.text_message.agent", sessionId=session_id)
        return {"ok": True, "trace_id_user": trace_id_user, "trace_id_agent": trace_id_agent}

    except Exception as e:
        print(f"[Sessions] Error processing message: {e}")
        trace_event("session.message_error", sessionId=session_id, error=str(e))
        return {"ok": False, "error": str(e)}



