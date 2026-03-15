## Why

Claude Pro and Max subscribers hit usage limits within 5-hour and 7-day rolling windows; there is currently no way to monitor quota consumption without leaving the app. A persistent, glanceable widget surfaces this information where the user already looks — the sidebar — without adding visual noise.

## What Changes

- Add quota utilization fields (`claudeQuota5hUtil`, `claudeQuota5hReset`, `claudeQuota7dUtil`, `claudeQuota7dReset`, `claudeQuotaFetchedAt`) to the `DaemonState` wire schema as optional fields.
- Add an app-to-daemon RPC command (`fetch-quota`) that makes a minimal Anthropic Messages API call from the daemon host. The daemon reads the OAuth access token from `~/.claude/.credentials.json`, sends a one-token request to `api.anthropic.com/v1/messages`, and reads the authoritative utilization and reset-time values from the `anthropic-ratelimit-unified-*` response headers.
- Add a `ClaudeQuotaPanel` component to the sidebar: two compact rows (5h and 7d) each with a filled progress bar, a time-cursor tick showing elapsed fraction of the window, a percentage label, a reset countdown, and a manual refresh button. No section header. Displayed above the Machines panel.
- The app controls polling: on foreground and on a ~5-minute debounce, it sends `fetch-quota` RPC to exactly one online machine — avoiding redundant multi-daemon polling.
- Quota data is account-level (not machine-level); the widget is rendered once, not per machine.

## Capabilities

### New Capabilities

- `claude-quota-widget`: Account-level quota usage panel in the sidebar showing 5h and 7d utilization bars with time cursors and a refresh button; app-controlled single-daemon RPC fetch via minimal Anthropic Messages API ping with OAuth token, reading authoritative `anthropic-ratelimit-unified-*` response headers.

### Modified Capabilities

- `machine-daemon-state`: Add four optional quota fields and a `claudeQuotaFetchedAt` timestamp to the `DaemonState` wire schema.

## Impact

- `joyful-wire`: `DaemonStateSchema` gains 5 optional fields.
- `joyful-cli`: New `fetch-quota` RPC handler; reads OAuth `accessToken` from `~/.claude/.credentials.json`; makes a minimal `POST /v1/messages` call with `claude-haiku-4-5-20251001` + `max_tokens: 1`; reads `anthropic-ratelimit-unified-{5h,7d}-{utilization,reset}` response headers; updates daemon state with authoritative server-side values.
- `joyful-app`: New `ClaudeQuotaPanel` component; new `useClaudeQuota` hook; sidebar layout updated to render panel above machines section; i18n strings for all 9 languages.
- No server changes required (quota fields ride existing encrypted `daemonState` blobs).
- No breaking changes; all new fields are optional.
