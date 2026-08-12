# BYOA (Build Your Own Assistant) — Manual Testing Runbook

> Canonical runbook for manual verification before commit. Automated tests prove correctness; manual tests prove the feature works end-to-end in the actual runtime environment.
>
> **When you add a new feature, UI element, LLM integration, or IPC message, add a section here in the same commit.**

---

## How to use this file

For every feature area, this file lists:

1. **The exact command(s)** to run
2. **The setup** (env vars, fixtures, preconditions)
3. **What to observe** (UI state, log lines, output)
4. **Pass criteria** (concrete, observable conditions)
5. **Fail indicators** (symptoms that mean the feature is broken or a regression has occurred)

The agent writes these for every new runtime-affecting change. The human runs them before commit approval.

---

## Test template (copy this when adding a new section)

```markdown
### <feature name>

**Test command(s)**:
  <exact shell command(s) to run, or UI action sequence>

**Setup** (if any):
  <env vars, flags, API keys, or preconditions>

**What to observe**:
  <exact UI state, log lines, or output to inspect>

**Pass criteria**:
  <concrete, observable — not "it should work" but "UI shows X", "log contains Y", "no hang">

**Fail indicators**:
  <symptoms that mean the feature is broken or another feature has regressed>
```

---

## Bootstrap sanity check

**Test command(s)**:
```bash
make check
```

**Setup**: Fresh clone; dependencies installed (`yarn install`); `make setup-hooks` has been run once.

**What to observe**: Full output of the lint pipeline.

**Pass criteria**:
- Exit code 0
- No ESLint errors (web)
- No Stylelint errors (web CSS)
- No clang-tidy errors (native)
- Pre-commit hook installed and executable (`.git/hooks/pre-commit` exists after `make setup-hooks`)

**Fail indicators**:
- Exit code non-zero
- Any lint violation
- Pre-commit hook missing (`ls .git/hooks/pre-commit` fails)

---

## App launch

**Test command(s)**: Launch the built app binary (macOS: `open build/BYOA.app`, Windows: `build\BYOA.exe`)

**Setup**: App must be fully built (`make build` or `yarn build:all`).

**What to observe**: System tray / menubar icon appears; no crash on startup.

**Pass criteria**:
- App icon visible in macOS menubar or Windows system tray
- Clicking the icon opens the assistant popup without hang
- No error dialogs on startup

**Fail indicators**:
- App crashes on launch
- No tray icon appears
- Assistant popup is blank or frozen

---

## Keyboard shortcut

**Test command(s)**: After launch, trigger the global shortcut (check Settings for the configured key).

**Setup**: App running, shortcut configured.

**What to observe**: Assistant popup appears/dismisses.

**Pass criteria**:
- Shortcut triggers the popup on first press
- Second press dismisses it
- Works when another app is in the foreground

**Fail indicators**:
- Shortcut does not respond
- Popup appears but freezes
- Other global shortcuts are broken after the change

---

## LLM API call (vendor-agnostic check)

**Test command(s)**: Open Settings → add an LLM provider config → trigger an action from the assistant popup.

**Setup**: Valid API key for at least one provider configured in Settings.

**What to observe**: Loading indicator appears immediately; response renders after API call completes.

**Pass criteria**:
- Loading spinner visible during the API call (no UI freeze)
- Response text rendered correctly
- Switching to a different provider in Settings and re-triggering uses the new provider

**Fail indicators**:
- UI hangs without a loader during the API call
- Hard-coded provider name appears in logs or UI
- Switching provider has no effect

---

## Local history storage (SQLite)

**Test command(s)**:
1. Launch the built app.
2. Configure at least one LLM provider in Settings → LLM Integrations.
3. Trigger a quick Action from the assistant popup on some clipboard text.
4. Trigger an ad-hoc custom prompt from the assistant popup.
5. Temporarily break the API key (or base URL) for a config, trigger another request, then restore it.
6. Open Settings → History.

**Setup**: At least one enabled LLM config with a valid API key (plus one deliberately-broken attempt for the error case in step 5).

**What to observe**:
- The History tab shows a loading spinner briefly, then a table of past requests, newest first.
- The Action-triggered row shows the action's label in the "Action" column; the ad-hoc row shows "Ad-hoc".
- The deliberately-failed request appears with a red "error" status tag.
- Expanding a row shows a "Prompt" section (the action's prompt, or the typed custom prompt) above "Clipboard content", plus the response (or error message) text. The Prompt text differs correctly between the Action-triggered row (shows the action's canned prompt) and the ad-hoc row (shows the exact custom prompt typed).
- Typing in the search box filters rows by keyword in the request, response, or prompt text; filtering by model and by status works.
- Deleting a row removes it immediately (with a confirm prompt); "Clear all" empties the table (with a confirm prompt).
- Quitting and relaunching the app preserves history (it's on disk, not in memory).

**Pass criteria**:
- All actions above produce a history row with correct model name, action (or "Ad-hoc"), status, and a plausible response time.
- No UI freeze while the History tab loads or while typing in the search box.
- History persists across app restart.
- Delete / Clear all actually remove rows (confirmed by re-opening the tab).

**Fail indicators**:
- History tab is empty despite having made requests.
- UI hangs while the History tab loads or while searching.
- Action metadata missing/wrong (e.g. ad-hoc prompts show an action name, or vice versa).
- Failed requests are silently dropped instead of recorded with `status: error`.
- History is lost after an app restart (indicates the DB file isn't being found/created correctly for the platform).
- Delete/Clear all appear to succeed in the UI but the rows reappear after reopening Settings.

---

---

## Auto-tag + release on `package.json` version bump

**Test command(s)**:
1. On a branch, bump `"version"` in `package.json` (e.g. `1.0.0` → `1.0.1`), commit, and merge/push to `main`.
2. Watch the Actions tab for the `Tag on Version Bump` workflow run.
3. After it completes, confirm tag `v1.0.1` exists (`git fetch --tags && git tag -l v1.0.1`) and that it triggered a `Build and Release Apps` run.
4. Once that run completes, open the repo's Releases page and inspect the `v1.0.1` release body.
5. Push another commit that touches `package.json` without changing `version` (e.g. reformat), and confirm no new tag/release is created.

**Setup**: None beyond normal repo write access; no secrets to configure (uses the default `GITHUB_TOKEN`).

**What to observe**:
- `Tag on Version Bump` creates and pushes tag `v1.0.1`, then dispatches `Build and Release Apps` for that tag.
- The release body has a `## Changes` section listing `- <commit subject> (<short sha>)` for every commit since the previous tag, plus a `**Commits included:** <start-sha>...<end-sha>` line.
- Build artifacts (macOS/Windows zips) are attached to the release, same as a manually-tagged release.
- Step 5 (no version change) produces no new tag and no new workflow dispatch.

**Pass criteria**:
- Tag, workflow dispatch, and release all happen automatically from the version bump alone — no manual `git tag`/`git push` needed.
- Release notes accurately list the commits merged since the prior release.
- Re-touching `package.json` without a version change is a safe no-op.

**Fail indicators**:
- No tag/release appears after a version bump merges to `main`.
- Release is created but the body is empty or missing the commit range.
- A `package.json` touch with an unchanged version still creates a duplicate tag or a failed release run.

---

*Add new sections below this line as features land. Group by feature area (e.g. Clipboard, Actions, Settings, IPC, Platform-specific).*
