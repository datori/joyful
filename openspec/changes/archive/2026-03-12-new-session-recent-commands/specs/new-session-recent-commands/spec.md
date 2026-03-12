## ADDED Requirements

### Requirement: Recent commands cache
The system SHALL collect slash commands seen across all prior sessions by scanning `session.metadata.slashCommands` for every session in storage, deduplicating, and filtering out `IGNORED_COMMANDS`. The result SHALL include `DEFAULT_COMMANDS` (`compact`, `clear`) as a baseline even when no sessions exist.

#### Scenario: Commands collected from prior sessions
- **WHEN** sessions exist in storage with `metadata.slashCommands` populated
- **THEN** `getRecentCommands()` returns the deduplicated union of all commands across those sessions, excluding any in `IGNORED_COMMANDS`

#### Scenario: No prior sessions
- **WHEN** no sessions exist in storage, or none have `slashCommands` metadata
- **THEN** `getRecentCommands()` returns `DEFAULT_COMMANDS` (`compact`, `clear`)

#### Scenario: IGNORED_COMMANDS excluded
- **WHEN** a session's `slashCommands` contains an entry in `IGNORED_COMMANDS` (e.g., `exit`, `status`, `model`)
- **THEN** that command SHALL NOT appear in the result of `getRecentCommands()`

### Requirement: Slash command autocomplete on new session screen
The new session creation screen SHALL enable `/` autocomplete using the recent commands cache. The active session screen SHALL continue using the existing session-specific autocomplete and SHALL NOT be modified.

#### Scenario: User types `/` on new session screen
- **WHEN** the user types `/` in the message input on the new session screen
- **THEN** the autocomplete picker opens with recent commands matching the query

#### Scenario: Active session screen unchanged
- **WHEN** an active session is open and the user types `/`
- **THEN** the existing session-specific `searchCommands(sessionId, query)` is used, not the recent commands cache

### Requirement: Recent commands label
When the autocomplete picker is shown in new-session mode, a "Recent commands" label SHALL appear above the suggestion list to indicate the list is derived from prior session history.

#### Scenario: Label visible in new session mode
- **WHEN** the autocomplete picker is open on the new session screen
- **THEN** a localized "Recent commands" label is displayed as a section header above the suggestion items

#### Scenario: Label absent in active session mode
- **WHEN** the autocomplete picker is open in an active session
- **THEN** no "Recent commands" label is shown (existing behavior preserved)

### Requirement: i18n for Recent commands label
The "Recent commands" label SHALL be defined in `_default.ts` and all translation files using the `t()` system.

#### Scenario: Label translated
- **WHEN** the app is set to a non-English locale
- **THEN** the "Recent commands" label is displayed in the appropriate language
