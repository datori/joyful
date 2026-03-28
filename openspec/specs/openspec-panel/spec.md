## Requirements

### Requirement: OpenSpec toolbar controls (adaptive layout)
The system SHALL display OpenSpec controls in the `AgentInput` left toolbar when `openspecStatus.hasOpenspec` is true for the current session's project. The controls SHALL be absent when the project has no `openspec/` directory.

**On narrow layouts (screen width < 640 px):** A single icon button opens a floating submenu (popover) anchored above the button. The submenu SHALL contain rows for each available mode (Explore, Patch, Apply, FF), a divider, and an **Open Panel** row.

**On wide layouts (screen width ≥ 640 px):** All controls are shown inline in the toolbar row — individual icon buttons for each mode (Explore, Patch, Apply, FF) followed by a stack icon button that opens the OpenSpec panel directly. No popup is used.

In both cases the Open Panel icon button SHALL show a numeric badge indicating the count of active changes when greater than zero.

When any mode is armed, its corresponding icon button SHALL be highlighted (primary background color) to indicate active state. On the narrow (submenu) layout the main toolbar button also shows the armed mode's icon and label.

A **vertical divider** SHALL appear between the OpenSpec controls section and the model selection controls (Snt/Ops toggles for Claude, gear for Codex/Gemini) whenever both sections are present.

#### Scenario: Project has active changes
- **WHEN** `openspecStatus.hasOpenspec` is true and `activeChanges.length` is 2
- **THEN** the toolbar shows the OpenSpec button with a "2" badge

#### Scenario: Project has openspec but no active changes
- **WHEN** `openspecStatus.hasOpenspec` is true and `activeChanges.length` is 0
- **THEN** the toolbar shows the OpenSpec button with no badge

#### Scenario: Project has no openspec directory
- **WHEN** `openspecStatus` is null or `hasOpenspec` is false
- **THEN** no OpenSpec button appears in the toolbar

#### Scenario: User arms Explore Mode via submenu
- **WHEN** the user taps the OpenSpec button, then taps "Explore Mode"
- **THEN** the submenu closes, Explore Mode is armed, and the OpenSpec toolbar button highlights

#### Scenario: User opens the panel via submenu
- **WHEN** the user taps the OpenSpec button, then taps "Open Panel"
- **THEN** the submenu closes and the app navigates to the OpenSpec panel screen

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

### Requirement: Patch Mode toggle button
The system SHALL provide a Patch Mode toggle in the OpenSpec submenu (active sessions) or as a standalone toolbar button (new session creator), alongside the Explore Mode toggle. It SHALL behave as a one-shot prefix toggle: when armed, the next sent message is prefixed with `/opsx:patch `. Only one of Explore Mode or Patch Mode may be armed at a time; arming one SHALL disarm the other.

#### Scenario: User arms Patch Mode and sends a message
- **WHEN** the user taps the Patch button (arming it), types "fix the badge count", and taps Send
- **THEN** the message sent is `/opsx:patch fix the badge count` and the button returns to its unarmed state

#### Scenario: Patch and Explore are mutually exclusive
- **WHEN** the user arms Explore Mode then taps the Patch button
- **THEN** Explore Mode disarms and Patch Mode arms

### Requirement: OpenSpec panel has a manual refresh button
The system SHALL display a refresh icon button in the OpenSpec panel header. Tapping it SHALL trigger an immediate re-scan of the OpenSpec directory and update the displayed data.

#### Scenario: User taps refresh
- **WHEN** the user taps the refresh button in the panel header
- **THEN** `openspecSync.invalidate(sessionId)` is called and the panel data refreshes
