from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from memory.store import (
    get_engine,
    Agent,
    create_db,
    upsert_agent,
    get_agent,
    list_agents,
)
from services.gemini_flash import synthesize_agent_card
from observability.langfuse import trace_event


router = APIRouter()


class CreateAgentRequest(BaseModel):
    name: str
    role: str
    goals: list[str] = []
    tone: str = "neutral"
    avatarReplicaId: str | None = None
    tavusPersonaId: str | None = None

class PatchAgentRequest(BaseModel):
    role: str | None = None
    goals: list[str] | None = None
    tone: str | None = None
    style: dict | None = None
    avatarReplicaId: str | None = None
    tavusPersonaId: str | None = None


# Database initialization moved to app.py startup event
# (router startup events don't work reliably in included routers)


@router.post("", response_model=dict)
def create_agent(body: CreateAgentRequest):
    card = synthesize_agent_card(
        name=body.name, role=body.role, goals=body.goals, tone=body.tone
    )

    # Get agent ID from card before creating Agent object
    agent_id = card["id"]

    agent = Agent.from_card(card)
    if body.avatarReplicaId:
        agent.avatar_replica_id = body.avatarReplicaId
    if body.tavusPersonaId:
        agent.tavus_persona_id = body.tavusPersonaId

    upsert_agent(agent)

    # Build response card after upsert (include avatar data if present)
    response_card = dict(card)
    if body.avatarReplicaId or body.tavusPersonaId:
        response_card["avatar"] = {
            "replicaId": body.avatarReplicaId or "",
            "thumbnailUrl": "",
            "tavusPersonaId": body.tavusPersonaId or ""
        }

    trace_id = trace_event("agent.create", agentId=agent_id)
    return {"agent": response_card, "trace_id": trace_id}


@router.get("", response_model=dict)
def list_all_agents():
    """List all agents."""
    agents = list_agents()
    trace_id = trace_event("agent.list", count=len(agents))
    return {
        "agents": [agent.to_card() for agent in agents],
        "trace_id": trace_id
    }


@router.get("/{agent_id}", response_model=dict)
def fetch_agent(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    trace_id = trace_event("agent.fetch", agentId=agent_id)
    return {"agent": agent.to_card(), "trace_id": trace_id}


@router.patch("/{agent_id}", response_model=dict)
def patch_agent(agent_id: str, body: PatchAgentRequest):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    card = agent.to_card()
    persona = card.get("persona", {})
    if body.role is not None:
        persona["role"] = body.role
    if body.goals is not None:
        persona["goals"] = body.goals
    if body.tone is not None:
        persona["tone"] = body.tone
    if body.style is not None:
        persona["style"] = body.style
    card["persona"] = persona
    updated_agent = Agent.from_card(card)
    if body.avatarReplicaId is not None:
        updated_agent.avatar_replica_id = body.avatarReplicaId
    if body.tavusPersonaId is not None:
        updated_agent.tavus_persona_id = body.tavusPersonaId
    upsert_agent(updated_agent)
    trace_id = trace_event("agent.patch", agentId=agent_id)
    return {"agent": updated_agent.to_card(), "trace_id": trace_id}



