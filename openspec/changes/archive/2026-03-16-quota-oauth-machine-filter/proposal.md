## Why

The quota widget always polls the **newest active machine** for quota data, but only machines running Claude via OAuth (subscription) can provide it. When the newest machine uses an API key, quota fetches silently fail and the widget either stays hidden or shows permanently stale data from an older subscription machine — even if that subscription machine is online and healthy.

## What Changes

- The daemon reports `hasOAuthCredentials: boolean` in its `daemonState` so the app knows which machines are capable of providing quota data.
- The daemon sets this field on startup (and re-evaluates when credentials are refreshed).
- The quota hook in the app filters its poll target to the first active machine where `hasOAuthCredentials === true`, skipping API-key-only machines entirely.
- The quota data read path is unchanged — it still reads from the first machine that has quota fields populated.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `machine-daemon-state`: `DaemonState` gains a `hasOAuthCredentials` boolean field — daemon sets it on startup by checking whether `~/.claude/.credentials.json` contains a valid `claudeAiOauth.accessToken`.
- `claude-quota-widget`: Machine selection for the `fetch-quota` RPC changes from "first active machine" to "first active machine where `hasOAuthCredentials === true`".

## Impact

- **joyful-cli** — `src/api/types.ts` (`DaemonStateSchema`), `src/daemon/run.ts` or `apiMachine.ts` (set `hasOAuthCredentials` on startup), `src/daemon/quotaFetcher.ts` (expose credential check helper for reuse).
- **joyful-app** — `sources/hooks/useClaudeQuota.ts` (filter machine selection by `hasOAuthCredentials`).
- No server, wire, or UI changes required beyond the daemonState field.
