## ADDED Requirements

### Requirement: Slash-command popup anchors to the input bar on mobile
On mobile devices with a software keyboard, the autocomplete popup SHALL appear directly above the text input bar, hovering over the chat message area, regardless of how tall the surrounding AgentInput component is (due to attachments, chip rows, settings overlays, etc.).

#### Scenario: Slash command typed with keyboard open
- **WHEN** the user types `/` in the input field on a phone with the keyboard visible
- **THEN** the autocomplete popup SHALL appear immediately above the text input row, overlapping the bottom of the chat message list

#### Scenario: Popup does not shift with AgentInput height growth
- **WHEN** the AgentInput component grows taller (e.g., attachments or settings chips are shown) and the user types a slash command
- **THEN** the popup SHALL remain anchored to the top of the text input row, not pushed further up by the additional height

#### Scenario: Popup on desktop/web unchanged
- **WHEN** the user types a slash command on web or desktop (no software keyboard)
- **THEN** the autocomplete popup SHALL behave identically to current behavior
