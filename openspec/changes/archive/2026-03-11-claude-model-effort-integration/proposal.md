## Why

The app hardcodes a stale model list and has no way to communicate reasoning effort preferences to Claude. Meanwhile Claude Code already knows which model it prefers (from `~/.claude/settings.json`) and reports the actual model it chose at session start — none of this is surfaced to the user. We should make Claude Code the source of truth for model config and add per-session effort level control.

## What Changes

- **Remove** `adaptiveUsage` pseudo-model from the app — it's dead code that would pass `--model adaptiveUsage` (an invalid flag) to the CLI.
- **Read** Claude Code defaults (`model`, `effortLevel`) from `~/.claude/settings.json` at daemon startup and include in `MachineMetadata` so the app can show them as defaults.
- **Define** the canonical Claude model list on the CLI side; send it to the app via `Metadata.models[]` at session init so the app no longer hardcodes model names.
- **Capture** the actual model Claude Code chose (from `SDKSystemMessage.model`) and update `Metadata.currentModelCode` so the session view displays the real model in use.
- **Add** `effortLevel` (`low | medium | high | max | null`) to `MessageMeta` wire type. `null` means "use Claude Code's own setting."
- **Pass** `--effort <level>` flag when spawning Claude if `effortLevel` is non-null; also populate `Metadata.thoughtLevels[]` and `Metadata.currentThoughtLevelCode`.
- **Add** effort level picker to the new session wizard and session control UI in the app.

## Capabilities

### New Capabilities

- `claude-session-config`: Per-session Claude Code configuration — model selection and reasoning effort level flowing from app through CLI to the Claude subprocess.

### Modified Capabilities

- `claude-subprocess-env`: Extends the existing spec with how Claude Code's own settings (`~/.claude/settings.json`) are read and forwarded at daemon startup and session init.

## Impact

- **joyful-wire**: `MessageMeta` schema gains `effortLevel`; `MachineMetadata` gains `claudeDefaultModel` and `claudeDefaultEffortLevel`.
- **joyful-cli**: `claudeSettings.ts` exposes `model` and `effortLevel`; `claudeRemote.ts` and `query.ts` pass `--effort`; `claudeRemoteLauncher.ts` captures `SDKSystemMessage.model`; `loop.ts` `EnhancedMode` gains `effortLevel`.
- **joyful-app**: `modelModeOptions.ts` drops `adaptiveUsage`, reads model list from metadata; `messageMeta.ts` resolves `effortLevel`; new effort picker UI in `NewSessionWizard` and session view.
- No server changes required — server is a transparent relay of encrypted metadata.
