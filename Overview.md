Love it — we’ll run a **dual-track build**:

* **Track A:** *FlowOne Voice* (voice-native “Pipecat × Gemini Live” studio)
* **Track B:** *FlowOne Studio* (your original interactive UI for Configure/Test—now upgraded to generate deployable voice agents too)

Below is a compact, submission-ready package: PRD (dual mode), merged architecture, sprint plan, repo layout, and copy-paste prompts for **Code Scaffold (Codex CLI)** and **Figma Make**.

---

# FlowOne Voice + FlowOne Studio (Dual-Mode)

### Gemini × Pipecat Hackathon • Oct 11–19, 2025

## 1) One-liner

> Create, test, and share adaptive voice agents in real time — by **talking** (Voice Studio) or by **configuring** (Interactive Studio) — powered by **Gemini 2.5 Live** + **Pipecat** with memory, tracing, and exportable “Agent Cards”.

## 2) Goals (hackathon scope)

* **Real-time duplex voice** via **Gemini Live API** with **Pipecat** orchestration.
* **Two creation modes** sharing one backend + memory:

  * **Voice Studio**: describe and refine your agent entirely by voice.
  * **Interactive Studio**: edit persona/goals/tools visually (your original FlowOne UX).
* **Adaptive behaviors**: live persona tweaks, goal updates, and memory injection mid-call.
* **Agent Cards**: export JSON schema + shareable link for quick demos.
* **Observability**: **Langfuse** traces (latency, token use, memory hits).

## 3) Merged Architecture (high-level)

```
User (Mic/Browser) ──WebRTC (Daily)──► Pipecat Orchestrator ──► Gemini 2.5 Live (speech↔speech)
         │                                    │
         └────────── REST/WebSocket ◄──────────┘
                 (Configure/Test, state events)

Pipecat Orchestrator ───► Gemini 2.5 Flash (reasoning, schema/JSON, tool calls)
       │
       ├── Memory Store (SQLite/FAISS): persona, goals, examples, vectors
       ├── Langfuse: spans, logs, metrics
       └── Tool Adapters (optional stretch): Tavus/Boundary/Coval
```

**Frontends (two UIs, one backend):**

* **frontend/voice-studio (React + Vite + Daily JS)**: waveform, live transcript, “make it more X” quick actions, persona chips that update live.
* **frontend/interactive-studio (React + Zustand)**: Configure/Test tabs, sliders/chips for tone/safety/tools, prompt composer, session transcript viewer.

## 4) Feature Matrix (MVP vs Stretch)

| Feature                            | Voice Studio | Interactive Studio | Gemini/Pipecat         |
| ---------------------------------- | ------------ | ------------------ | ---------------------- |
| Live duplex convo (low-latency)    | ✅            | ▶ (monitor)        | Gemini Live + Pipecat  |
| Persona synthesis from user intent | ✅            | ✅                  | Gemini Flash           |
| Mid-session persona edits          | ✅ (voice)    | ✅ (UI)             | Pipecat context router |
| Memory recall/trace viewer         | ✅ (panel)    | ✅ (panel)          | Langfuse + logs        |
| Export “Agent Card” (JSON)         | ✅            | ✅                  | Flash schema tool      |
| Shareable demo link                | ✅            | ✅                  | Daily room token       |
| Voice → visual UI generation       | ◻︎ (stretch) | ◻︎ (stretch)       | Flash + image mode     |
| Tool calling (actions)             | ◻︎ (stretch) | ◻︎ (stretch)       | Flash tool calls       |

## 5) 9-Day Sprint Plan

**Day 1–2**

* Monorepo scaffold, Pipecat server up, Gemini Live & Flash keys, Daily test loop.
* Minimal Voice loop (`/sessions/:id/voice`), Langfuse wired.

**Day 3–4**

* Voice Studio UI: waveform, push-to-talk, live transcript, quick “Refine” actions.
* Persona synthesis endpoint (`POST /agents` → JSON schema).

**Day 5**

* Interactive Studio: Configure/Test tabs, live bind to same session/memory.
* Unified “Agent Card” export & rehydrate (`/agents/:id`).

**Day 6**

* Memory inspector (Langfuse spans mapped to UI), persona chips update live.
* Demo scripts & seed agents (coach, study buddy, onboarding assistant).

**Day 7–8**

* Polish + resilience: reconnects, VAD tweaks, mic permissions, safe defaults.
* Optional stretch: voice style switching; upload 1-2 reference docs to memory.

**Day 9**

* Record 90-sec video; finalize README; smoke test shareable demo.

## 6) Repo Layout (monorepo)

```
flowone/
├─ backend/
│  ├─ app.py                # FastAPI/Starlette + Pipecat routes
│  ├─ services/
│  │  ├─ pipecat_runtime.py
│  │  ├─ gemini_live.py
│  │  └─ gemini_flash.py
│  ├─ memory/
│  │  ├─ store.py           # SQLite/FAISS, agent profiles, examples
│  │  └─ embeddings.py
│  ├─ observability/
│  │  └─ langfuse.py
│  └─ api/
│     ├─ agents.py          # POST /agents, GET /agents/:id
│     ├─ sessions.py        # POST /sessions, WS /sessions/:id/events
│     └─ voice.py           # WebRTC hooks
├─ frontend/
│  ├─ voice-studio/
│  │  ├─ src/App.tsx
│  │  ├─ src/components/VoiceConsole.tsx
│  │  └─ src/lib/pipecatClient.ts
│  └─ interactive-studio/
│     ├─ src/App.tsx
│     ├─ src/modules/configure/PersonaPanel.tsx
│     └─ src/modules/test/TestConsole.tsx
├─ packages/
│  └─ agent-schema/         # Shared TS types for Agent Card
├─ ops/
│  ├─ docker-compose.yml
│  └─ Dockerfile.{api,ui}
├─ README.md
└─ demo.mp4
```

## 7) API Surfaces (thin)

* `POST /agents` → `{ name, goals, tone }` → returns **AgentCard JSON** (schema w/ system prompt, tools, memory slots)
* `GET /agents/:id` → hydrate card
* `POST /sessions` → `{ agentId }` → returns `sessionId` (Pipecat)
* `WS /sessions/:id/events` → transcripts, persona updates, memory hits
* (WebRTC) `/voice/tokens` → ephemeral Daily token for room join

---

## 8) Codex CLI — **Scaffold Prompt** (copy-paste)

```
You are Codex CLI. Create a monorepo named "flowone" for a dual-interface
adaptive agent builder using Pipecat + Gemini.

Requirements:
- Backend: Python 3.11, FastAPI, Pipecat server runtime, Daily WebRTC, Langfuse.
- LLM: Gemini 2.5 Live (speech↔speech) + Gemini 2.5 Flash (text reasoning).
- Memory: SQLite (sqlmodel) + FAISS for vector recall.
- Frontends: Two React + Vite apps: "voice-studio" and "interactive-studio".
- Shared TS package "agent-schema" for AgentCard types.
- Docker: separate images for backend and each frontend.

Scaffold:
1) Monorepo folders:
   flowone/{backend,frontend/voice-studio,frontend/interactive-studio,packages/agent-schema,ops}
2) Backend deps:
   pip install fastapi uvicorn[standard] pipecat-ai daily-python langfuse sqlmodel
   faiss-cpu pydantic-settings websockets python-dotenv httpx
3) Backend files:
   - backend/app.py:
     * FastAPI app with /health, /agents, /sessions, /voice endpoints.
     * Mount WebSocket /sessions/{id}/events for streaming transcripts
       and persona changes.
   - backend/services/pipecat_runtime.py:
     * Initialize Pipecat pipeline, register GoogleLLMService (Flash),
       GeminiLiveLLMService (Live), audio I/O with Daily.
   - backend/services/gemini_live.py, gemini_flash.py:
     * Thin wrappers for Live/Flash calls; Flash handles JSON schema outputs.
   - backend/memory/store.py:
     * sqlite db: tables Agents, Sessions, Memories; basic CRUD + FAISS index.
   - backend/observability/langfuse.py:
     * setup client; span helpers for LLM calls, memory hits.
   - backend/api/agents.py:
     * POST /agents -> synthesize persona via Flash; store AgentCard JSON;
       return schema; GET /agents/:id -> hydrate.
   - backend/api/sessions.py:
     * POST /sessions -> create session for agent; attach runtime state.
   - backend/api/voice.py:
     * /voice/tokens -> create ephemeral Daily room token; env DAILY_API_KEY.
4) Frontend voice-studio:
   - React + Vite + TypeScript.
   - Components: VoiceConsole (join room, mic control), TranscriptPanel (live),
     PersonaChips (reflect server persona state), QuickActions
     (“more motivating”, “shorter replies”, “add greeting”).
   - Services: pipecatClient.ts to open WS to /sessions/:id/events.
5) Frontend interactive-studio:
   - Configure tab: inputs for name, goals, tone; “Generate Agent” calls POST /agents.
   - Test tab: connect to live session; show transcript; apply edits that push
     persona diffs to backend (WS).
6) Shared package "agent-schema":
   - export TS interfaces for AgentCard (id, persona, goals, tone, tools, memory).
7) Scripts:
   - root npm workspaces; pnpm preferred.
   - Makefile: `dev` (concurrently run api + both UIs), `build`, `docker-build`.
8) Env:
   - .env: GEMINI_API_KEY, DAILY_API_KEY, LANGFUSE_SECRET, LANGFUSE_PUBLIC_KEY.
9) Docker:
   - ops/Dockerfile.api (uvicorn app:app), Dockerfile.ui (for each frontend).
10) Seed:
   - Seed script to create 2 example agents (fitness coach, study buddy).
11) README checklist for hackathon submission.

Generate all files with basic, working code stubs and TODOs where needed.
```

---

## 9) Figma Make — **UI Prompts** (copy-paste)

**A) Voice Studio (React app)**

```
Design a clean, modern web app screen: "FlowOne Voice Studio".
Layout: three stacked sections.

1) Header bar:
   - App title "FlowOne Voice"
   - Right-aligned: Mic status pill (Idle/Listening/Live), room ID.

2) Main panel (side-by-side):
   - Left: "Voice Console" card:
       * Large round Push-to-Talk button
       * Live waveform area above the button
       * Room join status + “Switch voice style” dropdown
   - Right: "Live Transcript" card:
       * Streaming user/agent turns (timestamps)
       * Inline tags showing memory recalls (chips)
       * Tiny latency indicator (ms)

3) Footer panel:
   - "Persona & Controls" card with:
       * Persona chips (e.g., Friendly, Expert, Concise) toggleable
       * Quick actions: [More motivating] [Shorter replies] [Acknowledge first]
       * “Export Agent Card” button

Style: Tailwind-friendly spacing, rounded-xl cards, soft shadows,
readable fonts, minimal color accents. Provide component names and states.
```

**B) Interactive Studio (React app)**

```
Design a dual-tab interface: "Configure" and "Test".

Configure tab:
- Left panel "Agent Settings":
   * Inputs: Name, Role (textarea), Goals (chips), Tone (slider/switches)
   * Button: "Generate Agent" (creates Agent Card via API)
- Right panel "Persona Preview":
   * Read-only schema view (key-value blocks)
   * Memory slots list (add/remove button)

Test tab:
- Left "Session":
   * Start/Stop session buttons
   * Session stats (duration, tokens, latency)
- Right "Transcript":
   * Live turns, search box, “Copy last reply”
- Top-right "Apply Changes" button:
   * Patches persona and updates active session

Style to match Voice Studio: clean, rounded, subtle dividers,
good contrast. Include hover/pressed states and empty/loading states.
```

---

## 10) README Submission Checklist (drop into repo)

* What is this? (1 sentence)
* 90-sec demo video
* How Gemini + Pipecat are used (Live for voice loop; Flash for persona/schema; Pipecat for orchestration; Daily for WebRTC)
* What was built during hackathon vs prior work (note: Interactive Studio existed conceptually; all real-time voice + merged backend built this week)
* Tooling: Langfuse, SQLite/FAISS
* Feedback on tools (latency, ergonomics, DX notes)
* Optional live demo link

---

## 11) Demo Script (90 seconds)

1. Start in **Interactive Studio → Configure**: “Generate a Fitness Coach” → shows Agent Card.
2. Click **Test** → start session (show transcript updates).
3. Switch to **Voice Studio** → join room, press-to-talk:

   * “Make it more motivating and keep answers under 15 seconds.”
   * Show persona chips update live; Langfuse chart blips.
4. Press **Export Agent Card** → copy JSON; open share link → talk to the agent.
5. Close with latency overlay and mention “Pipecat + Gemini Live + Flash + Daily + Langfuse”.

---

## 12) Risks & Mitigations (brief)

* **Gemini Live API quirks**: keep a fallback path via Flash (TTS/STT cascade if needed).
* **Browser audio perms/VAD**: clear onboarding and mic test; conservative defaults.
* **WebRTC tokens**: short-lived; handle refresh; show reconnect UI.

---