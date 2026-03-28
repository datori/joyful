## Why

When a user opens an archived session and sends a message, the message is silently stored on the server but never processed — the CLI process is dead and no `ApiSessionClient` is listening. Sending a message to an archived session should automatically fork it (via `--resume`) so Claude can respond with full history intact.

## What Changes

- When the user sends a message in the app and the target session is inactive (`session.active === false`), the app will first spawn a new session with `resumeNativeSessionId` set to the archived session's native Claude session ID (from `session.metadata.sessionId`)
- The new session forks the archived session's full history; the daemon's normal message polling loop picks up the pending message once the new session is live
- After spawning, the app navigates the user to the new (active) forked session
- If the machine is offline or the spawn RPC fails, an error is surfaced via the existing error handling (`useJoyfulAction`)
- The archived session remains in the archived list unchanged; the fork appears as a new active session

## Capabilities

### New Capabilities

- `archived-session-resume`: Automatically resuming (forking) an archived session when the user sends a new message to it — detecting inactive sessions pre-send, triggering the spawn RPC with `resumeNativeSessionId`, and navigating to the new session

### Modified Capabilities

_(none — archived-sessions-list display behavior is unchanged)_

## Impact

- **joyful-app `sources/-session/SessionView.tsx`**: `onSend` handler needs to detect inactive session and call `machineSpawnNewSession()` with `resumeNativeSessionId` before sending the message
- **joyful-app `sources/sync/ops.ts`**: `machineSpawnNewSession` already supports `resumeNativeSessionId`; no changes needed
- **joyful-app `sources/sync/storageTypes.ts`**: Need to confirm `session.metadata.sessionId` holds the native Claude session ID
- **joyful-cli**: No changes needed — daemon already handles `resumeNativeSessionId` via `JOYFUL_RESUME_NATIVE_SESSION` env var
- **joyful-server**: No changes needed — message endpoint already stores messages for any session regardless of `active` state
