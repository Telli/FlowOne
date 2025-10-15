from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.memory.store import (
    get_engine,
    Agent,
    create_db,
    upsert_agent,
    get_agent,
)
from backend.services.gemini_flash import synthesize_agent_card


router = APIRouter()


class CreateAgentRequest(BaseModel):
    name: str
    role: str
    goals: list[str] = []
    tone: str = "neutral"


@router.on_event("startup")
def startup():
    create_db(get_engine())
    # seed default agent if not exists
    default_id = "agent_fitness_coach"
    if not get_agent(default_id):
        card = {
            "id": default_id,
            "name": "Fitness Coach",
            "persona": {
                "role": "You are a concise fitness coach that tailors workouts.",
                "goals": ["motivate", "10k-steps", "weekly-plan"],
                "tone": "friendly",
                "style": {"max_words": 120, "acknowledge_first": True},
            },
            "tools": [],
            "memory": {"summaries": [], "vectors": []},
            "routing": {"policies": []},
        }
        upsert_agent(Agent.from_card(card))


@router.post("", response_model=dict)
def create_agent(body: CreateAgentRequest):
    card = synthesize_agent_card(
        name=body.name, role=body.role, goals=body.goals, tone=body.tone
    )
    agent = Agent.from_card(card)
    upsert_agent(agent)
    return {"agent": agent.to_card()}


@router.get("/{agent_id}", response_model=dict)
def fetch_agent(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return {"agent": agent.to_card()}



