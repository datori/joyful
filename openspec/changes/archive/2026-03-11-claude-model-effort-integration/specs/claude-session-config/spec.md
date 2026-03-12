## ADDED Requirements

### Requirement: Effort level can be set per session
The system SHALL accept an effort level (`low`, `medium`, `high`, `max`) from the app as part of session message metadata and pass it to Claude Code via the `--effort` flag. When no effort level is specified (`null`), the `--effort` flag SHALL be omitted, allowing Claude Code to use its own configured default.

#### Scenario: Effort level passed to subprocess
- **WHEN** the app sends a message with `effortLevel: "high"`
- **THEN** Claude is spawned with `--effort high`

#### Scenario: No effort level omits the flag
- **WHEN** the app sends a message with `effortLevel: null` or the field is absent
- **THEN** Claude is spawned without any `--effort` flag

#### Scenario: Effort level persists for session duration
- **WHEN** effort level is set at session start
- **THEN** the same `--effort` value is used if the session is re-spawned on reconnect (within the same mode hash)

### Requirement: Available effort levels are communicated to the app
The CLI SHALL populate `Metadata.thoughtLevels[]` with the supported effort levels at session init so the app renders the correct options without hardcoding them.

#### Scenario: Thought levels populated at session init
- **WHEN** a Claude session starts
- **THEN** `Metadata.thoughtLevels` contains `["low", "medium", "high", "max"]`

#### Scenario: Current thought level reflected in metadata
- **WHEN** a session is running with `effortLevel: "max"`
- **THEN** `Metadata.currentThoughtLevelCode` is `"max"`

### Requirement: Claude model list is owned by the CLI
The CLI SHALL define the canonical list of supported Claude model identifiers and send them as `Metadata.models[]` at session init. The app SHALL render the model list as received and not hardcode model names.

#### Scenario: Model list sent at session start
- **WHEN** a Claude session starts
- **THEN** `Metadata.models` is a non-empty array containing at least the default Claude model

#### Scenario: adaptiveUsage is not a valid model
- **WHEN** the app sends a message with `model: "adaptiveUsage"`
- **THEN** the CLI does not pass `--model adaptiveUsage` to Claude (adaptiveUsage SHALL NOT exist as a selectable option)

### Requirement: Actual model is reflected in session metadata
The CLI SHALL capture the model Claude Code chose from the `SDKSystemMessage` init event and update `Metadata.currentModelCode` so the app displays the model actually in use.

#### Scenario: currentModelCode updated after session init
- **WHEN** Claude Code sends its `system` init message containing a model name
- **THEN** `Metadata.currentModelCode` is updated to that model name within the session

#### Scenario: currentModelCode may differ from requested model
- **WHEN** the user requested `model: "claude-opus-4-5"` but Claude Code fell back to another model
- **THEN** `Metadata.currentModelCode` reflects the model Claude Code actually used

### Requirement: Claude Code defaults pre-populate new session wizard
The CLI SHALL read `model` and `effortLevel` from `~/.claude/settings.json` at daemon startup and include them as `MachineMetadata.claudeDefaultModel` and `MachineMetadata.claudeDefaultEffortLevel`. The app SHALL use these values as defaults in the new session wizard when no explicit selection has been made.

#### Scenario: CC default model pre-selected in wizard
- **WHEN** `~/.claude/settings.json` contains `"model": "claude-sonnet-4-5"`
- **THEN** `MachineMetadata.claudeDefaultModel` is `"claude-sonnet-4-5"` and the wizard pre-selects it

#### Scenario: CC default effort pre-selected in wizard
- **WHEN** `~/.claude/settings.json` contains `"effortLevel": "high"`
- **THEN** `MachineMetadata.claudeDefaultEffortLevel` is `"high"` and the wizard pre-selects it

#### Scenario: Missing settings file results in undefined defaults
- **WHEN** `~/.claude/settings.json` does not exist
- **THEN** `MachineMetadata.claudeDefaultModel` and `claudeDefaultEffortLevel` are absent (no error thrown)
