## Capability: native-session-fab

Split FAB UI that provides a first-class "Resume from Claude Code" entry point alongside "New Session" on the main sessions list screen.

---

### Requirement: Split FAB layout

The floating action button on the sessions list screen SHALL be a two-button split: a primary "New Session" button and a secondary "Resume" button rendered side-by-side in a single container.

#### Scenario: Default appearance
WHEN the user is on the main sessions list screen
THEN the split FAB is visible with "New Session" on the left and a resume icon/label on the right, separated by a vertical divider.

#### Scenario: Resume button disabled — no online machine
WHEN no machine is currently online
THEN the resume button SHALL be rendered at reduced opacity and SHALL be non-interactive.

#### Scenario: Resume button enabled — machine online
WHEN at least one machine is online
THEN the resume button SHALL be fully interactive.

---

### Requirement: Resume picker modal

Tapping the resume button SHALL open a modal that allows the user to select a machine (if needed) and enter a working directory path, then browse native sessions for that path.

#### Scenario: Single online machine — auto-selected
WHEN exactly one machine is online AND the resume button is tapped
THEN the modal SHALL open with that machine pre-selected and the machine selector hidden or read-only.

#### Scenario: Multiple online machines — selector shown
WHEN more than one machine is online AND the resume button is tapped
THEN the modal SHALL show a machine selector listing all online machines.

#### Scenario: Path entry and browse
WHEN the user has selected a machine and entered a non-empty directory path AND taps "Find Sessions"
THEN the `NativeSessionBrowser` modal SHALL open scoped to that machine and path.

#### Scenario: Empty path — browse disabled
WHEN the path input is empty
THEN the "Find Sessions" action SHALL be disabled.

---

### Requirement: Session resume from FAB

When the user selects a native session in the browser and confirms, the session SHALL be spawned via the existing `machineSpawnNewSession` with `resumeNativeSessionId`, without routing through the new-session wizard.

#### Scenario: Successful resume
WHEN the user taps "Resume in Joyful" in the `NativeSessionBrowser`
THEN a new Joyful session is spawned with the selected native session ID as the resume target AND the user is navigated to the new session.

---

### Requirement: Conversation history displayed on resume

When a Joyful session is spawned via `resumeNativeSessionId`, the prior conversation history from the native Claude session SHALL be replayed to the app immediately, so the user sees the full history before sending a new message.

#### Scenario: History visible on navigation
WHEN the user navigates to a resumed session
THEN the messages from the original native session SHALL be visible in the chat view without requiring the user to send a message first.

---

### Requirement: Wizard inline link removed

The conditional "Browse native sessions" inline link inside the new-session wizard (`/new`) SHALL be removed. The split FAB is the sole entry point for native session browsing.
