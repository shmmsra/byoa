# BYOA (Build Your Own Assistant) — Dev Environment Setup

> Canonical onboarding guide for BYOA. Follow this top-to-bottom on a fresh clone.
>
> **If you add a new dependency, tool, MCP server, or agent skill while working in this repo, update this file in the same commit.** Onboarding the next agent on a fresh clone is the regression test.

---

## 1. Prerequisites — language toolchains

| Language | Required version | How to install |
|----------|------------------|----------------|
| Node.js | 18+ | `brew install node` / [nodejs.org](https://nodejs.org) |
| Yarn | 1.x (classic) | `npm install -g yarn` |
| C++23 compiler | clang 15+ / MSVC 2022+ / GCC 13+ | macOS: Xcode CLI tools (`xcode-select --install`); Windows: Visual Studio 2022 with C++ workload; Linux: `apt install clang-15` |
| CMake | 3.16+ | `brew install cmake` / `apt install cmake` / [cmake.org](https://cmake.org/download) |
| Make | any | macOS: pre-installed; Linux: `apt install make`; Windows: use Git Bash or `choco install make` |

Platform-specific minimum OS:
- macOS: 14.0 (Sonoma) or later
- Windows: 10 or later
- Linux: any modern distro with glibc 2.17+

---

## 2. Clone and install dependencies

```bash
git clone https://github.com/shmmsra/byoa.git
cd byoa

# Install web dependencies
yarn install --frozen-lockfile

# Configure the native build
yarn configure:native   # runs: cmake -B build -S .
```

---

## 3. Required external tools / CLIs

| Tool | Purpose | Install |
|------|---------|---------|
| `git` | Version control | Pre-installed on macOS/Linux; Git for Windows |
| `make` | Build entry point (`make check`, `make setup-hooks`) | See §1 above |
| `gh` | GitHub CLI — used by agents to interact with GitHub Issues | `brew install gh` / [cli.github.com](https://cli.github.com) |
| `node` / `yarn` | Web build + linting | See §1 above |
| `cmake` | Native C++ build | See §1 above |

Optional but recommended:
| Tool | Purpose | Install |
|------|---------|---------|
| `clangd` | C++ language server (IDE integration) | `brew install llvm` / VS Code extension |
| `clang-format` | C++ formatter (already configured via `.clang-format`) | Included with Xcode / LLVM |

---

## 4. Agent skills and MCP servers

| Skill / MCP | Purpose | How to install |
|-------------|---------|----------------|
| `ai-sdlc-bootstrap` | The skill that scaffolded this workflow (already applied) | n/a — already in `.claude/skills/` |

*Add rows when you integrate new skills or MCP servers.*

---

## 5. Install the git hooks (one-time)

```bash
make setup-hooks
```

This installs a `.git/hooks/pre-commit` that runs `make check` automatically on every `git commit`. If the check fails, the commit is aborted. Fix the failure and retry.

You only need to run `make setup-hooks` once per clone. Re-run if you delete `.git/hooks/`.

---

## 6. Run the baseline check

```bash
make check
```

This runs `yarn lint:all:check`, which covers:
- **Web lint**: ESLint (JS/TS) + Stylelint (CSS)
- **Native lint**: clang-tidy (C++)

Expected outcome on a fresh clone: lint clean. If it fails, fix `docs/dev-setup.md` — the install steps above are wrong.

**Note**: No automated tests exist yet. When Vitest (web) and GoogleTest (native) are wired up, `make check` will be extended to run them too.

---

## 7. Build the full app

```bash
# Web frontend only
yarn build:web:release

# Native backend only (after configure:native)
yarn build:native:release

# Everything
yarn build:all
```

---

## 8. Editor / IDE setup

- **VS Code**: settings in `.vscode/settings.json` (spell-check words pre-configured). Install the recommended extensions: ESLint, Stylelint, clangd, Prettier.
- **Cursor**: `.cursor/rules/byoa.mdc` configures project rules. Cursor reads it automatically.
- **Other IDEs**: `.editorconfig` covers indentation and line-ending conventions for all editors that support it.

---

## 9. Environment variables / secrets

API keys for LLM providers are stored in the system credential store (macOS Keychain / Windows Credential Manager) — **never in files**. Configure them via the app's Settings dialog at runtime.

There is no `.env` file needed for development.

---

## 10. Verify the agent workflow

To confirm your environment can drive the agent-SDLC contract end-to-end:

1. Read `CLAUDE.md` (or `AGENTS.md` for non-Claude agents) and `docs/agents/CONVENTIONS.md`.
2. Run `make check` — should exit 0 on a clean clone.
3. Make a trivial doc change and try to commit — the pre-commit hook should run `make check` automatically.
4. Revert the commit if it was just a test.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `make check` fails on a fresh clone | This file is stale or a dependency is missing | Update §1/§2 above and re-run |
| `yarn configure:native` fails | CMake or compiler not found | Install missing toolchain from §1 |
| Pre-commit hook not running | `make setup-hooks` not run | Run `make setup-hooks` |
| `clang-tidy` errors after a toolchain upgrade | `.clang-tidy` version mismatch | Check `.clang-tidy` config; update if needed |

*Add new rows as recurring setup gotchas are discovered.*
