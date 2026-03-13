## Context

On socket reconnect the app currently fires N independent `GET /v3/sessions/:id/messages` requests — one per session that needs new data. The recent `selective-reconnect-invalidation` change reduced which sessions get invalidated, but when sessions do need fetching, each still makes its own HTTP round-trip with its own session ownership check and DB query. Perf data from a real session shows reconnect wall times of 2–4.5 seconds with 12 sessions and 46% of fetches returning empty.

The existing per-session `InvalidateSync` pattern works well for steady-state (one message at a time via WebSocket fast-path), but is poorly suited for the burst pattern of reconnect where we know upfront exactly which sessions need data and at what seq offset.

## Goals / Non-Goals

**Goals:**
- Reduce reconnect wall time from 2–4.5s to a single HTTP round-trip (~200–500ms)
- Eliminate empty fetches during reconnect
- Preserve the existing per-session fetch path for pagination and non-reconnect flows

**Non-Goals:**
- Changing the WebSocket fast-path for individual message delivery
- Modifying the CLI's single-session fetch flow
- Adding WebSocket-based batch fetch (stay with REST for simplicity)
- Replacing `InvalidateSync` as a pattern — it remains for per-session use

## Decisions

### 1. POST endpoint with session-specific cursors

**Decision**: Use `POST /v3/messages/batch` with a body containing `sessions: Array<{ sessionId, afterSeq }>` rather than a GET with query params.

**Why**: GET query strings have practical length limits with many session IDs. POST bodies are unbounded and the request is not cacheable regardless (it contains user-specific encrypted data). The endpoint is idempotent despite being POST.

**Alternatives considered**:
- GET with comma-separated session IDs: query string length limits, can't include per-session afterSeq cursors cleanly
- WebSocket RPC: would avoid HTTP overhead but adds protocol complexity and needs its own request/response correlation; REST is simpler and sufficient

### 2. Per-session message limit with global cap

**Decision**: Accept an optional `limit` per session entry (default 100, max 500 — matching existing endpoint) and enforce a global cap of 500 total messages across all sessions in a single response. If a session exceeds its limit, set `hasMore: true` for that session so the client can paginate via the existing per-session endpoint.

**Why**: Prevents unbounded response size while keeping the common case (reconnect with a few messages per session) in a single request. The 500 global cap matches the existing endpoint's max page size. Sessions with very large backlogs naturally degrade to per-session pagination.

**Alternatives considered**:
- No global cap (just per-session): risk of huge responses if many sessions each have hundreds of new messages
- Lower global cap: would force more fallback to per-session fetches, reducing the benefit
- Server-side prioritization (newest sessions first): adds complexity without clear user benefit

### 3. Single ownership query with IN clause

**Decision**: Verify ownership of all requested sessions in a single `WHERE id IN (...) AND accountId = userId` query instead of N individual checks.

**Why**: Replaces N `Session.findFirst` queries with one. Sessions the user doesn't own are silently excluded from the response (same as returning 404 on the per-session endpoint — the client treats missing sessions as "no new messages").

### 4. Client sends batch fetch only for sessions identified by connect-state

**Decision**: The batch fetch is triggered by the `connect-state` handler, not the reconnect handler directly. The client builds the batch request from sessions where `serverSeq > clientSeq`, calls the batch endpoint once, then dispatches results to per-session message queues.

**Why**: Integrates cleanly with the existing selective-reconnect-invalidation flow. Sessions already up-to-date are excluded before the request is made. The fallback (3s timeout without connect-state) continues to use per-session InvalidateSync invalidations since it doesn't know which sessions need data.

### 5. Reuse existing toResponseMessage format

**Decision**: The batch response uses the same message format as the existing per-session endpoint. Response shape: `{ sessions: Record<sessionId, { messages: Message[], hasMore: boolean }> }`.

**Why**: The client already has decryption and normalization code for this message format. No new wire types needed. Sessions with no new messages are omitted from the response rather than included with empty arrays (saves bandwidth).

## Risks / Trade-offs

**[Large batch responses on reconnect after long offline]** → Global 500-message cap prevents unbounded responses. Sessions exceeding their share get `hasMore: true` and the client falls back to per-session pagination for those sessions only.

**[New endpoint to maintain alongside existing]** → The per-session endpoint is unchanged and still needed for pagination, WebSocket fast-path fallback, and CLI. The batch endpoint is additive. Shared `toResponseMessage` helper keeps them in sync.

**[Client must handle partial batch results]** → If some sessions have `hasMore`, the client dispatches what it received and then invalidates those specific sessions' `InvalidateSync` for follow-up pagination. This is a new code path but straightforward.

**[PGlite compatibility]** → The `WHERE sessionId IN (...)` query uses standard SQL. Prisma generates this correctly for both PostgreSQL and PGlite. No raw SQL needed.

## Open Questions

None — the design is deliberately minimal. If the global cap of 500 proves too low or too high in practice, it can be adjusted as a constant without protocol changes.
