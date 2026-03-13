## 1. Server — Batch Endpoint

- [x] 1.1 Add Zod request/response schemas for `POST /v3/messages/batch` in `v3SessionRoutes.ts`: request body with `sessions` array (max 50 entries, each `{ sessionId: string, afterSeq: number, limit?: number }`), response with `sessions: Record<string, { messages, hasMore }>`
- [x] 1.2 Implement the batch route handler: single ownership query (`Session.findMany` with `WHERE id IN (...) AND accountId = userId`), then `SessionMessage.findMany` with `WHERE sessionId IN (...) AND seq > afterSeq` per owned session, respecting per-session and global (500) message caps, using existing `toResponseMessage` for message formatting
- [x] 1.3 Verify the endpoint works with the dev stack: start server, send a manual `curl` request to `POST /v3/messages/batch` with 2-3 session IDs and confirm correct response shape

## 2. App — Batch Fetch Client Method

- [x] 2.1 Add a `fetchMessagesBatch` method to `apiSocket.ts` (or `sync.ts`) that sends `POST /v3/messages/batch` and returns the typed response. Reuse the existing `apiSocket.request()` mechanism for making authenticated REST calls.
- [x] 2.2 Add a `batchFetchAndDispatch` method to `sync.ts` that: accepts the `connect-state` sessions map, builds the batch request (sessions where `serverSeq > clientSeq`), calls `fetchMessagesBatch`, decrypts messages per session using existing `encryption.getSessionEncryption()`, enqueues decoded messages via `enqueueMessages()`, updates `sessionLastSeq`, and returns the set of session IDs that have `hasMore: true`

## 3. App — Reconnect Handler Integration

- [x] 3.1 Modify the `onConnectState` handler in `subscribeToUpdates` to call `batchFetchAndDispatch` instead of looping through sessions and calling `getMessagesSync(id).invalidate()` individually
- [x] 3.2 After `batchFetchAndDispatch` completes, call `getMessagesSync(id).invalidate()` only for sessions that returned `hasMore: true` (to continue pagination via the existing per-session endpoint)
- [x] 3.3 Keep the 3-second fallback timeout unchanged — if `connect-state` doesn't arrive, fall back to per-session `InvalidateSync` invalidations as before
- [x] 3.4 Clean up the previous `onConnectState` listener and fallback timeout on subsequent reconnects to prevent listener leaks (fix existing bug from `selective-reconnect-invalidation`)

## 4. Verification

- [x] 4.1 Run `yarn workspace joyful-server build` and `yarn workspace joyful-app typecheck` to confirm no type errors
- [x] 4.2 Test reconnect flow end-to-end: start dev stack, create a few sessions with messages, disconnect/reconnect the app, confirm batch endpoint is called once instead of N per-session fetches, and messages appear correctly
