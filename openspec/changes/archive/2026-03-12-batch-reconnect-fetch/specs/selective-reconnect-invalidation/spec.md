## MODIFIED Requirements

### Requirement: App skips REST refetch for up-to-date sessions on reconnect
On reconnect, when `connect-state` arrives, the app SHALL use the batch message fetch endpoint (`POST /v3/messages/batch`) to fetch messages for all sessions whose server-reported seq exceeds the client's cached `sessionLastSeq`. The app SHALL build a single batch request from these sessions, dispatch the returned messages to per-session message queues, and invalidate per-session `InvalidateSync` only for sessions that have `hasMore: true` in the batch response (to continue pagination via the existing per-session endpoint). Sessions where `serverSeq <= clientSeq` SHALL NOT be included in the batch request.

#### Scenario: Up-to-date session skips refetch
- **WHEN** `connect-state` arrives with `{ sessions: { "abc": 42 } }` and the client's `sessionLastSeq` for `"abc"` is `42`
- **THEN** session `"abc"` is NOT included in the batch request

#### Scenario: Behind sessions fetched via batch
- **WHEN** `connect-state` arrives with `{ sessions: { "abc": 45, "def": 100 } }` and the client's `sessionLastSeq` is `{ "abc": 42, "def": 90 }`
- **THEN** the app sends a single `POST /v3/messages/batch` with `{ sessions: [{ sessionId: "abc", afterSeq: 42 }, { sessionId: "def", afterSeq: 90 }] }`

#### Scenario: Batch response with hasMore triggers per-session pagination
- **WHEN** the batch response for session `"abc"` has `hasMore: true`
- **THEN** the app dispatches the received messages and then calls `getMessagesSync("abc").invalidate()` to continue fetching via the per-session endpoint

#### Scenario: Unknown session triggers batch inclusion
- **WHEN** `connect-state` contains a session ID not present in the client's `sessionLastSeq` map
- **THEN** that session is included in the batch request with `afterSeq: 0`

### Requirement: Fallback to full session invalidation if connect-state absent
If the `connect-state` event does not arrive within 3 seconds of `onReconnected` firing, the app SHALL fall back to invalidating all sessions unconditionally using per-session `InvalidateSync` (not the batch endpoint), since it does not know which sessions need data.

#### Scenario: Timeout triggers full invalidation
- **WHEN** `onReconnected` fires but no `connect-state` event arrives within 3 seconds
- **THEN** all sessions in `sessionsData` are invalidated via per-session `InvalidateSync` as before
