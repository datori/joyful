## ADDED Requirements

### Requirement: Only terminal-specific and installation commands are hidden from autocomplete
The app's slash command autocomplete SHALL hide only commands that require an interactive terminal (PTY) to function meaningfully, or are one-time installation/maintenance tools. All other commands — including config, diagnostic, auth, and review commands — SHALL be visible in autocomplete.

The hidden set SHALL be exactly:
- `exit` — terminates the CLI process (terminal control)
- `vim` — opens interactive terminal editor
- `ide` — opens IDE integration (terminal-only)
- `terminal-setup` — configures terminal emulator
- `migrate-installer` — one-time installation migration
- `install-github-app` — one-time GitHub App installation
- `statusline` — configures terminal statusline display
- `resume` — joyful provides its own session-resume UI; native `/resume` would conflict

#### Scenario: Config commands appear in autocomplete
- **WHEN** a user types `/co` in the chat input
- **THEN** autocomplete suggestions include `config` and `cost`

#### Scenario: Diagnostic commands appear in autocomplete
- **WHEN** a user types `/d` in the chat input
- **THEN** autocomplete suggestions include `doctor`

#### Scenario: Auth commands appear in autocomplete
- **WHEN** a user types `/lo` in the chat input
- **THEN** autocomplete suggestions include `login` and `logout`

#### Scenario: Terminal-only commands are not shown
- **WHEN** a user types `/vi` in the chat input
- **THEN** `vim` does NOT appear in autocomplete suggestions

#### Scenario: resume is not shown
- **WHEN** a user types `/res` in the chat input
- **THEN** `resume` does NOT appear in autocomplete suggestions
