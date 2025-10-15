import asyncio
from typing import AsyncGenerator, Dict, Any, Optional

from backend.observability.langfuse import trace_event


class Session:
    def __init__(self, session_id: str, agent_card: Dict[str, Any]):
        self.id = session_id
        self.agent = agent_card
        self.queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._started = False

    async def start(self, room: Optional[str] = None, token: Optional[str] = None):
        if self._started:
            return
        self._started = True

        # TODO: Wire Pipecat: Daily WebRTC I/O + Gemini Live + Gemini Flash
        # For day-1, simulate agent activity if not yet wired

        async def run_loop():
            # emit a synthetic agent message shortly after start if nothing else arrives
            await asyncio.sleep(0.8)
            await self.queue.put({
                "type": "agent.speech",
                "text": "Hello! I'm ready to chat.",
            })
            trace_event("agent.speech", sessionId=self.id)

        self._task = asyncio.create_task(run_loop())

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while True:
            ev = await self.queue.get()
            yield ev

    def close(self):
        if self._task and not self._task.done():
            self._task.cancel()


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def spawn(self, session_id: str, agent_card: Dict[str, Any]):
        s = Session(session_id, agent_card)
        self.sessions[session_id] = s
        # Push startup event
        asyncio.create_task(s.queue.put({
            "type": "session.started",
            "sessionId": session_id,
            "persona": agent_card.get("persona", {}),
        }))
        trace_event("session.started", sessionId=session_id)
        # Kick off runtime (no-op/sim now)
        asyncio.create_task(s.start())

    async def events(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            yield {"type": "error", "message": "session not found"}
            return
        async for ev in session.stream_events():
            yield ev

    def close(self, session_id: str):
        if s := self.sessions.pop(session_id, None):
            s.close()

    async def emit(self, session_id: str, event: Dict[str, Any]):
        # Allow APIs to push events into a live session queue
        s = self.sessions.get(session_id)
        if not s:
            return False
        await s.queue.put(event)
        return True



