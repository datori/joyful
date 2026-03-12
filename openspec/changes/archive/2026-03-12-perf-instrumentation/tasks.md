## 1. Server: PerfLog Writer

- [x] 1.1 Create `packages/joyful-server/sources/storage/perfLog.ts` — exports `perfLog(event: PerfEvent): void` that appends to `data/perf.ndjson` when env var is set, no-op otherwise
- [x] 1.2 Define `PerfEvent` TypeScript interface covering all operation types from spec (http.request, db.query, app.foreground, ws.connected, ws.msg.fast, ws.msg.slow, fetch_msgs, app.synced, outbox.flush)
- [x] 1.3 Create `data/` directory if it doesn't exist on first write; use `appendFileSync` with newline terminator

## 2. Server: Fastify HTTP Hook

- [x] 2.1 In the Fastify app setup (where routes are registered), add an `onResponse` hook that calls `perfLog` with method, path template (`req.routeOptions.url`), status code, and `reply.elapsedTime`
- [x] 2.2 Verify path template uses `:param` notation (Fastify `req.routeOptions.url` already provides this)

## 3. Server: Prisma Query Middleware

- [x] 3.1 In `packages/joyful-server/sources/storage/db.ts`, wrap the Prisma client with `$extends` to intercept all queries: record `Date.now()` before, `await next(query)`, then call `perfLog` with model, action, and `dur_ms`
- [x] 3.2 Ensure the `$extends` block is only applied when env var is set (check at module init, not per-query)

## 4. Server: Dev Perf Endpoint

- [x] 4.1 In `packages/joyful-server/sources/app/api/routes/devRoutes.ts`, add `GET /dev/perf` route (inside existing env var guard) that reads the last 500 lines of `data/perf.ndjson`, parses each as JSON, and returns `{ events, total }`
- [x] 4.2 Handle missing file gracefully (return `{ events: [], total: 0 }`)

## 5. Server: Accept App/CLI Perf Events

- [x] 5.1 In `devRoutes.ts`, add `POST /dev/perf` route accepting `{ events: PerfEvent[] }` body, iterating and calling `perfLog` for each event (preserves original `ts` from the client)

## 6. App: Perf Buffer Utility

- [x] 6.1 Create `packages/joyful-app/sources/utils/perfBuffer.ts` — exports `perfMark(op: string, meta?: Record<string, unknown>): void` that buffers events (ring buffer, max 500) when env var is set
- [x] 6.2 Implement 5-second interval flush: batch POST all buffered events to `/dev/perf`, clear buffer on success
- [x] 6.3 Implement `flushPerfBuffer()` for on-demand flush (called on app background)
- [x] 6.4 All functions are no-ops when `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` is not set

## 7. App: Foreground and Socket Markers

- [x] 7.1 In `sync.ts` `AppState` change listener, call `perfMark('app.foreground')` and store the timestamp when transitioning to `active`
- [x] 7.2 In `apiSocket.ts` `connect` handler, call `perfMark('ws.connected', { dur_ms: Date.now() - foregroundTs })` using the stored foreground timestamp
- [x] 7.3 After dispatching all sync invalidations in the `active` state handler, call `perfMark('app.synced', { dur_ms, sessions_count })`
- [x] 7.4 On app background in `AppState` change listener, call `flushPerfBuffer()`

## 8. App: Streaming Path Markers

- [x] 8.1 In `sync.ts` `handleUpdate` for `new-message`, on fast-path branch (seq === lastSeq + 1): call `perfMark('ws.msg.fast', { seq, dur_ms })` after decrypt and enqueue
- [x] 8.2 On slow-path branch (getMessagesSync invalidate): call `perfMark('ws.msg.slow', { seq, reason })` — derive reason: `"first_load"` if `currentLastSeq === undefined`, `"seq_gap"` otherwise
- [x] 8.3 In the reconnect handler where `getMessagesSync(id).invalidate()` is called in the loop, call `perfMark('ws.msg.slow', { seq: -1, reason: 'reconnect' })` once per session (not once globally)

## 9. App: fetchMessages Timing

- [x] 9.1 In `sync.ts` `fetchMessages`, record `Date.now()` at entry and after the while loop; call `perfMark('fetch_msgs', { session_id: sessionId.slice(0, 8), count: totalNormalized, pages, dur_ms })`
- [x] 9.2 Track page count in the existing `while (hasMore)` loop

## 10. CLI: Outbox Flush Timing

- [x] 10.1 Locate the outbox flush function in `packages/joyful-cli/src/api/apiSession.ts`
- [x] 10.2 Record `Date.now()` before and after each flush; POST a single `outbox.flush` event to `/dev/perf` with `count` and `dur_ms` (fire-and-forget, like existing remote logging)
- [x] 10.3 Only POST when `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` is set and `JOYFUL_SERVER_URL` is available

## 11. Verification

- [x] 11.1 Start dev stack with env var set, use the app for 2+ minutes (open sessions, trigger Claude run), then `cat packages/joyful-server/data/perf.ndjson | jq -c 'select(.op == "db.query")' | head -20` to verify DB events are present
- [x] 11.2 Verify fast-path events appear during streaming: `cat packages/joyful-server/data/perf.ndjson | jq 'select(.op == "ws.msg.fast") | .dur_ms'`
- [x] 11.3 Verify `GET /dev/perf` returns events: `curl -s http://localhost:3007/dev/perf | jq '.total'`
- [x] 11.4 Background the app and verify buffer flush events arrive: `tail -5 packages/joyful-server/data/perf.ndjson`
