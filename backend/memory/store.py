from typing import Optional, Dict, Any
import json
from sqlmodel import SQLModel, Field, Session, create_engine

from backend.settings import get_settings


settings = get_settings()
_engine = create_engine(settings.DATABASE_URL, echo=False)


def get_engine():
    return _engine


class Agent(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    card_json: str

    def to_card(self) -> Dict[str, Any]:
        return json.loads(self.card_json)

    @staticmethod
    def from_card(card: Dict[str, Any]) -> "Agent":
        return Agent(id=card["id"], name=card.get("name", card["id"]), card_json=json.dumps(card))


class SessionRow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    agent_id: str


def create_db(engine):
    SQLModel.metadata.create_all(engine)


def upsert_agent(agent: Agent):
    with Session(_engine) as s:
        existing = s.get(Agent, agent.id)
        if existing:
            existing.name = agent.name
            existing.card_json = agent.card_json
        else:
            s.add(agent)
        s.commit()


def get_agent(agent_id: str) -> Optional[Agent]:
    with Session(_engine) as s:
        return s.get(Agent, agent_id)


def create_session(agent_id: str) -> str:
    import uuid
    sid = str(uuid.uuid4())
    with Session(_engine) as s:
        s.add(SessionRow(id=sid, agent_id=agent_id))
        s.commit()
    return sid



