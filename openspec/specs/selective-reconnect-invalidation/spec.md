## ADDED Requirements

### Requirement: Server emits connect-state on socket connect
On every user-scoped socket connection, the server SHALL emit a `connect-state` event to the connecting socket containing the current `seq` value for each of the user's sessions. The payload SHALL be `{ sessions: Record<string, number> }` where keys are session IDs and values are the session's latest message seq.

#### Scenario: connect-state emitted after connect
- **WHEN** a user-scoped socket connects (fresh connect or reconnect)
- **THEN** the server emits a `connect-state` event to that socket with `{ sessions: { [sessionId]: seq, … } }` for all sessions belonging to that user

#### Scenario: User with no sessions
- **WHEN** a user with zero sessions connects
- **THEN** the server emits `connect-state` with `{ sessions: {} }`

### Requirement: App skips REST refetch for up-to-date sessions on reconnect
On reconnect, the app SHALL only invalidate (trigger REST refetch of) sessions whose server-reported seq in `connect-state` exceeds the client's cached `sessionLastSeq` for that session. Sessions where the client seq equals the server seq SHALL NOT be invalidated.

#### Scenario: Up-to-date session skips refetch
- **WHEN** `connect-state` arrives with `{ sessions: { "abc": 42 } }` and the client's `sessionLastSeq` for `"abc"` is `42`
- **THEN** `getMessagesSync("abc").invalidate()` is NOT called for that session

#### Scenario: Behind session triggers refetch
- **WHEN** `connect-state` arrives with `{ sessions: { "abc": 45 } }` and the client's `sessionLastSeq` for `"abc"` is `42`
- **THEN** `getMessagesSync("abc").invalidate()` IS called for that session

#### Scenario: Unknown session triggers refetch
- **WHEN** `connect-state` contains a session ID not present in the client's `sessionLastSeq` map
- **THEN** that session IS invalidated (safe default)

### Requirement: Non-session data always invalidated on reconnect
On reconnect the app SHALL continue to unconditionally invalidate machines, artifacts, friends, friend requests, feed, and pending sends, regardless of `connect-state` content.

#### Scenario: Non-session invalidations are unconditional
- **WHEN** a reconnect occurs and `connect-state` indicates all sessions are up-to-date
- **THEN** machines, artifacts, friends, friend requests, and feed syncs are still invalidated

### Requirement: Fallback to full session invalidation if connect-state absent
If the `connect-state` event does not arrive within 3 seconds of `onReconnected` firing, the app SHALL fall back to invalidating all sessions unconditionally.

#### Scenario: Timeout triggers full invalidation
- **WHEN** `onReconnected` fires but no `connect-state` event arrives within 3 seconds
- **THEN** all sessions in `sessionsData` are invalidated as if `connect-state` had not been implemented
