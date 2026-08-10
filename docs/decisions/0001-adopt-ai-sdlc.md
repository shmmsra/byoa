# ADR-001: Adopt the ai-sdlc-bootstrap workflow

**Date**: 2026-05-23
**Status**: Accepted
**Decider**: Shivam Mishra + AI agent (session 2026-05-23)

---

## Context

BYOA (Build Your Own Assistant) will be developed by humans collaborating with multiple AI coding agents (Claude, Codex, Cursor, Gemini, future tools) across many sessions over an extended timeline. Without a structured workflow:

- Each new agent session starts from zero context — no shared rules, no shared status, no shared history.
- Agents propose plausible-looking changes that violate unstated constraints (LLM vendor coupling, platform-specific code, broken shortcuts).
- "Done" is ambiguous — features ship without tests, docs, or recorded reasoning.
- The next agent has no way to know what was tried, what was rejected, or what's in progress.

The fix is to encode the contract in the repository itself, so it travels with the code and is readable by every agent on first sight.

## Decision

Adopt the **ai-sdlc-bootstrap** workflow:

1. **Agent-config layer**: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules/byoa.mdc` — all thin adapters pointing to one canonical `docs/agents/` triad. No rule duplication.
2. **Canonical rules in `docs/agents/`**: `OVERVIEW.md` (context), `CONVENTIONS.md` (hard constraints), `STATUS.md` (current state).
3. **Plan-first workflow**: every source code change requires a written plan + explicit human `lgtm` before code is written (strict threshold).
4. **Pre-commit gate**: `make check` runs `yarn lint:all:check`; hook installed via `make setup-hooks` enforces it locally; CI mirrors it.
5. **Manual testing required**: for runtime-affecting changes, the agent writes a test plan and waits for human confirmation before showing the diff.
6. **Documentation as part of done**: STATUS, CHANGELOG, requirements, issues, manual-testing, ADRs all update in the same commit as the feature.
7. **GitHub Issues bridge** (`docs/issues.md`) — agents read tickets via `gh` CLI without external API tokens.
8. **Linear git history**: rebase or fast-forward only; agents never `git push`.
9. **ADRs**: any architectural decision lands in `docs/decisions/` with Context / Decision / Rationale / Alternatives rejected / Consequences.

## Rationale

- **Cross-agent compatibility**: One canonical rules source means a new agent tool can be added by writing a 30-line adapter, not by reauthoring rules.
- **Plan-first prevents 80% of "agent went off the rails" failures**: the human catches misunderstandings before code is written, when the cost of correction is near zero.
- **Strict plan threshold** (any source change) chosen because BYOA has cross-cutting constraints (vendor agnosticism, cross-platform, shortcut safety) that are easy to violate accidentally.
- **Docs-as-done is the only way to keep state legible across sessions**: agents read `STATUS.md` first on every session and pick up exactly where the last agent left off.
- **Convention-only commit tracking** (no post-commit hook) was chosen to keep the setup lightweight for a solo/small-team project.

## Alternatives rejected

- **No structured workflow, rely on prompt engineering**: each session re-litigates the same rules. Drift is guaranteed.
- **GitHub Copilot / Cursor / Claude rules files only, no canonical source**: every agent has slightly different rules; cross-agent reviews diverge.
- **External wiki for project rules**: requires API access for agents, breaks on outages, drifts from code.
- **Pre-commit hook only, no plan-gate**: catches regressions but not misunderstandings. Plan-gate is upstream and prevents work from starting wrong.

## Consequences

**Easier**:
- New agents onboard in one read of `docs/agents/OVERVIEW.md` + `CONVENTIONS.md` + `STATUS.md`.
- The next session knows exactly what's in progress and what's next.
- Every architectural choice has a documented rationale that future agents can challenge or extend.
- CI failures become rare because the local gate runs the same checks.

**Harder**:
- Every source code change has a plan-step latency before code starts. Acceptable for the bug-prevention payoff.
- Documentation updates are mandatory at commit time. A feature without a `CHANGELOG` entry isn't done.
- Pushing is always manual — agents stop after local commit. This is by design.

**New commitments**:
- Keep `docs/agents/CONVENTIONS.md` in sync with `CLAUDE.md §1`, `AGENTS.md`, and `.cursor/rules/byoa.mdc` summaries. (Each has a sync-note pointing this out.)
- Every architectural decision gets an ADR.
