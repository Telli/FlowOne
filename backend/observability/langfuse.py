from backend.settings import get_settings

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


def trace_event(name: str, **kwargs):
    if not _lf:
        return
    try:
        _lf.event(name=name, metadata=kwargs)
    except Exception:
        pass



