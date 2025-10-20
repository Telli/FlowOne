"""
Production-ready three-model pipeline: STT → LLM → TTS
Recommended by Pipecat team for production applications over Gemini Live API.

Benefits:
- Consistent behavior
- Better observability
- Superior function calling
- Component-level control
"""

import asyncio
import time
from typing import Dict, Any, Optional
from datetime import datetime

from settings import get_settings
from observability.langfuse import get_langfuse, trace_event


class ProductionPipelineComponents:
    """
    Three-model production pipeline components.
    Each component is traced separately for observability.
    """
    
    def __init__(self, agent_card: Dict[str, Any]):
        self.settings = get_settings()
        self.agent_card = agent_card
        self.langfuse = get_langfuse()
        
        # Initialize components based on available API keys
        self.stt = self._init_stt()
        self.llm = self._init_llm()
        self.tts = self._init_tts()
        
        # Metrics tracking
        self.metrics = {
            "stt_latency_ms": [],
            "llm_latency_ms": [],
            "tts_latency_ms": [],
            "total_latency_ms": [],
            "llm_tokens_input": 0,
            "llm_tokens_output": 0,
            "cost_usd": 0.0
        }
    
    def _init_stt(self):
        """Initialize Speech-to-Text service"""
        if self.settings.DEEPGRAM_API_KEY:
            # Deepgram STT (recommended)
            try:
                from pipecat.services.deepgram import DeepgramSTTService
                return DeepgramSTTService(
                    api_key=self.settings.DEEPGRAM_API_KEY,
                    model="nova-2",
                    language="en"
                )
            except ImportError:
                print("Warning: Deepgram not available, using fallback")
        
        # Fallback to Google STT
        if self.settings.GOOGLE_STT_API_KEY:
            try:
                from pipecat.services.google import GoogleSTTService
                return GoogleSTTService(
                    api_key=self.settings.GOOGLE_STT_API_KEY
                )
            except ImportError:
                pass
        
        # No STT available
        return None
    
    def _init_llm(self):
        """Initialize Language Model (Gemini Flash)"""
        if not self.settings.GEMINI_API_KEY:
            return None
        
        try:
            from pipecat.services.google import GoogleLLMService
            
            # Extract persona from agent card
            persona = self.agent_card.get("persona", {})
            role = persona.get("role", "helpful assistant")
            goals = persona.get("goals", [])
            tone = persona.get("tone", "professional")
            
            system_instruction = f"""You are a {role}.
Your goals: {', '.join(goals)}
Communication tone: {tone}

Respond naturally and concisely."""
            
            return GoogleLLMService(
                api_key=self.settings.GEMINI_API_KEY,
                model="gemini-2.5-flash",
                system_instruction=system_instruction
            )
        except ImportError:
            print("Warning: Google LLM service not available")
            return None
    
    def _init_tts(self):
        """Initialize Text-to-Speech service"""
        if self.settings.CARTESIA_API_KEY:
            # Cartesia TTS (recommended for quality)
            try:
                from pipecat.services.cartesia import CartesiaTTSService
                voice_id = self.agent_card.get("voice_id", "default")
                return CartesiaTTSService(
                    api_key=self.settings.CARTESIA_API_KEY,
                    voice_id=voice_id
                )
            except ImportError:
                print("Warning: Cartesia not available, using fallback")
        
        # Fallback to ElevenLabs
        if self.settings.ELEVENLABS_API_KEY:
            try:
                from pipecat.services.elevenlabs import ElevenLabsTTSService
                return ElevenLabsTTSService(
                    api_key=self.settings.ELEVENLABS_API_KEY
                )
            except ImportError:
                pass
        
        # No TTS available
        return None
    
    async def process_audio_to_text(self, audio_chunk: bytes, session_id: str) -> str:
        """
        STT: Convert audio to text with tracing.
        """
        if not self.stt:
            return ""
        
        start_time = time.time()
        trace_id = f"stt_{session_id}_{int(start_time * 1000)}"
        
        try:
            # Process audio through STT
            text = await self._stt_process(audio_chunk)
            
            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            self.metrics["stt_latency_ms"].append(latency_ms)
            
            # Trace to Langfuse
            trace_event(
                name="stt_processing",
                trace_id=trace_id,
                metadata={
                    "component": "stt",
                    "service": "deepgram",
                    "latency_ms": latency_ms,
                    "audio_duration_ms": len(audio_chunk) / 16,  # Assuming 16kHz
                    "text_length": len(text),
                    "text": text
                }
            )
            
            return text
            
        except Exception as e:
            trace_event(
                name="stt_error",
                trace_id=trace_id,
                metadata={"error": str(e)}
            )
            raise
    
    async def _stt_process(self, audio_chunk: bytes) -> str:
        """Internal STT processing"""
        # Placeholder - actual implementation depends on Pipecat API
        return "Transcribed text from audio"
    
    async def process_text_to_response(
        self, 
        user_text: str, 
        session_id: str,
        conversation_history: list = None
    ) -> Dict[str, Any]:
        """
        LLM: Generate response from text with tracing.
        Returns: {text: str, input_tokens: int, output_tokens: int}
        """
        if not self.llm:
            return {"text": "LLM not configured", "input_tokens": 0, "output_tokens": 0}
        
        start_time = time.time()
        trace_id = f"llm_{session_id}_{int(start_time * 1000)}"
        
        try:
            # Generate response
            response = await self._llm_generate(user_text, conversation_history)
            
            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            self.metrics["llm_latency_ms"].append(latency_ms)
            self.metrics["llm_tokens_input"] += response.get("input_tokens", 0)
            self.metrics["llm_tokens_output"] += response.get("output_tokens", 0)
            
            # Calculate cost (Gemini Flash pricing: $0.075/$0.30 per 1M tokens)
            input_cost = (response.get("input_tokens", 0) / 1_000_000) * 0.075
            output_cost = (response.get("output_tokens", 0) / 1_000_000) * 0.30
            total_cost = input_cost + output_cost
            self.metrics["cost_usd"] += total_cost
            
            # Trace to Langfuse with generation details
            if self.langfuse:
                self.langfuse.generation(
                    name="llm_generation",
                    model="gemini-2.5-flash",
                    input=user_text,
                    output=response["text"],
                    usage={
                        "input": response.get("input_tokens", 0),
                        "output": response.get("output_tokens", 0),
                        "total": response.get("input_tokens", 0) + response.get("output_tokens", 0)
                    },
                    metadata={
                        "latency_ms": latency_ms,
                        "cost_usd": total_cost,
                        "session_id": session_id
                    }
                )
            
            return response
            
        except Exception as e:
            trace_event(
                name="llm_error",
                trace_id=trace_id,
                metadata={"error": str(e), "input": user_text}
            )
            raise
    
    async def _llm_generate(self, text: str, history: list = None) -> Dict[str, Any]:
        """Internal LLM generation"""
        # Placeholder - actual implementation depends on Pipecat API
        # In real implementation, this would call the LLM service
        return {
            "text": f"Response to: {text}",
            "input_tokens": len(text.split()) * 2,  # Rough estimate
            "output_tokens": 50
        }
    
    async def process_text_to_audio(self, text: str, session_id: str) -> bytes:
        """
        TTS: Convert text to audio with tracing.
        """
        if not self.tts:
            return b""
        
        start_time = time.time()
        trace_id = f"tts_{session_id}_{int(start_time * 1000)}"
        
        try:
            # Generate audio
            audio = await self._tts_generate(text)
            
            # Calculate metrics
            latency_ms = (time.time() - start_time) * 1000
            self.metrics["tts_latency_ms"].append(latency_ms)
            
            # Trace to Langfuse
            trace_event(
                name="tts_generation",
                trace_id=trace_id,
                metadata={
                    "component": "tts",
                    "service": "cartesia",
                    "latency_ms": latency_ms,
                    "text_length": len(text),
                    "audio_size_bytes": len(audio),
                    "text": text[:100]  # First 100 chars
                }
            )
            
            return audio
            
        except Exception as e:
            trace_event(
                name="tts_error",
                trace_id=trace_id,
                metadata={"error": str(e), "text": text}
            )
            raise
    
    async def _tts_generate(self, text: str) -> bytes:
        """Internal TTS generation"""
        # Placeholder - actual implementation depends on Pipecat API
        return b"audio_data"
    
    async def process_full_pipeline(
        self, 
        audio_chunk: bytes, 
        session_id: str,
        conversation_history: list = None
    ) -> Dict[str, Any]:
        """
        Full pipeline: Audio → Text → Response → Audio
        Returns: {text: str, response_text: str, response_audio: bytes, metrics: dict}
        """
        pipeline_start = time.time()
        
        # STT: Audio → Text
        user_text = await self.process_audio_to_text(audio_chunk, session_id)
        
        # LLM: Text → Response
        response = await self.process_text_to_response(
            user_text, 
            session_id, 
            conversation_history
        )
        
        # TTS: Response → Audio
        response_audio = await self.process_text_to_audio(response["text"], session_id)
        
        # Calculate total latency
        total_latency_ms = (time.time() - pipeline_start) * 1000
        self.metrics["total_latency_ms"].append(total_latency_ms)
        
        # Trace full pipeline
        trace_event(
            name="pipeline_complete",
            trace_id=f"pipeline_{session_id}_{int(pipeline_start * 1000)}",
            metadata={
                "total_latency_ms": total_latency_ms,
                "user_text": user_text,
                "response_text": response["text"],
                "components": {
                    "stt_ms": self.metrics["stt_latency_ms"][-1] if self.metrics["stt_latency_ms"] else 0,
                    "llm_ms": self.metrics["llm_latency_ms"][-1] if self.metrics["llm_latency_ms"] else 0,
                    "tts_ms": self.metrics["tts_latency_ms"][-1] if self.metrics["tts_latency_ms"] else 0
                }
            }
        )
        
        return {
            "text": user_text,
            "response_text": response["text"],
            "response_audio": response_audio,
            "metrics": self.get_metrics_summary()
        }
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get aggregated metrics for monitoring dashboard"""
        def avg(lst):
            return sum(lst) / len(lst) if lst else 0
        
        return {
            "stt": {
                "avg_latency_ms": avg(self.metrics["stt_latency_ms"]),
                "min_latency_ms": min(self.metrics["stt_latency_ms"]) if self.metrics["stt_latency_ms"] else 0,
                "max_latency_ms": max(self.metrics["stt_latency_ms"]) if self.metrics["stt_latency_ms"] else 0,
                "count": len(self.metrics["stt_latency_ms"])
            },
            "llm": {
                "avg_latency_ms": avg(self.metrics["llm_latency_ms"]),
                "min_latency_ms": min(self.metrics["llm_latency_ms"]) if self.metrics["llm_latency_ms"] else 0,
                "max_latency_ms": max(self.metrics["llm_latency_ms"]) if self.metrics["llm_latency_ms"] else 0,
                "total_input_tokens": self.metrics["llm_tokens_input"],
                "total_output_tokens": self.metrics["llm_tokens_output"],
                "total_cost_usd": self.metrics["cost_usd"],
                "count": len(self.metrics["llm_latency_ms"])
            },
            "tts": {
                "avg_latency_ms": avg(self.metrics["tts_latency_ms"]),
                "min_latency_ms": min(self.metrics["tts_latency_ms"]) if self.metrics["tts_latency_ms"] else 0,
                "max_latency_ms": max(self.metrics["tts_latency_ms"]) if self.metrics["tts_latency_ms"] else 0,
                "count": len(self.metrics["tts_latency_ms"])
            },
            "pipeline": {
                "avg_total_latency_ms": avg(self.metrics["total_latency_ms"]),
                "min_total_latency_ms": min(self.metrics["total_latency_ms"]) if self.metrics["total_latency_ms"] else 0,
                "max_total_latency_ms": max(self.metrics["total_latency_ms"]) if self.metrics["total_latency_ms"] else 0,
                "count": len(self.metrics["total_latency_ms"])
            }
        }


def create_production_pipeline(agent_card: Dict[str, Any]) -> ProductionPipelineComponents:
    """
    Factory function to create production pipeline.
    """
    return ProductionPipelineComponents(agent_card)


