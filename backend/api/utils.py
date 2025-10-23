"""Shared API utilities for Daily.co and other integrations."""
from typing import Any


def is_duplicate_room_error(status_code: int, data: Any) -> bool:
    """Return True if the Daily room create error indicates the room already exists.

    Daily API returns 400 with payload like:
    {"error": "invalid-request-error", "info": "Room 'xyz' already exists"}
    """
    try:
        return (
            status_code == 400
            and isinstance(data, dict)
            and data.get("error") == "invalid-request-error"
            and "already exists" in (data.get("info") or "")
        )
    except Exception:
        return False

