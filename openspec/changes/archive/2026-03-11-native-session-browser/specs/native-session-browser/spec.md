# native-session-browser Specification

## Purpose
Defines how the daemon enumerates native Claude Code sessions for a working directory and how the app surfaces them for discovery and resumption.

## Requirements

### Requirement: Daemon lists native sessions for a directory
The daemon SHALL expose a `list-native-sessions` RPC that accepts a `directory` string, scans the corresponding `~/.claude/projects/<path-id>/` folder for `.jsonl` files, and returns an array of `NativeSessionInfo` objects sorted by last-modified time descending.

#### Scenario: Sessions returned for known directory
- **WHEN** the app calls `list-native-sessions` with `directory: "/code/finance"`
- **THEN** the daemon returns a `NativeSessionInfo[]` array where each entry has `sessionId`, `lastModified`, and at least one of `summary` or `firstMessage`

#### Scenario: Empty array for directory with no sessions
- **WHEN** the app calls `list-native-sessions` with a directory that has no `.jsonl` files
- **THEN** the daemon returns an empty array without error

#### Scenario: Malformed JSONL files are skipped
- **WHEN** the project directory contains a `.jsonl` file with corrupt content
- **THEN** that file is silently skipped and the remaining sessions are returned normally

### Requirement: Session metadata is extracted from partial file reads
The daemon SHALL read only the first 50 lines of each JSONL file to extract metadata, avoiding full-file reads for performance.

#### Scenario: Summary line used when present
- **WHEN** the JSONL file contains a `{"type":"summary","summary":"..."}` line within the first 50 lines
- **THEN** `NativeSessionInfo.summary` is set to that summary string

#### Scenario: First user message used as fallback title
- **WHEN** no summary line is present but a `{"type":"user"}` message exists within the first 50 lines
- **THEN** `NativeSessionInfo.firstMessage` is set to the text content of that message, truncated to 100 characters

#### Scenario: Session ID short form as last-resort identifier
- **WHEN** neither a summary nor a user message is found in the first 50 lines
- **THEN** both `summary` and `firstMessage` are null; the app MAY display the short-form session ID

#### Scenario: Last-modified from file stat
- **WHEN** the daemon reads session metadata
- **THEN** `NativeSessionInfo.lastModified` reflects the file's mtime as a Unix timestamp (milliseconds)

### Requirement: App decorates native sessions with tracking status
The app SHALL compute `isTracked` for each `NativeSessionInfo` by comparing `sessionId` against the `claudeSessionId` values of all known Joyful sessions. This computation SHALL happen client-side; the daemon does not know Joyful session linkage.

#### Scenario: Tracked session identified
- **WHEN** a native session's `sessionId` matches any Joyful session's `metadata.claudeSessionId`
- **THEN** that session is considered tracked and rendered greyed out in the browser

#### Scenario: Untracked session available for resume
- **WHEN** a native session's `sessionId` does not match any known Joyful `claudeSessionId`
- **THEN** that session is selectable and the "Resume in Joyful" action is enabled

### Requirement: Native session browser modal displays project-scoped sessions
The app SHALL present a modal browser showing native sessions for the currently selected working directory. The modal SHALL display the 10 most recent sessions by default with an option to expand to the full list.

#### Scenario: Modal shows 10 most recent sessions on open
- **WHEN** the native session browser modal opens for a given directory
- **THEN** the 10 most recent sessions (by `lastModified`) are shown immediately

#### Scenario: Full list revealed on expand
- **WHEN** the user taps "Show all (N)" where N is the total session count
- **THEN** all sessions are shown in the list

#### Scenario: Search filters sessions by title
- **WHEN** the user types in the search field
- **THEN** the list is filtered to sessions whose summary or firstMessage contains the search string (case-insensitive)

#### Scenario: Tracked sessions are greyed out and non-interactive
- **WHEN** a session has `isTracked: true`
- **THEN** it is rendered with reduced opacity and the tap/select action is disabled

#### Scenario: Browser shows empty state when no sessions exist
- **WHEN** the daemon returns an empty array for the selected directory
- **THEN** the modal displays a message indicating no native sessions were found for this directory

### Requirement: Wizard surfaces native session discovery after path selection
The app's new-session wizard SHALL show a "Browse native sessions" trigger in the working-directory section when a directory is selected and the machine daemon is reachable.

#### Scenario: Trigger appears after directory selection
- **WHEN** the user has selected a working directory in the new-session wizard and the machine is online
- **THEN** a "Browse native sessions" link or button is visible below the path selector

#### Scenario: Trigger is hidden when machine is offline
- **WHEN** the machine daemon is not reachable
- **THEN** the "Browse native sessions" trigger is not shown

### Requirement: Selecting a native session creates a forking Joyful session
The app SHALL create a new Joyful session record and pass `resumeNativeSessionId` to the spawn RPC. The daemon SHALL initialize the Claude session with that native session ID so the first Claude process spawned forks from it via `--resume`.

#### Scenario: Fork created on first message
- **WHEN** a user creates a session by resuming native session ID `abc-123`
- **THEN** the first Claude process is spawned with `--resume abc-123`, creating a new fork session

#### Scenario: Fork session ID replaces native ID in metadata
- **WHEN** Claude forks the native session and `onSessionFound` fires with the new fork ID `def-456`
- **THEN** `session.metadata.claudeSessionId` is updated to `def-456`

#### Scenario: Original native session is not modified
- **WHEN** the fork session is created
- **THEN** the original `abc-123.jsonl` file remains unchanged on disk

#### Scenario: Subsequent reconnects resume the fork, not the original
- **WHEN** the Joyful session reconnects after the fork
- **THEN** Claude is resumed from `def-456` (the fork), not from `abc-123` (the original native session)

### Requirement: spawn-joyful-session accepts optional resumeNativeSessionId
The `spawn-joyful-session` RPC SHALL accept an optional `resumeNativeSessionId` string. When present, the daemon SHALL initialize the session's Claude session ID to that value before spawning. When absent, behavior is unchanged.

#### Scenario: Spawn with resumeNativeSessionId initializes session
- **WHEN** `spawn-joyful-session` is called with `resumeNativeSessionId: "abc-123"` and `directory: "/code/finance"`
- **THEN** the spawned session's initial `claudeSessionId` is `"abc-123"` and Claude is launched with `--resume abc-123`

#### Scenario: Spawn without resumeNativeSessionId is unchanged
- **WHEN** `spawn-joyful-session` is called without `resumeNativeSessionId`
- **THEN** the daemon behaves identically to the current behavior (fresh session)

#### Scenario: Invalid native session ID is rejected gracefully
- **WHEN** `spawn-joyful-session` is called with a `resumeNativeSessionId` that has no corresponding JSONL file
- **THEN** `claudeCheckSession` returns false, `startFrom` is set to null, and Claude starts a fresh session (no error thrown)
