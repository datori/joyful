## Context

No timing data exists anywhere in the stack today. The three packages each have logging (pino on server, file-based on CLI, in-memory on app) and the `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` env var already consolidates human-readable text logs into a single server file. However all output is event narrative — "fetchMessages started", "fetchMessages completed" — with no durations, no structured fields, and no way to answer "how long did X take" without manually diffing timestamps across lines.

Investigation revealed two high-value UX latency moments: (1) foreground→synced, where the app invalidates all session/message syncs on every reconnect triggering N concurrent REST fetches, and (2) the streaming fast/slow path branch in `sync.ts:handleUpdate`, where a sequence gap causes a full REST refetch instead of direct application of the websocket payload.

The server already uses pino (structured JSON). The app already has the remote logging pipeline. The CLI already has file-based logging. The instrumentation layer builds on what exists rather than replacing it.

## Goals / Non-Goals

**Goals:**
- Structured NDJSON perf event stream, one JSON object per line, written to `data/perf.ndjson` on the server
- Server: automatic HTTP request duration (Fastify `onResponse` hook) and DB query duration (Prisma `$extends`)
- App: explicit markers at UX boundary points — foreground, socket connect, fast-path message apply, slow-path REST fallback, fetchMessages completion, and the overall foreground→synced duration
- CLI: outbox flush timing (message count, total duration)
- App events batched in memory and POSTed to server every 5s or on app-background, not per-event
- `GET /dev/perf` endpoint returning the last N events as JSON for agent access without file system
- All instrumentation gated behind existing `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` env var

**Non-Goals:**
- Distributed tracing / span correlation across requests (no trace IDs linking app event to server event)
- Production monitoring or alerting
- Any UI to visualize perf data
- React Native frame-level render profiling (requires native profiler, not achievable via logging)
- Automatic log rotation or perf.ndjson size management in this change

## Decisions

### NDJSON file over extending the existing consolidated log

The existing consolidated log mixes debug narrative with any structured events we'd add. Grep-filtering by tag works but is fragile. A dedicated `perf.ndjson` with one JSON object per line is directly parseable with `jq` or any JSON library without text scraping. An agent can `tail -200 data/perf.ndjson` and immediately have structured data.

Alternative considered: append `[PERF] {...}` tagged lines to the consolidated log. Rejected because the file grows with all debug noise and requires text parsing to extract perf events.

### App events buffered and batched, not per-event HTTP POST

During active streaming, fast-path message events fire at ~10-20/sec. The existing `remoteLogger` fires one HTTP POST per `console.log`. Applying that pattern to perf events would add HTTP latency to the measurements themselves and flood the network. Buffer events in a ring (max 500) and flush as a single POST every 5 seconds or when the app backgrounds.

Alternative considered: write to AsyncStorage locally and sync later. Rejected as more complex with no benefit for local dev usage.

### Prisma `$extends` for DB query instrumentation

`$extends` intercepts every query with model name, operation, and args. Wrapping it with `Date.now()` before/after gives accurate per-query durations without touching any call site. The check for the env var happens at module initialization, so the middleware is either registered or not — no per-query branch overhead when disabled.

Alternative considered: manual `Date.now()` wrapping at each `allocateUserSeq` call site. Rejected because it only covers explicitly-wrapped sites and misses other slow queries we haven't identified yet.

### Explicit app markers rather than automatic instrumentation

`InvalidateSync` callbacks, `fetchMessages`, and `handleUpdate` are the meaningful UX boundaries. Automatic instrumentation (e.g., monkey-patching fetch) would produce noise from unrelated requests (RevenueCat, PostHog). Explicit `perf.mark(op, ...)` calls at the four identified points are more signal-dense.

### Single `perf.mark()` API shared across app/CLI

Both app and CLI need to emit events. A thin `perf.mark(op, meta)` function that either buffers (app) or POSTs immediately in a small batch (CLI, lower frequency) keeps the call sites clean and identical regardless of layer.

## Risks / Trade-offs

- **Clock skew between app and server**: App timestamps are device time, server timestamps are server time. For single-device local dev these are the same machine, so skew is negligible. For remote devices, events may appear out of order in the file. Mitigation: each event carries `src` field; analysis tools should sort within a source, not globally.
- **perf.ndjson grows unboundedly**: No rotation in this change. For local dev sessions of a few hours the file stays small (< 1MB). Mitigation: document that the file should be cleared between profiling sessions; add rotation in a follow-up.
- **App events lost on crash**: The in-memory buffer is not persisted. If the app crashes, buffered events are lost. Acceptable for development use; this is not production monitoring.
- **Prisma middleware adds minimal overhead even when active**: Each query gets two `Date.now()` calls and one `appendFileSync` (or batched write). The file write is the concern — mitigation is to use a write buffer rather than per-event `appendFileSync`. This is a follow-up optimization if needed; at development query rates it's negligible.

## Migration Plan

No migration needed. All changes are additive and gated. Steps:
1. Implement server perf writer (`sources/storage/perfLog.ts`)
2. Add Fastify hook and Prisma middleware
3. Add `/dev/perf` endpoint to `devRoutes.ts`
4. Implement app perf buffer and batch POST utility
5. Add markers to `sync.ts` at the four UX boundary points
6. Add CLI outbox flush markers

Rollback: remove env var. All code paths are no-ops without it.

## Open Questions

- Should perf events from the CLI daemon use the existing `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` HTTP POST path (already implemented in `logger.ts`) or a new dedicated `/dev/perf` POST endpoint? Using the existing path is simpler but mixes perf events with debug logs. A dedicated endpoint keeps them separate. **Decision deferred to tasks.**
