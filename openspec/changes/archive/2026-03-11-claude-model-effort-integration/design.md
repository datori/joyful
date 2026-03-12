## Context

Currently, the app hardcodes a Claude model list (`default`, `adaptiveUsage`, `sonnet`, `opus`) in `modelModeOptions.ts`. `adaptiveUsage` is dead code — it would pass `--model adaptiveUsage` to the CLI, which Claude doesn't recognize. The app also has no concept of reasoning effort level despite the `--effort` flag existing in the Claude binary.

On the CLI side, `SDKSystemMessage.model` carries the actual model Claude chose at session start, but `claudeRemoteLauncher.ts` ignores it. `Metadata.models[]` / `currentModelCode` / `thoughtLevels[]` / `currentThoughtLevelCode` fields already exist in the wire types for ACP agents but are never populated for Claude sessions. `~/.claude/settings.json` already contains `model` and `effortLevel` keys read by `claudeSettings.ts`, but only `includeCoAuthoredBy` is used.

## Goals / Non-Goals

**Goals:**
- CLI is the single source of truth for which Claude models are available and their names.
- App displays the actual model Claude is using (fed back from the SDK init message).
- Users can set per-session reasoning effort level from the app (`low | medium | high | max`), or leave it unset to let Claude Code use its own default.
- CC defaults (`model`, `effortLevel`) from `~/.claude/settings.json` surface in the app as pre-populated defaults.
- `adaptiveUsage` is removed entirely.

**Non-Goals:**
- Editing `~/.claude/settings.json` from the app (we set per-session options via flags, not persistent config).
- Supporting effort level for non-Claude agents (Codex, Gemini).
- Surfacing full Claude Code settings file to the user.

## Decisions

### Model list ownership: CLI → app (not hardcoded in app)

The CLI defines the canonical list of Claude model IDs in `claudeRemote.ts` (or a new `claudeModels.ts` constant file) and sends them as `Metadata.models[]` when a session starts. The app renders whatever list it receives.

**Why**: Model names change with Claude releases. Having the CLI own the list means a CLI update is sufficient; no app release needed for new models.

**Alternative**: Fetch from an API. Rejected — adds network dependency and latency for something the CLI already knows.

### CC defaults via MachineMetadata

At daemon startup, `claudeSettings.ts` reads `~/.claude/settings.json` and we add `claudeDefaultModel?: string` and `claudeDefaultEffortLevel?: string` to `MachineMetadataSchema`. The app uses these to pre-populate the new session wizard.

**Why**: Machine metadata is sent once at startup and cached. This is appropriate for user-level preferences that change rarely.

### Actual model feedback via SDKSystemMessage

In `claudeRemoteLauncher.ts`, when `SDKSystemMessage` arrives (type `system`, subtype `init`), extract `.model` and call `session.client.updateMetadata({ currentModelCode })`. This updates the session view in real time once Claude responds.

**Why**: Claude Code picks the actual model based on availability and user's API plan. We should show what's actually running, not what was requested.

### Effort level flow: MessageMeta → EnhancedMode → --effort flag

`MessageMeta.effortLevel` (`low | medium | high | max | null`) flows from the app through the message queue, gets picked up in `claudeRemoteLauncher.ts`'s `nextMessage()`, stored in `EnhancedMode.effortLevel`, then passed as `--effort <level>` when spawning Claude. `null` means "omit the flag" (Claude uses its own default).

**Why**: Per-session means per-spawn. Each time `claudeRemote()` is called (on mode change or reconnect), the `effortLevel` from the current mode is used.

The effort levels are also sent as `Metadata.thoughtLevels[]` at session init so the app can render the correct options dynamically (matching the same format as ACP agents).

### Drop adaptiveUsage

Remove from `modelModeOptions.ts` and `NewSessionWizard.tsx`. No CLI-side changes needed (it was never used there).

## Risks / Trade-offs

- **SDKSystemMessage timing**: The model feedback arrives asynchronously after spawn. The session view briefly shows the requested model (or nothing) until the init message arrives. This is acceptable UX — it resolves within the first second.
- **`~/.claude/settings.json` absent**: Not all users will have this file. `claudeSettings.ts` already handles this gracefully; `claudeDefaultModel` / `claudeDefaultEffortLevel` will be `undefined` and the app falls back to no pre-selection.
- **Effort level on continued sessions**: When a session is resumed (`--resume`), `--effort` can still be passed. Claude will apply it. This is correct behavior — the user's current session effort preference should be respected.
- **Wire schema forward compatibility**: Adding optional fields to `MessageMeta` and `MachineMetadata` is non-breaking for existing CLI/app pairs. Older app ignores new fields; older CLI sends them as undefined.
