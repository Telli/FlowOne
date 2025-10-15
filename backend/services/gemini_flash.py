from typing import Dict, List
import json
import httpx

from backend.settings import get_settings


def _fallback_card(name: str, role: str, goals: List[str], tone: str) -> Dict:
    return {
        "id": f"agent_{name.lower().replace(' ','_')}",
        "name": name,
        "persona": {
            "role": role,
            "goals": goals,
            "tone": tone,
            "style": {"max_words": 120, "acknowledge_first": True},
        },
        "tools": [],
        "memory": {"summaries": [], "vectors": []},
        "routing": {"policies": [{"on": "user_request", "adapt": ["concise"]}]},
    }


def synthesize_agent_card(name: str, role: str, goals: List[str], tone: str) -> Dict:
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return _fallback_card(name, role, goals, tone)

    prompt = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Return ONLY valid JSON for an AgentCard with keys: "
                            "id,name,persona{role,goals,tone,style},tools,memory{summaries,vectors}. "
                            f"Name: {name}. Role: {role}. Goals: {', '.join(goals)}. Tone: {tone}."
                        )
                    }
                ],
            }
        ]
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(url, headers=headers, json=prompt)
            r.raise_for_status()
            data = r.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            card = json.loads(text)
            if not all(k in card for k in ["id", "name", "persona", "tools", "memory"]):
                raise ValueError("incomplete card")
            return card
    except Exception:
        return _fallback_card(name, role, goals, tone)



