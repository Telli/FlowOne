from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.memory.store import get_agent, create_session
from backend.services.pipecat_runtime import SessionManager


router = APIRouter()
session_manager = SessionManager()


class CreateSessionRequest(BaseModel):
    agentId: str


@router.post("")
def create_session_ep(body: CreateSessionRequest):
    agent = get_agent(body.agentId)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session_id = create_session(body.agentId)
    session_manager.spawn(session_id, agent.to_card())
    return {"sessionId": session_id}


@router.websocket("/{session_id}/events")
async def ws_events(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        async for event in session_manager.events(session_id):
            await ws.send_json(event)
    except WebSocketDisconnect:
        session_manager.close(session_id)



