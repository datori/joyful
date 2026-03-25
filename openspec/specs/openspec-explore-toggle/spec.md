## Requirements

### Requirement: Explore and Patch Mode toggles are available in both new session creator and active sessions
The system SHALL provide Explore Mode and Patch Mode toggle buttons accessible from the `AgentInput` toolbar. In **active sessions** where the project has an `openspec/` directory, these toggles appear inside the OpenSpec submenu (see openspec-panel spec). In the **new session creator** (where no openspec context exists), they appear as standalone toolbar buttons.

#### Scenario: Active session with openspec
- **WHEN** the user is viewing an active session whose project has `openspec/`
- **THEN** Explore and Patch Mode toggles are available inside the OpenSpec submenu

#### Scenario: New session creator
- **WHEN** the user is on the new session creation screen
- **THEN** Explore and Patch Mode buttons appear as standalone toolbar buttons

### Requirement: The OpenSpec submenu button shows which mode is currently armed
When a mode is armed the OpenSpec submenu button (in the `AgentInput` toolbar) SHALL change its visual appearance to indicate both that a mode is active AND which specific mode. The stack icon SHALL be replaced with the armed mode's icon alongside a short text label (e.g., telescope + "Explore", wrench + "Patch"). The filled primary-color background remains as the selection indicator.

Inside the submenu, the armed row SHALL display with a highlighted background and primary-color text so the active choice is immediately distinguishable.

#### Scenario: No mode armed — default button
- **WHEN** no mode is armed
- **THEN** the submenu button shows the stack icon on a transparent background

#### Scenario: A mode is armed — button shows mode
- **WHEN** e.g. Patch Mode is armed
- **THEN** the submenu button shows the construct icon and the label "Patch" on a filled primary background

#### Scenario: Armed row highlighted in submenu
- **WHEN** the submenu is open and Explore Mode is armed
- **THEN** the Explore row has a distinct background, primary-color text, and a filled checkmark icon

---

### Requirement: Explore Mode is a one-shot prefix toggle
The system SHALL implement Explore Mode as a one-shot toggle. When the button is tapped:
1. The button enters an "armed" visual state (highlighted/tinted)
2. The very next message sent via `onSend` is prefixed with `/opsx:explore ` before the user's text
3. Immediately after that send, the armed state resets to off — the button returns to its normal appearance

The button SHALL also be able to be tapped again while armed to cancel (disarm) without sending.
Arming Explore Mode SHALL automatically disarm Patch Mode if it was armed (mutually exclusive).

#### Scenario: User arms and sends a message
- **WHEN** the user taps the Explore button (arming it), types "how does auth work?", and taps Send
- **THEN** the message sent to the session is `/opsx:explore how does auth work?` and the button returns to its normal (unarmed) state

#### Scenario: User arms then disarms without sending
- **WHEN** the user taps the Explore button to arm it, then taps it again
- **THEN** the button returns to its normal state and no prefix is applied to future messages

#### Scenario: User arms and sends empty message
- **WHEN** the Explore button is armed and the user taps Send with an empty input
- **THEN** nothing is sent (normal empty-send guard applies) and the armed state is NOT cleared

### Requirement: Explore/Patch Mode state is ephemeral
The explore/patch mode armed state SHALL be stored as local React state (`useState`) in the component managing the session. It SHALL reset whenever a message is successfully sent. It SHALL NOT be persisted to storage, synced across devices, or retained across navigation.

#### Scenario: Navigate away and back
- **WHEN** Explore Mode is armed and the user navigates away from the session screen and returns
- **THEN** the button is in its normal (unarmed) state
