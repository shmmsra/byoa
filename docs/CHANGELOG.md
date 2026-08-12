# BYOA (Build Your Own Assistant) — Changelog

> Chronological log of what changed in this repo and *why*. The "why" matters more than the "what" — the diff already shows the what.
>
> Update at the end of every session. Newest entries at the top.

---

## 2026-08-12 — History: record the focused app's name for context

**What changed**: Added a `focused_app_name` column to the `history` table, populated at shortcut-trigger time (the same moment each platform already captures the focused app's PID). macOS reads `NSWorkspace.frontmostApplication.localizedName`; Windows resolves the foreground window's owning process and takes its executable basename via `GetForegroundWindow`/`GetWindowThreadProcessId`/`QueryFullProcessImageNameW` (previously a `TODO` stub returning PID `0`). The name is stamped onto the entry server-side inside the `history_saveEntry` IPC handler (`webview-wrapper.cpp`), not passed from the frontend. Existing databases migrate in place via the same `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` pattern used for `system_content`. The History tab now shows an "App" column. See ADR-005.

**Why**: History rows showed what was asked and what came back, but not which app the user was in when they triggered BYOA — context that makes old rows much easier to interpret.

**What was rejected**: Passing the app name from the frontend via a new IPC field — would need a new exposed query and risks a stale name if the user alt-tabs between trigger and save; resolving the Windows app's full product name via PE version resources — extra `VerQueryValue` code for a v1 feature where "some readable hint" (the exe basename) is enough, and many binaries lack version info anyway; bumping `HISTORY_SCHEMA_VERSION` — the frontend's outgoing payload shape didn't change, only the persisted DB schema did.

**What's next**: No Linux native backend exists yet, so this field stays empty there until one is built (see ADR-005 consequences).

---

## 2026-08-12 — Version 1.0.1; `package.json` as single source of truth for versioning

**What changed**: Bumped `package.json` version to `1.0.1`. `CMakeLists.txt` now reads that version at configure time (`file(READ ...)` + `string(JSON ... GET ... version)`) and passes it to `project(BYOAssistant VERSION ${BYOA_VERSION} ...)`, instead of hardcoding it in `project(VERSION 1.0.0 ...)` *and* separately re-deriving it via manual `PROJECT_VERSION_MAJOR/MINOR/PATCH` lines. `cmake_minimum_required` bumped `3.16` → `3.19` for `string(JSON ...)` support. See ADR-004.

**Why**: A version bump previously meant editing two files (and two spots within `CMakeLists.txt`), risking the native bundle's version (`CFBundleShortVersionString`, templated from `PROJECT_VERSION`) drifting from `package.json` — which is what `tag-on-version-bump.yml` (ADR-003) actually reads to decide when to cut a release.

**What was rejected**: Shell command substitution in the `configure:native` yarn script to inject the version — not portable across Windows/macOS/Linux; a generated header/config file from a Node prebuild step — unnecessary extra moving parts when CMake can read the JSON directly.

---

## 2026-08-12 — Auto-tag + release on `package.json` version bump

**What changed**: Added `.github/workflows/tag-on-version-bump.yml`, which triggers on any push to `main` touching `package.json`, reads the `version` field, and — if tag `v<version>` doesn't already exist — creates/pushes it and dispatches `bundle-and-release.yml` via `gh workflow run --ref v<version>` (an explicit dispatch is required because tags pushed with the default `GITHUB_TOKEN` don't trigger other workflows). `bundle-and-release.yml`'s release job now also checks out full history and generates release notes: a `## Changes` list of `git log <prev-tag>..<current-tag>` commit subjects, plus a `**Commits included:** <start-sha>...<end-sha>` line, passed as the release body. See ADR-003.

**Why**: The release trigger required a manual `git tag && git push`, which nobody was doing consistently — the last release (`v0.0.9`) was months old despite several merged improvements. Release bodies were also just a bare title with no record of what changed.

**What was rejected**: A PAT secret to let the tag push itself re-trigger the release workflow (avoided the extra secret-management burden — `gh workflow run --ref` solves the same problem with the existing token); auto-bumping `package.json` version from commit history (out of scope — versioning intent stays a human decision); changelog/commit categorization tooling (only plain concatenation was asked for).

**What's next**: End-to-end manual verification against a real version bump; reconcile `package.json`'s `1.0.0` with the existing `v0.0.x` tag sequence before the next release.

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
