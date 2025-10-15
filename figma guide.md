here’s an **updated Figma Make prompt** that tells Figma to use your linked file’s look-and-feel as the canonical UI, and to output frames/components mapped to your ReactFlow build. I’ve also added a short note at the end about backend changes (spoiler: none needed for per-node testing; flows need a small add-on).

---

# FlowOne Voice — UI Generation Prompt (Use THIS Figma as the visual source)

**Reference UI (use styles/layout as the baseline):**
`https://www.figma.com/make/SUSvdk5fQ3vdkd5e10w7TV/Voice-Configured-Agent-Builder?node-id=0-4`

## Goal

Generate a **ReactFlow-based visual agent builder** with a **voice-first test panel**, matching the referenced Figma project’s visual language (spacing, typography, cards, badges, iconography). Keep the three-panel structure (Palette | Canvas | Voice Panel) and the top bar with a single **Test Agent ⚡** entrypoint.

---

## Pages & Frames to Generate

### 1) `Page/FlowOne Voice`

Top-level frame that contains all 3 panels and a fixed top bar.

#### Top Bar — `Header/HeaderBar`

* Left: Logo (mic icon) + “FlowOne Voice”
* Center: **Primary CTA** button that toggles:

  * Idle → “Test Agent ⚡” (blue)
  * Testing → “Stop Testing 🛑” (red)
* Right: User avatar (profile dropdown)
* Style: match reference (height ≈ 64px, subtle divider, light background)

#### Left Panel — `Panel/AgentPalette` (width ≈ 280px)

* Header: “Agent Palette” + helper text “Drag to canvas to create”
* **Categories** (stacked accordions):

  * Customer Service, Education & Tutoring, Sales & Business, Health & Wellness, Creative & Content, Custom Templates
* **Agent Card (palette item)** — `Card/AgentTeaser`

  * 240×80, icon + name + 1-line description, **[Drag to canvas]** affordance
  * Hover: lift + shadow; Drag: 50% opacity ghost
* Footer button: **[+ Create Custom Agent]**

#### Center Panel — `Canvas/ReactFlowBoard` (flex-1)

* ReactFlow canvas with:

  * `Background` (subtle dotted grid: use the reference spacing),
  * `MiniMap` (bottom-left 120×80),
  * `Controls` (zoom ±, fit, lock)
* **Node (on canvas)** — `Node/ConversationalAgentCard`

  * Header: icon + agent name + (••• menu)
  * Status badge row (New/Draft, Ready, Active, Error)
  * Key config lines:

    * Persona (tone/traits)
    * Voice style (short line)
    * Tools (comma list)
  * Action row: **[Configure]** + **[Test Now ⚡]**
  * Connection handles (top=Input, bottom=Output)
* **Edge styles:** smooth bezier, purple gradient (#8B5CF6 → #3B82F6), 2px, hover glow
* **FAB** (bottom-right): round blue [+] to add a generic agent
* **Status Bar** (bottom-left): chips showing counts (Agents / Connections / Auto-save)

#### Right Panel — `Panel/VoiceTest` (collapsible ~360px)

**Closed (peek bar):** “Test Agent ▶” on right border
**Open (testing mode):**

* Header: agent name + timer + close (×)
* **Conversation window** (bubbles with timestamps; user right/blue, agent left/gray)
* **Voice input**: large mic circle, waveform bar, “Tap to speak or hold” text, recording indicator (red)
* **Persona adapter**: “Current: …” + radio list of personas; **Live Update ⚡** chip
* Footer: **[🛑 Stop Testing]** + small stats row (latency, tokens)

#### Modal — `Modal/ConfigureAgent`

* Trigger: double-click node or click **Configure**
* 900px width, 60/40 split (Form | Preview)
* **Form**: Name, Persona (multiline), Voice (style/speed/pitch sliders), Tools (checkbox list), Model (Flash/Pro radio)
* **Preview**: card-like persona preview & status
* Footer: **Cancel | Save Draft | Save & Test ⚡**

---

## Components & Variants

* `Node/ConversationalAgentCard`

  * `state={draft|ready|testing|error}`
  * `density={compact|normal}`
* `Badge/Status`

  * `variant={draft|ready|active|error}` with colors from the reference
* `Button/Primary`, `Button/Secondary`, `Button/Danger`
* `Controls/EdgeStyles` (single style as above; optional dotted variant for `conditional`)
* `Persona/QuickSwitcher` (radio list)
* `Chat/Bubble` (agent|user variants)
* `Header/HeaderBar` with `testing={true|false}`

**IDs (for code binding):**

* `#test-cta`, `#palette-create-custom`, `#canvas-fab`,
* `#voice-panel-toggle`, `#voice-mic-btn`, `#persona-switcher`,
* `#configure-open`, `#configure-save`, `#configure-save-test`

---

## Visual System (match the referenced file)

* **Typography:** Inter / Plus Jakarta Sans (as in the reference), headings 18–24 semibold, body 14–16 regular, micro 12 medium
* **Colors:**

  * Voice Blue `#3B82F6` (primary), Recording Red `#EF4444`, Success Green `#10B981`, Warning Amber `#F59E0B`, Accent Purple `#8B5CF6`
  * Canvas BG `#F9FAFB`, Grid `#E5E7EB`, Card BG `#FFFFFF`, Border `#D1D5DB`
* **Elevation:** medium shadow on hover/lift
* **Radii:** 12px cards, 8px chips, round mic button
* **Motion:** subtle fades, canvas-scale on focus, brief blue flash on persona switch

---

## Export Mapping (Figma → React)

Match these export names to code files (don’t rename):

* `Header/HeaderBar` → `frontend/interactive-studio/src/components/HeaderBar.tsx`
* `Panel/AgentPalette` → `frontend/interactive-studio/src/components/AgentPalette.tsx`
* `Node/ConversationalAgentCard` → `frontend/interactive-studio/src/components/ConversationalAgentCard.tsx`
* `Canvas/ReactFlowBoard` → `frontend/interactive-studio/src/pages/FlowBuilder.tsx`
* `Panel/VoiceTest` → `frontend/interactive-studio/src/components/VoiceTestPanel.tsx`
* `Modal/ConfigureAgent` → `frontend/interactive-studio/src/components/ConfigureAgentModal.tsx`
* `Badge/Status` → `frontend/interactive-studio/src/components/StatusBadge.tsx`
* `Chat/Bubble` → `frontend/interactive-studio/src/components/ChatBubble.tsx`

**Assets:** export any icons as SVG; keep color tokens editable.

---

## Behavior Notes (to prototype)

* **Drag from Palette → Canvas**: ghost card + grid highlight; drop opens Configure modal
* **Connect nodes**: handles appear on hover; on connect, show animated flow on edge
* **Test Agent ⚡**:

  * If a node is selected → open Voice panel for that agent
  * Mic button toggles state; waveform animates while active
  * Persona switcher updates the card’s status briefly (blue flash)
* **Save & Test ⚡** in modal closes modal and opens Voice panel

---

## Deliverables

* Frames/components above, styled **exactly like the provided Figma file**
* Component variants for states (draft/ready/testing/error)
* A prototype with:

  * Palette → drag to canvas → auto-open Configure
  * Test Agent toggle from header
  * Voice panel open/close & persona switcher interactions

---

## Backend Impact (quick guidance)

* **No backend change required** for this UI if “Test Agent ⚡” targets the **selected node’s agent** (you already have `/v1/agents`, `/v1/sessions`, `/v1/voice/tokens`, `/v1/sessions/{id}/persona`).
* If you later want edges to **actually route** the ongoing conversation across nodes, add the small **Flow** layer we outlined (Flow CRUD + Flow Session runtime). Until then, keep routing purely visual.

---

If you want, I can also generate the **Tailwind token sheet** from the reference file’s colors/spacing (as CSS variables) so the exported code drops in perfectly.
