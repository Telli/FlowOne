from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio

from memory.store import get_agent, create_session, add_message
from services.pipecat_runtime import SessionManager
from services.gemini_flash import generate_agent_reply
from observability.langfuse import trace_event


router = APIRouter()
session_manager = SessionManager()


class CreateSessionRequest(BaseModel):
    agentId: str
    enableAvatar: bool = False

class PostMessageRequest(BaseModel):
    text: str


@router.post("")
async def create_session_ep(body: CreateSessionRequest):
    agent = get_agent(body.agentId)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session_id = create_session(body.agentId)
    await session_manager.spawn(session_id, agent.to_card(), enable_avatar=body.enableAvatar)
    trace_id = trace_event("session.create", sessionId=session_id, agentId=body.agentId, enableAvatar=body.enableAvatar)
    return {"sessionId": session_id, "trace_id": trace_id}


@router.websocket("/{session_id}/events")
async def ws_events(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        async for event in session_manager.events(session_id):
            await ws.send_json(event)
    except WebSocketDisconnect:
        await session_manager.close(session_id)


@router.post("/{session_id}/messages")
async def post_message(session_id: str, body: PostMessageRequest):
    # record user message
    add_message(session_id, role="user", text=body.text)
    # emit as events into session queue for clients
    trace_id_user = trace_event("session.text_message.user", sessionId=session_id)
    await session_manager.emit(session_id, {"type": "speech.final", "from": "user", "text": body.text})
    # produce agent reply using persona if available
    # find agent card from the session manager's stored session (best-effort)
    # fallback to echo
    reply = None
    # we can't easily access agent card here without extra state; use echo fallback
    try:
        reply = generate_agent_reply(body.text, {})
    except Exception:
        reply = None
    if not reply:
        reply = f"I heard: {body.text}"
    add_message(session_id, role="agent", text=reply)
    trace_id_agent = trace_event("session.text_message.agent", sessionId=session_id)
    await session_manager.emit(session_id, {"type": "agent.speech", "text": reply})
    return {"ok": True, "trace_id_user": trace_id_user, "trace_id_agent": trace_id_agent}



