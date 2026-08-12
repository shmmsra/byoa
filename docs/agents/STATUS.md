# BYOA (Build Your Own Assistant) — Current Status & Backlog

> Updated: 2026-08-11
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

1. Verify the native build (with the new SQLiteCpp dependency) on Windows and Linux, not just macOS — CI/manual test still needed on those two platforms.
2. Add Vitest to `package.json` devDependencies and configure it for the web frontend.
3. Add GoogleTest via CMake FetchContent and wire up `ctest` for the native backend.
4. Extend `make check` to run both test suites once they exist.
5. Write the first real test for the smallest meaningful unit on each side.

---

## Recently closed

| Date | Ticket | Summary | Commit |
|------|--------|---------|--------|
| 2026-08-11 | — | Local query/response history (SQLite) + Settings History tab | pending |
| 2026-05-23 | — | ai-sdlc-bootstrap scaffold | pending |

---

## Deferred — pull only when a specific need surfaces

*Add tickets here when they're explicitly de-prioritized rather than open.*
