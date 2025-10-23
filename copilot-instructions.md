# Copilot Code Review Instructions for FlowOne

These instructions guide GitHub Copilot in this repository to produce high‑quality, repo‑aware code reviews.

## Repository context
- Monorepo with FastAPI backend and three React frontends (Main Studio `src/`, Voice Studio `frontend/voice-studio/`, Agent Configurator `frontend/agent-configurator/`).
- Realtime agents: WebSockets, Daily.co for rooms, Tavus avatars (two modes), optional Pipecat voice pipeline.
- Python uses async FastAPI; TypeScript/React uses modern hooks, Zustand for state.
- Tests: backend (pytest, 80%+ coverage target), frontend (Vitest + RTL), E2E (Playwright).

## High‑priority review focus
1) Async correctness and resource cleanup
- Avoid fire‑and‑forget unless clearly intentional with logging/cleanup.
- Prefer async APIs that await initialization/cleanup.
- Ensure WebSocket and Daily room sessions close deterministically.

2) Avatar modes: dual‑path support
- Mode is resolved via `TAVUS_AVATAR_MODE`: `pipecat_daily` (Daily room viewer) or `phoenix_rest` (direct URL).
- When `pipecat_daily`: backend emits `avatar.started` with `dailyRoomUrl`; frontend must join the room.
- When `phoenix_rest`: backend emits `videoStreamUrl`; frontend should play directly.
- Do not mix assumptions between the two paths.

3) Daily.co integration
- Rooms: idempotent creation; treat duplicate-room 400 as success.
- Prefer shared helper `is_duplicate_room_error()`.
- Frontend must join with mic/cam off for viewer-only.
- Clean up `DailyCall` on dialog close (`leave()` then `destroy()`).

4) Configuration and env
- Settings in `backend/settings.py` drive behavior; avoid hardcoding domains.
- `DAILY_SUBDOMAIN` is sanitized; room URLs should be derived, not literal.
- `TAVUS_BASE_URL` defaults to `https://tavusapi.com/v2`.

5) Readability and maintainability
- Extract complex ternaries and boolean expressions into helpers.
- Prefer descriptive function names over inline compound logic.
- Keep error messages actionable; add trace/logs where helpful.

6) Testing and safety
- Add/adjust unit tests with changes in behavior.
- Keep changes minimal and backwards‑compatible when possible.

## Examples of preferred patterns
- Make lifecycle methods async and `await` them in callers.
- Use small, named helpers (e.g., `_resolve_avatar_mode()`, `is_duplicate_room_error()`).
- In TypeScript, avoid `any` where SDK types exist; prefer explicit types.

## Anti‑patterns to flag
- `await` inside a non‑async function; fire‑and‑forget for critical cleanup.
- Complex inline expressions that obscure intent (nested ternaries, negated booleans).
- Duplicated validation logic across endpoints.
- Unhandled task exceptions (`create_task` without a done callback/log).

## File‑specific guidance
- backend/services/pipecat_runtime.py
  - `SessionManager.spawn/close` should be async and awaited by endpoints.
  - Extract avatar mode resolution and handle unknown modes.
  - When scheduling work, store task references and log exceptions.
- backend/api/sessions.py & backend/api/voice.py
  - Share Daily duplicate-room detection via `api/utils.py`.
  - Prefer positive checks; avoid negated compound conditions.
- backend/services/tavus_client.py
  - Use readable base URL derivation (stepwise), no deeply nested expressions.
- src/components/AgentTestDialog.tsx
  - Use `DailyCall` type, avoid `any` for call object & video element.
  - Join room on `dailyRoomUrl`; play URL on `videoStreamUrl`.
  - Ensure cleanup on unmount.

## Review checklist
- [ ] Async lifecycle methods are awaited where applicable
- [ ] Dual avatar modes handled correctly end‑to‑end
- [ ] Daily room create is idempotent; token generation succeeds
- [ ] No stray `any` where SDK types exist
- [ ] Shared util used for duplicate-room detection
- [ ] Config derived from settings, no hardcoded endpoints
- [ ] Tests updated/added as needed

