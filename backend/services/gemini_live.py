# Minimal wrapper placeholder for Gemini Live (speech↔speech)
# Real implementation would integrate Pipecat runtime and audio I/O.

from typing import Callable, Dict, Any


class GeminiLiveClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._running = False

    async def start(
        self,
        session_id: str,
        agent_card: Dict[str, Any],
        on_partial: Callable[[str], None],
        on_final: Callable[[str], None],
        on_agent: Callable[[str], None],
        on_persona: Callable[[Dict[str, Any]], None],
        on_metric: Callable[[int], None],
    ):
        # TODO: implement using Pipecat nodes and Daily I/O
        self._running = True

    async def stop(self):
        self._running = False



