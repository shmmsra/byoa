# ADR-004: `package.json` as the single source of truth for app version

**Date**: 2026-08-12
**Status**: Accepted
**Decider**: Shivam Mishra + AI agent (session 2026-08-12)

## Context

The version bump in ADR-003's release flow requires editing `package.json`'s `version` field. Before this change, `CMakeLists.txt` also hardcoded the version twice within itself: once in `project(BYOAssistant VERSION 1.0.0 ...)`, and again via manually-set `PROJECT_VERSION_MAJOR/MINOR/PATCH` a few lines later that reassembled `PROJECT_VERSION` — redundant with what `project(VERSION ...)` already sets automatically. A version bump therefore meant editing two files (and, within `CMakeLists.txt`, two spots), an easy way for the native bundle's version (`CFBundleShortVersionString`/`CFBundleVersion`, templated from `PROJECT_VERSION`) to drift from `package.json`.

## Decision

`CMakeLists.txt` now reads the version out of `package.json` at configure time via `file(READ ...)` + `string(JSON BYOA_VERSION GET ... version)`, and passes it directly to `project(BYOAssistant VERSION ${BYOA_VERSION} ...)`. The manual `PROJECT_VERSION_MAJOR/MINOR/PATCH`/`PROJECT_VERSION` lines are deleted — `project(VERSION ...)` already populates all of those. `cmake_minimum_required` is bumped from `3.16` to `3.19`, the minimum version supporting `string(JSON ...)`.

## Rationale

- **`string(JSON ...)` over a shell-based extraction** (e.g. `cmake -DAPP_VERSION=$(node -p ...) ...` in the `configure:native` yarn script): a shell command substitution in a `package.json` script string isn't portable across Windows/macOS/Linux (`CONVENTIONS.md §3`), whereas CMake's own JSON parsing runs identically on every platform regardless of the invoking shell.
- **3.19 minimum is safe**: it's a nine-version-old floor; GitHub-hosted runners and the local dev machine (verified: CMake 4.1.1) are both far newer. No toolchain currently in use needs the older floor.
- **Deleting the redundant manual `PROJECT_VERSION_*` lines**: they were already just re-deriving what `project(VERSION ...)` sets, so removing them is a correctness cleanup, not a behavior change downstream (`VERSION_FULL`, the macOS bundle plist substitution, and the configure-log `Version:` line all still read `PROJECT_VERSION`, unchanged).

## Alternatives rejected

- **Shell command substitution in the yarn `configure:native` script**: rejected for cross-platform portability, per above.
- **A generated header/config file written by a Node prebuild step**: more moving parts (an extra build step to keep in sync) for no benefit over CMake reading the JSON directly at configure time.
- **Making `package.json` derive its version from `CMakeLists.txt` instead**: rejected — `package.json` is what `tag-on-version-bump.yml` (ADR-003) already reads to decide when to cut a release, so it's the natural single source of truth.

## Consequences

- Bumping the app version is now a one-line edit to `package.json`; `CMakeLists.txt` picks it up automatically on the next configure.
- `package.json`'s version must stay valid CMake `project(VERSION ...)` syntax (numeric `major[.minor[.patch[.tweak]]]`, no pre-release suffixes like `-beta`) — not enforced today, since no such value has ever been used, but worth knowing before adding one.
