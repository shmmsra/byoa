# BYOA (Build Your Own Assistant) — Engineering Conventions

> Hard constraints and contribution rules for all agents working in this repository.
> These apply to every session, every agent, every change — no exceptions.

---

## 1. Contribution workflow

### What counts as non-trivial (requires a written plan + explicit human approval before coding)

**Any change to source code** requires a written plan + explicit human approval before implementation begins. Only two categories are exempt:

- Pure documentation updates with zero code changes (`.md`, `.txt`, `docs/`, comment-only edits)
- Single-character typo fixes in comments or strings

### Exempt from the planning step (implement directly)

- Pure documentation updates
- Adding tests for an interface that is already fully designed and approved
- Dependency version bumps

### Exempt from manual testing (may commit after `make check` + diff approval)

- Pure documentation updates with zero code changes
- Test-only additions with no logic change
- Dependency version bumps with no behavioural change
- Pure internal refactors where the public API and observable output are provably unchanged

---

## 2. Implementation rules

1. **TDD is mandatory** — write the test before (or alongside) any logic change, in the same commit.
2. **`make check` must pass** before every commit.
3. **No `--no-verify`** except for docs/housekeeping commits with zero code changes.
4. **Documentation is part of done** — see `CONTRIBUTING.md §5` for the full list of docs to update per session.

---

## 3. Hard constraints

**Universal rules**:

- **No credentials in code**: API keys go in `.env` only (git-ignored). Secrets in code are a hard failure.
- **All decisions get an ADR**: If you're about to change something another agent might wonder about, write an ADR. Template in `docs/decisions/README.md`.
- **Linear history**: No `git merge --no-ff`. Use rebase or `git merge --ff-only`. Agents never run `git push`.

**Project-specific domain rules**:

1. **LLM vendor agnosticism**: Never couple BYOA's core logic to a specific LLM provider. All LLM interactions must go through the existing provider abstraction layer. Adding provider-specific code outside that layer is a hard failure.
2. **Frontend performance**: The web UI must never block or hang. Any async operation (LLM call, IPC round-trip, file I/O) must show a loading indicator while in flight. A UI that appears frozen is a bug, not a UX tradeoff.
3. **Cross-platform compatibility**: Every change must work on Windows, macOS, and Linux. Platform-specific code must be isolated behind platform detection and tested on all three targets before merging.
4. **Keyboard shortcut integrity**: Never break existing keyboard shortcut handling. Changes to shortcut registration, event listeners, or the global hotkey subsystem require explicit approval and manual testing on all platforms.

---

## 4. Approval-gated operations

The following operations **always** require explicit human approval before execution, beyond the standard plan + commit approval:

1. **Production releases / GitHub Releases**: Tagging a release or triggering `bundle-and-release.yml` requires explicit human go-ahead.
2. **CI/CD workflow edits**: Any change to `.github/workflows/` requires sign-off before the file is modified.
3. **Native C++ IPC surface changes**: Any change to the message protocol between the C++ backend and the web frontend (the IPC contract) requires explicit approval.
4. **Credential / vault code changes**: Any change to the vault, keychain, or API key storage subsystem requires explicit approval.

If you are uncertain whether an operation falls under one of these categories, ask. The cost of asking is low; the cost of an unwanted change in any of these areas is high.

---

## 5. Code-review and merge policy

This project's policy: **direct merge after local review**.

**Direct merge after local review** — code is reviewed locally by the agent and human together, then fast-forwarded or rebased directly into `main`. No PR is required for every change, though PRs may be used at the human's discretion for larger features.

- Use `git merge --ff-only` or `git rebase` when integrating a branch.
- Never `git merge --no-ff` — no merge commits.
- The human always runs `git push` — agents stop after the local commit and report the SHA.

Full detail in `CONTRIBUTING.md §6`.

---

## 6. Commit attribution and tracking

This repo uses **convention-only** commit tracking. No automated hooks enforce attribution, but the convention is:

- Agent-authored commits: use `[agent]` prefix in the commit subject if desired, e.g. `[agent] feat(ipc): add retry on disconnect`.
- Human-authored commits: no special prefix.

This is informational only — no gate blocks on it.

---

## 7. Repository hygiene files

These files are project artefacts, not metadata. **Keep them current.** Updating them is part of "done" for any change that affects them.

| File | What changes it |
|------|-----------------|
| `README.md` | New install/quick-start step, public-facing description change |
| `LICENSE` | Change in license (requires ADR) |
| `CODEOWNERS` | Module / directory ownership change |
| `.gitignore` | New build artefact, cache dir, IDE config, or secret pattern |
| `.vscode/`, IDE configs | New recommended extension or workspace setting |
| `docs/dev-setup.md` | **New dependency, tool, language toolchain, or required CLI** — onboarding will break otherwise |
| `docs/decisions/` | Architectural choice another agent might wonder about |

See `CONTRIBUTING.md §12` for the full policy.
