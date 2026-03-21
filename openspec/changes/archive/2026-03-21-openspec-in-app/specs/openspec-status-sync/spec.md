## ADDED Requirements

### Requirement: OpenSpec directory is scanned per project on session visibility
The system SHALL scan the `openspec/` directory of a session's working directory whenever a session becomes visible in the app, using the existing `sessionBash` RPC mechanism. The scan SHALL be project-keyed (machine ID + path) so all sessions sharing the same working directory share one status object. Results SHALL be stored in app state and updated reactively.

#### Scenario: Session in OpenSpec project becomes visible
- **WHEN** a session whose working directory contains an `openspec/` folder becomes the active session
- **THEN** `openspecSync` runs the bash scan command within 100ms and stores parsed `OpenSpecStatus` in `projectOpenspecStatus` keyed by `machineId:path`

#### Scenario: Session in non-OpenSpec project becomes visible
- **WHEN** a session whose working directory does NOT contain `openspec/` becomes active
- **THEN** `openspecSync` stores `{ hasOpenspec: false, ... }` and no OpenSpec UI elements appear

#### Scenario: Offline session
- **WHEN** `sessionBash` fails or times out (session offline, CLI unreachable)
- **THEN** the existing `OpenSpecStatus` (if any) is retained unchanged and no error is surfaced to the user

### Requirement: OpenSpec status captures changes, specs, and task completion
The system SHALL parse the bash output into a structured `OpenSpecStatus` object containing: `hasOpenspec` boolean, `activeChanges` array, `archivedChanges` array, `mainSpecs` array, and `lastUpdatedAt` timestamp.

Each `OpenSpecChange` SHALL include: `name` (directory name), `isArchived` boolean, `artifacts` (top-level files with their type classification), `deltaSpecs` (specs/ subdirectory contents), and `taskStats` with `completed` and `total` counts derived from `[x]` and `[ ]` occurrences in `tasks.md`.

Each `OpenSpecSpecGroup` SHALL include: `name` (subdirectory name) and `artifacts` (files within).

#### Scenario: Active change with partial task completion
- **WHEN** `openspec/changes/my-change/tasks.md` contains 3 `[x]` lines and 4 `[ ]` lines
- **THEN** the change entry has `taskStats: { completed: 3, total: 7 }`

#### Scenario: Change with delta specs
- **WHEN** `openspec/changes/my-change/specs/my-capability/spec.md` exists
- **THEN** the change entry's `deltaSpecs` array contains one group `{ name: "my-capability", artifacts: [{ filename: "spec.md", ... }] }`

#### Scenario: Archived change
- **WHEN** a directory exists at `openspec/changes/archive/<name>/`
- **THEN** it appears in `archivedChanges` with `isArchived: true`

### Requirement: OpenSpec status can be manually refreshed
The system SHALL expose a `invalidate()` method on the `OpenSpecSync` instance that forces an immediate re-scan for the given session's project. This is called when the user taps the refresh button in the OpenSpec panel header.

#### Scenario: User taps refresh in panel
- **WHEN** the user taps the refresh icon in the OpenSpec panel header
- **THEN** `openspecSync.invalidate(sessionId)` is called and the panel data updates within 2 seconds
