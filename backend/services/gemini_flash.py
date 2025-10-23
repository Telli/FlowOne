from typing import Dict, List
import json
import httpx

from settings import get_settings


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


def parse_nlp_command(text: str) -> Dict:
    """Use Gemini Flash to parse natural language into a structured command.
    Returns dict: {action, config?, modification?, details[]} with deterministic fallback.
    """
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY
    fallback = {"action": "unknown", "details": ["fallback"]}
    if not api_key:
        return fallback

    schema_instruction = (
        "Return ONLY valid JSON with keys: action ('create'|'modify'|'connect'|'query'|'unknown'), "
        "config (optional, object), modification (optional, object), details (array of strings). "
        "Infer minimal fields from the text."
    )
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{schema_instruction}\nInput: {text}"}]}
        ]
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            out_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            cmd = json.loads(out_text)
            if "action" not in cmd:
                raise ValueError("no action")
            if "details" not in cmd:
                cmd["details"] = []
            return cmd
    except Exception:
        return fallback


def generate_agent_reply(user_text: str, agent_card: Dict) -> str:
    """Generate a short agent reply consistent with the persona using Flash.
    Fallback: echo. """
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return f"I heard: {user_text}"

    persona = agent_card.get("persona", {})
    role = persona.get("role", "You are a helpful assistant.")
    tone = persona.get("tone", "neutral")
    style = persona.get("style", {})
    max_words = style.get("max_words", 60)
    system = (
        f"{role}\nTone: {tone}. Keep reply under {max_words} words."
    )
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": system + "\nUser: " + user_text}]}
        ]
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            out_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return out_text.strip() or f"I heard: {user_text}"
    except Exception:
        return f"I heard: {user_text}"


async def generate_ai_suggestions(nodes: list, edges: list, selected_node_id: str = None) -> list:
    """Generate intelligent suggestions using Gemini Flash based on canvas state.

    Args:
        nodes: List of agent nodes on canvas
        edges: List of connections between nodes
        selected_node_id: Currently selected node ID

    Returns:
        List of suggestions with id, text, category, and priority
    """
    settings = get_settings()
    api_key = settings.GEMINI_API_KEY

    # Fallback suggestions if API not available
    fallback = [
        {
            "id": "create-first",
            "text": "Create your first agent",
            "category": "create",
            "priority": 10
        }
    ]

    if not api_key:
        return fallback

    # Build context about current canvas state
    node_summary = f"{len(nodes)} agents"
    edge_summary = f"{len(edges)} connections"

    agent_details = []
    for node in nodes:
        data = node.get("data", {})
        agent_details.append({
            "name": data.get("name", "Unknown"),
            "type": data.get("type", "custom"),
            "tools": data.get("tools", []),
            "status": data.get("status", "draft")
        })

    prompt = f"""Given this AI agent workflow canvas state:
- {node_summary}
- {edge_summary}
- Selected node: {selected_node_id or 'none'}

Agent details:
{json.dumps(agent_details, indent=2)}

Generate 3-5 helpful suggestions for the user. Consider:
1. Next logical steps in workflow creation
2. Missing agent types or connections
3. Optimization opportunities
4. Testing recommendations

Return as JSON array of objects with these fields:
- id: unique identifier (string)
- text: suggestion text (string)
- category: one of 'create', 'modify', 'connect', 'test', 'optimize' (string)
- priority: importance level 1-10 (number)

Example format:
[
  {{"id": "test-agent", "text": "Test your agent", "category": "test", "priority": 9}},
  {{"id": "add-second", "text": "Add a second agent", "category": "create", "priority": 8}}
]"""

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ]
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            out_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            suggestions = json.loads(out_text)

            # Validate suggestions structure
            if not isinstance(suggestions, list):
                return fallback

            # Ensure all required fields are present
            validated = []
            for s in suggestions:
                if all(k in s for k in ["id", "text", "category", "priority"]):
                    validated.append(s)

            return validated if validated else fallback

    except Exception as e:
        print(f"Error generating suggestions: {e}")
        return fallback



