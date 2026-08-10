# Contributing to BYOA

Thank you for your interest in contributing! 🎉

### How to Contribute
1. Fork this repo and create a new branch (`feature/my-feature`).
2. Run checks before committing:
   ```bash
   make check   # (or: yarn lint:all:check)
   ```
3. Open a PR (or commit directly for small fixes) and describe what changed and why.

---

## AI Agent Workflow

> **For AI agents (Claude Code, Codex, Cursor, Gemini)**: read the three files below before starting any work.
> The full agent contract — plan step, test gate, commit approval, domain rules — lives there.

| File | Contents |
|------|----------|
| [`docs/agents/OVERVIEW.md`](docs/agents/OVERVIEW.md) | Project context, architecture, tech stack, build commands |
| [`docs/agents/CONVENTIONS.md`](docs/agents/CONVENTIONS.md) | All hard constraints, domain rules, approval gates — non-negotiable |
| [`docs/agents/STATUS.md`](docs/agents/STATUS.md) | Current status, what's next, backlog priority order |

### The short version

1. **Plan first** — for any source code change, write out every file you'll create/modify and why, state what you will NOT do, and wait for explicit human approval (`lgtm` / `go ahead`). Silence is not approval.
2. **`make check` must pass** before every commit (runs `yarn lint:all:check`). Install the pre-commit hook once with `make setup-hooks`.
3. **Manual test before diff** — for runtime-affecting changes, write a test plan and wait for the human to confirm before showing the diff or requesting commit approval.
4. **Docs are part of done** — update `docs/agents/STATUS.md`, `docs/CHANGELOG.md`, `docs/issues.md`, `docs/requirements.md`, and `docs/dev-setup.md` (if dependencies changed) in the same commit.
5. **Never `git push`** — agents stop after the local commit and report the SHA. Pushing is always the human's call.

Full detail: [`docs/agents/CONVENTIONS.md`](docs/agents/CONVENTIONS.md)
