## Why

When multiple machines are registered, the session list gives no quick visual cue about which machine each session belongs to. Users have to read group headers or tap into a session to identify its machine — friction that adds up when switching between devices.

## What Changes

- Session rows (both active and archived) display a colored left border that identifies their machine
- Colors are assigned deterministically per machine (stable hash of `machineId` → palette index)
- The feature is entirely suppressed when only one machine is registered — zero UI impact for single-machine users
- A `getMachineColor` utility encapsulates the color assignment logic

## Capabilities

### New Capabilities

- `session-machine-color-indicator`: Visual machine identification via colored left borders on session list rows, shown only when multiple machines exist

### Modified Capabilities

<!-- No existing spec-level behavior changes -->

## Impact

- `joyful-app` only — no server, CLI, or wire changes
- Files: `ActiveSessionsGroup.tsx`, `SessionsList.tsx`, `storage.ts`, `machineUtils.ts`
- No new dependencies
- Purely additive rendering change; no data model changes
