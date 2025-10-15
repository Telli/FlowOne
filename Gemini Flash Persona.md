Awesome — I’ll drop in two things you asked for so Codex can finish the build cleanly:

1. **A production-ready Gemini Flash persona synthesis module** (with schema, validation, retries)
2. **A Push-to-Talk / simple VAD utility + Daily join helper** for the Voice Studio UI

I’ll also note any **requirements** and **exact file paths** so Codex knows where to put everything.

---

# 1) Gemini Flash Persona Synthesis (replace stub)

**Add dependency** to `backend/requirements.txt`:

```
google-generativeai
```

**Replace** `backend/services/gemini_flash.py` with this:

```python
# backend/services/gemini_flash.py
from __future__ import annotations
from typing import Dict, List, Optional
import os, json, time
from pydantic import BaseModel, Field, ValidationError
from backend.settings import get_settings

# SDK
import google.generativeai as genai

settings = get_settings()
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# ---------- Schema ----------

class AgentStyle(BaseModel):
    max_words: Optional[int] = Field(default=120, ge=10, le=500)
    acknowledge_first: Optional[bool] = True

class AgentPersona(BaseModel):
    role: str
    goals: List[str] = Field(default_factory=list)
    tone: str = "neutral"
    style: Optional[AgentStyle] = None

class AgentRoutingPolicy(BaseModel):
    on: str = "user_request"
    adapt: List[str] = Field(default_factory=list)

class AgentMemory(BaseModel):
    summaries: List[str] = Field(default_factory=list)
    vectors: List[Dict] = Field(default_factory=list)

class AgentCard(BaseModel):
    id: str
    name: str
    persona: AgentPersona
    tools: List[Dict] = Field(default_factory=list)
    memory: AgentMemory = Field(default_factory=AgentMemory)
    routing: Optional[Dict] = None

# ---------- Prompt ----------

SYSTEM_JSON_SPEC = """\
You produce STRICT JSON that conforms to this schema (no prose, no markdown):

{
  "id": "string: lowercase snake_case identifier; derive from name",
  "name": "string: short display name",
  "persona": {
    "role": "string: 1-2 sentences describing the assistant's role",
    "goals": ["string", "..."],
    "tone": "string: neutral|friendly|expert|concise or custom",
    "style": {
      "max_words": 120,
      "acknowledge_first": true
    }
  },
  "tools": [],
  "memory": { "summaries": [], "vectors": [] },
  "routing": { "policies": [ { "on": "user_request", "adapt": ["concise"] } ] }
}
Return ONLY valid JSON.
"""

USER_TEMPLATE = """\
Create an AgentCard JSON for:
- Name: {name}
- Role: {role}
- Goals: {goals}
- Tone: {tone}

Constraints:
- “id” must be lowercase snake_case derived from the name (e.g., "Fitness Coach" -> "fitness_coach").
- Keep persona.role to 1–2 sentences.
- goals: deduplicate, max 6, concise verbs.
- style.max_words default 120 unless user goals require longer.
- Prefer tone="{tone}", else choose closest category.
"""

# ---------- Implementation ----------

def _fallback_card(name: str, role: str, goals: List[str], tone: str) -> Dict:
    # Deterministic fallback when no API key or API error
    norm_id = "agent_" + name.lower().replace(" ", "_")
    return AgentCard(
        id=norm_id,
        name=name,
        persona=AgentPersona(
            role=role,
            goals=list(dict.fromkeys([g.strip() for g in goals if g.strip()])),
            tone=tone,
            style=AgentStyle(max_words=120, acknowledge_first=True),
        ),
        tools=[],
        memory=AgentMemory(),
        routing={"policies":[{"on":"user_request","adapt":["concise"]}]}
    ).model_dump()

def synthesize_agent_card(name: str, role: str, goals: List[str], tone: str) -> Dict:
    """
    Calls Gemini 2.5 Flash to produce a validated AgentCard JSON.
    Falls back to deterministic schema if API is unavailable.
    """
    if not settings.GEMINI_API_KEY:
        return _fallback_card(name, role, goals, tone)

    model = genai.GenerativeModel("gemini-2.5-flash")
    user = USER_TEMPLATE.format(name=name, role=role, goals=", ".join(goals), tone=tone)

    # Up to 3 retries with simple backoff + strict JSON validation
    last_error = None
    for i in range(3):
        try:
            resp = model.generate_content(
                [{"role":"system","parts":[SYSTEM_JSON_SPEC]},
                 {"role":"user","parts":[user]}],
                generation_config={"response_mime_type":"application/json"}
            )
            raw = resp.text or (resp.candidates and resp.candidates[0].content.parts[0].text) or ""
            data = json.loads(raw)

            # Validate
            card = AgentCard.model_validate(data)
            # Normalize id
            if not card.id:
                card.id = "agent_" + card.name.lower().replace(" ", "_")
            return card.model_dump()
        except Exception as e:
            last_error = e
            time.sleep(0.6 * (i+1))
            continue

    # Fallback if all retries fail
    return _fallback_card(name, role, goals, tone)
```

> This module enforces a **strict JSON schema**, does **3 retries**, validates with **Pydantic**, and falls back deterministically if Gemini is unavailable. It preserves your previous `synthesize_agent_card(...)` signature, so the rest of your code stays unchanged.

---

# 2) Push-to-Talk / Simple VAD + Daily Join Helpers

**Add dependency** to the **voice-studio** app:

```
npm i @daily-co/daily-js
```

### A) Daily join helper

Create `frontend/voice-studio/src/lib/dailyClient.ts`:

```ts
// frontend/voice-studio/src/lib/dailyClient.ts
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

export type DailyJoinInfo = { call: DailyCall };

export async function joinDailyRoom(roomUrlOrName: string, token?: string): Promise<DailyJoinInfo> {
  const call = DailyIframe.createCallObject({
    subscribeToTracksAutomatically: true,
    dailyConfig: { experimentalChromeVideoMuteLightOff: true }
  });

  // If your backend returns only a room name, replace with your Daily domain:
  const url = roomUrlOrName.startsWith("http")
    ? roomUrlOrName
    : `https://YOUR-DAILY-SUBDOMAIN.daily.co/${roomUrlOrName}`;

  await call.join({ url, token }).catch((err) => {
    console.warn("Daily join failed:", err?.message);
    throw err;
  });

  return { call };
}

export async function leaveDaily(call: DailyCall | null) {
  if (!call) return;
  try { await call.leave(); } catch {}
  call.destroy();
}
```

> Replace `YOUR-DAILY-SUBDOMAIN` with your subdomain once you have it (Codex can set an `.env` value and feed it in).

---

### B) Push-to-Talk + simple VAD utility

Create `frontend/voice-studio/src/lib/ptt.ts`:

```ts
// frontend/voice-studio/src/lib/ptt.ts
// Simple Push-to-Talk (PTT) and naive VAD based on RMS energy.
// Not production-grade VAD, but great for a hackathon demo.

export type PTTHandle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
  isActive: () => boolean;
  rms: () => number;
  destroy: () => void;
};

export async function createPTT(stream?: MediaStream): Promise<PTTHandle> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const srcStream = stream || await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const source = ctx.createMediaStreamSource(srcStream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  const data = new Uint8Array(analyser.fftSize);

  source.connect(analyser);
  let active = false;
  let lastRms = 0;

  function computeRMS() {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128; // [-1,1]
      sum += v * v;
    }
    lastRms = Math.sqrt(sum / data.length);
    return lastRms;
  }

  async function start() {
    if (ctx.state === "suspended") await ctx.resume();
    active = true;
  }
  async function stop() { active = false; }
  async function toggle() { return active ? stop() : start(); }

  const interval = setInterval(() => { computeRMS(); }, 100);

  return {
    start, stop, toggle,
    isActive: () => active,
    rms: () => lastRms,
    destroy: () => { clearInterval(interval); ctx.close(); srcStream.getTracks().forEach(t => t.stop()); }
  };
}

// A naïve VAD helper you can use to auto-trigger PTT if you want:
export function shouldTransmit(rms: number, threshold = 0.08, hangMs = 350) {
  // Example threshold; tune empirically. Use hang time to avoid choppiness.
  return rms > threshold;
}
```

---

### C) Wire into **VoiceConsole** (replace current component)

Replace `frontend/voice-studio/src/components/VoiceConsole.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import { joinDailyRoom, leaveDaily } from "../lib/dailyClient";
import { createPTT, shouldTransmit } from "../lib/ptt";

export default function VoiceConsole({ onSessionCreated }: { onSessionCreated: (id: string)=>void }) {
  const [agentId, setAgentId] = useState("agent_fitness_coach");
  const [room, setRoom] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [transmitting, setTransmitting] = useState(false);

  const callRef = useRef<any>(null);
  const pttRef = useRef<any>(null);
  const rmsRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (pttRef.current) pttRef.current.destroy();
      leaveDaily(callRef.current);
    };
  }, []);

  async function startAll() {
    setJoining(true);

    // 1) Create session
    const sres = await fetch(`${import.meta.env.VITE_API_URL}/sessions`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ agentId })
    });
    const sjson = await sres.json();
    onSessionCreated(sjson.sessionId);

    // 2) Get Daily token
    const tres = await fetch(`${import.meta.env.VITE_API_URL}/voice/tokens`);
    const tjson = await tres.json();
    setRoom(tjson.room); setToken(tjson.token);

    // 3) Join Daily
    const { call } = await joinDailyRoom(tjson.room, tjson.token);
    callRef.current = call;

    // 4) Init PTT/VAD
    pttRef.current = await createPTT();
    loopVAD();

    setJoining(false);
  }

  function loopVAD() {
    const step = () => {
      const rms = pttRef.current?.rms() ?? 0;
      rmsRef.current = rms;

      // Simple auto-PTT example (optional): transmit only if above threshold
      const speak = shouldTransmit(rms, 0.08);
      if (speak && !transmitting) {
        setTransmitting(true);
        pttRef.current.start();
        // TODO: Hook mic frames into Pipecat upstream (when wired)
      } else if (!speak && transmitting) {
        setTransmitting(false);
        pttRef.current.stop();
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function togglePTT() {
    pttRef.current?.toggle().then(() => setTransmitting(pttRef.current.isActive()));
  }

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Voice Console</h2>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-sm">Agent ID</label>
          <input value={agentId} onChange={e=>setAgentId(e.target.value)} className="w-full border rounded p-2"/>
        </div>
        <button onClick={startAll} disabled={joining} className="px-4 py-2 rounded bg-black text-white">
          {joining ? "Starting…" : "Start"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={togglePTT} className={`px-3 py-2 rounded ${transmitting ? "bg-green-600 text-white" : "border"}`}>
          {transmitting ? "Speaking…" : "Push to Talk"}
        </button>
        <div className="text-xs opacity-70">Room: {room || "—"}</div>
        <div className="text-xs opacity-70">RMS: {rmsRef.current.toFixed(3)}</div>
      </div>

      <p className="text-xs opacity-60 mt-2">
        Tip: Auto-PTT is enabled via VAD. You can disable it by removing the shouldTransmit() check and using the button only.
      </p>
    </div>
  );
}
```

> This gives you a **usable PTT button** with a **naïve VAD loop** you can tune. It doesn’t yet pipe raw audio frames into Pipecat (that’s server-side), but it sets up the interaction model and UX while you wire the backend duplex loop.

---

## Bonus: tiny README snippet for Codex to print at the end

Add to the Codex RUN GUIDE:

```
# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
export GEMINI_API_KEY=... DAILY_API_KEY=... LANGFUSE_PUBLIC_KEY=... LANGFUSE_SECRET_KEY=...
uvicorn backend.app:app --reload --port 8000

# Voice Studio
cd frontend/voice-studio
npm i
npm run dev
# .env in this folder (or vite env variables) should include:
# VITE_API_URL=http://localhost:8000
# VITE_API_WS=ws://localhost:8000

# Interactive Studio
cd ../interactive-studio
npm i
npm run dev
```

---

Awesome—here’s the **Pipecat duplex loop skeleton** you asked for, plus exact **wiring points** for Gemini Live, Daily, and your WS event stream. Drop these in as-is; Codex can fill TODOs.

---

# 1) `backend/services/pipecat_runtime.py` (Duplex runtime skeleton)

```python
# backend/services/pipecat_runtime.py
from __future__ import annotations
import asyncio, base64, time
from typing import AsyncGenerator, Dict, Any, Optional, Callable

from backend.settings import get_settings
from backend.observability.langfuse import trace_event
from backend.services.gemini_flash import AgentCard  # pydantic model if you export it
from backend.services.gemini_live import GeminiLiveClient
from backend.services.realtime.daily_bot import DailyBot  # (next section)

settings = get_settings()

# -------- Event helpers (normalized) --------
def ev(type_: str, **data) -> Dict[str, Any]:
    data["type"] = type_
    data["ts"] = time.time()
    return data

# -------- Session & Manager --------
class Session:
    """
    Owns:
      - DailyBot (server-side bot that joins Daily room, exposes PCM frames)
      - GeminiLiveClient (speech↔speech)
      - A queue of JSON events for the websocket
    """
    def __init__(self, session_id: str, agent_card: Dict[str, Any]):
        self.id = session_id
        self.agent_card = agent_card
        self.queue: asyncio.Queue = asyncio.Queue()
        self._tasks: list[asyncio.Task] = []
        self._closing = asyncio.Event()
        self.daily: Optional[DailyBot] = None
        self.live: Optional[GeminiLiveClient] = None

    async def start(self, room_name: str, room_token: str):
        # 1) init Daily server-side bot (receive/send audio)
        self.daily = DailyBot(room_name=room_name, token=room_token)
        await self.daily.join()

        # 2) init Gemini Live session (duplex)
        self.live = GeminiLiveClient(api_key=settings.GEMINI_API_KEY, persona=self.agent_card.get("persona", {}))
        await self.live.start()

        # 3) wire pipelines
        self._tasks = [
            asyncio.create_task(self._pump_user_audio_to_live()),
            asyncio.create_task(self._pump_live_events_to_daily()),
            asyncio.create_task(self._heartbeat()),
        ]

        # initial UI event
        await self.queue.put(ev("session.started", sessionId=self.id, persona=self.agent_card.get("persona", {})))

    async def _pump_user_audio_to_live(self):
        """
        From DailyBot → (PCM frames) → GeminiLiveClient
        Also forward interim/final transcripts from STT (if provided by Live)
        """
        assert self.daily and self.live
        async for frame in self.daily.user_pcm_stream():
            # frame: bytes (16-bit PCM, 16kHz mono) – adapt to Live API requirements
            await self.live.send_user_audio(frame)

            # optional: if you implement local VAD, push 'speech.partial' once per chunk
            await self.queue.put(ev("speech.partial", from_="user", text="…", rms=frame_rms(frame)))

        # flush/end-of-stream on hangup
        await self.live.flush_user_audio()

    async def _pump_live_events_to_daily(self):
        """
        From GeminiLiveClient → (agent audio/text events) → DailyBot & WS queue
        """
        assert self.daily and self.live
        async for event in self.live.events():
            t = event.get("type")
            if t == "stt.final":
                await self.queue.put(ev("speech.final", from_="user", text=event["text"]))
                trace_event("speech.final", role="user", text=event["text"])
            elif t == "agent.tts.chunk":
                # Pass audio chunk to Daily (playback in the room)
                # event["pcm"] should be raw PCM; if base64, decode:
                pcm = event["pcm"] if isinstance(event["pcm"], (bytes, bytearray)) else base64.b64decode(event["pcm"])
                await self.daily.play_agent_pcm(pcm)
            elif t == "agent.text":
                await self.queue.put(ev("agent.speech", text=event["text"]))
                trace_event("agent.speech", text=event["text"])
            elif t == "persona.updated":
                await self.queue.put(ev("persona.updated", persona=event["persona"]))
            elif t == "metrics.latency":
                await self.queue.put(ev("metrics.latency", value_ms=event["value_ms"]))
            # Add other Live event mappings here…

    async def _heartbeat(self):
        while not self._closing.is_set():
            await asyncio.sleep(5)
            await self.queue.put(ev("metrics.heartbeat", sessionId=self.id))

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while not self._closing.is_set():
            item = await self.queue.get()
            yield item

    async def close(self):
        if self._closing.is_set(): return
        self._closing.set()
        for t in self._tasks:
            t.cancel()
        if self.live: await self.live.stop()
        if self.daily: await self.daily.leave()

class SessionManager:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    def spawn(self, session_id: str, agent_card: Dict[str, Any]):
        s = Session(session_id, agent_card)
        self.sessions[session_id] = s
        return s

    async def events(self, session_id: str):
        s = self.sessions.get(session_id)
        if not s:
            yield ev("error", message="session not found")
            return
        async for e in s.stream_events():
            yield e

    async def close(self, session_id: str):
        s = self.sessions.pop(session_id, None)
        if s: await s.close()

# --------- tiny util ---------
def frame_rms(frame: bytes) -> float:
    # naive RMS for telemetry; optional
    import array, math
    a = array.array("h", frame)  # 16-bit
    if not a: return 0.0
    return math.sqrt(sum(x*x for x in a) / len(a)) / 32768.0
```

> **How to use in your API flow**
>
> * After `POST /sessions`, call your existing `/voice/tokens` to get `{room, token}`.
> * Then: `await session.start(room, token)` (e.g., inside `create_session_ep`).
> * The WS consumer is unchanged; it just reads from `Session.stream_events()`.

---

# 2) `backend/services/realtime/daily_bot.py` (Daily server “bot” stub)

```python
# backend/services/realtime/daily_bot.py
from __future__ import annotations
from typing import AsyncGenerator
import asyncio

class DailyBot:
    """
    Server-side participant that joins a Daily room.
    In production, use Daily's REST + WebRTC SFU (server SDK / headless).
    For hackathon, this can be a shim that:
      - subscribes to a user's audio track,
      - yields 16kHz mono PCM frames via user_pcm_stream(),
      - accepts agent PCM via play_agent_pcm().
    """
    def __init__(self, room_name: str, token: str):
        self.room = room_name
        self.token = token
        self._pcm_queue: asyncio.Queue = asyncio.Queue()

    async def join(self):
        # TODO: Implement real join using Daily server SDK or a headless browser
        # For day-1: simulate audio input so the pipeline runs
        pass

    async def user_pcm_stream(self) -> AsyncGenerator[bytes, None]:
        """
        Yield user PCM frames captured from Daily.
        Replace this with frames from the subscribed remote audio track.
        """
        while True:
            frame = await self._pcm_queue.get()
            yield frame

    async def push_test_pcm(self, frame: bytes):
        """ Test helper: enqueue a fake PCM frame (useful before wiring Daily). """
        await self._pcm_queue.put(frame)

    async def play_agent_pcm(self, pcm: bytes):
        """
        Send agent audio back into the room (playback to participants).
        Real implementation publishes an outbound audio track.
        """
        # TODO: publish pcm as an Opus frame on an outgoing track
        pass

    async def leave(self):
        # TODO: hang up, release resources
        pass
```

> **Note:** There are multiple ways to implement a server “bot” with Daily (headless Chrome + WebRTC; SFU SDK). For the hackathon, it’s acceptable to **simulate** frames while you finalize the join/publish steps. Your UI can still show event flow.

---

# 3) `backend/services/gemini_live.py` (Gemini Live wrapper skeleton)

```python
# backend/services/gemini_live.py
from __future__ import annotations
import asyncio, base64, time
from typing import AsyncGenerator, Dict, Any, Optional

# If Pipecat exposes a Gemini Live service, you can wrap that here.
# Otherwise, use the official Gemini Live API client when available.

class GeminiLiveClient:
    """
    Sends user audio; receives agent audio/text + transcripts as async events.
    Event shapes yielded by .events():
      - {"type":"stt.final","text": str}
      - {"type":"agent.text","text": str}
      - {"type":"agent.tts.chunk","pcm": bytes|base64str}
      - {"type":"persona.updated","persona": {...}}
      - {"type":"metrics.latency","value_ms": int}
    """
    def __init__(self, api_key: str, persona: Dict[str, Any] | None = None):
        self.api_key = api_key
        self.persona = persona or {}
        self._out_q: asyncio.Queue = asyncio.Queue()
        self._run_task: Optional[asyncio.Task] = None
        self._audio_in_q: asyncio.Queue = asyncio.Queue()
        self._closing = asyncio.Event()

    async def start(self):
        # TODO: open a Live API session and start reading audio/text streams
        self._run_task = asyncio.create_task(self._run())

    async def _run(self):
        """
        Glue loop that:
          - consumes PCM from _audio_in_q and sends to Live
          - reads Live events, pushes normalized events to _out_q
        """
        # For day-1, simulate a reply so the UI lights up:
        await asyncio.sleep(0.5)
        await self._out_q.put({"type":"stt.final","text":"hello from stub"})
        await asyncio.sleep(0.3)
        await self._out_q.put({"type":"agent.text","text":"Hi! I'm your voice agent."})

    async def send_user_audio(self, pcm: bytes):
        # TODO: stream to Live API
        await self._audio_in_q.put(pcm)

    async def flush_user_audio(self):
        # TODO: finalize current utterance if the API supports it
        pass

    async def events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while not self._closing.is_set():
            ev = await self._out_q.get()
            yield ev

    async def stop(self):
        if self._closing.is_set(): return
        self._closing.set()
        if self._run_task:
            self._run_task.cancel()
```

---

# 4) Patch your **Sessions API** to start the runtime

Update `backend/api/sessions.py` so a session **actually starts** (room+token):

```python
# backend/api/sessions.py (replace create_session_ep)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.memory.store import get_agent, create_session
from backend.services.pipecat_runtime import SessionManager
from backend.api.voice import create_daily_token  # reuse the function

router = APIRouter()
session_manager = SessionManager()

class CreateSessionRequest(BaseModel):
    agentId: str

@router.post("")
async def create_session_ep(body: CreateSessionRequest):
    agent = get_agent(body.agentId)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    sid = create_session(body.agentId)
    s = session_manager.spawn(sid, agent.to_card())

    # get Daily room + token and start pipelines
    tok = await create_daily_token()
    await s.start(room_name=tok["room"], room_token=tok["token"])

    return {"sessionId": sid}
```

---

# 5) Frontend note (no code change required here)

Your **Voice Studio** already opens the WS `/sessions/:id/events` and shows events. With the above wiring:

* You should see `session.started` right after `POST /sessions`.
* Then stubbed `stt.final` and `agent.text` appear.
* Once you wire audio, you’ll also see `agent.tts.chunk` (you can visualize a “audio playing…” badge).

---

## What you should give Codex CLI (summary)

* **Files to add**

  * `backend/services/realtime/daily_bot.py` (stub as above)

* **Files to replace/extend**

  * `backend/services/pipecat_runtime.py` (full skeleton above)
  * `backend/services/gemini_live.py` (skeleton above)
  * `backend/api/sessions.py` (`create_session_ep` to call `s.start(room, token)`)

* **Clear TODOs**

  1. Implement Daily server bot join/publish in `DailyBot`.
  2. Implement Gemini Live streaming in `GeminiLiveClient`.
  3. Ensure PCM format matches Gemini Live requirements (e.g., 16kHz mono 16-bit).
  4. Emit normalized events exactly as shown.
  5. Keep stubbed simulated events until audio path is verified.

* **Acceptance checks**

  * `POST /agents` → returns AgentCard
  * `POST /sessions` → WS emits `session.started` then simulated `stt.final` & `agent.text`
  * `/voice/tokens` works with a real Daily API key
  * Voice Studio shows the events; PTT toggles without errors

---

Want me to add a tiny **“mock audio generator”** you can flip on to simulate user speech (so demos run even without Daily wired)? I can drop a `MockMic` that pushes sine/noise frames into the pipeline for early testing.

