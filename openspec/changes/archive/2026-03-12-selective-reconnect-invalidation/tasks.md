## 1. Server: emit connect-state on socket connect

- [x] 1.1 In `packages/joyful-server/sources/app/api/socket.ts`, after the connection is authenticated and `eventRouter.addConnection()` is called, query `db.session.findMany({ where: { accountId: userId }, select: { id: true, seq: true } })` and emit `socket.emit('connect-state', { sessions: Object.fromEntries(sessions.map(s => [s.id, s.seq])) })`
- [x] 1.2 Ensure the emit is only for `user-scoped` client type (not session-scoped or machine-scoped)

## 2. App: apiSocket.ts — onConnectState listener

- [x] 2.1 In `packages/joyful-app/sources/sync/apiSocket.ts`, add a `private connectStateListeners: Set<(sessions: Record<string, number>) => void> = new Set()` field
- [x] 2.2 Add `onConnectState = (listener: (sessions: Record<string, number>) => void) => { … }` method that registers and returns an unsubscribe function (same pattern as `onReconnected`)
- [x] 2.3 In `setupEventHandlers`, inside `socket.onAny`, detect the `connect-state` event and call all `connectStateListeners` with `data.sessions`

## 3. App: sync.ts — selective session invalidation

- [x] 3.1 In `packages/joyful-app/sources/sync/sync.ts`, in the `onReconnected` callback, remove the per-session `getMessagesSync(item.id).invalidate()` loop and the `perfMark('ws.msg.slow', { reason: 'reconnect' })` calls from there
- [x] 3.2 Register a `apiSocket.onConnectState` handler that performs selective invalidation: for each session in `sessionsData`, call `getMessagesSync(id).invalidate()` only if `serverSeq > (this.sessionLastSeq.get(id) ?? -1)`; retain the `perfMark('ws.msg.slow', { seq: -1, reason: 'reconnect', session_id })` call only for sessions that ARE invalidated
- [x] 3.3 Add a 3-second fallback timeout in the `onReconnected` handler: if `connect-state` has not been received by then, invalidate all sessions unconditionally and cancel the timeout once `connect-state` arrives
- [x] 3.4 Keep `gitStatusSync.invalidate(item.id)` unconditional for all sessions (not gated on seq comparison) — git status is transient and should always refresh

## 4. Verification

- [x] 4.1 Reconnect (close and reopen browser tab), check `data/perf.ndjson` — `ws.msg.slow` with `reason: reconnect` should appear only for sessions that actually had new messages since last fetch, not all sessions
- [x] 4.2 Verify `fetch_msgs` count on reconnect drops from N (all sessions) to only sessions with new content
- [x] 4.3 Confirm non-session data (machines, artifacts) still refetches on reconnect by checking server HTTP log for `GET /v1/machines` and `GET /v1/artifacts` after reconnect
