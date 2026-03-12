## Context

Native Claude Code sessions are stored as JSONL files in `~/.claude/projects/<path-id>/` where `<path-id>` is the absolute working directory with non-alphanumeric characters replaced by `-`. The daemon already knows this layout (via `getProjectPath` in `claude/utils/path.ts`) and uses it in `claudeCheckSession`. When the app spawns a new Joyful session, it has no visibility into existing native sessions at the chosen working directory.

The `spawn-joyful-session` RPC already reserves a `sessionId` parameter with a TODO comment noting it could support `--resume` in the future. The `Session` object in `loop.ts` is always initialized with `sessionId: null`. Threading a native session ID through these layers is the critical path for the resume fork mechanic.

## Goals / Non-Goals

**Goals:**
- List native sessions for a specific directory via a daemon RPC
- Present a searchable browser modal in the app showing those sessions
- Allow the user to fork any non-tracked native session into a new Joyful session
- Show already-tracked sessions greyed out (visually informational only)
- Integrate discovery into the new-session wizard after path selection

**Non-Goals:**
- Cross-project browsing (scoped to one working directory at a time)
- Read-only history import without a live resume (always forks)
- Session deletion or management of native sessions
- Tapping greyed-out sessions to navigate to the Joyful record

## Decisions

### Decision 1: Daemon-side RPC for session listing, app-side tracking decoration

The daemon scans the filesystem and returns raw session metadata. The app computes `isTracked` by comparing each session's ID against the `claudeSessionId` values across all known Joyful sessions. This avoids the daemon needing knowledge of Joyful session state, which it doesn't own.

Alternative considered: daemon tracks which Claude session IDs it has spawned and marks them itself. Rejected — the daemon's session tracking is runtime-only; it doesn't persist Joyful session linkage across restarts.

### Decision 2: Partial file reads for metadata extraction

For each JSONL file, read only the first ~50 lines. This captures the `file-history-snapshot`, any `{"type":"summary"}` line (present in compacted sessions), and the first `{"type":"user"}` message for title extraction. Full-file reads for 61 sessions would be unnecessarily heavy.

Title priority: `summary.summary` → first user message text (truncated to 100 chars) → session ID short form (`abc12...3456`).

### Decision 3: `resumeNativeSessionId` as a separate spawn parameter

The existing `sessionId` in `spawnSession` is the Joyful server-side session ID. We add a distinct `resumeNativeSessionId: string | undefined` parameter to avoid conflating the two ID spaces. This threads into `loop.ts` Session construction as the initial `sessionId`, which `claudeRemote` then validates via `claudeCheckSession` and uses as the `resume` target.

When Claude forks, `onSessionFound` fires with the new session ID and overwrites `sessionId`, so subsequent reconnects resume the fork (not the original native session).

Alternative considered: pass via `claudeArgs: ['--resume', id]`. Rejected — `claudeRemote` already has first-class session resume logic including file existence validation; reusing that is cleaner than duplicating it via raw args.

### Decision 4: Browser as a modal sheet, triggered from wizard path section

The browser lives in a modal (bottom sheet on mobile, centered dialog on web) rather than a dedicated route. This keeps it lightweight and contextual. The trigger is a "Browse native sessions" link/button that appears in the new-session wizard after a working directory is selected and a daemon is online.

Showing 10 most recent by default with a "Show all (N)" expansion keeps the initial list scannable without overwhelming users who have hundreds of sessions.

### Decision 5: No i18n for session content (summaries/first messages)

Native session content is always in the language the user typed. We do i18n the chrome (headers, buttons, empty states, status labels) but not the session title strings themselves.

## Risks / Trade-offs

[JSONL parse errors in native sessions] → Silently skip malformed files; log at debug level. A corrupt session should not crash the RPC or hide other valid sessions.

[Large session counts (60+ files) causing slow RPC response] → Cap partial read at 50 lines per file; run file reads in parallel with `Promise.all`. If still slow, add a server-side cache keyed by (path, mtime) in a future pass.

[Session file mtime as "last used" approximation] → File mtime reflects the last write to the JSONL, which corresponds to the last message in the session. This is a good proxy but doesn't account for `--fork-session` scenarios where the original is untouched. Acceptable for a "most recent" sort.

[Native sessions from other Joyful machines on the same filesystem] → A session might appear in this machine's native session list AND be tracked on a different machine's Joyful record. The app's `isTracked` check uses all sessions across all machines, so such sessions will appear greyed out. This is the correct behavior — it prevents double-resuming.

## Migration Plan

- No database migrations required.
- New RPC handler is additive; old app versions simply won't call it.
- `resumeNativeSessionId` in `spawn-joyful-session` is optional; existing callers unaffected.
- No rollback complexity.

## Open Questions

- Should the modal cache the session list after first load within the wizard session, or re-fetch every time it opens? (Lean toward re-fetch — cheap, always fresh.)
