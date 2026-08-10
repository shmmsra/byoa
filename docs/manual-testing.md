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

*Add new sections below this line as features land. Group by feature area (e.g. Clipboard, Actions, Settings, IPC, Platform-specific).*
