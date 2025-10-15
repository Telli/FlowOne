---

# Monorepo layout

```
flowone/
├─ backend/
│  ├─ app.py
│  ├─ api/
│  │  ├─ agents.py
│  │  ├─ sessions.py
│  │  └─ voice.py
│  ├─ services/
│  │  ├─ pipecat_runtime.py
│  │  ├─ gemini_live.py
│  │  └─ gemini_flash.py
│  ├─ memory/
│  │  ├─ store.py
│  │  └─ embeddings.py
│  ├─ observability/
│  │  └─ langfuse.py
│  ├─ settings.py
│  └─ requirements.txt
├─ frontend/
│  ├─ voice-studio/
│  │  ├─ index.html
│  │  ├─ vite.config.ts
│  │  ├─ package.json
│  │  └─ src/
│  │     ├─ App.tsx
│  │     ├─ main.tsx
│  │     ├─ components/
│  │     │  ├─ VoiceConsole.tsx
│  │     │  ├─ TranscriptPanel.tsx
│  │     │  └─ PersonaChips.tsx
│  │     └─ lib/pipecatClient.ts
│  └─ interactive-studio/
│     ├─ index.html
│     ├─ vite.config.ts
│     ├─ package.json
│     └─ src/
│        ├─ App.tsx
│        ├─ main.tsx
│        ├─ modules/configure/PersonaPanel.tsx
│        └─ modules/test/TestConsole.tsx
├─ packages/
│  └─ agent-schema/
│     ├─ package.json
│     └─ src/index.ts
├─ ops/
│  ├─ docker-compose.yml
│  ├─ Dockerfile.api
│  └─ Dockerfile.ui
├─ .env.example
└─ README.md
```

---

## Backend

### `backend/requirements.txt`

```
fastapi
uvicorn[standard]
python-dotenv
pydantic-settings
sqlmodel
faiss-cpu
httpx
websockets
langfuse
```

### `backend/settings.py`

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DAILY_API_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    DATABASE_URL: str = "sqlite:///./flowone.db"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### `backend/app.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.settings import get_settings
from backend.api import agents, sessions, voice

app = FastAPI(title="FlowOne API", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])
```

### `backend/api/agents.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from backend.memory.store import get_engine, Agent, create_db, upsert_agent, get_agent
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

@router.post("", response_model=dict)
def create_agent(body: CreateAgentRequest):
    # Use Gemini Flash to draft a clean Agent Card JSON
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
```

### `backend/api/sessions.py`

```python
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from backend.memory.store import get_agent, create_session
from backend.services.pipecat_runtime import SessionManager

router = APIRouter()
session_manager = SessionManager()

class CreateSessionRequest(BaseModel):
    agentId: str

@router.post("")
def create_session_ep(body: CreateSessionRequest):
    agent = get_agent(body.agentId)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    session_id = create_session(body.agentId)
    session_manager.spawn(session_id, agent.to_card())
    return {"sessionId": session_id}

@router.websocket("/{session_id}/events")
async def ws_events(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        async for event in session_manager.events(session_id):
            await ws.send_json(event)
    except WebSocketDisconnect:
        session_manager.close(session_id)
```

### `backend/api/voice.py`

```python
from fastapi import APIRouter
# For hackathon: return a mock ephemeral Daily token; replace with real call.
router = APIRouter()

@router.get("/tokens")
def create_daily_token():
    # TODO: call Daily REST to create room + token using DAILY_API_KEY
    return {"room": "demo-room", "token": "mock-ephemeral-token"}
```

### `backend/services/pipecat_runtime.py`

```python
import asyncio
from typing import AsyncGenerator, Dict, Any

# Thin abstraction to hide Pipecat setup.
# In real code, import and wire:
# from pipecat.server import PipecatServer
# from pipecat.services.google import GoogleLLMService, GeminiLiveLLMService

class Session:
    def __init__(self, session_id: str, agent_card: Dict[str, Any]):
        self.id = session_id
        self.agent = agent_card
        self.queue: asyncio.Queue = asyncio.Queue()
        # TODO: init Pipecat pipeline, bind Gemini Live (speech) + Flash (text)

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        # Forward transcript chunks, persona updates, memory hits, metrics
        while True:
            ev = await self.queue.get()
            yield ev

    def close(self):
        # TODO: tear down audio/rtc pipeline
        pass

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def spawn(self, session_id: str, agent_card: Dict[str, Any]):
        self.sessions[session_id] = Session(session_id, agent_card)
        # Push a synthetic startup event (useful for UI wiring)
        asyncio.create_task(self.sessions[session_id].queue.put({
            "type": "session.started",
            "sessionId": session_id,
            "persona": agent_card.get("persona", {}),
        }))

    async def events(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            # Yield an error then stop
            yield {"type": "error", "message": "session not found"}
            return
        async for ev in session.stream_events():
            yield ev

    def close(self, session_id: str):
        if s := self.sessions.pop(session_id, None):
            s.close()
```

### `backend/services/gemini_flash.py`

```python
from typing import Dict, List

# Placeholder: call Gemini 2.5 Flash with a structured prompt to get JSON.
# For hackathon day-1, stub a deterministic schema; then replace with real call.

def synthesize_agent_card(name: str, role: str, goals: List[str], tone: str) -> Dict:
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
        "routing": {"policies": [{"on": "user_request", "adapt": ["concise"]}]}
    }
```

### `backend/services/gemini_live.py`

```python
# Stub for Gemini Live (speech↔speech) integration.
# Real implementation: open bidirectional audio stream via Pipecat,
# map transcripts to events, push persona updates, etc.

class GeminiLiveClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def run_duplex(self, session_id: str):
        # TODO: implement streaming loop
        pass
```

### `backend/memory/store.py`

```python
from sqlmodel import SQLModel, Field, Session, create_engine, select
from typing import Optional, Dict, Any
import json
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
```

### `backend/memory/embeddings.py`

```python
# Optional (stretch): FAISS vector store helpers (add docs, search).
# Keep minimal during hackathon unless needed for a demo.
```

### `backend/observability/langfuse.py`

```python
from langfuse import Langfuse
from backend.settings import get_settings

settings = get_settings()
lf = Langfuse(
    public_key=settings.LANGFUSE_PUBLIC_KEY or None,
    secret_key=settings.LANGFUSE_SECRET_KEY or None,
    host=settings.LANGFUSE_HOST
)

def trace_event(name: str, **kwargs):
    try:
        lf.event(name=name, metadata=kwargs)
    except Exception:
        # Fail open: tracing should never break demo
        pass
```

---

## TypeScript shared types

### `packages/agent-schema/package.json`

```json
{
  "name": "@flowone/agent-schema",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "devDependencies": { "typescript": "^5.6.2" }
}
```

### `packages/agent-schema/src/index.ts`

```ts
export interface AgentStyle {
  max_words?: number;
  acknowledge_first?: boolean;
}

export interface AgentPersona {
  role: string;
  goals: string[];
  tone: "neutral" | "friendly" | "expert" | string;
  style?: AgentStyle;
}

export interface AgentRoutingPolicy {
  on: string;           // e.g. "user_request"
  adapt: string[];      // e.g. ["concise", "encourage"]
}

export interface AgentCard {
  id: string;
  name: string;
  persona: AgentPersona;
  tools: any[];
  memory: { summaries: string[]; vectors: any[] };
  routing?: { policies: AgentRoutingPolicy[] };
}
```

---

## Frontend — Voice Studio (React + Vite)

### `frontend/voice-studio/package.json`

```json
{
  "name": "flowone-voice-studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "@flowone/agent-schema": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": { "typescript": "^5.6.2", "vite": "^5.4.0", "@types/react": "^18.2.46", "@types/react-dom": "^18.2.18" }
}
```

### `frontend/voice-studio/src/App.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import VoiceConsole from "./components/VoiceConsole";
import TranscriptPanel from "./components/TranscriptPanel";
import PersonaChips from "./components/PersonaChips";

export default function App() {
  const [sessionId, setSessionId] = useState<string>("");
  const [events, setEvents] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(`${import.meta.env.VITE_API_WS}/sessions/${sessionId}/events`);
    wsRef.current = ws;
    ws.onmessage = (msg) => setEvents((prev) => [...prev, JSON.parse(msg.data)]);
    ws.onclose = () => (wsRef.current = null);
    return () => ws.close();
  }, [sessionId]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">FlowOne Voice</h1>
        <div className="text-sm opacity-70">Session: {sessionId || "—"}</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VoiceConsole onSessionCreated={setSessionId} />
        <TranscriptPanel events={events} />
      </div>

      <footer className="mt-4">
        <PersonaChips events={events} />
        <div className="mt-3">
          <button className="px-3 py-2 rounded border">Export Agent Card</button>
        </div>
      </footer>
    </div>
  );
}
```

### `frontend/voice-studio/src/components/VoiceConsole.tsx`

```tsx
import { useState } from "react";

export default function VoiceConsole({ onSessionCreated }: { onSessionCreated: (id: string)=>void }) {
  const [agentId, setAgentId] = useState("agent_fitness_coach");
  const [joining, setJoining] = useState(false);

  async function start() {
    setJoining(true);
    // 1) Ensure agent exists (demo assumes seeded)
    // 2) Create session
    const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId })
    });
    const json = await res.json();
    onSessionCreated(json.sessionId);
    // 3) (Stretch) fetch /voice/tokens and join Daily room
    setJoining(false);
  }

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Voice Console</h2>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm">Agent ID</label>
          <input value={agentId} onChange={e=>setAgentId(e.target.value)} className="w-full border rounded p-2"/>
        </div>
        <button onClick={start} disabled={joining} className="px-4 py-2 rounded bg-black text-white">
          {joining ? "Starting…" : "Start Session"}
        </button>
      </div>
      <div className="mt-3 text-sm opacity-60">Waveform + Push-to-Talk (stretch)</div>
    </div>
  );
}
```

### `frontend/voice-studio/src/components/TranscriptPanel.tsx`

```tsx
export default function TranscriptPanel({ events }: { events: any[] }) {
  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Live Transcript</h2>
      <div className="h-72 overflow-auto space-y-2 text-sm">
        {events.map((e, i) => (
          <div key={i} className="p-2 rounded bg-gray-50">
            <code className="text-xs">{e.type}</code>
            {"persona" in e && <div className="mt-1">Persona updated</div>}
            {"text" in e && <div>{e.text}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `frontend/voice-studio/src/components/PersonaChips.tsx`

```tsx
export default function PersonaChips({ events }: { events: any[] }) {
  const lastPersona = [...events].reverse().find(e => e.persona)?.persona;
  const chips = lastPersona ? [
    lastPersona.tone || "neutral",
    ...(lastPersona.goals || []).slice(0, 3)
  ] : [];

  return (
    <div className="rounded-xl border p-3">
      <h3 className="text-sm font-medium mb-2">Persona</h3>
      <div className="flex gap-2">
        {chips.map((c: string, i: number) => (
          <span key={i} className="px-2 py-1 text-xs rounded-full border">{c}</span>
        ))}
        {chips.length === 0 && <span className="text-xs opacity-60">No persona data yet</span>}
      </div>
    </div>
  );
}
```

---

## Frontend — Interactive Studio (React + Vite)

### `frontend/interactive-studio/src/App.tsx`

```tsx
import { useState } from "react";

export default function App() {
  const [tab, setTab] = useState<"configure"|"test">("configure");
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">FlowOne Studio</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab("configure")} className={`px-3 py-1 rounded ${tab==="configure"?"bg-black text-white":"border"}`}>Configure</button>
          <button onClick={() => setTab("test")} className={`px-3 py-1 rounded ${tab==="test"?"bg-black text-white":"border"}`}>Test</button>
        </div>
      </header>

      {tab === "configure" ? <Configure /> : <Test />}
    </div>
  );
}

function Configure() {
  const [name, setName] = useState("Fitness Coach");
  const [role, setRole] = useState("You are a concise fitness coach that tailors workouts.");
  const [goals, setGoals] = useState("motivate,10k-steps,weekly-plan");
  const [tone, setTone] = useState("friendly");
  const [agent, setAgent] = useState<any>(null);

  async function createAgent() {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/agents`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name, role, goals: goals.split(",").map(s=>s.trim()), tone })
    });
    const json = await res.json();
    setAgent(json.agent);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">Agent Settings</h2>
        <label className="text-sm">Name</label>
        <input className="w-full border rounded p-2 mb-2" value={name} onChange={e=>setName(e.target.value)} />
        <label className="text-sm">Role</label>
        <textarea className="w-full border rounded p-2 mb-2" value={role} onChange={e=>setRole(e.target.value)} />
        <label className="text-sm">Goals (comma-separated)</label>
        <input className="w-full border rounded p-2 mb-2" value={goals} onChange={e=>setGoals(e.target.value)} />
        <label className="text-sm">Tone</label>
        <input className="w-full border rounded p-2 mb-4" value={tone} onChange={e=>setTone(e.target.value)} />
        <button onClick={createAgent} className="px-4 py-2 rounded bg-black text-white">Generate Agent</button>
      </div>
      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">Persona Preview</h2>
        <pre className="text-xs overflow-auto h-80">{agent ? JSON.stringify(agent, null, 2) : "—"}</pre>
      </div>
    </div>
  );
}

function Test() {
  const [agentId, setAgentId] = useState("agent_fitness_coach");
  const [sessionId, setSessionId] = useState<string>("");

  async function start() {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ agentId })
    });
    const json = await res.json();
    setSessionId(json.sessionId);
  }

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Test Session</h2>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm">Agent ID</label>
          <input value={agentId} onChange={e=>setAgentId(e.target.value)} className="w-full border rounded p-2"/>
        </div>
        <button onClick={start} className="px-4 py-2 rounded bg-black text-white">Start Session</button>
      </div>
      <div className="mt-2 text-sm opacity-70">Session: {sessionId || "—"}</div>
    </div>
  );
}
```

---

## Ops / Env

### `.env.example`

```
GEMINI_API_KEY=
DAILY_API_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
DATABASE_URL=sqlite:///./flowone.db
```

### `ops/docker-compose.yml`

```yaml
version: "3.9"
services:
  api:
    build:
      context: ..
      dockerfile: ops/Dockerfile.api
    env_file: ../.env
    ports: ["8000:8000"]
  voice-studio:
    build:
      context: ../frontend/voice-studio
      dockerfile: ../../ops/Dockerfile.ui
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_API_WS=ws://localhost:8000
    ports: ["5173:5173"]
  interactive-studio:
    build:
      context: ../frontend/interactive-studio
      dockerfile: ../../ops/Dockerfile.ui
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_API_WS=ws://localhost:8000
    ports: ["5174:5173"]
```

### `ops/Dockerfile.api`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend /app/backend
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `ops/Dockerfile.ui`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm i -g pnpm || true
COPY . .
RUN pnpm i || npm i
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## README (key bits)

* **Run backend**: `uvicorn backend.app:app --reload --port 8000`
* **Env**: copy `.env.example` → `.env` and fill keys.
* **Run UIs**: in each frontend folder → `npm i && npm run dev` (set `VITE_API_URL`, `VITE_API_WS`).
* **Submission**: record a 90s video showing both studios using the *same* agent + session.

---

