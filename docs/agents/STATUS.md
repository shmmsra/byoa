# BYOA (Build Your Own Assistant) — Current Status & Backlog

> Updated: 2026-05-23
> For the full feature history see [`docs/CHANGELOG.md`](../CHANGELOG.md).
> For per-ticket detail see [`docs/issues.md`](../issues.md).
> For the full phase breakdown see [`docs/requirements.md`](../requirements.md).

---

## Phase status

| Phase | Status |
|-------|--------|
| 0 — Project bootstrap + AI-SDLC scaffold | ✅ Complete |
| 1 — Initial implementation | 🔄 In progress |

*Update this table as phases progress. Use ✅ Complete / 🔄 In progress / 📋 Planned / 🚫 Blocked.*

**Current test counts**: 0 automated tests; `make check` (lint gate) active.

---

## What's next

The next logical work, in priority order. Update at the end of every session.

1. Add Vitest to `package.json` devDependencies and configure it for the web frontend.
2. Add GoogleTest via CMake FetchContent and wire up `ctest` for the native backend.
3. Extend `make check` to run both test suites once they exist.
4. Write the first real test for the smallest meaningful unit on each side.

---

## Recently closed

| Date | Ticket | Summary | Commit |
|------|--------|---------|--------|
| 2026-05-23 | — | ai-sdlc-bootstrap scaffold | pending |

---

## Deferred — pull only when a specific need surfaces

*Add tickets here when they're explicitly de-prioritized rather than open.*
