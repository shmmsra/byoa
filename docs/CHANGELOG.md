# BYOA (Build Your Own Assistant) — Changelog

> Chronological log of what changed in this repo and *why*. The "why" matters more than the "what" — the diff already shows the what.
>
> Update at the end of every session. Newest entries at the top.

---

## 2026-05-23 — ai-sdlc-bootstrap scaffold

**What changed**: Bootstrapped the AI-driven SDLC workflow on this repo via the `ai-sdlc-bootstrap` skill. Added agent-config layer (CLAUDE.md, AGENTS.md, .cursor/rules/byoa.mdc, GEMINI.md), `docs/agents/` triad (OVERVIEW, CONVENTIONS, STATUS), expanded `CONTRIBUTING.md` with AI Agent Workflow section, scaffolded `docs/issues.md` GitHub bridge, ADR archive, pre-commit gate (`make check`), `docs/manual-testing.md`, `docs/dev-setup.md`, and `.editorconfig`.

**Why**: BYOA will be developed by humans + multiple AI agents across many sessions. Without the agent-config layer and a strict plan/test/commit workflow, every session starts from zero context and agents make changes that violate unstated constraints. The scaffold installs the contract so it travels with the code.

**What was rejected**: Post-commit hook and `docs/commit-log.md` (commit-tracking convention-only, no automation requested). `CODEOWNERS` (not requested). CI workflow changes (already configured).

**What's next**: Wire up Vitest (web) and GoogleTest (native) test frameworks; extend `make check` to run tests once they exist.

---

*Add new entries above this line. Format: `## YYYY-MM-DD — Short title`, followed by `What / Why / Rejected / Next` sub-headings.*
