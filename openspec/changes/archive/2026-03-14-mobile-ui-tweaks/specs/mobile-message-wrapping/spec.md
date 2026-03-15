## ADDED Requirements

### Requirement: Agent messages wrap within screen bounds
Agent message containers SHALL constrain their width to the available screen width so that long unbreakable content (file paths, identifiers, URLs) wraps rather than overflowing off-screen.

#### Scenario: Long unbreakable string in agent message
- **WHEN** an agent message contains a string with no whitespace longer than the screen width
- **THEN** the message container SHALL NOT exceed the screen width and the text SHALL wrap to the next line

#### Scenario: Normal text message
- **WHEN** an agent message contains typical prose with natural word boundaries
- **THEN** the message SHALL display identically to current behavior (shrink to content, left-aligned)

#### Scenario: Code block in agent message
- **WHEN** an agent message contains a fenced code block
- **THEN** the code block SHALL scroll horizontally within its container and the outer message container SHALL remain within screen bounds
