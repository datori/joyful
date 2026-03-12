## ADDED Requirements

### Requirement: PerfEvent schema
The system SHALL represent every performance event as a JSON object with the following fields:
- `ts` (number): Unix timestamp in milliseconds
- `src` (string): source layer — `"server"`, `"app"`, or `"cli"`
- `op` (string): operation identifier (see operation registry below)
- `dur_ms` (number, optional): duration of the operation in milliseconds
- Additional fields specific to each operation type

Operation registry:
- `http.request`: `method`, `path` (template, not raw), `status`, `dur_ms`
- `db.query`: `model`, `action`, `dur_ms`
- `app.foreground`: no additional fields
- `ws.connected`: `dur_ms` (from foreground to socket connect event)
- `ws.msg.fast`: `seq` (number), `dur_ms` (decrypt + enqueue time)
- `ws.msg.slow`: `seq` (number), `reason` (`"first_load"` | `"seq_gap"` | `"reconnect"`)
- `fetch_msgs`: `session_id` (first 8 chars only), `count`, `pages`, `dur_ms`
- `app.synced`: `dur_ms` (from foreground to all initial invalidations dispatched), `sessions_count`
- `outbox.flush`: `count`, `dur_ms`

#### Scenario: Event written to perf.ndjson
- **WHEN** a perf event is emitted with valid fields
- **THEN** it is appended as a single line of valid JSON to `data/perf.ndjson` on the server

#### Scenario: Event is parseable
- **WHEN** `data/perf.ndjson` is read line by line
- **THEN** each line parses as valid JSON with at minimum `ts`, `src`, and `op` fields

### Requirement: Dev-only activation
The perf log system SHALL be active only when the appropriate env var is set per package:
- **Server and CLI**: `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING`
- **App (joyful-app)**: `EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` — Expo Metro only inlines `EXPO_PUBLIC_*` vars into the browser bundle, so the app uses this prefix variant of the same guard.

When not set, all instrumentation code paths SHALL be no-ops with no file I/O and no HTTP requests from app/CLI.

#### Scenario: Inactive in production
- **WHEN** the relevant env var is not set
- **THEN** no `data/perf.ndjson` file is created or written to
- **THEN** app and CLI make no perf-related HTTP requests

#### Scenario: Active in dev
- **WHEN** `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=true` is set on server/CLI and `EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=1` is set when running the app
- **THEN** `data/perf.ndjson` is created on first event
- **THEN** events are appended within 100ms of occurring on the server

### Requirement: Server HTTP request instrumentation
The server SHALL emit an `http.request` perf event for every Fastify response, containing the HTTP method, path template (not the raw URL with IDs), HTTP status code, and response time in milliseconds. Path templates replace dynamic segments with `:param` notation (e.g., `/v3/sessions/:id/messages`).

#### Scenario: Request event captured
- **WHEN** any HTTP request completes on the server
- **THEN** an `http.request` event is written with `method`, `path`, `status`, and `dur_ms`

#### Scenario: Path is templated
- **WHEN** a request is made to `/v3/sessions/abc123/messages`
- **THEN** the `path` field in the event is `/v3/sessions/:sessionId/messages`, not the raw URL

### Requirement: Server DB query instrumentation
The server SHALL emit a `db.query` perf event for every Prisma query, containing the model name, operation name, and duration in milliseconds.

#### Scenario: DB query event captured
- **WHEN** any Prisma query executes
- **THEN** a `db.query` event is written with `model`, `action`, and `dur_ms`

#### Scenario: Sequential allocateUserSeq calls are individually visible
- **WHEN** a POST to `/v3/sessions/:id/messages` creates N messages
- **THEN** N separate `db.query` events with `action: "update"` and `model: "account"` appear in the log

### Requirement: App foreground and socket timing
The app SHALL emit an `app.foreground` event when transitioning from background to active state, and a `ws.connected` event when the WebSocket reconnects, with duration measured from the foreground event.

#### Scenario: Foreground sequence captured
- **WHEN** the app transitions from background to active
- **THEN** an `app.foreground` event is buffered with current timestamp
- **THEN** when the socket connects, a `ws.connected` event is buffered with `dur_ms` measured from `app.foreground`

#### Scenario: Initial app start
- **WHEN** the app starts cold (no prior foreground event in the session)
- **THEN** `ws.connected` is still emitted with `dur_ms` from the nearest available reference point

### Requirement: App message streaming path instrumentation
The app SHALL emit a `ws.msg.fast` event when a `new-message` websocket event is applied directly to state (fast path), and a `ws.msg.slow` event when a REST refetch is triggered (slow path), including the reason for the fallback.

#### Scenario: Fast path captured
- **WHEN** a `new-message` websocket event arrives with `seq === lastSeq + 1`
- **THEN** a `ws.msg.fast` event is buffered with the seq number and decrypt duration

#### Scenario: Slow path captured with reason
- **WHEN** a `new-message` websocket event triggers `getMessagesSync().invalidate()`
- **THEN** a `ws.msg.slow` event is buffered with `seq` and the appropriate `reason`
- **THEN** `reason` is `"first_load"` when no `currentLastSeq` exists, `"seq_gap"` when seq is non-consecutive, `"reconnect"` when triggered by the reconnect handler

### Requirement: App fetchMessages timing
The app SHALL emit a `fetch_msgs` event each time `fetchMessages()` completes, with the number of messages fetched, number of HTTP pages required, and total duration.

#### Scenario: Fetch metrics captured
- **WHEN** `fetchMessages()` completes successfully for a session
- **THEN** a `fetch_msgs` event is buffered with `count`, `pages`, and `dur_ms`
- **THEN** `session_id` contains only the first 8 characters of the session ID

### Requirement: App foreground-to-synced duration
The app SHALL emit an `app.synced` event after the foreground transition triggers the initial round of invalidations, capturing total elapsed time from `app.foreground` and the count of sessions that were invalidated.

#### Scenario: Synced duration captured
- **WHEN** the app foregrounds and dispatches all session/machine/artifact invalidations
- **THEN** an `app.synced` event is buffered with `dur_ms` from `app.foreground` and `sessions_count`

### Requirement: App event batching
The app SHALL buffer perf events in memory (ring buffer, max 500 entries) and flush them to the server as a single HTTP POST at most every 5 seconds when the buffer is non-empty. The buffer SHALL also be flushed immediately when the app transitions to background.

#### Scenario: Batch flush on interval
- **WHEN** 5 seconds elapse with buffered perf events
- **THEN** a single POST is made containing all buffered events
- **THEN** the buffer is cleared after a successful POST

#### Scenario: Flush on background
- **WHEN** the app transitions to background with buffered events
- **THEN** the buffer is flushed immediately before the app suspends

#### Scenario: No POST when inactive
- **WHEN** `EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` is not set
- **THEN** the app makes no perf-related HTTP requests regardless of buffer state

### Requirement: CLI outbox flush timing
The CLI daemon SHALL emit an `outbox.flush` perf event each time the outbox is flushed to the server, capturing message count and total flush duration.

#### Scenario: Flush metrics captured
- **WHEN** the outbox flush completes (success or failure)
- **THEN** an `outbox.flush` event is POSTed to the server with `count` and `dur_ms`

### Requirement: Agent-accessible perf endpoint
The server SHALL expose a `GET /dev/perf` endpoint (active only when `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` is set) that returns the last 500 perf events from `data/perf.ndjson` as a JSON array.

#### Scenario: Events returned as array
- **WHEN** `GET /dev/perf` is requested
- **THEN** the response is `{ events: PerfEvent[], total: number }` where `events` contains at most the last 500 entries

#### Scenario: Empty when no events
- **WHEN** `GET /dev/perf` is requested and no events have been written
- **THEN** the response is `{ events: [], total: 0 }`
