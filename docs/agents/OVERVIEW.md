# BYOA (Build Your Own Assistant) — Project Overview

> Canonical reference for project context, architecture, tech stack, and build commands.
> Read before asking architecture questions or evaluating new libraries/frameworks.

---

## What is this project?

**BYOA (Build Your Own Assistant)** — Native cross-platform desktop AI assistant with C++23 backend and React 18/TypeScript frontend.

**Owner**: Shivam Mishra
**AI-first SDLC**: Designed to be built by humans and multiple AI agents across many sessions. Every significant decision and status change is committed to this repo so agents never need manual context transfer.

---

## Architecture in 30 seconds

```
┌──────────────────────────────────────────────────────────┐
│  System Tray / Menubar (native OS integration)           │
│         ↓  user triggers shortcut or tray click          │
│  C++ Native Backend  (Saucer webview host)               │
│    - Application & window manager                        │
│    - Clipboard integration                               │
│    - Secure vault (Keychain / Credential Manager)        │
│    - HTTP client → LLM APIs (OpenAI, Claude, local, …)  │
│         ↕  IPC (JSON messages over webview bridge)       │
│  Web Frontend  (React 18 / TypeScript / Vite / Ant Design)│
│    - Assistant popup (AI interaction UI)                 │
│    - Settings dialog (LLM config, custom actions)        │
│    - Clipboard data processing views                     │
└──────────────────────────────────────────────────────────┘
```

**Key invariant**: The C++ backend is LLM-vendor-agnostic. All provider-specific code lives in the backend's HTTP/LLM abstraction layer; the frontend and the IPC protocol never encode provider details.

---

## Key decisions (quick reference)

Full ADRs in [`docs/decisions/`](../decisions/). Read the ADR before changing anything related to that decision.

| # | Decision | Short rationale |
|---|----------|-----------------|
| [ADR-001](../decisions/0001-adopt-ai-sdlc.md) | Adopt the ai-sdlc-bootstrap workflow | Plan-first, TDD-enforced, docs-as-done, multi-agent compatible |

*Add new rows as ADRs accumulate.*

---

## Tech stack

| Layer | Tech | Key files |
|-------|------|-----------|
| Native backend | C++23, CMake 3.16+, Saucer webview | `src/native/`, `CMakeLists.txt` |
| Web frontend | TypeScript, React 18, Vite 6, Ant Design 5 | `src/web/` |
| Build system | Yarn (web) + CMake (native), unified via `Makefile` | `package.json`, `CMakeLists.txt`, `Makefile` |
| Testing (web) | Vitest | `src/__tests__/` (to be created) |
| Testing (native) | GoogleTest | `tests/` (to be created) |
| CI | GitHub Actions | `.github/workflows/` |
| Linting | ESLint + Stylelint (web), clang-tidy (native) | `eslint.config.mjs`, `.stylelintrc.json`, `.clang-tidy` |
| Formatting | Prettier (web), clang-format (native) | `.prettierrc.json`, `.clang-format` |

---

## Build and run

```bash
make check           # pre-commit gate — run before every commit
make setup-hooks     # one-time: installs pre-commit hook after cloning
```

Underlying commands (if not using `make`):

```bash
yarn lint:all:check              # lint web (ESLint + Stylelint) + native (clang-tidy)
yarn build:web:release           # build the web frontend
yarn configure:native && yarn build:native:release   # build the C++ backend
```

**First-time setup**: see [`docs/dev-setup.md`](../dev-setup.md) for the full bootstrap (dependencies, toolchains, CMake, Yarn, hooks). The dev-setup doc is the single source of truth for onboarding — if it's out of date, fix it in the same commit as whatever broke it.

---

## Repository layout

```
.
├── README.md                    # Project description + install + quick-start
├── LICENSE                      # MIT
├── .gitignore
├── CMakeLists.txt               # Native build (C++23, Saucer, CMake)
├── package.json / yarn.lock     # Web build + dev tooling
├── vite.config.ts               # Vite bundler config
├── tsconfig.json                # TypeScript config
├── .clang-format / .clang-tidy  # C++ formatting + linting
├── .prettierrc.json             # Web formatting
├── src/
│   ├── native/                  # C++23 backend source
│   └── web/                     # React/TypeScript frontend source
├── scripts/                     # Build and install scripts
│   ├── setup-hooks.sh           # Installs git pre-commit hook
│   └── bundle.js / lint-native.js / …
├── docs/
│   ├── agents/                  # AGENT-CRITICAL: OVERVIEW.md, CONVENTIONS.md, STATUS.md
│   ├── decisions/               # ADRs
│   ├── CHANGELOG.md
│   ├── requirements.md
│   ├── issues.md                # GitHub Issues bridge
│   ├── manual-testing.md
│   └── dev-setup.md             # Onboarding: deps, tools, hooks
├── CLAUDE.md / AGENTS.md / GEMINI.md / .cursor/rules/byoa.mdc
├── CONTRIBUTING.md
├── Makefile                     # make check, make setup-hooks
└── .github/workflows/           # build.yml, lint.yml, bundle-and-release.yml
```

*Update this tree as the project grows. Agents read it to navigate.*

---

## Further reading

External docs / wikis used to inform this scaffold:

*(none)*
