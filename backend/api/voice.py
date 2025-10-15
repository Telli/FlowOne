import time
from fastapi import APIRouter, HTTPException, Query
import httpx

from backend.settings import get_settings


router = APIRouter()


@router.get("/tokens")
async def create_daily_token(sessionId: str = Query(...)):
    settings = get_settings()
    api_key = settings.DAILY_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="DAILY_API_KEY missing")

    room_name = f"flowone-{sessionId}"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        # Ensure room exists (idempotent-ish create)
        exp = int(time.time()) + 60 * 60
        room_payload = {
            "name": room_name,
            "privacy": "private",
            "properties": {"exp": exp},
        }
        try:
            await client.post("https://api.daily.co/v1/rooms", headers=headers, json=room_payload)
        except httpx.HTTPStatusError:
            pass

        # Create meeting token
        token_payload = {"properties": {"room_name": room_name, "is_owner": False}}
        r = await client.post("https://api.daily.co/v1/meeting-tokens", headers=headers, json=token_payload)
        if r.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Daily token error: {r.text}")
        data = r.json()
        return {"room": room_name, "token": data.get("token")}



