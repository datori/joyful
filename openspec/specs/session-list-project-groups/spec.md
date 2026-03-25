## ADDED Requirements

### Requirement: Sessions are grouped by project in the sessions list
All sessions in the sessions list SHALL be grouped under project group headers. Each group header represents a unique combination of machine and working directory. Active sessions appear in project groups at the top; archived sessions appear in project groups within the collapsed "Archived" section below.

#### Scenario: Active sessions grouped by project
- **WHEN** the sessions list renders active sessions
- **THEN** sessions are grouped under project headers showing the display path (e.g., `~/code/joyful`)

#### Scenario: Project group header shows avatar and path
- **WHEN** a project group header is rendered
- **THEN** it shows a small avatar derived from the machine ID and path, and the display path of the project

---

### Requirement: Project groups are individually collapsible
Each project group header SHALL be tappable to collapse or expand the sessions beneath it. Collapsed state SHALL be persisted per device via local settings.

#### Scenario: User collapses a project group
- **WHEN** the user taps a project group header
- **THEN** all session rows in that group are hidden and the header shows a forward chevron

#### Scenario: User expands a project group
- **WHEN** the user taps a collapsed project group header
- **THEN** all session rows in that group become visible and the header shows a down chevron

#### Scenario: Collapsed state persists across sessions
- **WHEN** the user collapses a project group and relaunches the app
- **THEN** the group remains collapsed

---

### Requirement: Project group positions are stable and user-orderable
Project group headers SHALL maintain a stable position in the list — they SHALL NOT jump in response to session activity. New groups are appended to the bottom of the active section. The user SHALL be able to reorder groups via a reorder button (≡) on each header. The user-defined order SHALL persist across app sessions.

#### Scenario: New project group appended at bottom
- **WHEN** a session from a previously unseen project appears
- **THEN** its project group is added at the bottom of the active groups section

#### Scenario: User reorders a project group
- **WHEN** the user taps the reorder (≡) button on a project group header
- **THEN** a modal appears with "Move Up" and "Move Down" options

#### Scenario: Reorder order persists
- **WHEN** the user reorders project groups and relaunches the app
- **THEN** the groups appear in the user-defined order

---

### Requirement: Dividers separate project groups visually
A hairline divider SHALL be rendered between consecutive project groups to visually separate them.

#### Scenario: Divider between groups
- **WHEN** two project group headers appear consecutively (after collapsing or naturally)
- **THEN** a subtle horizontal divider is shown between them

---

### Requirement: Each project group header has a quick new-chat button
Each project group header SHALL display a `+` button to the left of the reorder button. Tapping it spawns a new session in that project's directory on the associated machine and navigates directly to the new session.

#### Scenario: User taps + button on a project group
- **WHEN** the user taps the + button on a project group header
- **THEN** a new session is spawned in that project's directory and the app navigates to it

#### Scenario: + button navigates to new session
- **WHEN** session spawning succeeds
- **THEN** the app navigates immediately to the new session

#### Scenario: Spawning fails gracefully
- **WHEN** session spawning returns an error
- **THEN** an error alert is shown and the user remains on the sessions list
