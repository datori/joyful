## ADDED Requirements

### Requirement: Machine/RAM panel visible on mobile sessions tab
On phone-sized devices, the sessions tab SHALL display the `MachinesSidebarPanel` above the session list, showing connected machines and their RAM usage — matching the information available in the desktop sidebar.

#### Scenario: At least one machine registered
- **WHEN** the user is on a phone, viewing the sessions tab, and at least one machine is registered
- **THEN** the `MachinesSidebarPanel` SHALL appear above the session list, showing machine name, online status, and RAM usage when available

#### Scenario: No machines registered
- **WHEN** the user is on a phone, viewing the sessions tab, and no machines are registered
- **THEN** the `MachinesSidebarPanel` SHALL render nothing (existing null-return behavior) and the session list SHALL occupy the full tab

#### Scenario: Panel is collapsible
- **WHEN** the user taps the machines panel header
- **THEN** the machine rows SHALL toggle collapsed/expanded, same as on desktop sidebar

#### Scenario: Not shown on tablet or desktop
- **WHEN** the device is a tablet or desktop (sidebar variant)
- **THEN** the machines panel SHALL remain in the sidebar only and SHALL NOT appear duplicated in the main content area
