## Why

Claude Pro and Max subscribers hit usage limits within 5-hour and 7-day rolling windows; there is currently no way to monitor quota consumption without leaving the app. A persistent, glanceable widget surfaces this information where the user already looks — the sidebar — without adding visual noise.

## What Changes

- Add quota utilization fields (`claudeQuota5hUtil`, `claudeQuota5hReset`, `claudeQuota7dUtil`, `claudeQuota7dReset`, `claudeQuotaFetchedAt`) to the `DaemonState` wire schema as optional fields.
- Add an app-to-daemon RPC command (`fetch-quota`) that triggers local session-file analysis on the daemon host. The daemon parses `~/.claude/projects/**/*.jsonl` files to count token usage across rolling 5h and 7d windows, then normalises against estimated tier limits read from `~/.claude/.credentials.json`.
- Add a `ClaudeQuotaPanel` component to the sidebar: two compact rows (5h and 7d) each with a filled progress bar, a time-cursor tick showing elapsed fraction of the window, a percentage label, a reset countdown, and a manual refresh button. No section header. Displayed above the Machines panel.
- The app controls polling: on foreground and on a ~5-minute debounce, it sends `fetch-quota` RPC to exactly one online machine — avoiding redundant multi-daemon polling.
- Quota data is account-level (not machine-level); the widget is rendered once, not per machine.

## Capabilities

### New Capabilities

- `claude-quota-widget`: Account-level quota usage panel in the sidebar showing 5h and 7d utilization bars with time cursors and a refresh button; app-controlled single-daemon RPC fetch via local JSONL session-file analysis.

### Modified Capabilities

- `machine-daemon-state`: Add four optional quota fields and a `claudeQuotaFetchedAt` timestamp to the `DaemonState` wire schema.

## Impact

- `joyful-wire`: `DaemonStateSchema` gains 5 optional fields.
- `joyful-cli`: New `fetch-quota` RPC handler; reads `rateLimitTier` from `~/.claude/.credentials.json`; parses `~/.claude/projects/**/*.jsonl` to sum token usage in 5h and 7d rolling windows; normalises against estimated tier limits; updates daemon state.
- `joyful-app`: New `ClaudeQuotaPanel` component; new `useClaudeQuota` hook; sidebar layout updated to render panel above machines section; i18n strings for all 9 languages.
- No server changes required (quota fields ride existing encrypted `daemonState` blobs).
- No breaking changes; all new fields are optional.
