from settings import get_settings
from typing import Optional, Dict, Any
import uuid
import time
from functools import wraps

try:
    from langfuse import Langfuse
    from langfuse.decorators import observe
except Exception:
    Langfuse = None  # type: ignore
    observe = None  # type: ignore


settings = get_settings()
_lf = None

# Temporarily disable Langfuse initialization to prevent blocking
# TODO: Re-enable after fixing the blocking issue
print("⚠ Langfuse disabled temporarily to prevent startup blocking")

# if Langfuse and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY:
#     try:
#         # Initialize Langfuse with timeout to prevent blocking startup
#         _lf = Langfuse(
#             public_key=settings.LANGFUSE_PUBLIC_KEY,
#             secret_key=settings.LANGFUSE_SECRET_KEY,
#             host=settings.LANGFUSE_HOST,
#             enabled=True,
#             flush_at=1,  # Flush more frequently for demo
#             flush_interval=1.0,  # Flush every second
#         )
#         print("✓ Langfuse tracing enabled")
#     except Exception as e:
#         print(f"⚠ Langfuse initialization failed: {e}")
#         _lf = None


def get_langfuse() -> Optional[Langfuse]:
    """Get Langfuse client instance"""
    return _lf


def trace_event(name: str, **kwargs) -> str:
    """Emit a Langfuse event and return a best-effort trace_id for client correlation."""
    trace_id = kwargs.get("trace_id") or str(uuid.uuid4())
    payload = dict(kwargs)
    payload["trace_id"] = trace_id
    if _lf:
        try:
            _lf.event(name=name, metadata=payload)
        except Exception:
            # fail open
            pass
    return trace_id


def trace_component(component_name: str):
    """
    Decorator for tracing individual pipeline components.
    Tracks latency, inputs, outputs, and errors.
    
    Usage:
        @trace_component("stt")
        async def process_audio(self, audio):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not _lf:
                return await func(*args, **kwargs)
            
            start_time = time.time()
            trace_id = f"{component_name}_{int(start_time * 1000)}"
            
            try:
                result = await func(*args, **kwargs)
                latency_ms = (time.time() - start_time) * 1000
                
                # Trace successful execution
                _lf.event(
                    name=f"{component_name}_success",
                    metadata={
                        "trace_id": trace_id,
                        "component": component_name,
                        "latency_ms": latency_ms,
                        "function": func.__name__
                    }
                )
                
                return result
                
            except Exception as e:
                latency_ms = (time.time() - start_time) * 1000
                
                # Trace error
                _lf.event(
                    name=f"{component_name}_error",
                    metadata={
                        "trace_id": trace_id,
                        "component": component_name,
                        "latency_ms": latency_ms,
                        "error": str(e),
                        "function": func.__name__
                    }
                )
                raise
        
        return wrapper
    return decorator


def trace_generation(
    model: str,
    input_text: str,
    output_text: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: float,
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """
    Trace LLM generation with token usage and costs.
    Returns trace_id for correlation.
    """
    if not _lf:
        return str(uuid.uuid4())
    
    trace_id = str(uuid.uuid4())
    
    try:
        # Calculate costs based on model
        costs = _calculate_costs(model, input_tokens, output_tokens)
        
        _lf.generation(
            name="llm_generation",
            model=model,
            input=input_text,
            output=output_text,
            usage={
                "input": input_tokens,
                "output": output_tokens,
                "total": input_tokens + output_tokens,
                "unit": "TOKENS"
            },
            metadata={
                "trace_id": trace_id,
                "latency_ms": latency_ms,
                "cost_input_usd": costs["input"],
                "cost_output_usd": costs["output"],
                "cost_total_usd": costs["total"],
                **(metadata or {})
            }
        )
    except Exception:
        pass  # Fail open
    
    return trace_id


def _calculate_costs(model: str, input_tokens: int, output_tokens: int) -> Dict[str, float]:
    """
    Calculate costs based on model pricing.
    Pricing as of 2024 (update as needed).
    """
    # Gemini Flash pricing: $0.075 / $0.30 per 1M tokens
    if "flash" in model.lower():
        input_cost = (input_tokens / 1_000_000) * 0.075
        output_cost = (output_tokens / 1_000_000) * 0.30
    # Gemini Live pricing: $0.15 / $0.60 per 1M tokens
    elif "live" in model.lower():
        input_cost = (input_tokens / 1_000_000) * 0.15
        output_cost = (output_tokens / 1_000_000) * 0.60
    # Default to Flash pricing
    else:
        input_cost = (input_tokens / 1_000_000) * 0.075
        output_cost = (output_tokens / 1_000_000) * 0.30
    
    return {
        "input": input_cost,
        "output": output_cost,
        "total": input_cost + output_cost
    }


class MetricsCollector:
    """
    Collect and aggregate metrics for dashboard.
    """
    def __init__(self):
        self.metrics = {
            "stt": [],
            "llm": [],
            "tts": [],
            "pipeline": []
        }
    
    def add_metric(self, component: str, latency_ms: float, metadata: Optional[Dict] = None):
        """Add a metric data point"""
        if component in self.metrics:
            self.metrics[component].append({
                "timestamp": time.time(),
                "latency_ms": latency_ms,
                "metadata": metadata or {}
            })
    
    def get_summary(self, component: Optional[str] = None) -> Dict[str, Any]:
        """Get aggregated metrics summary"""
        if component:
            return self._summarize_component(component)
        
        return {
            comp: self._summarize_component(comp)
            for comp in self.metrics.keys()
        }
    
    def _summarize_component(self, component: str) -> Dict[str, Any]:
        """Summarize metrics for a single component"""
        data = self.metrics.get(component, [])
        
        if not data:
            return {"count": 0, "avg_latency_ms": 0}
        
        latencies = [d["latency_ms"] for d in data]
        
        return {
            "count": len(data),
            "avg_latency_ms": sum(latencies) / len(latencies),
            "min_latency_ms": min(latencies),
            "max_latency_ms": max(latencies),
            "p50_latency_ms": sorted(latencies)[len(latencies) // 2],
            "p95_latency_ms": sorted(latencies)[int(len(latencies) * 0.95)] if len(latencies) > 1 else latencies[0],
            "p99_latency_ms": sorted(latencies)[int(len(latencies) * 0.99)] if len(latencies) > 1 else latencies[0]
        }
    
    def reset(self):
        """Reset all metrics"""
        for key in self.metrics:
            self.metrics[key] = []


# Global metrics collector
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get global metrics collector"""
    return _metrics_collector



