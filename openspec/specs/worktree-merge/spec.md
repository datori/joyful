## MODIFIED Requirements

### Requirement: Auto-send message on session navigate
The session route (`/session/[id]`) SHALL accept an `autoSendMessage` URL param. When present and the session is active, the session view SHALL call `sync.sendMessage` with the param value on mount, without pre-filling the input. When the session is inactive, the behaviour SHALL fall back to pre-filling the input identically to the existing `initialMessage` param.

#### Scenario: Navigate to active session with autoSendMessage
- **WHEN** the app navigates to `/session/{id}` with `autoSendMessage` set and the session is active
- **THEN** the message is sent immediately on mount and the conversation shows the sent message with the agent responding

#### Scenario: Navigate to inactive session with autoSendMessage
- **WHEN** the app navigates to `/session/{id}` with `autoSendMessage` set and the session is not active
- **THEN** the message text is placed in the input field and not auto-sent, allowing the user to review before sending
