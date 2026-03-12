## ADDED Requirements

### Requirement: Claude Code settings are read at daemon startup
The CLI SHALL read `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`) at daemon startup and make `model` and `effortLevel` values available for inclusion in `MachineMetadata`.

#### Scenario: Settings file with model and effortLevel is read
- **WHEN** the daemon starts and `~/.claude/settings.json` contains `model` and `effortLevel` keys
- **THEN** those values are available as `claudeDefaultModel` and `claudeDefaultEffortLevel` in `MachineMetadata`

#### Scenario: Settings file is absent or unreadable
- **WHEN** the daemon starts and `~/.claude/settings.json` does not exist or cannot be parsed
- **THEN** the daemon starts successfully with `claudeDefaultModel` and `claudeDefaultEffortLevel` absent from `MachineMetadata` (no crash)
