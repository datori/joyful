## ADDED Requirements

### Requirement: Batch message fetch endpoint
The server SHALL expose `POST /v3/messages/batch` that accepts a JSON body with `sessions: Array<{ sessionId: string, afterSeq: number, limit?: number }>` and returns messages for all requested sessions belonging to the authenticated user in a single response. The endpoint SHALL require Bearer token authentication.

#### Scenario: Fetch messages for multiple sessions
- **WHEN** client sends `POST /v3/messages/batch` with `{ sessions: [{ sessionId: "a", afterSeq: 10 }, { sessionId: "b", afterSeq: 0 }] }`
- **THEN** the response contains `{ sessions: { "a": { messages: [...], hasMore: false }, "b": { messages: [...], hasMore: false } } }` with messages having `seq > afterSeq` for each session

#### Scenario: Session not owned by user is excluded
- **WHEN** client requests messages for a session that does not belong to the authenticated user
- **THEN** that session is omitted from the response (no error, no entry in the sessions map)

#### Scenario: Empty batch request
- **WHEN** client sends `{ sessions: [] }`
- **THEN** the response is `{ sessions: {} }`

### Requirement: Per-session message limit
Each session entry MAY include an optional `limit` field (default 100, max 500). The server SHALL return at most `limit` messages per session, ordered by `seq` ascending. If more messages exist beyond the limit, the session's `hasMore` field SHALL be `true`.

#### Scenario: Session with more messages than limit
- **WHEN** session "a" has 150 new messages and the request specifies `limit: 100`
- **THEN** the response for "a" contains the first 100 messages (by seq) with `hasMore: true`

#### Scenario: Default limit applied
- **WHEN** a session entry omits the `limit` field
- **THEN** the server uses a default limit of 100

### Requirement: Global message cap
The server SHALL enforce a global cap of 500 total messages across all sessions in a single response. Sessions SHALL be processed in the order they appear in the request. Once the global cap is reached, remaining sessions SHALL be returned with empty message arrays and `hasMore: true` (if they have any messages).

#### Scenario: Global cap exceeded
- **WHEN** client requests 10 sessions and the first 3 sessions collectively contain 500+ messages
- **THEN** sessions 1-3 receive their messages (up to the cap), and sessions 4-10 receive `{ messages: [], hasMore: true }` if they have any pending messages

#### Scenario: Global cap not reached
- **WHEN** total messages across all sessions is under 500
- **THEN** all sessions receive their messages normally, `hasMore` reflects per-session pagination only

### Requirement: Ownership verified in single query
The server SHALL verify ownership of all requested sessions in a single database query using `WHERE id IN (...) AND accountId = userId`, not per-session queries.

#### Scenario: Batch ownership check
- **WHEN** client requests messages for 12 sessions
- **THEN** the server executes one session ownership query (not 12 separate queries)

### Requirement: Sessions with no new messages omitted
Sessions where no messages exist with `seq > afterSeq` SHALL be omitted from the response entirely, rather than included with an empty messages array.

#### Scenario: Up-to-date session excluded from response
- **WHEN** session "a" has no messages with `seq > 42` and the request includes `{ sessionId: "a", afterSeq: 42 }`
- **THEN** session "a" does not appear in the response `sessions` map

### Requirement: Response message format matches per-session endpoint
Each message in the batch response SHALL use the same format as `GET /v3/sessions/:id/messages`: `{ id, seq, content, localId, createdAt, updatedAt }` with timestamps as epoch milliseconds.

#### Scenario: Message format consistency
- **WHEN** a message is returned via the batch endpoint
- **THEN** its fields and types are identical to the same message returned via `GET /v3/sessions/:id/messages`

### Requirement: Request validation
The server SHALL validate the request body with Zod. The `sessions` array SHALL have a maximum of 50 entries. Each `sessionId` SHALL be a non-empty string. Each `afterSeq` SHALL be a non-negative integer.

#### Scenario: Too many sessions in request
- **WHEN** client sends a request with 51 session entries
- **THEN** the server returns 400 with a validation error

#### Scenario: Invalid afterSeq
- **WHEN** a session entry has `afterSeq: -1`
- **THEN** the server returns 400 with a validation error
