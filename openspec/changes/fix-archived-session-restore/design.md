## Context

When a session is archived (`session.active === false`), the CLI process has been terminated. Any new message sent via the app is stored on the server but never picked up — the `ApiSessionClient` for that session no longer exists.

All the plumbing to fix this already exists on the CLI side:
- `machineSpawnNewSession()` in `ops.ts` accepts `resumeNativeSessionId`
- The daemon passes it as `JOYFUL_RESUME_NATIVE_SESSION` env var to a new child process
- Claude Code's `--resume <id>` forks the session with full history under a **new** session ID on the server
- The fork's `ApiSessionClient` connects and polls for messages on its own new session ID

The native Claude session ID is stored in `session.metadata.claudeSessionId`. The machine ID is in `session.metadata.machineId`.

## Goals / Non-Goals

**Goals:**
- When the user sends a message to an archived session, automatically spawn a forked session with `resumeNativeSessionId = session.metadata.claudeSessionId` and navigate to it
- The message the user typed is pre-filled on the new session view for review and send
- Surface errors (machine offline, spawn failure) via `useJoyfulAction`

**Non-Goals:**
- In-place reactivation — the fork always creates a new session ID
- Server or CLI changes — none needed
- Resuming non-Claude sessions (Codex, Gemini) — `claudeSessionId` absent → skip this path

## Decisions

### Decision 1: Intercept in `SessionView.onSend`, not in `sync.sendMessage`

`sync.sendMessage` is a fire-and-forget queue — it should not own async RPC logic or navigation. The view layer (`SessionView`) already has router access and uses `useJoyfulAction` for async error handling. The fork check belongs there.

_Alternative rejected_: guard in `sync.sendMessage` — it can't navigate and breaks the sync engine's contract.

### Decision 2: Spawn, navigate, re-send on new session

Claude's `--resume` creates a **new server-side session ID**. The new session's daemon polls messages for that new ID only — not the old archived session. Therefore:

```
onSend detects session.active === false
    ↓
machineSpawnNewSession({ machineId, directory, resumeNativeSessionId: claudeSessionId })
    ↓
  success: { sessionId: newId }
    ↓
navigate to /session/${newId}  (pass original message text via initialMessage route param)
    ↓
new SessionView pre-fills input with the message text → user sends normally
```

Sending the message to the **old** session ID then having the fork pick it up is not viable — the fork's `ApiSessionClient` fetches from its own new session ID, not the archived one.

_Alternative rejected_: call `sync.sendMessage(newId, text)` immediately after spawn before navigation — timing race: session may not be in sync storage yet when `sendMessage` checks `storage.getState().sessions[sessionId]`.

### Decision 3: Pass message via `initialMessage` route param

The session route `session/[id].tsx` adds an optional `initialMessage` param. `SessionView` accepts a matching optional prop. On mount, if `initialMessage` is provided and the session is in storage, the message is pre-filled in the input (as a draft). The user then sends it normally.

_Alternative rejected_: auto-send — pre-filling is safer; the user can review and cancel if the fork didn't work as expected.

_Alternative rejected_: `tempDataStore` — route param is simpler and self-documenting.

### Decision 4: Fallback if `claudeSessionId` is missing

If `session.metadata?.claudeSessionId` is falsy (rare: session was killed before Claude registered), skip the resume path. Fall through to the existing `sync.sendMessage` call — behavior unchanged (silently fails as before). A future improvement could spawn a fresh session, but that's out of scope.

## Risks / Trade-offs

- **[Machine offline]** → spawn RPC times out → `useJoyfulAction` surfaces error automatically.
- **[Fork = new session in list]** → User sees a new session created; archived session stays archived. This matches Claude Code's native semantics but may surprise users. Acceptable for now.
- **[Race: session not in storage on new view mount]** → Pre-fill via draft/input state doesn't require session to be in storage. The session appears in storage via the real-time feed shortly after spawn returns. Low risk.

## Migration Plan

No migration needed. All changes are additive: new optional prop/param on the session screen, new branch in `onSend`.

## Open Questions

- Should there be a brief "Resuming..." loading indicator during the spawn RPC (2–4 seconds)?
- Should voice input (`onMicPress`) also trigger resume for archived sessions?
