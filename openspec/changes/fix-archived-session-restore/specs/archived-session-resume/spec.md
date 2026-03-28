## ADDED Requirements

### Requirement: Send message to archived session triggers a fork
When the user attempts to send a message from an archived (inactive) session view, the app SHALL automatically spawn a forked session using `machineSpawnNewSession` with `resumeNativeSessionId` set to the archived session's native Claude session ID (`session.metadata.claudeSessionId`), rather than sending the message to the inactive session.

#### Scenario: User sends message to archived session with valid claudeSessionId
- **WHEN** the user submits a message in a session view where `session.active === false` and `session.metadata.claudeSessionId` is set
- **THEN** the app calls `machineSpawnNewSession` with `resumeNativeSessionId = session.metadata.claudeSessionId` and the session's working directory

#### Scenario: Spawn succeeds — user is navigated to the new session
- **WHEN** `machineSpawnNewSession` returns a successful result with a new session ID
- **THEN** the app navigates to the new session screen (`/session/<newSessionId>`)
- **THEN** the message text the user typed is pre-filled as the draft on the new session

#### Scenario: Spawn fails — error is surfaced
- **WHEN** `machineSpawnNewSession` returns an error (e.g. machine offline, daemon unavailable)
- **THEN** the app displays an error message via the standard error handling path
- **THEN** the user remains on the archived session screen with their typed text intact

### Requirement: No resume when claudeSessionId is unavailable
When the archived session has no `session.metadata.claudeSessionId` (rare edge case: non-Claude session or session archived before Claude registered), the app SHALL NOT attempt to spawn a resumed session. The existing `sync.sendMessage` path is used unchanged.

#### Scenario: Send message to archived session with no claudeSessionId
- **WHEN** the user submits a message in a session view where `session.active === false` and `session.metadata.claudeSessionId` is null or undefined
- **THEN** the app SHALL NOT call `machineSpawnNewSession`
- **THEN** the message SHALL be sent via `sync.sendMessage` as normal (existing behavior)

### Requirement: Session route accepts optional initial message
The session route (`/session/:id`) SHALL accept an optional `initialMessage` query param. When present, the session view SHALL pre-fill the message input with this text on mount.

#### Scenario: Session opened with initialMessage param
- **WHEN** the app navigates to a session screen with an `initialMessage` query param
- **THEN** the message input SHALL be pre-filled with the `initialMessage` text
- **THEN** the message SHALL NOT be auto-sent (user reviews and sends manually)

#### Scenario: Session opened without initialMessage param
- **WHEN** the app navigates to a session screen without an `initialMessage` query param
- **THEN** the message input SHALL be empty (or show any existing draft)

### Requirement: Original archived session is preserved after resume
After a successful resume fork, the original archived session SHALL remain in the archived sessions list unchanged.

#### Scenario: Archived session visible after successful resume
- **WHEN** the user sends a message to an archived session and resume succeeds
- **THEN** the original archived session SHALL still appear in the archived sessions list
- **THEN** a new active session SHALL appear at the top of the active sessions list

### Requirement: Message input remains active on archived sessions
The message input field in the session view SHALL remain enabled and interactive for archived sessions, so users can type and submit to trigger the resume flow.

#### Scenario: Input is enabled on archived session
- **WHEN** the user views an archived session (`session.active === false`)
- **THEN** the message input is not disabled
- **THEN** tapping the send button triggers the fork flow (not a no-op or error)
