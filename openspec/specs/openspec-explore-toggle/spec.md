## ADDED Requirements

### Requirement: Explore Mode toggle button appears for active sessions
The system SHALL display an Explore Mode toggle button in the `AgentInput` left toolbar when the session is active (not archived). The button SHALL be visually distinct when armed (tinted/highlighted color). The button SHALL NOT appear for archived sessions or when there is no active session.

#### Scenario: Active session toolbar
- **WHEN** the session is active (`session.active === true`)
- **THEN** the Explore Mode button appears in the AgentInput left toolbar

#### Scenario: Archived session toolbar
- **WHEN** the session is archived (`session.active === false`)
- **THEN** the Explore Mode button does NOT appear

### Requirement: Explore Mode is a one-shot prefix toggle
The system SHALL implement Explore Mode as a one-shot toggle. When the button is tapped:
1. The button enters an "armed" visual state (highlighted/tinted)
2. The very next message sent via `onSend` is prefixed with `/opsx:explore ` before the user's text
3. Immediately after that send, the armed state resets to off — the button returns to its normal appearance

The button SHALL also be able to be tapped again while armed to cancel (disarm) without sending.

#### Scenario: User arms and sends a message
- **WHEN** the user taps the Explore button (arming it), types "how does auth work?", and taps Send
- **THEN** the message sent to the session is `/opsx:explore how does auth work?` and the button returns to its normal (unarmed) state

#### Scenario: User arms then disarms without sending
- **WHEN** the user taps the Explore button to arm it, then taps it again
- **THEN** the button returns to its normal state and no prefix is applied to future messages

#### Scenario: User arms and sends empty message
- **WHEN** the Explore button is armed and the user taps Send with an empty input
- **THEN** nothing is sent (normal empty-send guard applies) and the armed state is NOT cleared

### Requirement: Explore Mode state is ephemeral
The explore mode armed state SHALL be stored as local React state (`useState`) in the session view component. It SHALL reset whenever the session view unmounts or a message is successfully sent. It SHALL NOT be persisted to storage, synced across devices, or retained across navigation.

#### Scenario: Navigate away and back
- **WHEN** Explore Mode is armed and the user navigates away from the session and returns
- **THEN** the button is in its normal (unarmed) state
