"""Pipecat pipeline wiring with TavusVideoService.

This module creates a Daily transport and inserts TavusVideoService as a video
rendering layer. It is designed to be used behind a feature flag so existing
Phoenix REST behavior can remain as a fallback.

Note: This pipeline renders video/audio into the Daily transport. It does not
produce a direct video URL like Phoenix. Callers should communicate the Daily
room URL to clients if they need to render it on the frontend.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional, Tuple, Callable, Union
from datetime import datetime

from settings import get_settings


# Types
EventEmitter = Callable[[Dict[str, Any]], Union["asyncio.Future[Any]", Any]]


async def start_tavus_video_pipeline(
    *,
    session_id: str,
    room_url: str,
    replica_id: str,
    emit_event: EventEmitter,
) -> Tuple[Any, Any, asyncio.Task]:
    """Start a Pipecat pipeline with Daily transport and TavusVideoService.

    Returns (pipeline, transport, task) where task runs the pipeline in background.
    """
    settings = get_settings()

    try:
        from aiohttp import ClientSession
        from pipecat.services.tavus.video import TavusVideoService
        from pipecat.transports.services.daily import DailyParams, DailyTransport
        from pipecat.pipeline.pipeline import Pipeline
        # Optional VAD to improve turn-taking if needed
        try:
            from pipecat.audio.vad.silero import SileroVADAnalyzer  # type: ignore
            vad = SileroVADAnalyzer()
        except Exception:
            vad = None

        # HTTP session for Tavus service
        http_session = ClientSession()

        tavus = TavusVideoService(
            api_key=settings.TAVUS_API_KEY,
            replica_id=replica_id,
            session=http_session,
        )

        daily_params = DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            camera_out_enabled=True,  # Avatar video goes out via Daily
            vad_enabled=bool(vad),
            vad_analyzer=vad,
        )
        transport = DailyTransport(
            room_url=room_url,
            token=None,  # public rooms need no token (private would need token wiring)
            bot_name="FlowOne Agent",
            params=daily_params,
        )

        # Build pipeline: input -> Tavus video (after your TTS in a full build) -> output
        pipeline = Pipeline([
            transport.input(),
            tavus,
            transport.output(),
        ])

        # Background task to run the pipeline
        async def _runner():
            try:
                await pipeline.run()
            except asyncio.CancelledError:
                pass
            except Exception as e:  # pragma: no cover - best-effort logging
                await safe_emit(emit_event, {
                    "type": "avatar.error",
                    "error": f"Pipecat pipeline error: {e}",
                    "sessionId": session_id,
                })
            finally:
                try:
                    await transport.close()
                except Exception:
                    pass
                try:
                    await http_session.close()
                except Exception:
                    pass

        task = asyncio.create_task(_runner())

        # Inform clients that avatar is available in the Daily room
        await safe_emit(emit_event, {
            "type": "avatar.started",
            "sessionId": session_id,
            # No direct video URL from TavusVideoService; provide room URL for clients that can join it
            "videoStreamUrl": None,
            "dailyRoomUrl": room_url,
            "replicaId": replica_id,
            "timestamp": datetime.utcnow().isoformat(),
            "pipeline": "tavus_videoservice",
        })

        return pipeline, transport, task

    except ImportError as e:
        await safe_emit(emit_event, {
            "type": "avatar.error",
            "error": f"Pipecat dependency missing: {e}",
            "sessionId": session_id,
        })
        raise
    except Exception as e:
        await safe_emit(emit_event, {
            "type": "avatar.error",
            "error": f"Failed to start Tavus pipeline: {e}",
            "sessionId": session_id,
        })
        raise


async def safe_emit(emit: EventEmitter, event: Dict[str, Any]) -> None:
    try:
        maybe = emit(event)
        if asyncio.iscoroutine(maybe):
            await maybe
    except Exception:
        # Best-effort; avoid raising in background
        pass

