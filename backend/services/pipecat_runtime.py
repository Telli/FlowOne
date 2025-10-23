import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, List
import logging

from observability.langfuse import trace_event
from services.tavus_client import get_tavus_client
from services.gemini_flash import generate_agent_reply
from settings import get_settings

logger = logging.getLogger(__name__)


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
        self.conversation_history: List[Dict[str, str]] = []
        # Pipecat Tavus pipeline handles (when enabled)
        self._tavus_pipeline = None
        self._tavus_transport = None
        self._tavus_task: Optional[asyncio.Task] = None

    async def start(self, room: Optional[str] = None, token: Optional[str] = None):
        if self._started:
            return
        self._started = True

        logger.info(f"[Session {self.id}] Starting session with enable_avatar={self.enable_avatar}, room={room}")

        # Start avatar stream if enabled
        if self.enable_avatar:
            await self._start_avatar_stream(room)

        # Session is ready - wait for user messages via process_user_message()
        # No need for run_loop anymore since messages are driven by API calls

    def get_conversation_history(self, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get recent conversation history for context."""
        return self.conversation_history[-max_messages:]

    async def process_user_message(self, user_text: str) -> None:
        """Process user message and generate LLM response."""
        try:
            logger.info(f"[Session {self.id}] Processing user message: {user_text[:50]}...")

            # Add user message to history
            self.conversation_history.append({
                "role": "user",
                "content": user_text
            })

            # Generate response using Gemini Flash with agent persona
            response = generate_agent_reply(
                user_text=user_text,
                agent_card=self.agent
            )

            logger.info(f"[Session {self.id}] Generated response: {response[:50]}...")

            # Stream agent response as deltas, then finalize
            for token in response.split():
                try:
                    await self.queue.put({
                        "type": "agent.speech.delta",
                        "delta": token + " ",
                        "timestamp": asyncio.get_event_loop().time(),
                    })
                    await asyncio.sleep(0.02)
                except Exception:
                    # continue best-effort streaming
                    pass

            # Final message
            await self.queue.put({
                "type": "agent.speech",
                "text": response,
                "timestamp": asyncio.get_event_loop().time(),
            })
            await self.queue.put({
                "type": "agent.speech.done",
                "text": response,
                "timestamp": asyncio.get_event_loop().time(),
            })

            # Add agent response to history
            self.conversation_history.append({
                "role": "agent",
                "content": response,
            })

            trace_event("agent.speech", sessionId=self.id, text=response[:100])

        except Exception as e:
            logger.error(f"[Session {self.id}] Error processing user message: {e}")
            await self.queue.put({
                "type": "agent.error",
                "error": f"Failed to generate response: {str(e)}",
                "sessionId": self.id
            })
            trace_event("agent.error", sessionId=self.id, error=str(e))

    def _resolve_avatar_mode(self) -> str:
        """Resolve avatar mode with clear precedence rules."""
        try:
            mode = getattr(self.settings, 'TAVUS_AVATAR_MODE', None)
            if mode:
                return str(mode).lower()
        except Exception:
            pass
        # Legacy fallback flag
        return "pipecat_daily" if getattr(self.settings, 'USE_TAVUS_PIPECAT_VIDEO', False) else "phoenix_rest"

    async def _start_avatar_stream(self, room: Optional[str] = None):
        """Start Tavus Phoenix session for avatar streaming."""
        try:
            # Get avatar replica ID from agent card or use default
            replica_id = (
                self.agent.get("avatar", {}).get("replicaId")
                or self.settings.TAVUS_DEFAULT_REPLICA_ID
            )

            # Check if we have a valid replica ID
            if not replica_id or replica_id == "default":
                trace_event(
                    "avatar.error",
                    sessionId=self.id,
                    error="No valid replica ID configured"
                )
                await self.queue.put({
                    "type": "avatar.error",
                    "error": "No valid replica ID configured. Please set TAVUS_DEFAULT_REPLICA_ID or configure an avatar for this agent.",
                    "sessionId": self.id
                })
                return

            # Branch: Pipecat TavusVideoService vs Phoenix REST
            mode = self._resolve_avatar_mode()
            if mode == "pipecat_daily":
                # Pipecat path requires a Daily room to render avatar into
                if not room:
                    trace_event(
                        "avatar.skipped",
                        sessionId=self.id,
                        reason="Pipecat requires a Daily room"
                    )
                    await self.queue.put({
                        "type": "avatar.error",
                        "error": "Avatar requires a voice room (Pipecat TavusVideoService)",
                        "sessionId": self.id
                    })
                    return

                room_url = f"https://{self.settings.DAILY_SUBDOMAIN}.daily.co/{room}"
                try:
                    from services.tavus_pipecat_video import start_tavus_video_pipeline
                    pipeline, transport, task = await start_tavus_video_pipeline(
                        session_id=self.id,
                        room_url=room_url,
                        replica_id=replica_id,
                        emit_event=self.queue.put,
                    )
                    self._tavus_pipeline = pipeline
                    self._tavus_transport = transport
                    self._tavus_task = task
                    logger.info(f"[Session {self.id}] Pipecat Tavus pipeline started successfully")
                    return
                except ImportError as e:
                    # Pipecat dependencies not installed - this is a fatal error for pipecat_daily mode
                    logger.error(f"[Session {self.id}] Pipecat import failed: {e}")
                    trace_event("avatar.error", sessionId=self.id, error=f"Pipecat not available: {e}")
                    await self.queue.put({
                        "type": "avatar.error",
                        "error": f"Pipecat dependencies not installed: {e}",
                        "sessionId": self.id
                    })
                    return
                except Exception as e:
                    logger.error(f"[Session {self.id}] Pipecat init failed: {e}")
                    trace_event("avatar.error", sessionId=self.id, error=f"Pipecat init failed: {e}")
                    await self.queue.put({
                        "type": "avatar.error",
                        "error": f"Failed to start Pipecat Tavus pipeline: {e}",
                        "sessionId": self.id
                    })
                    return

            # Phoenix REST path (legacy)
            # Tavus Phoenix API requires a valid audio stream URL
            if mode == "phoenix_rest":
                if room:
                    audio_stream_url = f"https://{self.settings.DAILY_SUBDOMAIN}.daily.co/{room}"
                else:
                    trace_event(
                        "avatar.skipped",
                        sessionId=self.id,
                        reason="No Daily room available for text-only session"
                    )
                    await self.queue.put({
                        "type": "avatar.error",
                        "error": "Avatar streaming requires voice session with Daily.co room",
                        "sessionId": self.id
                    })
                    return

                result = await self.tavus_client.start_phoenix_session(
                    replica_id=replica_id,
                    audio_stream_url=audio_stream_url,
                    enable_vision=False
                )
            else:
                # Unknown mode; report error
                await self.queue.put({
                    "type": "avatar.error",
                    "error": f"Unknown TAVUS_AVATAR_MODE: {mode}",
                    "sessionId": self.id
                })
                return

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
        
        # Stop Pipecat Tavus pipeline if running
        try:
            if self._tavus_task and not self._tavus_task.done():
                self._tavus_task.cancel()
        except Exception:
            pass
        try:
            if self._tavus_transport:
                await self._tavus_transport.close()
        except Exception:
            pass

        # Cancel task
        if self._task and not self._task.done():
            self._task.cancel()


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    async def spawn_async(self, session_id: str, agent_card: Dict[str, Any], enable_avatar: bool = False, room: Optional[str] = None):
        logger.info(f"[SessionManager] Spawning session {session_id} with enable_avatar={enable_avatar}, room={room}")
        logger.debug(f"[SessionManager] Agent card avatar config: {agent_card.get('avatar', {})}")

        s = Session(session_id, agent_card, enable_avatar=enable_avatar)
        self.sessions[session_id] = s
        # Push startup event synchronously
        s.queue.put_nowait({
            "type": "session.started",
            "sessionId": session_id,
            "persona": agent_card.get("persona", {}),
        })
        trace_event("session.started", sessionId=session_id, room=room)
        # Start and await initialization for deterministic readiness
        await s.start(room=room)

    def spawn(self, session_id: str, agent_card: Dict[str, Any], enable_avatar: bool = False, room: Optional[str] = None):
        """Backward-compatible spawn: registers session immediately and schedules async start."""
        logger.info(f"[SessionManager] Spawning session {session_id} (sync wrapper) with enable_avatar={enable_avatar}, room={room}")
        s = Session(session_id, agent_card, enable_avatar=enable_avatar)
        self.sessions[session_id] = s
        # Emit session.started immediately
        try:
            s.queue.put_nowait({
                "type": "session.started",
                "sessionId": session_id,
                "persona": agent_card.get("persona", {}),
            })
            trace_event("session.started", sessionId=session_id, room=room)
        except Exception:
            pass
        # Schedule start without awaiting
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(s.start(room=room))
        except RuntimeError:
            asyncio.ensure_future(s.start(room=room))
        return s

    async def events(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            yield {"type": "error", "message": "session not found"}
            return
        async for ev in session.stream_events():
            yield ev

    async def close_async(self, session_id: str):
        if s := self.sessions.pop(session_id, None):
            try:
                await s.close()
            except Exception:
                # Ensure best-effort cleanup
                pass

    def close(self, session_id: str):
        """Backward-compatible close: pops immediately and schedules async cleanup."""
        s = self.sessions.pop(session_id, None)
        if not s:
            return
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(s.close())
        except RuntimeError:
            asyncio.ensure_future(s.close())

    async def emit(self, session_id: str, event: Dict[str, Any]):
        # Allow APIs to push events into a live session queue
        s = self.sessions.get(session_id)
        if not s:
            return False
        await s.queue.put(event)
        return True

    async def process_message(self, session_id: str, user_text: str) -> bool:
        """Process user message through session's LLM."""
        s = self.sessions.get(session_id)
        if not s:
            logger.warning(f"[SessionManager] Session {session_id} not found")
            return False

        # Process message asynchronously with error handling; store ref for cleanup
        task = asyncio.create_task(s.process_user_message(user_text))
        s._task = task
        def _log_task_result(t: asyncio.Task):
            try:
                t.result()
            except Exception as e:
                logger.error(f"[SessionManager] Message task error for {session_id}: {e}")
        task.add_done_callback(_log_task_result)
        return True



