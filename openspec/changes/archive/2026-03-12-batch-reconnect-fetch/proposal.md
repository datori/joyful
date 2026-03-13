## Why

On socket reconnect, the app fires N independent `GET /v3/sessions/:id/messages` requests — one per session that needs new messages. With 12 sessions this means 12 parallel HTTP round-trips, each with its own TLS/TCP overhead, session ownership check, and DB query. Perf data shows reconnect wall time reaching 4.5 seconds, with 46% of fetches returning zero messages (wasted round-trips). On mobile with high-latency connections, this is the dominant source of perceived lag after backgrounding the app.

## What Changes

- Add a new batch endpoint `POST /v3/messages/batch` that accepts multiple `{sessionId, afterSeq}` pairs and returns messages for all requested sessions in a single response, with per-session `hasMore` flags.
- Replace the app's reconnect invalidation loop (N independent `InvalidateSync` invalidations) with a single batch fetch call that dispatches results to per-session message queues.
- Retain the existing per-session `GET /v3/sessions/:id/messages` endpoint for pagination and the WebSocket fast-path — it is unchanged.

## Capabilities

### New Capabilities
- `batch-message-fetch`: Server endpoint and client-side reconnect path for fetching messages across multiple sessions in a single HTTP request.

### Modified Capabilities
- `selective-reconnect-invalidation`: The reconnect handler will use the batch fetch endpoint instead of per-session InvalidateSync invalidations when connect-state arrives.

## Impact

- **Server**: New route in `v3SessionRoutes.ts`, new Zod schemas for batch request/response.
- **App**: Changes to `sync.ts` reconnect handler and potentially a new fetch method. `InvalidateSync` per-session pattern remains for non-reconnect flows.
- **Wire**: No wire-level changes needed — the batch endpoint is REST, not part of the WebSocket protocol.
- **CLI**: No changes — CLI manages single sessions and doesn't reconnect across multiple.
