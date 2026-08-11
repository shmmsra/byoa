# ADR-002: Local query/response history via native SQLite

**Date**: 2026-08-11
**Status**: Accepted
**Decider**: Shivam Mishra + AI agent (session 2026-08-11)

---

## Context

Users asked to be able to browse past LLM queries/responses from a "History" tab in Settings. Today the app persists nothing about past requests: `InvokeLLM` (`src/web/utils/llm.ts`) returns a result that lives only in `AssistantPopup`'s React state and disappears on close/restart. The only existing local persistence is `Vault` (`src/native/source/xplat/vault.cpp`), a Keychain-backed key/value store meant for small secrets (LLM configs, actions, theme) — not a queryable log that will grow into the hundreds or thousands of rows.

BYOA is not Electron — it's a native C++23 app (Saucer webview + React frontend) with no Node runtime at app runtime (`docs/agents/OVERVIEW.md`). Any local database therefore has to be a native C++ dependency exposed to the web layer through the existing `saucer` IPC bridge (`expose()` calls in `webview-wrapper.cpp`), the same pattern already used for clipboard, vault, and network access. This is a change to the native IPC surface, which `docs/agents/CONVENTIONS.md §4` calls out as requiring explicit approval before implementation.

The app is also single-shot request/response (no multi-turn conversation threading), so "history" is a flat, timestamped log rather than a set of conversations.

## Decision

Store history as a flat SQLite table via **SQLiteCpp** (MIT license, wraps the public-domain SQLite amalgamation — no licensing concern), added as a native dependency via CMake `FetchContent`. The database lives at an OS-appropriate app-data directory (`%APPDATA%\BYOAssistant`, `~/Library/Application Support/BYOAssistant`, or `$XDG_DATA_HOME/BYOAssistant`/`~/.local/share/BYOAssistant`), resolved and created on demand in `src/native/source/xplat/history.cpp`.

Four new IPC calls are exposed, mirroring the `vault_*` pattern: `history_saveEntry`, `history_queryEntries`, `history_deleteEntry`, `history_clearAll`. The web layer never talks to SQLite directly — it calls `HistoryUtils` (`src/web/utils/history.ts`), which serializes to/from JSON over the bridge.

History is recorded at the `assistant-popup.tsx` call site (inside the local `invokeLLM` helper), not inside `InvokeLLM` itself — `InvokeLLM` is the vendor-agnostic provider chokepoint (`CONVENTIONS.md §3`) and should not accumulate history-specific concerns. The call site already has access to the LLM config name, the action (if any) that triggered the call, and can time the request, so it can build a complete row; the save call is fire-and-forget so a history write failure never breaks the actual LLM flow.

Schema:
```sql
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_hash TEXT NOT NULL,
  request TEXT NOT NULL,
  system_content TEXT NOT NULL DEFAULT '',
  response TEXT,
  model TEXT NOT NULL,
  llm_config_name TEXT,
  action_id TEXT,
  action_name TEXT,
  status TEXT NOT NULL,            -- 'success' | 'error'
  error_message TEXT,
  response_time_ms INTEGER,
  requested_at TEXT NOT NULL,      -- ISO 8601
  schema_version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_history_requested_at ON history(requested_at);
```

Data is stored unencrypted. Retention is manual only: users delete individual rows or clear all history from the new History tab (`src/web/components/history-tab.tsx`); there is no auto-cap or expiry in v1.

### Amendment (2026-08-11): `system_content` column

The initial implementation only stored `request` (the clipboard content sent as the user message) — the actual instruction given to the LLM (the action's canned prompt, or a typed custom prompt) was never persisted for either path, making the History tab's ad-hoc rows uninformative about what was actually asked. Added a `system_content` column, populated for both Action-triggered and ad-hoc calls, bumping `HISTORY_SCHEMA_VERSION` to `2`. Existing databases are migrated in place: `History::init()` checks `PRAGMA table_info(history)` and runs `ALTER TABLE history ADD COLUMN system_content TEXT NOT NULL DEFAULT ''` if the column is missing, so no data is lost on upgrade — pre-existing rows simply have an empty `system_content`.

## Rationale

- **SQLiteCpp over raw `sqlite3` C API**: RAII wrappers (`SQLite::Database`, `SQLite::Statement`) reduce manual resource/error-code handling, keeping `history.cpp` consistent in style with the rest of the codebase (exceptions + `Logger`, same as `network.cpp`).
- **`request_hash` as a plain (non-cryptographic) content fingerprint** (`std::hash<std::string>`, not SHA-256): its only purpose is spotting/deduping identical requests later; there's no security requirement that justifies a crypto dependency for this.
- **Recording at the `assistant-popup.tsx` call site, not inside `InvokeLLM`**: the call site already has the config name and action metadata that `InvokeLLM`'s vendor-agnostic signature deliberately doesn't carry; threading history concerns into `InvokeLLM` would couple the provider chokepoint to a persistence feature.
- **Per-row `schema_version`**: lets future migrations distinguish rows written by older client versions without needing a blocking migration step at startup.
- **Manual-only retention for v1**: avoids committing to a cap/expiry policy before real usage data exists; per-row delete + "Clear all" cover the immediate need.
- **No encryption at rest**: explicit product decision — history is local-only, never leaves the device, and the added complexity/UX friction of encryption wasn't judged worth it for this data.

## Alternatives rejected

- **Embed Node/`better-sqlite3`**: not viable — there is no Node runtime at app runtime; the project deliberately avoids Electron to stay lightweight.
- **Content-hash as primary key**: rejected because identical repeated prompts would collide, breaking the ability to keep every occurrence and to order/paginate by insertion.
- **Record history inside `InvokeLLM`**: rejected to keep the provider chokepoint vendor-agnostic and free of feature-specific state (action metadata, config display name).
- **Auto-cap or time-based expiry in v1**: rejected as premature — no usage data yet to size a sensible default; manual controls are simpler and reversible.
- **Encrypt history at rest**: rejected per explicit product decision; revisit if BYOA later handles more sensitive clipboard content by default.

## Consequences

**Easier**:
- Users can review, search/filter, and manage past queries without leaving Settings.
- Future schema changes have a per-row version marker to key off.

**Harder**:
- The native build now depends on SQLiteCpp (fetched via CMake `FetchContent`), adding to build time and requiring verification on Windows/macOS/Linux.
- Unbounded history growth is possible until a retention policy is revisited; users must know to use "Clear all" if they care about disk usage.

**New commitments**:
- Any future change to the `history` schema must bump `schema_version` and consider existing rows written under the previous version.
- The `history_*` IPC surface is now part of the native/web contract — changes to it fall under the same approval gate as this ADR.
