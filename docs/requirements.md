# BYOA (Build Your Own Assistant) — Requirements

> What this project must do, broken into phases. Use this to plan; use `docs/issues.md` to track individual tickets.
> Tick items as complete. Add new items as scope emerges.

---

## Phase 0 — Bootstrap (✅ done 2026-05-23)

- [x] Agent-config layer in place (CLAUDE.md, AGENTS.md, .cursor/rules/byoa.mdc, GEMINI.md)
- [x] `docs/agents/` triad written (OVERVIEW, CONVENTIONS, STATUS)
- [x] `CONTRIBUTING.md` updated with AI Agent Workflow section
- [x] `docs/issues.md` GitHub Issues bridge initialised
- [x] `docs/decisions/` ADR archive seeded with ADR-001
- [x] Pre-commit gate (`make check` → `yarn lint:all:check`) wired up
- [x] `docs/manual-testing.md` runbook initialised
- [x] `docs/dev-setup.md` onboarding guide written
- [x] `.editorconfig` added for C++/TypeScript/JSON consistency

---

## Phase 1 — Testing infrastructure

- [ ] Add Vitest to `package.json` devDependencies and configure for web frontend
- [ ] Add GoogleTest via CMake FetchContent and wire up `ctest` for native backend
- [ ] Extend `make check` to run `yarn vitest run` + `ctest` once tests exist
- [ ] Write first real test for the smallest meaningful unit (web side)
- [ ] Write first real test for the smallest meaningful unit (native side)

---

## Phase 2 — Ongoing feature work

- [x] Local query/response history stored in SQLite (native, via SQLiteCpp) — see ADR-002
- [x] Settings → History tab: search/filter, view full request/response, per-row delete, clear all
- [x] History rows record the focused app's name (mac + Windows) at shortcut-trigger time — see ADR-005
- [ ] Verify native build with the new SQLiteCpp dependency on Windows and Linux
- [ ] Verify focused-app-name capture on a real Windows build (currently only exercised on macOS)

*Populate this section with the next chunk of product work as it's planned. Each item should be a concrete, testable deliverable.*

---

## Future phases

*Add phases as scope clarifies. Each phase should be a logical milestone, not a sprint timeline.*
