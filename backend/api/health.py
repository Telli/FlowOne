from fastapi import APIRouter
from settings import get_settings
from memory.store import get_engine
from observability.langfuse import trace_event

router = APIRouter()


@router.get("/live")
def health_live():
    trace_id = trace_event("health.live")
    return {"ok": True, "trace_id": trace_id}


@router.get("/ready")
def ready():
    # basic checks: DB engine creation succeeds; env present (optional)
    try:
        engine = get_engine()
        conn = engine.connect()
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False
    s = get_settings()
    payload = {
        "ok": db_ok,
        "db": db_ok,
        "env": {
            "GEMINI_API_KEY": bool(s.GEMINI_API_KEY),
            "DAILY_API_KEY": bool(s.DAILY_API_KEY),
        },
    }
    payload["trace_id"] = trace_event("health.ready", db=db_ok)
    return payload


@router.get("/status")
def status():
    trace_id = trace_event("health.status")
    return {"version": "0.1.0", "trace_id": trace_id}


