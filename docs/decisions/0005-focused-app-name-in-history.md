# ADR-0005: Capture the focused app's name in history for context

**Date**: 2026-08-12
**Status**: Accepted
**Decider**: Shivam Mishra + Claude (session 2026-08-12)

## Context

The History tab records every query/response, but a row only shows the clipboard content, prompt, model, and outcome — not *which app the user was in* when they triggered BYOA. That context (e.g. "was this from Slack, VS Code, or a PDF reader?") makes old history rows much easier to interpret, especially weeks later.

macOS already resolves the frontmost app's PID at shortcut-trigger time (`app-controller.mm`, to drive copy/paste simulation via `AppController::_copyContent`/`_pasteContent`). Windows had a `TODO` stub for the equivalent PID capture. Neither platform previously captured a human-readable app *name*.

## Decision

Capture the focused app's display name in the same place each platform already captures its PID — at shortcut-trigger time, before the assistant popup steals focus — and store it on a new `focused_app_name` column on the `history` table. The name is stamped onto the entry **server-side**, inside the `history_saveEntry` IPC handler in `webview-wrapper.cpp`, by reading `AppController::getFocusedAppName()` directly, rather than having the frontend pass it through. This avoids adding a new IPC-exposed function, and avoids a race where the user could switch apps between the shortcut trigger and the (async) history-save call.

- **macOS**: `NSWorkspace.frontmostApplication.localizedName` (e.g. "Slack", "Visual Studio Code") — the OS-provided human-readable name, already available since `frontmostApplication` was already being read for the PID.
- **Windows**: `GetForegroundWindow` → `GetWindowThreadProcessId` → `QueryFullProcessImageNameW`, then the executable's basename without extension (e.g. "slack", "Code") — not the full product name from version resource metadata.
- **Linux**: not implemented — there is no native Linux backend in this repo yet (`src/native/source/{mac,win}` only).

## Rationale

Reusing the existing focus-capture call site means no new perf cost: it's one more property read (mac) or one more Win32 call chain (Windows) on a codepath that already runs once per shortcut trigger, not on any hot path or render loop.

Injecting the name server-side keeps the frontend/native IPC contract unchanged (no new exposed function, no new field the frontend must remember to pass) and keeps the "what was I looking at" answer authoritative — it reflects what the native layer actually observed, not what the webview claims.

The Windows executable-basename choice (vs. resolving `FileDescription`/`ProductName` from the PE version resource) avoids adding a new link dependency and the extra `GetFileVersionInfo`/`VerQueryValue` code for a v1 feature whose main value is "some readable hint", not a polished display name.

## Alternatives rejected

- **Frontend passes the app name via a new field on `history_saveEntry`'s payload**: rejected — would require exposing a new query (e.g. `getFocusedAppName`) for the frontend to read at popup-open time, and introduces a window where the user could alt-tab before the save call fires, producing a stale/wrong name.
- **Windows: resolve full product name via version resource (`VerQueryValue`)**: deferred — real product names are nicer ("Slack" vs. "slack") but need `GetFileVersionInfoSizeW`/`GetFileVersionInfoW`/`VerQueryValueW` and are missing on many binaries (Electron apps, CLI-launched tools) requiring a basename fallback anyway; not worth the extra code for v1.
- **Bumping `HISTORY_SCHEMA_VERSION` (the frontend-side payload version constant)**: rejected — the frontend's outgoing payload shape is unchanged (it never sends this field); only the persisted DB schema gains a column, migrated the same way `system_content` was (see ADR-002 amendment), so no frontend schema-version bump is needed.

## Consequences

- History rows going forward carry a `focused_app_name` column (empty string for rows written before this change, or when the OS lookup fails, e.g. system window has no owning process).
- Windows history rows show an executable basename, not a polished app name — a small UX inconsistency with macOS's `localizedName` output. Acceptable for v1; revisit if it's confusing in practice.
- Any future Linux native backend must add its own focused-window lookup (e.g. `_NET_ACTIVE_WINDOW` via X11, or a Wayland-specific mechanism) to populate this field — there's no existing pattern to copy on that platform yet.
