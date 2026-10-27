# BYOA (Build Your Own Assistant) — Current Status & Backlog

> Updated: 2026-10-27
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

**Current test counts**: 34 automated web tests (`yarn test:web`); `make check` (lint gate) active.

---

## What's next

The next logical work, in priority order. Update at the end of every session.

Confirm the Node.js 24 migration in the next normal build/lint CI run; verify the
release workflows at the next approved release, without triggering a release just
for this migration.

0. Manually verify popup toast cleanup and selected-LLM persistence across quit/relaunch and machine restart (see `docs/manual-testing.md`). Implementation is ready, but the local native build is blocked by Saucer/fill's ambiguous `std::views::join_with` with the installed Xcode toolchain; an isolated object build also encountered a stale PCH. Existing TypeScript errors also prevent a clean standalone `tsc` run. Windows verification remains pending; Linux has no native window backend.
1. Manually verify Settings → About displays the correct executable path on Windows (see `docs/manual-testing.md`); macOS verified on 2026-10-27.
2. Manually verify the focused-app-name capture on both macOS and Windows (see `docs/manual-testing.md`) — not yet exercised on a real Windows build.
3. Manually verify the new auto-tag-on-version-bump release flow end-to-end (see `docs/manual-testing.md`) — not yet exercised against a real version bump.
4. Decide on `package.json` version vs. the existing `v0.0.x` tag sequence before the next bump (currently `1.0.0`, would jump straight to `v1.0.0` on the next release).
5. Verify the native build (with the new SQLiteCpp dependency) on Windows and Linux, not just macOS — CI/manual test still needed on those two platforms.
6. Add native test infrastructure alongside the existing Vitest web suite.
7. Add GoogleTest via CMake FetchContent and wire up `ctest` for the native backend.
8. Extend `make check` to run both test suites once they exist.
9. Write the first real native test.

## Awaiting manual verification

| Date | Request | Status |
|------|---------|--------|
| 2026-10-27 | Settings About tab: app icon, version, executable path, and license | Implemented; macOS verified, Windows pending |
| 2026-10-24 | Clear popup toasts on hide, including late async completions | Implemented; manual verification pending |
| 2026-10-24 | Remember selected LLM across process relaunches; default to Auto | Implemented; manual verification pending |

---

## Recently closed

| Date | Ticket | Summary | Commit |
|------|--------|---------|--------|
| 2026-10-27 | — | CI checkout/setup-node upgraded to v5; build tooling requires Node.js 24+ | pending |
| 2026-08-12 | — | Version 1.1.0 | pending |
| 2026-08-12 | — | History: record the focused app's name (mac + Windows) for context | pending |
| 2026-08-12 | — | Auto-tag + release on `package.json` version bump, with commit-log release notes | pending |
| 2026-08-11 | — | Local query/response history (SQLite) + Settings History tab | pending |
| 2026-05-23 | — | ai-sdlc-bootstrap scaffold | pending |

---

## Deferred — pull only when a specific need surfaces

*Add tickets here when they're explicitly de-prioritized rather than open.*
