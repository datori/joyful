## Why

When a user's model is shown as Opus because the CLI reported it via `metadata.currentModelCode`
(e.g. from `~/.claude/settings.json`), but the user never explicitly selected it in the app's
model picker, the model silently resets to Sonnet after `/compact` or auto-compact. Two separate
bugs cause this, and both need fixing to make model selection stable across compaction.

## What Changes

- **App `messageMeta.ts`**: `resolveMessageModeMeta` will fall back to
  `metadata.currentModelCode` when `session.modelMode` is null, so the model that is
  *displayed* is also the model that is *sent* in message meta — eliminating the phantom
  selection problem.
- **CLI `claudeRemoteLauncher.ts`**: `currentModelCode` in session metadata will only be
  written from the first `system init` message within a single `claudeRemote` invocation.
  Subsequent init messages (from session forks triggered by auto-compact) will not overwrite
  it, preventing the UI from flipping to a wrong model mid-session.

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
- `claude-session-config`: Two new requirements on model stability across compaction:
  (1) the app must use `currentModelCode` as the effective model when no explicit `modelMode`
  is set, and (2) the CLI must not overwrite `currentModelCode` from secondary init messages
  within the same session.

## Impact

- `packages/joyful-app/sources/sync/messageMeta.ts` — one-line change to `resolveMessageModeMeta`
- `packages/joyful-cli/src/claude/claudeRemoteLauncher.ts` — track whether model has been
  reported and skip overwriting on subsequent init messages
- No wire protocol changes; no server changes; no breaking changes
- Side-effect to document: after this fix, a session's first message (before metadata is
  populated) will use `model: null`; once the init message arrives and metadata updates, the
  second message will carry the explicit model. This causes a one-time mode-hash change after
  turn 1 for sessions where the model comes from CLI settings rather than an explicit app
  selection. The result is a brief SDK respawn — imperceptible to users but worth noting in
  design.
