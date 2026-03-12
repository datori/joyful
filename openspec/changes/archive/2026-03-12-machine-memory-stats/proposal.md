## Why

Claude Code processes are memory-intensive; machines running multiple sessions can exhaust RAM and freeze. Users have no visibility into machine memory usage from the app, so they can't proactively kill expensive sessions before the machine becomes unresponsive.

## What Changes

- The daemon collects machine memory stats (`os.totalmem`, `os.freemem`, `process.memoryUsage().rss`) on its existing heartbeat/update cadence
- `DaemonState` wire schema gains optional `memTotal`, `memFree`, and `memDaemonRss` fields
- The app displays a memory bar on the machine card/list row showing used vs. total RAM

## Capabilities

### New Capabilities

- `machine-memory-stats`: Daemon-reported per-machine memory stats surfaced in the app UI

### Modified Capabilities

- `machine-daemon-state`: `DaemonState` schema extended with optional memory fields (`memTotal`, `memFree`, `memDaemonRss`)

## Impact

- `joyful-wire`: `DaemonState` schema (add 3 optional number fields)
- `joyful-cli`: `updateDaemonState()` in `apiMachine.ts` — include memory stats on each update
- `joyful-app`: Machine list/card UI — display memory usage bar or text indicator
