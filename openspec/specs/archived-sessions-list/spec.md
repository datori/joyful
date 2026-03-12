## ADDED Requirements

### Requirement: Archived sessions appear in a collapsed section at the bottom of the sessions list
All inactive (`active: false`) sessions SHALL be grouped under a single "Archived" section header at the bottom of the sessions list. This section SHALL be collapsed by default. The existing date-group headers (Today, Yesterday, N days ago) for inactive sessions SHALL be removed.

#### Scenario: Archived section is collapsed by default
- **WHEN** the sessions list is rendered
- **THEN** only active sessions and the "Archived (N)" header row are visible; no archived session rows are shown

#### Scenario: User expands the archived section
- **WHEN** the user taps the "Archived (N)" header row
- **THEN** all archived sessions become visible below the header

#### Scenario: User collapses the archived section
- **WHEN** the archived section is expanded and the user taps the header row
- **THEN** all archived session rows are hidden

#### Scenario: No archived sessions
- **WHEN** all sessions have `active: true`
- **THEN** the "Archived" section header is not rendered

#### Scenario: Section header shows count
- **WHEN** the archived section header is rendered
- **THEN** it displays the count of archived sessions (e.g., "Archived (3)")

### Requirement: Archived session rows are visually de-emphasized
Archived session rows SHALL render with reduced opacity and slightly smaller text compared to active session rows, signalling that they are secondary content.

#### Scenario: Archived session row visual treatment
- **WHEN** an archived session row is rendered (section expanded)
- **THEN** the row has reduced opacity (approx. 0.55) and session title uses a slightly smaller font size than standard rows

### Requirement: `hideInactiveSessions` setting suppresses the archived section
When the `hideInactiveSessions` setting is enabled, the archived section header and all archived session rows SHALL be hidden, consistent with the existing behavior of hiding inactive sessions.

#### Scenario: hideInactiveSessions hides the archived section
- **WHEN** `hideInactiveSessions` is true
- **THEN** neither the "Archived" header nor any archived session rows appear in the list
