
---

# Backend (FastAPI) — add Flow CRUD + Flow Session runtime

## 1) Models — `backend/models/flow.py`

```python
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON
import datetime

class FlowNode(SQLModel, table=False):
    id: str
    agentId: str
    label: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    ui: Optional[Dict[str, Any]] = None  # {x,y,w?} — UI-only

class FlowEdge(SQLModel, table=False):
    id: str
    from_: str = Field(alias="from")
    to: str
    condition: Optional[Dict[str, Any]] = None  # e.g., {"type":"intent","match":"sales"}

class Flow(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    name: str
    nodes: List[FlowNode] = Field(sa_column=Column(JSON))
    edges: List[FlowEdge] = Field(sa_column=Column(JSON))
    version: int = 1
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow, nullable=False)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow, nullable=False)
```

> Store **UI coordinates** in `ui` so runtime logic stays clean.

## 2) DB bootstrap — `backend/db.py` (if you don’t have one yet)

```python
from sqlmodel import SQLModel, create_engine
import os
DATABASE_URL = os.getenv("DATABASE_URL","sqlite:///./flowone.db")
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    from backend.models.flow import Flow  # ensure import so tables are created
    SQLModel.metadata.create_all(engine)
```

Call `init_db()` during app startup.

## 3) Flow CRUD router — `backend/api/flows.py`

```python
from fastapi import APIRouter, HTTPException
from sqlmodel import Session
from backend.db import engine
from backend.models.flow import Flow

router = APIRouter(prefix="/v1/flows", tags=["flows"])

@router.post("", response_model=Flow)
def create_flow(flow: Flow):
    with Session(engine) as s:
        if not flow.id:
            import uuid; flow.id = f"flow_{uuid.uuid4().hex[:8]}"
        s.add(flow); s.commit(); s.refresh(flow)
        return flow

@router.get("/{flow_id}", response_model=Flow)
def get_flow(flow_id: str):
    with Session(engine) as s:
        obj = s.get(Flow, flow_id)
        if not obj: raise HTTPException(404, "Flow not found")
        return obj

@router.patch("/{flow_id}", response_model=Flow)
def patch_flow(flow_id: str, patch: Flow):
    with Session(engine) as s:
        obj = s.get(Flow, flow_id)
        if not obj: raise HTTPException(404, "Flow not found")
        if patch.name: obj.name = patch.name
        if patch.nodes is not None: obj.nodes = patch.nodes
        if patch.edges is not None: obj.edges = patch.edges
        obj.version += 1
        s.add(obj); s.commit(); s.refresh(obj)
        return obj
```

## 4) Flow Session runtime — `backend/services/flows_runtime.py`

```python
from __future__ import annotations
import asyncio, time, uuid
from typing import Dict, Any, AsyncGenerator, Optional
from backend.models.flow import Flow
from backend.api.sessions import session_manager   # your existing SessionManager
from backend.memory.store import get_agent         # your agent loader

def ev(t, **k): k["type"]=t; k["ts"]=time.time(); return k

class FlowSession:
    def __init__(self, flow: Flow, flow_session_id: str):
        self.flow = flow
        self.id = flow_session_id
        self.active_node_id: Optional[str] = None
        self._current_session_id: Optional[str] = None
        self._q: asyncio.Queue = asyncio.Queue()
        self._closed = False

    async def start(self, entry_node_id: Optional[str] = None):
        node = next((n for n in self.flow.nodes if n.id == (entry_node_id or self.flow.nodes[0].id)), None)
        if not node: raise ValueError("entry node not found")
        await self._start_node(node.id)
        await self._q.put(ev("flow.started", flowSessionId=self.id, nodeId=node.id))

    async def _start_node(self, node_id: str):
        node = next(n for n in self.flow.nodes if n.id == node_id)
        agent = get_agent(node.agentId)
        if not agent: raise ValueError("agent not found")
        sid = f"s_{self.id}_{node_id}_{uuid.uuid4().hex[:6]}"
        s = session_manager.spawn(sid, agent.to_card() if hasattr(agent, "to_card") else agent)
        self._current_session_id = sid
        self.active_node_id = node_id

        async def pipe():
            async for e in session_manager.events(sid):
                e["nodeId"] = node_id
                await self._q.put(e)
        asyncio.create_task(pipe())

    async def route(self, to_node_id: str, reason: str = "manual"):
        if self._current_session_id:
            await session_manager.close(self._current_session_id)
        await self._q.put(ev("route", flowSessionId=self.id, fromNodeId=self.active_node_id, toNodeId=to_node_id, reason=reason))
        await self._start_node(to_node_id)

    async def stream(self) -> AsyncGenerator[Dict[str,Any], None]:
        while not self._closed:
            yield await self._q.get()

    async def close(self):
        self._closed = True
        if self._current_session_id:
            await session_manager.close(self._current_session_id)

class FlowSessionManager:
    def __init__(self):
        self.sessions: Dict[str, FlowSession] = {}

    def spawn(self, flow: Flow) -> FlowSession:
        fsid = f"fls_{uuid.uuid4().hex[:8]}"
        fs = FlowSession(flow, fsid)
        self.sessions[fsid] = fs
        return fs

flow_sessions = FlowSessionManager()
```

## 5) Flow runtime router — `backend/api/flows_runtime.py`

```python
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import Session
from backend.db import engine
from backend.models.flow import Flow
from backend.services.flows_runtime import flow_sessions

router = APIRouter(prefix="/v1/flows", tags=["flows-runtime"])

@router.post("/{flow_id}/sessions")
async def start_flow_session(flow_id: str, body: dict = {}):
    with Session(engine) as s:
        flow = s.get(Flow, flow_id)
        if not flow: raise HTTPException(404, "Flow not found")
    fs = flow_sessions.spawn(flow)
    await fs.start(body.get("entryNodeId"))
    return {"flowSessionId": fs.id, "activeNodeId": fs.active_node_id}

@router.websocket("/sessions/{flow_session_id}/events")
async def ws_flow_events(ws: WebSocket, flow_session_id: str):
    await ws.accept()
    fs = flow_sessions.sessions.get(flow_session_id)
    if not fs:
        await ws.send_json({"type":"error","message":"flow session not found"})
        await ws.close(); return
    try:
        async for e in fs.stream():
            await ws.send_json(e)
    except WebSocketDisconnect:
        return

@router.post("/sessions/{flow_session_id}/route")
async def route_flow(flow_session_id: str, body: dict):
    fs = flow_sessions.sessions.get(flow_session_id)
    if not fs: raise HTTPException(404, "flow session not found")
    to_node = body.get("toNodeId")
    if not to_node: raise HTTPException(400, "toNodeId required")
    await fs.route(to_node, reason=body.get("reason","manual"))
    return {"ok": True}
```

## 6) App wiring — `backend/app.py`

```python
from fastapi import FastAPI
from backend.db import init_db
from backend.api.flows import router as flows_router
from backend.api.flows_runtime import router as flows_runtime_router
# (your existing routers: agents, sessions, voice, health…)

app = FastAPI()
init_db()
app.include_router(flows_router)
app.include_router(flows_runtime_router)
```

> No changes to your Pipecat duplex code. We just **compose** it.

---

# Frontend (ReactFlow) — route across nodes

Assuming your **Flow Builder** lives in `frontend/interactive-studio`.

## 1) Minimal API helpers — `src/lib/flowApi.ts`

```ts
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function createFlow(flow:any){ return fetch(`${API}/v1/flows`, {method:"POST", headers:{'Content-Type':'application/json'}, body:JSON.stringify(flow)}).then(r=>r.json()); }
export async function getFlow(id:string){ return fetch(`${API}/v1/flows/${id}`).then(r=>r.json()); }
export async function patchFlow(id:string, flow:any){ return fetch(`${API}/v1/flows/${id}`, {method:"PATCH", headers:{'Content-Type':'application/json'}, body:JSON.stringify(flow)}).then(r=>r.json()); }

export async function startFlowSession(flowId:string, entryNodeId?:string){
  return fetch(`${API}/v1/flows/${flowId}/sessions`, {method:"POST", headers:{'Content-Type':'application/json'}, body:JSON.stringify({entryNodeId})}).then(r=>r.json());
}

export function openFlowEvents(flowSessionId:string){
  const wsUrl = (API.startsWith("https") ? API.replace("https","wss") : API.replace("http","ws")) + `/v1/flows/sessions/${flowSessionId}/events`;
  return new WebSocket(wsUrl);
}

export async function routeFlow(flowSessionId:string, toNodeId:string, reason?:string){
  return fetch(`${API}/v1/flows/sessions/${flowSessionId}/route`, {method:"POST", headers:{'Content-Type':'application/json'}, body:JSON.stringify({toNodeId, reason})}).then(r=>r.json());
}
```

## 2) UI bindings (high level)

* **Save Flow**: serialize ReactFlow nodes/edges to server Flow schema (include `ui: {x,y}` from `node.position`).
* **Test Flow**:

  1. `startFlowSession(flowId)` → `{ flowSessionId, activeNodeId }`
  2. `openFlowEvents(flowSessionId)` → ws.onmessage:

     * If `event.nodeId` is present, **highlight that node** (add “Active” pulse).
     * Render transcripts/persona updates in your right Voice panel.
  3. Optional **manual route** button in the UI → `routeFlow(flowSessionId, toNodeId)`.

> You can still keep **Test Agent ⚡** per node using your old `/v1/sessions` when needed. The **Test Flow** button is the new multi-agent route.

---

# Event shape (frontend)

The WS emits your existing events, plus `nodeId` attribution when in a flow:

```json
{ "type":"flow.started","ts":1730.22,"flowSessionId":"fls_abc123","nodeId":"node_1" }
{ "type":"speech.final","ts":1730.87,"nodeId":"node_1","from_":"user","text":"transfer me to sales" }
{ "type":"agent.speech","ts":1731.12,"nodeId":"node_1","text":"Sure—handing you to Sales." }
{ "type":"route","ts":1731.20,"fromNodeId":"node_1","toNodeId":"node_2","reason":"intent:sales" }
{ "type":"session.started","ts":1731.30,"nodeId":"node_2" }
{ "type":"agent.speech","ts":1731.40,"nodeId":"node_2","text":"Hi, Sales here! How can I help?" }
```

---

# Acceptance checks

**Backend**

* `POST /v1/flows` → returns `{id, nodes, edges}`
* `GET /v1/flows/{id}` → retrieves the same
* `POST /v1/flows/{id}/sessions` → returns `{flowSessionId, activeNodeId}`
* `WS /v1/flows/sessions/{id}/events` → emits `flow.started` then regular events with `nodeId`
* `POST /v1/flows/sessions/{id}/route {toNodeId}` → WS emits `route` then `session.started` for the new node

**Frontend**

* Canvas loads/saves flows
* **Test Flow** highlights the active node and streams conversation
* Manual **Route** switches the active node and the right panel follows

---

# Notes & next steps (optional)

* **Edge conditions**: today we allow manual routing. Add a tiny evaluator (keywords/intent) to auto-route from `speech.final`.
* **Parallel nodes**: possible by running multiple Pipecat sessions and mixing audio—but not needed for the hackathon.
* **Auth**: keep JWT from the browser; add HMAC between gateway↔Python later if you put ASP.NET in front.

If you want, I can add the **keyword intent evaluator** (5 lines) that listens for words like “sales”, “support”, etc., and triggers `route()` automatically on `speech.final`.
