## Context

The joyful CLI is designed to be started from within an existing Claude Code terminal session (that's the primary use case). Claude Code sets `CLAUDECODE=1` in the environment of any subprocess it launches. When the joyful daemon then spawns a child claude process to handle a remote session, the child inherits `CLAUDECODE=1` and Claude Code's built-in nesting guard immediately rejects it:

```
Error: Claude Code cannot be launched inside another Claude Code session.
```

The spawn chain is:
```
Claude Code (CLAUDECODE=1)
  └─ joyful daemon (inherits CLAUDECODE=1)
       └─ node dist/index.mjs claude (inherits CLAUDECODE=1)
            └─ node claude_remote_launcher.cjs ... (inherits CLAUDECODE=1)
                 └─ native claude binary  ← exits code 1 immediately
```

The resulting error propagates back as `{}` in logs (because `JSON.stringify(new Error(...))` returns `{}`) and surfaces to the user as "Process exited unexpectedly".

## Goals / Non-Goals

**Goals:**
- Claude subprocesses spawned by the daemon run successfully when `CLAUDECODE=1` is in the parent environment
- Error logging is actionable (shows error.message, not `{}`)

**Non-Goals:**
- Changing the user-facing session spawning flow
- Handling Codex/Gemini agents (they don't use `CLAUDECODE`)

## Decisions

### Decision 1: Strip `CLAUDECODE` in `query.ts` spawn env

**Chosen**: Strip `CLAUDECODE` (and `CLAUDE_CODE_ENTRYPOINT`) from `spawnEnv` before spawning any subprocess in `query.ts`.

**Rationale**: `query.ts` is the single point where all subprocess spawning happens. Fixing here covers:
- The `claude_remote_launcher.cjs` path (remote sessions)
- The bundled `cli.js` path (metadata extractor)

Since the launcher inherits the cleaned env and then passes `process.env` to the native binary, one fix in `query.ts` breaks the entire chain.

**Alternative considered**: Fix only in `claude_version_utils.cjs`'s `runClaudeCli`. Rejected because it only covers the native binary path and misses the bundled CLI case.

**Alternative considered**: Strip at the OS level before starting the daemon (document it in CLAUDE.md). Rejected because it requires manual setup on every machine, is fragile, and the right fix is in code.

### Decision 2: Also strip in `claude_version_utils.cjs`

**Chosen**: Add `delete env.CLAUDECODE` in `runClaudeCli` as defense-in-depth.

**Rationale**: The launcher is called with the full process.env even when `query.ts` doesn't provide a custom env. Since `runClaudeCli` builds its own env object before spawning, stripping there is both cheap and safe.

### Decision 3: Fix error logging to show `error.message`

**Chosen**: In `claudeRemoteLauncher.ts`, log `(e instanceof Error ? e.message : String(e))` instead of just `e`.

**Rationale**: `JSON.stringify(new Error("..."))` returns `{}` — the message is stored in a non-enumerable property. This single change makes all launch errors immediately legible without any other infrastructure changes.

## Risks / Trade-offs

- **Risk**: Stripping `CLAUDECODE` allows nesting in truly problematic scenarios (not just joyful). **Mitigation**: joyful is explicitly a controlled subprocess manager; it sets `CLAUDE_CODE_ENTRYPOINT = 'sdk-ts'` to signal SDK use, so the intent is already declared.
- **Risk**: Future Claude Code versions add more nesting-guard env vars. **Mitigation**: The fix is localized; we can add new vars to strip as needed.

## Migration Plan

1. Patch `query.ts` to strip env vars
2. Patch `claude_version_utils.cjs` to strip env vars in `runClaudeCli`
3. Patch `claudeRemoteLauncher.ts` error logging
4. Build: `yarn workspace joyful build`
5. Restart daemon (kills existing session process, starts fresh one that uses the new binary)

No server changes, no app changes, no migration needed.

## Open Questions

None — root cause is confirmed and fix is unambiguous.
