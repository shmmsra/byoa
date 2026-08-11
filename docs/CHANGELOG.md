# BYOA (Build Your Own Assistant) — Changelog

> Chronological log of what changed in this repo and *why*. The "why" matters more than the "what" — the diff already shows the what.
>
> Update at the end of every session. Newest entries at the top.

---

## 2026-08-11 — History: record the actual prompt/instruction, not just clipboard content

**What changed**: Added a `system_content` column to the `history` table, populated for both Action-triggered and ad-hoc requests with the actual instruction sent to the LLM (previously only the clipboard content was stored, so ad-hoc rows carried no record of what was asked). `HISTORY_SCHEMA_VERSION` bumped to `2`. Existing databases migrate in place via a `PRAGMA table_info` check + `ALTER TABLE ADD COLUMN` in `History::init()` — no data loss on upgrade. The History tab's expanded row now shows a "Prompt" section (the instruction) above "Clipboard content" (renamed from "Request"). See the amendment in ADR-002.

**Why**: A user testing the History tab noticed ad-hoc rows didn't show what was actually asked. The initial design only captured the action's *label* for Action-triggered calls and nothing for ad-hoc ones — the real gap was that the instruction text itself was never stored for either path.

**What was rejected**: Reusing the existing `action_name` field to hold ad-hoc prompt text — rejected because it conflates two different concepts (an action's label vs. free-form prompt text) and would have broken the "Ad-hoc" fallback in the UI, which triggers off an empty `action_name`.

---

## 2026-08-11 — Local query/response history (SQLite) + Settings History tab

**What changed**: Added a local, unencrypted SQLite-backed history of one-shot LLM queries/responses. Native side: `SQLiteCpp` added via CMake `FetchContent`, `src/native/source/xplat/history.cpp`/`history.hpp` implement the `history` table and CRUD, four new IPC calls (`history_saveEntry`, `history_queryEntries`, `history_deleteEntry`, `history_clearAll`) exposed in `webview-wrapper.cpp`. Web side: `HistoryUtils` (`src/web/utils/history.ts`) wraps the IPC calls; `assistant-popup.tsx` records every LLM call (success or failure, with model, action metadata, and timing) via a fire-and-forget save; a new `HistoryTab` (`src/web/components/history-tab.tsx`) is wired into `SettingsDialog` with search/filter, per-row delete, and "Clear all". See ADR-002 for the full design rationale.

**Why**: Users had no way to review or recover past queries/responses — everything lived only in transient React state and vanished on popup close or app restart.

**What was rejected**: Encryption at rest (explicit product decision — history never leaves the device); auto-cap/expiry retention (no usage data yet to size a sensible default, manual delete/clear covers v1); recording history inside `InvokeLLM` itself (would couple the vendor-agnostic provider chokepoint to a persistence feature); using the request-content hash as the primary key (collides on repeated identical prompts).

**What's next**: Manual verification of the native build (SQLiteCpp `FetchContent` + submodule fetch) on Windows and Linux, not just macOS.

---

## 2026-05-23 — ai-sdlc-bootstrap scaffold

**What changed**: Bootstrapped the AI-driven SDLC workflow on this repo via the `ai-sdlc-bootstrap` skill. Added agent-config layer (CLAUDE.md, AGENTS.md, .cursor/rules/byoa.mdc, GEMINI.md), `docs/agents/` triad (OVERVIEW, CONVENTIONS, STATUS), expanded `CONTRIBUTING.md` with AI Agent Workflow section, scaffolded `docs/issues.md` GitHub bridge, ADR archive, pre-commit gate (`make check`), `docs/manual-testing.md`, `docs/dev-setup.md`, and `.editorconfig`.

**Why**: BYOA will be developed by humans + multiple AI agents across many sessions. Without the agent-config layer and a strict plan/test/commit workflow, every session starts from zero context and agents make changes that violate unstated constraints. The scaffold installs the contract so it travels with the code.

**What was rejected**: Post-commit hook and `docs/commit-log.md` (commit-tracking convention-only, no automation requested). `CODEOWNERS` (not requested). CI workflow changes (already configured).

**What's next**: Wire up Vitest (web) and GoogleTest (native) test frameworks; extend `make check` to run tests once they exist.

---

*Add new entries above this line. Format: `## YYYY-MM-DD — Short title`, followed by `What / Why / Rejected / Next` sub-headings.*
