## ADDED Requirements

### Requirement: Machine color border shown only when multiple machines registered
Session rows in the session list SHALL display a colored left border identifying their machine only when two or more machines are registered on the account. When only one machine is registered, no borders SHALL be shown.

#### Scenario: Single machine — no borders
- **WHEN** the account has exactly one registered machine
- **THEN** no session row displays a colored left border

#### Scenario: Multiple machines — borders shown
- **WHEN** the account has two or more registered machines
- **THEN** every session row (active and archived) displays a colored left border corresponding to its machine

### Requirement: Deterministic stable color assignment per machine
The system SHALL assign machine colors based on the machine's registration order (sorted by `createdAt` ascending). The first registered machine SHALL receive no border. Subsequent machines SHALL each receive a distinct color from a fixed palette, cycling if more machines exist than palette entries.

#### Scenario: First machine has no border
- **WHEN** multiple machines are registered
- **THEN** the machine with the earliest `createdAt` displays sessions with no left border

#### Scenario: Second machine gets first palette color
- **WHEN** multiple machines are registered
- **THEN** the machine with the second-earliest `createdAt` displays sessions with the first palette color (blue)

#### Scenario: Color stable across app restarts
- **WHEN** the app is restarted and the same machines are registered
- **THEN** each machine's sessions display the same border color as before the restart

### Requirement: Color indicator applies to both active and archived sessions
The machine color border SHALL be applied consistently to session rows regardless of whether the session is active or archived.

#### Scenario: Active session shows color border
- **WHEN** multiple machines are registered
- **THEN** active session rows in `ActiveSessionsGroup` display the machine color border

#### Scenario: Archived session shows color border
- **WHEN** multiple machines are registered
- **THEN** archived session rows in the collapsed archived section display the machine color border

### Requirement: Machine color resolved at list-build time
The resolved machine color SHALL be attached to each session list item when `buildSessionListViewData()` constructs the list. Session row components SHALL receive the color as a prop and not perform machine lookups themselves.

#### Scenario: Color prop passed to session row
- **WHEN** `buildSessionListViewData` runs with multiple machines
- **THEN** each `{ type: 'session' }` item includes a `machineColor` string or `undefined` for the default machine
