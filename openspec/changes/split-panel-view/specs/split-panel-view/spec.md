## ADDED Requirements

### Requirement: Split layout activates on wide viewports
On viewports with width ≥1200px, the app SHALL render a three-column layout: sidebar | left panel | right panel. Below this threshold the app SHALL render the existing single-panel layout unchanged.

#### Scenario: Wide viewport on initial load
- **WHEN** the app loads with viewport width ≥1200px
- **THEN** the three-column layout is rendered with sidebar and left panel visible, right panel empty (closed state)

#### Scenario: Viewport narrows below threshold
- **WHEN** the viewport width drops below 1200px while split layout is active
- **THEN** the layout reverts to single-panel mode and the right panel is hidden

#### Scenario: Viewport widens above threshold
- **WHEN** the viewport width increases to ≥1200px from below the threshold
- **THEN** the three-column layout is restored; the right panel reopens if a session was previously open in it

### Requirement: Left panel is Expo Router–driven
The left panel SHALL render the current Expo Router route (the `<Slot>`) exactly as it does today. Navigation within the left panel SHALL update the URL.

#### Scenario: Navigating in left panel
- **WHEN** the user taps a session in the sidebar while in split layout
- **THEN** the left panel navigates to that session and the URL updates; the right panel is unaffected

### Requirement: Right panel opens a session
The user SHALL be able to open any session in the right panel. The right panel SHALL render a fully interactive `SessionView` for the chosen session.

#### Scenario: Open in right panel from session list (long-press, iPad)
- **WHEN** the user long-presses a session row in the sessions list on a wide viewport
- **THEN** a context menu appears with an "Open in right panel" option

#### Scenario: Open in right panel from session list (right-click, web)
- **WHEN** the user right-clicks a session row in the sessions list on a wide viewport
- **THEN** a context menu appears with an "Open in right panel" option

#### Scenario: Session opens in right panel
- **WHEN** the user selects "Open in right panel"
- **THEN** the chosen session is rendered in the right panel; the left panel is unaffected

#### Scenario: Opening a second session in right panel replaces the first
- **WHEN** the right panel already has a session open and the user opens another via "Open in right panel"
- **THEN** the right panel switches to the new session; the previous session is no longer shown

### Requirement: Right panel has a local navigation stack
The right panel SHALL maintain an independent local navigation stack for within-session sub-views (files, file detail, info, recent). Navigation within this stack SHALL NOT affect the left panel's URL or history.

#### Scenario: Navigating to files from right panel
- **WHEN** the user taps the files button in the right panel's session header
- **THEN** the right panel shows the files view; the left panel URL is unchanged

#### Scenario: Back navigation within right panel
- **WHEN** the user presses back within the right panel while a sub-view is active
- **THEN** the right panel returns to the previous screen in its local stack

#### Scenario: Sub-views not covered by local stack open as modals
- **WHEN** the user triggers navigation from the right panel to a route not handled by the local stack
- **THEN** the view opens as a full-screen modal over both panels

### Requirement: Right panel is closeable
The user SHALL be able to close the right panel, returning to single-panel mode (with the full content area given to the left panel).

#### Scenario: Close button visible
- **WHEN** the right panel has a session open
- **THEN** a close button is visible in the right panel's header area

#### Scenario: Closing right panel
- **WHEN** the user presses the close button on the right panel
- **THEN** the right panel is hidden and the left panel expands to fill the content area

### Requirement: Right panel session persists across page refreshes (web)
On web and macOS, the right panel's active session ID SHALL be reflected in the URL as a query parameter (`?r=<sessionId>`).

#### Scenario: Right panel session encoded in URL
- **WHEN** a session is open in the right panel on web
- **THEN** the URL includes `?r=<sessionId>`

#### Scenario: Right panel restores from URL on refresh
- **WHEN** the user loads a URL containing `?r=<sessionId>` on a wide viewport
- **THEN** the right panel opens with the specified session

#### Scenario: Right panel query param absent when panel closed
- **WHEN** the user closes the right panel
- **THEN** the `?r` query parameter is removed from the URL

### Requirement: Equal panel widths
When both panels are visible, each panel SHALL occupy 50% of the available content area (total width minus sidebar).

#### Scenario: Equal split rendering
- **WHEN** both panels are visible
- **THEN** each panel renders at the same width with no resize affordance

### Requirement: Split layout is web/macOS/iPad-only
The split panel feature SHALL only be available on web, macOS Tauri, and iPad devices. It SHALL NOT activate on phone-sized devices regardless of viewport width.

#### Scenario: Split layout suppressed on phone
- **WHEN** the app is running on a phone device with a wide viewport (e.g. landscape)
- **THEN** the split layout does NOT activate
