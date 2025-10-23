import time
from fastapi import APIRouter, HTTPException, Query, Depends
import httpx

# Support both `settings` and `backend.settings` import paths for FastAPI dependency overrides in tests
try:
    from backend.settings import get_settings as _get_settings, Settings as _Settings
except Exception:
    from settings import get_settings as _get_settings, Settings as _Settings

# Shared utilities (tolerant import for different run contexts)
try:
    from backend.api.utils import is_duplicate_room_error
except Exception:  # pragma: no cover - fallback for alternate import paths
    try:
        from api.utils import is_duplicate_room_error  # type: ignore
    except Exception:
        def is_duplicate_room_error(status_code: int, data):
            return (
                status_code == 400 and isinstance(data, dict)
                and data.get("error") == "invalid-request-error"
                and "already exists" in (data.get("info") or "")
            )

router = APIRouter()


@router.get("/tokens")
async def create_daily_token(sessionId: str = Query(...), settings: _Settings = Depends(_get_settings)):
    api_key = settings.DAILY_API_KEY

    # Production behavior - if API key not available, return 500
    if not api_key or api_key == "your_daily_api_key_here":
        raise HTTPException(status_code=500, detail="DAILY_API_KEY missing")

    room_name = f"flowone-{sessionId}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        # Ensure room exists (idempotent)
        exp = int(time.time()) + 60 * 60
        room_payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "exp": exp,
                # Harden room for headless/bot participants
                "enable_prejoin_ui": False,
                # Private rooms can use knocking
                "enable_knocking": True,
                # Start with mic ON
                "start_audio_off": False,
                # Start with video OFF by default
                "start_video_off": True,
            },
        }

        # First check if the room already exists to avoid 400 errors
        try:
            r_check = await client.get(f"https://api.daily.co/v1/rooms/{room_name}", headers=headers)
            if r_check.status_code != 200:
                r_create = await client.post("https://api.daily.co/v1/rooms", headers=headers, json=room_payload)
                if r_create.status_code not in (200, 201):
                    try:
                        data = r_create.json()
                    except Exception:
                        data = {}
                    if not is_duplicate_room_error(r_create.status_code, data):
                        raise HTTPException(status_code=500, detail=f"Daily room error: {r_create.text}")
        except Exception:
            # Non-fatal; token creation below will still fail if room truly doesn't exist
            pass

        # Create meeting token
        token_payload = {"properties": {"room_name": room_name, "is_owner": False}}
        r = await client.post("https://api.daily.co/v1/meeting-tokens", headers=headers, json=token_payload)
        if r.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Daily token error: {r.text}")
        data = r.json()
        return {"room": room_name, "token": data.get("token")}



