# BYOA (Build Your Own Assistant) — Agent Briefing (Claude Code)

> **Before starting any work:**
> - Project context, architecture, tech stack, build commands → [`docs/agents/OVERVIEW.md`](docs/agents/OVERVIEW.md)
> - Current status, what's next, backlog → [`docs/agents/STATUS.md`](docs/agents/STATUS.md)
> - All hard engineering constraints → [`docs/agents/CONVENTIONS.md`](docs/agents/CONVENTIONS.md)

---

## 0. Non-negotiable operating rules

These rules govern how Claude works in this repo. They are collaboration protocol, not style preferences.

### Plan before you code — always wait for explicit approval

For any source code change (the threshold is **stricter** here: any change to source code requires a plan), you **must**:

1. Write out your plan: every file you will create or modify, and why.
2. State what you will **not** do.
3. **Stop. Do not write a single line of implementation code.**
4. Wait for the human to explicitly approve with words like "lgtm", "go ahead", "approved", or equivalent.
5. Only then implement.

> **"Silence is not approval."** Presenting a plan and immediately proceeding — even if the human said "implement X" — is a violation. "Implement X" is a task assignment, not pre-approval of your specific approach.

**Exempt** (implement directly, no plan required):
- Pure documentation updates with zero code changes
- Single-character typo fixes in comments or strings

### After implementing: manual test → diff → commit approval (in that order)

1. **Write and post the manual test plan** — exact command(s), what to observe, pass/fail criteria. See `CONTRIBUTING.md §3`.
2. **Wait for the human to confirm** — "tested, looks good" or equivalent. Silence is not confirmation. **Do not show the diff yet.**
3. **Show the diff** — summarise every file changed and why.
4. **Wait for commit approval** — "lgtm", "commit it", or equivalent before running `git commit`.

Posting the diff before the manual test is confirmed is a violation, even when `make check` is green.

### `make check` must pass before every commit — no CI failures

```bash
make check   # delegates to: yarn lint:all:check
```

Every commit must leave CI green. Install the pre-commit hook once after cloning:

```bash
make setup-hooks
```

### Merge policy

This project uses **direct merge after local review**. Code is reviewed locally by the agent and human together, then fast-forwarded or rebased directly into `main`. No PR is required for every change.

- Use `git merge --ff-only` or `git rebase`. Never `git merge --no-ff`.
- **Never run `git push`** — stop after the local commit and report the SHA. The human pushes.

---

## 1. Hard constraints (every agent must respect these)

**Project-specific domain rules** (from `docs/agents/CONVENTIONS.md §3`):

1. **LLM vendor agnosticism**: Never couple BYOA's core logic to a specific LLM provider. All LLM interactions must go through the existing provider abstraction layer. Adding provider-specific code outside that layer is a hard failure.
2. **Frontend performance**: The web UI must never block or hang. Any async operation (LLM call, IPC round-trip, file I/O) must show a loading indicator while in flight. A UI that appears frozen is a bug, not a UX tradeoff.
3. **Cross-platform compatibility**: Every change must work on Windows, macOS, and Linux. Platform-specific code must be isolated behind platform detection and tested on all three targets before merging.
4. **Keyboard shortcut integrity**: Never break existing keyboard shortcut handling. Changes to shortcut registration, event listeners, or the global hotkey subsystem require explicit approval and manual testing on all platforms.

**Universal rules**:

- **No credentials in code**: API keys go in `.env` only (git-ignored).
- **All decisions get an ADR**: If you're about to change something another agent might wonder about, write an ADR. Template in `docs/decisions/README.md`.
- **Ask before approval-gated operations**: production releases, CI/CD workflow changes, native C++ IPC surface changes, credential/vault code. See `docs/agents/CONVENTIONS.md §4`.
- **Repo hygiene files stay current**: `README.md`, `.gitignore`, `docs/dev-setup.md`, IDE configs — update them in the same commit when they go stale. See `CONTRIBUTING.md §12`.

---

## 2. Documentation process

Every agent session that makes significant changes **must** update before committing:

1. **`docs/agents/STATUS.md`** — Update phase table, test counts, and "What's next" if anything completed or changed.
2. **`docs/CHANGELOG.md`** — Add an entry: what changed, *why*, what was rejected, what's next.
3. **`docs/requirements.md`** — Tick completed items, add new planned items.
4. **`docs/issues.md`** — Mark completed issues `DONE`, update `IN PROGRESS`, add newly discovered issues.
5. **`docs/decisions/`** — If a significant architectural decision was made, create an ADR (template in `docs/decisions/README.md`).
6. **`docs/manual-testing.md`** — Add manual-test steps for every new feature, CLI flag, UI element, or API route.
7. **`docs/dev-setup.md`** — If you added a dependency, CLI tool, or language toolchain, update the install instructions.

> **Rule**: Stale docs break every subsequent session. Treat doc updates as part of the definition of done.
>
> **Sync note**: If you modify `docs/agents/CONVENTIONS.md`, also update the inline summaries in this file's §1, `AGENTS.md`, and `.cursor/rules/byoa.mdc`. All agent config files: CLAUDE.md, AGENTS.md, .cursor/rules/byoa.mdc, GEMINI.md.
