## Why

There is no timing data anywhere in the stack — only event logs. This makes it impossible to distinguish between "something feels slow" and "something is actually slow", and equally hard to attribute latency to the right layer (DB query vs network vs decrypt vs render). An agent-readable perf log enables empirical bottleneck identification after real usage, replacing speculation with measurement.

## What Changes

- **New**: `perf.ndjson` — a dedicated structured performance log on the server, one JSON object per line, aggregating timing events from all three stack layers
- **New**: Server Fastify `onResponse` hook emitting HTTP request duration per-route
- **New**: Prisma query middleware emitting per-query model/action/duration
- **New**: App-side perf markers for the two key UX moments: foreground→synced latency and the streaming fast-path vs slow-path (REST refetch) decision
- **New**: CLI daemon outbox flush timing (messages posted per batch, total duration)
- **New**: App batched perf event POST — buffers events in memory, flushes every 5s or on background, avoids per-event HTTP noise
- **New**: Server endpoint `GET /dev/perf` returning recent perf events as JSON (agent-accessible without file access)
- All perf instrumentation gated behind `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` env var — zero cost in production

## Capabilities

### New Capabilities
- `perf-log`: Structured NDJSON performance log aggregated at the server, written by all three stack layers, readable by agents for bottleneck analysis

### Modified Capabilities

## Impact

- **joyful-server**: New Fastify lifecycle hook, Prisma `$extends` middleware, new `data/perf.ndjson` file, new `GET /dev/perf` route in `devRoutes.ts`
- **joyful-app**: New perf buffer utility, instrumentation in `sync.ts` (`handleUpdate` fast/slow path, `fetchMessages`, `#init` foreground sequence), batched POST to server
- **joyful-cli**: Instrumentation in outbox flush path, batched POST to server
- No schema changes, no wire protocol changes, no production behavior changes
