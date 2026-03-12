# claude-subprocess-env Specification

## Purpose
TBD - created by archiving change fix-claudecode-nested-session. Update Purpose after archive.
## Requirements
### Requirement: Claude subprocess runs successfully when started inside Claude Code
The CLI SHALL strip Claude Code session environment variables (`CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`) from the environment before spawning any `claude` subprocess. This ensures the daemon can spawn claude agents regardless of whether the daemon itself was started inside an existing Claude Code session.

#### Scenario: Daemon started inside Claude Code spawns session successfully
- **WHEN** the daemon is started from within an active Claude Code session (CLAUDECODE=1 in env)
- **THEN** the spawned claude subprocess starts successfully and processes messages

#### Scenario: CLAUDECODE is absent from spawned claude environment
- **WHEN** the SDK spawns a claude subprocess
- **THEN** the subprocess environment does NOT contain `CLAUDECODE`

#### Scenario: CLAUDE_CODE_ENTRYPOINT is absent from spawned claude environment
- **WHEN** the SDK spawns a claude subprocess
- **THEN** the subprocess environment does NOT contain `CLAUDE_CODE_ENTRYPOINT`

### Requirement: Launch errors are logged with their message text
The CLI SHALL log claude subprocess launch errors using `error.message` (or `String(error)` fallback), not `JSON.stringify(error)`. This ensures errors are human-readable in log files.

#### Scenario: Launch error message is visible in daemon log
- **WHEN** a claude subprocess exits with a non-zero exit code
- **THEN** the daemon log contains the error message text (e.g., "Claude Code process exited with code 1"), not `{}`

### Requirement: Claude Code settings are read at daemon startup
The CLI SHALL read `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`) at daemon startup and make `model` and `effortLevel` values available for inclusion in `MachineMetadata`.

#### Scenario: Settings file with model and effortLevel is read
- **WHEN** the daemon starts and `~/.claude/settings.json` contains `model` and `effortLevel` keys
- **THEN** those values are available as `claudeDefaultModel` and `claudeDefaultEffortLevel` in `MachineMetadata`

#### Scenario: Settings file is absent or unreadable
- **WHEN** the daemon starts and `~/.claude/settings.json` does not exist or cannot be parsed
- **THEN** the daemon starts successfully with `claudeDefaultModel` and `claudeDefaultEffortLevel` absent from `MachineMetadata` (no crash)

