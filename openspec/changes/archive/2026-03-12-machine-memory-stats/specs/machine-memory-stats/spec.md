## ADDED Requirements

### Requirement: Machine memory stats visible in sidebar panel
The app SHALL display a collapsible "Machines" panel at the top of the sidebar (above the sessions list) showing all registered machines. Each row SHALL include an online/offline indicator dot and, when memory stats are available, the RAM usage in human-readable form (e.g., `"12.3 / 16.0 GB used"`). The panel SHALL default to expanded. When no machines are registered, the panel SHALL be hidden.

#### Scenario: Memory stats shown for running machine
- **WHEN** a machine's daemon is running and has reported memory stats
- **THEN** the machine's sidebar row SHALL display used and total RAM in human-readable form

#### Scenario: Memory indicator hidden when stats absent
- **WHEN** a machine's `daemonState` does not include memory fields (older daemon or offline)
- **THEN** no memory text SHALL be shown for that machine row (dot and name still shown)

#### Scenario: Panel collapses and expands
- **WHEN** the user taps the Machines panel header
- **THEN** the machine rows SHALL toggle between visible and hidden

#### Scenario: Tapping machine row navigates to detail
- **WHEN** the user taps a machine row in the sidebar panel
- **THEN** the app SHALL navigate to that machine's detail screen

### Requirement: Memory stats also visible on machine detail screen
The machine detail screen SHALL display a "Memory" row in the Daemon section showing used and total RAM when `memTotal` and `memFree` are present in `daemonState`.

#### Scenario: Memory row shown on detail screen
- **WHEN** the user opens a machine's detail screen and the daemon has reported memory stats
- **THEN** a "Memory" row SHALL be visible in the Daemon section showing used and total RAM

### Requirement: Memory stats refreshed on existing daemon update cadence
The daemon SHALL include current machine memory stats (`memTotal`, `memFree`, `memDaemonRss`) in every `daemonState` update it sends to the server, using an update interval of approximately 60 seconds in addition to the connect-time update.

#### Scenario: Stats present on daemon connect
- **WHEN** the daemon connects to the server and calls `updateDaemonState()`
- **THEN** the emitted state SHALL include `memTotal`, `memFree`, and `memDaemonRss` values

#### Scenario: Stats refreshed periodically
- **WHEN** the daemon has been running for more than 60 seconds
- **THEN** it SHALL have sent at least one additional `daemonState` update containing current memory values
