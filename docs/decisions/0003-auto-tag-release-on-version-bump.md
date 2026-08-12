# ADR-003: Auto-create a release tag when `package.json` version bumps

**Date**: 2026-08-12
**Status**: Accepted
**Decider**: Shivam Mishra + AI agent (session 2026-08-12)

## Context

`bundle-and-release.yml` builds, bundles, and publishes a GitHub Release, but only when a `v*` tag is pushed manually (`git tag v0.0.9 && git push origin v0.0.9`). Nobody has been doing that consistently — the last release (`v0.0.9`) predates several merged improvements (local history/SQLite, AI-SDLC bootstrap, MacOS fixes). Releases were falling behind because the trigger required a manual, easy-to-forget step, and the release body was just a bare title with no changelog.

## Decision

Add `tag-on-version-bump.yml`: on every push to `main` that touches `package.json`, read the `version` field, and if a tag `v<version>` doesn't already exist, create and push it, then explicitly dispatch `bundle-and-release.yml` via `gh workflow run bundle-and-release.yml --ref v<version>`.

The explicit dispatch is necessary because tags pushed using the default `GITHUB_TOKEN` do not trigger other workflows (GitHub's built-in recursion guard) — relying on `bundle-and-release.yml`'s existing `push: tags: v*` trigger alone would silently no-op. `bundle-and-release.yml` needed no trigger changes: `workflow_dispatch` with an explicit `--ref` sets `github.ref_name` identically to a real tag push, so the same job logic (`${{ github.ref_name }}`) serves both paths.

`bundle-and-release.yml`'s release job also now generates release notes by checking out full history (`fetch-depth: 0`), finding the previous tag by creation date, and running `git log <prev>..<current> --pretty=format:'- %s (%h)'`, appended with a `**Commits included:** <start-sha>...<end-sha>` line — the range of commits covered by the release.

## Rationale

- **Trigger off `package.json`, not a manual tag**: the human already expresses release intent by bumping the version number in a commit; requiring a *second*, separate manual step (tagging) is exactly the friction that caused releases to go stale.
- **Idempotency via tag-existence check**: re-running the workflow (e.g., a `package.json` change that isn't a version bump, or a re-push) is a safe no-op rather than a duplicate/failed release.
- **Plain `git log` concatenation over changelog tooling**: the ask was specifically "concatenate the commit messages" — no conventional-commits parsing or categorization was requested, and adding that now would be unrequested scope.
- **`gh workflow run --ref` over a PAT**: avoids provisioning and storing a personal access token as a repo secret just to work around the same-token trigger restriction.

## Alternatives rejected

- **Personal Access Token (PAT) secret for the tag push**, which would let the tag push itself trigger `bundle-and-release.yml` normally: rejected to avoid the extra secret-management burden (rotation, scope) for a problem `gh workflow run` already solves without new credentials.
- **Auto-bumping `package.json` version automatically** (e.g., from commit history via semantic-release): rejected — the human wasn't asked about this and it changes how versioning decisions are made; out of scope for "add an action that reacts to a version bump."
- **Squashing the two workflows into one**: rejected — keeping tag-creation separate from build/bundle/release preserves the existing manual-tag-push path (a human can still `git tag && git push` directly) as a fallback/override.

## Consequences

- Bumping `version` in `package.json` and merging to `main` is now sufficient to produce a tagged release with artifacts and a commit-log release body — no separate manual tagging step.
- `package.json`'s version (`1.0.0` as of this ADR) is out of step with the existing tag sequence (`v0.0.1`–`v0.0.9`). The next version bump will produce `v1.0.0`, skipping the `v0.0.x` range entirely unless the human deliberately sets an intermediate version first. This was flagged to the human and left as their call.
- A no-op push to `package.json` (touching the file without changing `version`) is safe — the tag-existence check skips tagging/dispatch.
