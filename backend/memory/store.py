from typing import Optional, Dict, Any, List
import json
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, create_engine, select
from sqlalchemy import text

from settings import get_settings


settings = get_settings()
_engine = create_engine(settings.DATABASE_URL, echo=False)


def get_engine():
    return _engine


class Agent(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    card_json: str
    avatar_replica_id: Optional[str] = None
    avatar_thumbnail_url: Optional[str] = None
    tavus_persona_id: Optional[str] = None  # Tavus persona ID for Phoenix REST mode

    def to_card(self) -> Dict[str, Any]:
        card = json.loads(self.card_json)
        if self.avatar_replica_id:
            card["avatar"] = {
                "replicaId": self.avatar_replica_id,
                "thumbnailUrl": self.avatar_thumbnail_url or "",
                "tavusPersonaId": self.tavus_persona_id or ""
            }
        return card

    @staticmethod
    def from_card(card: Dict[str, Any]) -> "Agent":
        avatar_data = card.pop("avatar", None) if isinstance(card, dict) else None
        agent = Agent(
            id=card["id"],
            name=card.get("name", card["id"]),
            card_json=json.dumps(card),
            avatar_replica_id=avatar_data.get("replicaId") if avatar_data else None,
            avatar_thumbnail_url=avatar_data.get("thumbnailUrl") if avatar_data else None,
            tavus_persona_id=avatar_data.get("tavusPersonaId") if avatar_data else None
        )
        return agent


class SessionRow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    agent_id: str

class Message(SQLModel, table=True):
    id: str = Field(primary_key=True)
    session_id: str
    role: str  # 'user' | 'agent'
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Flow(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class FlowNode(SQLModel, table=True):
    id: str = Field(primary_key=True)
    flow_id: str
    agent_id: Optional[str] = None
    label: Optional[str] = None
    position_json: str = "{}"  # {x,y}
    data_json: str = "{}"

class FlowEdge(SQLModel, table=True):
    id: str = Field(primary_key=True)
    flow_id: str
    source_node_id: str
    target_node_id: str
    label: Optional[str] = None
    data_json: str = "{}"

class FlowVersion(SQLModel, table=True):
    id: str = Field(primary_key=True)
    flow_id: str
    version: int
    graph_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Template(SQLModel, table=True):
    id: str = Field(primary_key=True)
    key: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    config_json: str  # free-form template config
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Avatar(SQLModel, table=True):
    id: str = Field(primary_key=True)
    replica_id: str  # Tavus replica ID
    name: str
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


def create_db(engine):
    """Create database tables and run migrations."""
    SQLModel.metadata.create_all(engine)

    # Migration: Add tavus_persona_id column if it doesn't exist
    try:
        with Session(engine) as session:
            # Try to query the column - if it fails, we need to add it
            try:
                session.exec(text("SELECT tavus_persona_id FROM agent LIMIT 1"))
            except Exception:
                # Column doesn't exist, add it
                session.exec(text("ALTER TABLE agent ADD COLUMN tavus_persona_id VARCHAR"))
                session.commit()
                print("✓ Migration: Added tavus_persona_id column to agent table")
    except Exception as e:
        # Ignore migration errors (e.g., if table doesn't exist yet)
        pass


def upsert_agent(agent: Agent):
    with Session(_engine) as s:
        existing = s.get(Agent, agent.id)
        if existing:
            existing.name = agent.name
            existing.card_json = agent.card_json
            existing.avatar_replica_id = agent.avatar_replica_id
            existing.avatar_thumbnail_url = agent.avatar_thumbnail_url
            existing.tavus_persona_id = agent.tavus_persona_id
        else:
            s.add(agent)
        s.commit()


def get_agent(agent_id: str) -> Optional[Agent]:
    with Session(_engine) as s:
        return s.get(Agent, agent_id)


def list_agents() -> List[Agent]:
    """List all agents from the database."""
    with Session(_engine) as s:
        return list(s.exec(select(Agent)).all())


def create_session(agent_id: str) -> str:
    import uuid
    sid = str(uuid.uuid4())
    with Session(_engine) as s:
        s.add(SessionRow(id=sid, agent_id=agent_id))
        s.commit()
    return sid

# Messages
def add_message(session_id: str, role: str, text: str) -> str:
    import uuid
    mid = str(uuid.uuid4())
    with Session(_engine) as s:
        s.add(Message(id=mid, session_id=session_id, role=role, text=text))
        s.commit()
    return mid

# Flows
def create_flow(name: str) -> str:
    import uuid
    fid = str(uuid.uuid4())
    with Session(_engine) as s:
        s.add(Flow(id=fid, name=name))
        s.commit()
    return fid

def get_flow(flow_id: str) -> Optional[Flow]:
    with Session(_engine) as s:
        return s.get(Flow, flow_id)

def upsert_flow_graph(flow_id: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
    # full replace of nodes/edges for a flow
    with Session(_engine) as s:
        # ensure flow exists
        flow = s.get(Flow, flow_id)
        if not flow:
            return False
        # delete existing using SQLModel/SQLAlchemy 2.x syntax
        existing_nodes = s.exec(select(FlowNode).where(FlowNode.flow_id == flow_id)).all()
        for node in existing_nodes:
            s.delete(node)
        existing_edges = s.exec(select(FlowEdge).where(FlowEdge.flow_id == flow_id)).all()
        for edge in existing_edges:
            s.delete(edge)
        
        # add new
        for n in nodes:
            store_id = f"{flow_id}:{n.get('id')}"
            s.add(FlowNode(
                id=store_id, flow_id=flow_id, agent_id=n.get("agent_id"),
                label=n.get("label"), position_json=json.dumps(n.get("position", {})),
                data_json=json.dumps(n.get("data", {}))
            ))
        for e in edges:
            store_id = f"{flow_id}:{e.get('id')}"
            s.add(FlowEdge(
                id=store_id, flow_id=flow_id, source_node_id=e.get("source"),
                target_node_id=e.get("target"), label=e.get("label"),
                data_json=json.dumps(e.get("data", {}))
            ))
        flow.updated_at = datetime.utcnow()
        s.commit()
    return True

def list_flow_nodes_edges(flow_id: str) -> Dict[str, Any]:
    with Session(_engine) as s:
        nodes = s.exec(select(FlowNode).where(FlowNode.flow_id == flow_id)).all()
        edges = s.exec(select(FlowEdge).where(FlowEdge.flow_id == flow_id)).all()
        def node_to_dict(n: FlowNode):
            raw_id = n.id or ""
            rid = raw_id.split(":", 1)[1] if ":" in raw_id else raw_id
            return {
                "id": rid, "agent_id": n.agent_id, "label": n.label,
                "position": json.loads(n.position_json or "{}"),
                "data": json.loads(n.data_json or "{}"),
            }
        def edge_to_dict(e: FlowEdge):
            raw_id = e.id or ""
            rid = raw_id.split(":", 1)[1] if ":" in raw_id else raw_id
            return {
                "id": rid, "source": e.source_node_id, "target": e.target_node_id,
                "label": e.label, "data": json.loads(e.data_json or "{}"),
            }
        return {"nodes": [node_to_dict(n) for n in nodes], "edges": [edge_to_dict(e) for e in edges]}

def save_flow_version(flow_id: str, graph: Dict[str, Any]) -> int:
    with Session(_engine) as s:
        # compute next version
        existing = s.exec(select(FlowVersion).where(FlowVersion.flow_id == flow_id)).all()
        next_ver = (max([v.version for v in existing]) + 1) if existing else 1
        fv = FlowVersion(id=f"{flow_id}-v{next_ver}", flow_id=flow_id, version=next_ver, graph_json=json.dumps(graph))
        s.add(fv)
        s.commit()
        return next_ver

def list_flow_versions(flow_id: str) -> List[Dict[str, Any]]:
    with Session(_engine) as s:
        versions = s.exec(select(FlowVersion).where(FlowVersion.flow_id == flow_id)).all()
        return [{"version": v.version, "created_at": v.created_at.isoformat()} for v in versions]

def get_flow_version(flow_id: str, version: int) -> Optional[Dict[str, Any]]:
    with Session(_engine) as s:
        v = s.exec(select(FlowVersion).where(FlowVersion.flow_id == flow_id).where(FlowVersion.version == version)).first()
        if not v:
            return None
        return json.loads(v.graph_json)

def list_flows() -> List[Dict[str, Any]]:
    with Session(_engine) as s:
        rows = s.exec(select(Flow)).all()
        return [
            {"id": r.id, "name": r.name, "updated_at": r.updated_at.isoformat()}
            for r in rows
        ]

# Templates
def seed_default_templates():
    defaults = [
        {"key": "sales", "name": "Sales Agent", "description": "Professional & persuasive", "color": "#3b82f6", "config": {"persona": "Professional, persuasive"}},
        {"key": "tutor", "name": "Math Tutor", "description": "Friendly & patient", "color": "#10b981", "config": {"persona": "Friendly, patient"}},
        {"key": "support", "name": "Support Agent", "description": "Patient & empathetic", "color": "#6366f1", "config": {"persona": "Patient, empathetic"}},
        {"key": "coach", "name": "Life Coach", "description": "Motivating & inspiring", "color": "#f59e0b", "config": {"persona": "Motivating, inspiring"}},
    ]
    with Session(_engine) as s:
        for t in defaults:
            # upsert by key
            existing = s.exec(select(Template).where(Template.key == t["key"])) .first()
            if existing:
                continue
            import uuid
            s.add(Template(id=str(uuid.uuid4()), key=t["key"], name=t["name"], description=t["description"], color=t["color"], config_json=json.dumps(t["config"])) )
        s.commit()

def list_templates() -> List[Dict[str, Any]]:
    with Session(_engine) as s:
        rows = s.exec(select(Template)).all()
        return [
            {"id": r.id, "key": r.key, "name": r.name, "description": r.description, "color": r.color, "config": json.loads(r.config_json or "{}")}
            for r in rows
        ]

def upsert_template(tpl: Dict[str, Any]) -> str:
    with Session(_engine) as s:
        # by id if present else by key
        tid = tpl.get("id")
        if tid:
            row = s.get(Template, tid)
            if not row:
                return ""
            row.key = tpl.get("key", row.key)
            row.name = tpl.get("name", row.name)
            row.description = tpl.get("description", row.description)
            row.color = tpl.get("color", row.color)
            row.config_json = json.dumps(tpl.get("config", json.loads(row.config_json or "{}")))
            s.commit()
            return row.id
        else:
            import uuid
            new_id = str(uuid.uuid4())
            s.add(Template(id=new_id, key=tpl["key"], name=tpl.get("name", tpl["key"].title()), description=tpl.get("description"), color=tpl.get("color"), config_json=json.dumps(tpl.get("config", {}))))
            s.commit()
            return new_id

def delete_template(tid: str) -> bool:
    with Session(_engine) as s:
        row = s.get(Template, tid)
        if not row:
            return False
        s.delete(row)
        s.commit()
        return True



