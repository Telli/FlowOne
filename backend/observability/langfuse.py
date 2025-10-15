from backend.settings import get_settings
from typing import Optional
import uuid

try:
    from langfuse import Langfuse
except Exception:
    Langfuse = None  # type: ignore


settings = get_settings()
_lf = None
if Langfuse and settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY:
    try:
        _lf = Langfuse(
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            secret_key=settings.LANGFUSE_SECRET_KEY,
            host=settings.LANGFUSE_HOST,
        )
    except Exception:
        _lf = None


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



