# app-branding-text Specification

## Purpose
TBD - created by archiving change rename-happy-to-joyful-ui. Update Purpose after archive.
## Requirements
### Requirement: App displays Joyful branding in all user-visible strings
All user-visible text in the app translation files SHALL use "Joyful" and "Joyful Coder" instead of "Happy" and "Happy Coder".

#### Scenario: Settings about footer shows Joyful Coder
- **WHEN** user opens the Settings screen about section
- **THEN** the footer text reads "Joyful Coder is a Codex and Claude Code mobile client..."

#### Scenario: No machines found message shows Joyful
- **WHEN** user opens the new session screen with no connected machines
- **THEN** the empty state message reads "...Start a Joyful session on your computer first."

#### Scenario: Invalid server message shows Joyful
- **WHEN** user enters a server URL that is not a valid Joyful server
- **THEN** the error message reads "Not a valid Joyful Server"

#### Scenario: Session ID copy failure shows Joyful
- **WHEN** copying a session ID fails
- **THEN** the error toast reads "Failed to copy Joyful Session ID"

#### Scenario: Empty main screen install prompt shows Joyful
- **WHEN** user has no sessions and sees the empty main screen
- **THEN** the install prompt reads "Install the Joyful CLI"

#### Scenario: Sidebar sessions title shows Joyful
- **WHEN** user views the sessions sidebar
- **THEN** the section title reads "Joyful"

#### Scenario: Terminal connection request shows Joyful Coder
- **WHEN** a terminal requests to connect to the user's account
- **THEN** the prompt reads "...connect to your Joyful Coder account..."

#### Scenario: All language files use Joyful branding
- **WHEN** the app is displayed in any supported language (en, ru, pl, es, ca, it, pt, ja, zh-Hans, zh-Hant)
- **THEN** all brand name references use "Joyful" or "Joyful Coder" consistently

