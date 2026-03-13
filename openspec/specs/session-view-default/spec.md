### Requirement: Compact session view is the default
The system SHALL display the compact session list layout for all users who have not explicitly changed their session view preference. The `compactSessionView` setting SHALL default to `true`.

#### Scenario: New user sees compact view
- **WHEN** a user opens the app for the first time with no saved settings
- **THEN** the sessions list SHALL render using the compact layout (`ActiveSessionsGroupCompact`)

#### Scenario: User without saved preference sees compact view
- **WHEN** the `compactSessionView` setting has no stored value (default applies)
- **THEN** the sessions list SHALL render using the compact layout

### Requirement: Expanded session view is an opt-in via Appearance settings
The system SHALL provide an "Expanded Session View" toggle in Appearance settings. When enabled, the sessions list SHALL use the expanded layout instead of compact.

#### Scenario: Toggle off — compact view shown
- **WHEN** the "Expanded Session View" toggle is OFF (the default state)
- **THEN** the sessions list SHALL render using the compact layout

#### Scenario: Toggle on — expanded view shown
- **WHEN** the user enables the "Expanded Session View" toggle
- **THEN** the sessions list SHALL render using the expanded layout (`ActiveSessionsGroup`)

#### Scenario: Toggle label and description
- **WHEN** the user navigates to Settings → Appearance
- **THEN** the toggle SHALL be labelled "Expanded Session View" with a description indicating that enabling it switches to the expanded session layout
