import asyncio
from typing import AsyncGenerator, Dict, Any, Optional

from observability.langfuse import trace_event
from services.tavus_client import get_tavus_client
from settings import get_settings


class Session:
    def __init__(self, session_id: str, agent_card: Dict[str, Any], enable_avatar: bool = False):
        self.id = session_id
        self.agent = agent_card
        self.queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._started = False
        self.enable_avatar = enable_avatar
        self.tavus_session_id: Optional[str] = None
        self.tavus_client = get_tavus_client()
        self.settings = get_settings()

    async def start(self, room: Optional[str] = None, token: Optional[str] = None):
        if self._started:
            return
        self._started = True

        # Start avatar stream if enabled
        if self.enable_avatar:
            await self._start_avatar_stream(room)

        # TODO: Wire Pipecat: Daily WebRTC I/O + Gemini Live + Gemini Flash
        # For now, simulate agent activity

        async def run_loop():
            # emit a synthetic agent message shortly after start if nothing else arrives
            await asyncio.sleep(0.8)
            await self.queue.put({
                "type": "agent.speech",
                "text": "Hello! I'm ready to chat.",
            })
            trace_event("agent.speech", sessionId=self.id)

        self._task = asyncio.create_task(run_loop())

    async def _start_avatar_stream(self, room: Optional[str] = None):
        """Start Tavus Phoenix session for avatar streaming."""
        try:
            # Get avatar replica ID from agent card or use default
            replica_id = (
                self.agent.get("avatar", {}).get("replicaId")
                or self.settings.TAVUS_DEFAULT_REPLICA_ID
            )
            
            # For now, use a placeholder audio stream URL
            # In production, this would be the Daily room audio endpoint
            audio_stream_url = f"https://daily.co/rooms/{room}" if room else "placeholder"
            
            result = await self.tavus_client.start_phoenix_session(
                replica_id=replica_id,
                audio_stream_url=audio_stream_url,
                enable_vision=False
            )
            
            if result.get("error"):
                trace_event(
                    "avatar.error",
                    sessionId=self.id,
                    error=result.get("error")
                )
                await self.queue.put({
                    "type": "avatar.error",
                    "error": result.get("error"),
                    "sessionId": self.id
                })
                return
            
            self.tavus_session_id = result.get("session_id")
            video_stream_url = result.get("video_stream_url")
            
            trace_event(
                "avatar.started",
                sessionId=self.id,
                tavusSessionId=self.tavus_session_id
            )
            
            await self.queue.put({
                "type": "avatar.started",
                "sessionId": self.id,
                "tavusSessionId": self.tavus_session_id,
                "videoStreamUrl": video_stream_url,
                "replicaId": replica_id
            })
        except Exception as e:
            trace_event(
                "avatar.error",
                sessionId=self.id,
                error=str(e)
            )
            await self.queue.put({
                "type": "avatar.error",
                "error": str(e),
                "sessionId": self.id
            })

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while True:
            ev = await self.queue.get()
            yield ev

    async def close(self):
        # Stop avatar stream if running
        if self.tavus_session_id:
            try:
                result = await self.tavus_client.stop_phoenix_session(self.tavus_session_id)
                if not result.get("error"):
                    trace_event(
                        "avatar.stopped",
                        sessionId=self.id,
                        tavusSessionId=self.tavus_session_id
                    )
            except Exception as e:
                trace_event(
                    "avatar.stop_error",
                    sessionId=self.id,
                    error=str(e)
                )
        
        # Cancel task
        if self._task and not self._task.done():
            self._task.cancel()


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    async def spawn(self, session_id: str, agent_card: Dict[str, Any], enable_avatar: bool = False):
        s = Session(session_id, agent_card, enable_avatar=enable_avatar)
        self.sessions[session_id] = s
        # Push startup event
        asyncio.create_task(s.queue.put({
            "type": "session.started",
            "sessionId": session_id,
            "persona": agent_card.get("persona", {}),
        }))
        trace_event("session.started", sessionId=session_id)
        # Kick off runtime
        asyncio.create_task(s.start())

    async def events(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            yield {"type": "error", "message": "session not found"}
            return
        async for ev in session.stream_events():
            yield ev

    async def close(self, session_id: str):
        if s := self.sessions.pop(session_id, None):
            await s.close()

    async def emit(self, session_id: str, event: Dict[str, Any]):
        # Allow APIs to push events into a live session queue
        s = self.sessions.get(session_id)
        if not s:
            return False
        await s.queue.put(event)
        return True



