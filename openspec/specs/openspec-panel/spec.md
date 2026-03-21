## ADDED Requirements

### Requirement: OpenSpec toolbar button appears for OpenSpec projects
The system SHALL display an OpenSpec icon button in the `AgentInput` left toolbar when `openspecStatus.hasOpenspec` is true for the current session's project. The button SHALL show a numeric badge indicating the count of active changes when that count is greater than zero. The button SHALL be absent (not merely disabled) when the project has no `openspec/` directory.

#### Scenario: Project has active changes
- **WHEN** `openspecStatus.hasOpenspec` is true and `activeChanges.length` is 2
- **THEN** the toolbar shows the OpenSpec button with a "2" badge

#### Scenario: Project has openspec but no active changes
- **WHEN** `openspecStatus.hasOpenspec` is true and `activeChanges.length` is 0
- **THEN** the toolbar shows the OpenSpec button with no badge

#### Scenario: Project has no openspec directory
- **WHEN** `openspecStatus` is null or `hasOpenspec` is false
- **THEN** no OpenSpec button appears in the toolbar

### Requirement: OpenSpec panel displays hierarchy of changes and specs
The system SHALL provide a screen at the session-scoped route `session/[id]/openspec` that shows the full OpenSpec hierarchy in a scrollable, hierarchically organized list. The screen SHALL have three collapsible sections:

1. **Active Changes** — expanded by default; each change shows name, task progress bar, and a collapsible list of artifacts (proposal.md, design.md, tasks.md, .openspec.yaml, and any delta specs)
2. **Main Specs** — collapsed by default; each spec group shows its name and can be expanded to show its `spec.md` file
3. **Archived Changes** — collapsed by default; can be expanded to reveal individual archived change directories, each of which can be further expanded to show its artifacts

#### Scenario: User opens panel with active changes
- **WHEN** the user taps the OpenSpec toolbar button
- **THEN** the OpenSpec panel opens, the Active Changes section is expanded, and each active change is expanded showing its task progress and artifact list

#### Scenario: User opens panel for project with no active changes
- **WHEN** `activeChanges` is empty
- **THEN** the Active Changes section shows an empty state message (e.g., "No active changes")

#### Scenario: User expands Archived Changes
- **WHEN** the user taps the Archived Changes section header
- **THEN** the section expands to show all archived change directories by name

#### Scenario: Task progress display
- **WHEN** a change has `taskStats: { completed: 5, total: 9 }`
- **THEN** a progress bar and label "5/9 tasks" appear beneath the change name

### Requirement: Any artifact file can be opened in the file viewer
The system SHALL allow the user to tap any `.md` file or artifact file in the OpenSpec panel to open it in the existing file viewer screen (`session/[id]/file`). The file path SHALL be base64-encoded as the `path` query parameter, consistent with how the existing file browser navigates to the file viewer.

#### Scenario: User taps proposal.md in an active change
- **WHEN** the user taps `proposal.md` within the `my-change` active change row
- **THEN** the app navigates to `session/<id>/file?path=<base64("openspec/changes/my-change/proposal.md")>`

#### Scenario: User taps a spec file under Main Specs
- **WHEN** the user taps `spec.md` under the `chat-settings-popup` spec group
- **THEN** the app navigates to `session/<id>/file?path=<base64("openspec/specs/chat-settings-popup/spec.md")>`

#### Scenario: User taps a delta spec inside a change
- **WHEN** the user taps `spec.md` inside the `archived-session-resume` delta spec of an active change
- **THEN** the app navigates to `session/<id>/file?path=<base64("openspec/changes/my-change/specs/archived-session-resume/spec.md")>`

### Requirement: OpenSpec panel has a manual refresh button
The system SHALL display a refresh icon button in the OpenSpec panel header. Tapping it SHALL trigger an immediate re-scan of the OpenSpec directory and update the displayed data.

#### Scenario: User taps refresh
- **WHEN** the user taps the refresh button in the panel header
- **THEN** `openspecSync.invalidate(sessionId)` is called and the panel data refreshes
