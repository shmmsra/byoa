# BYOA (Build Your Own Assistant) — Agent Instructions

> Entry point for AI coding agents: Codex (OpenAI), and any AGENTS.md-compatible tool.
> Claude Code users: read `CLAUDE.md` instead — it adds Claude-specific workflow rules on top of these shared conventions.
>
> **Sync note**: The "Key rules" section below summarises `docs/agents/CONVENTIONS.md`. If you update that file, update the summary here too. Agent config files in this repo: CLAUDE.md, AGENTS.md, .cursor/rules/byoa.mdc, GEMINI.md.

---

## Before starting any work, read these three files

1. **[`docs/agents/OVERVIEW.md`](docs/agents/OVERVIEW.md)** — project context, architecture, tech stack, build commands.
2. **[`docs/agents/CONVENTIONS.md`](docs/agents/CONVENTIONS.md)** — all hard constraints and contribution rules. Non-negotiable.
3. **[`docs/agents/STATUS.md`](docs/agents/STATUS.md)** — current status, what's next, backlog priority order.

---

## Key rules (full detail in `docs/agents/CONVENTIONS.md`)

- **Plan before you code**: For any source code change, write out every file you will create/modify and why, state what you will NOT do, and wait for explicit human approval before writing any implementation code. Silence is not approval.
- **`make check` must pass** before every commit (runs `yarn lint:all:check`).
- **TDD is mandatory**: write tests before or alongside logic changes, in the same commit.
- **Docs are part of done**: update `docs/agents/STATUS.md`, `docs/CHANGELOG.md`, `docs/issues.md`, `docs/requirements.md`, and `docs/dev-setup.md` (if dependencies/tools changed) in the same commit.
- **Merge policy**: direct merge after local review. Use `git merge --ff-only` or `git rebase`. Never `git merge --no-ff`. Never `git push` — that's the human's call.

---

## Contribution process

Full rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md). All agents must follow it.

Key checklist before committing:
- [ ] Plan written and approved before implementation
- [ ] Tests written (TDD)
- [ ] `make check` passes
- [ ] Manual test completed (if runtime behaviour changed — see `CONTRIBUTING.md §3`)
- [ ] Docs updated (`docs/agents/STATUS.md`, `CHANGELOG.md`, `issues.md`, `requirements.md`, `dev-setup.md` if deps changed)
- [ ] Repo hygiene files updated where applicable (README, `.gitignore` — see `CONTRIBUTING.md §12`)

---

## Architecture boundaries (never cross these)

1. **LLM vendor agnosticism**: Never couple BYOA's core logic to a specific LLM provider. All LLM interactions must go through the existing provider abstraction layer. Adding provider-specific code outside that layer is a hard failure.
2. **Frontend performance**: The web UI must never block or hang. Any async operation must show a loading indicator while in flight. A UI that appears frozen is a bug.
3. **Cross-platform compatibility**: Every change must work on Windows, macOS, and Linux. Platform-specific code must be isolated behind platform detection.
4. **Keyboard shortcut integrity**: Never break existing keyboard shortcut handling. Changes to the shortcut subsystem require explicit approval and cross-platform manual testing.
