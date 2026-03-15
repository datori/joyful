## Context

Claude Pro and Max subscriptions enforce rolling-window rate limits (5-hour and 7-day). When a user hits these limits, Claude Code stops mid-session with no prior warning. Anthropic exposes utilization as a fraction (0–1) in standard HTTP rate-limit response headers on every Messages API response. The joyful daemon runs on the same machine as Claude Code and already holds session credentials — it is the natural place to fetch this data.

The `DaemonStateSchema` (in `joyful-cli/src/api/types.ts`) already carries dynamic machine state (status, memory) sent as an encrypted blob to the server and relayed to the app. Quota fields slot in naturally alongside existing `mem*` fields.

## Goals / Non-Goals

**Goals:**
- Show 5h and 7d quota utilization bars (with time-cursor) persistently above the Machines panel in the sidebar.
- Fetch quota data on demand (app-triggered RPC), never via an autonomous daemon timer.
- Use exactly one daemon per polling cycle regardless of how many machines are connected.
- Zero additional infrastructure: no schema migrations, no server changes, no new dependencies.

**Non-Goals:**
- Per-model breakdowns (Opus/Sonnet share) — requires the claude.ai session cookie path; not worth the extra credential friction.
- Dollar spend / billing data — separate Console session cookie, different audience.
- Automatic alerts or push notifications when quota is low.
- Token count estimates (we only show the utilization %, which is the authoritative signal).

## Decisions

### Decision 1: Minimal Messages API ping, not local JSONL files

**Chosen**: Make a single minimal `POST https://api.anthropic.com/v1/messages` request (model `claude-haiku-4-5-20251001`, `max_tokens: 1`) authenticated with the OAuth access token from `~/.claude/.credentials.json`. Read the authoritative utilization and reset-time values from the response headers:
- `anthropic-ratelimit-unified-5h-utilization` (0.0–1.0)
- `anthropic-ratelimit-unified-5h-reset` (Unix timestamp, seconds)
- `anthropic-ratelimit-unified-7d-utilization` (0.0–1.0)
- `anthropic-ratelimit-unified-7d-reset` (Unix timestamp, seconds)

**Why not JSONL parsing**: Local JSONL files only record `input_tokens` and `output_tokens`. Anthropic's unified rate limit also accounts for `cache_creation_input_tokens` (prompt-cache writes, often 100–2000× larger than `input_tokens` per turn). Additionally, when Claude Code resumes a session it copies the full prior-session history into a new JSONL file with the same UUIDs — without deduplication, every resumed session re-counts all historical tokens. Even with both issues fixed the tier-to-limit mapping is a conservative estimate, not the authoritative Anthropic figure.

**Why not the dedicated usage endpoint**: Anthropic disabled `api.anthropic.com/api/oauth/usage`.

**Why the Messages API ping works**: The `anthropic-ratelimit-unified-*` headers are returned on every successful response and reflect the account's exact server-side utilization immediately after the request completes. The OAuth token from `~/.claude/.credentials.json` is accepted with `Authorization: Bearer` + `anthropic-beta: oauth-2025-04-20` headers. This is the same approach used by the open-source Claude-Usage-Tracker project for CLI credential users.

**Accuracy**: Server-authoritative — the same figure Anthropic uses to enforce the rate limit.

**Cost**: One minimal Haiku call per 5-minute poll cycle (~1 output token). Negligible against any subscription tier.

### Decision 2: App controls polling, daemon is passive

**Chosen**: The app's `useClaudeQuota` hook sends a `fetch-quota` RPC to one online machine on app foreground and on a 5-minute interval while foregrounded. The daemon only fetches when asked.

**Why not a daemon-side timer**: If multiple machines are connected, each would poll independently against the same account quota — wasteful and redundant. The app already has a single view of all machines and can designate the poller. Daemon-side timers also run whether or not the user has the app open.

**Machine selection**: App picks the first machine where `isMachineOnline(machine)` returns true. Falls back silently if no machine is online — quota display simply shows last cached values.

### Decision 3: Quota fields added to DaemonStateSchema in joyful-cli/src/api/types.ts

**Chosen**: Add five optional fields to the existing Zod schema:
```
claudeQuota5hUtil:     z.number().optional()  // 0–1 float from header
claudeQuota5hReset:    z.string().optional()  // ISO timestamp
claudeQuota7dUtil:     z.number().optional()  // 0–1 float from header
claudeQuota7dReset:    z.string().optional()  // ISO timestamp
claudeQuotaFetchedAt:  z.number().optional()  // epoch ms, for staleness display
```

**Why not a separate top-level state object**: The `daemonState` blob is already the channel for live daemon telemetry and is pushed to the app via the existing encrypted state mechanism. Adding fields here requires zero new server routes, no protocol changes, and follows the same pattern as `memTotal`/`memFree`.

**Why not joyful-wire**: `DaemonStateSchema` lives in `joyful-cli/src/api/types.ts`, not in the wire package. The app reads it via the decrypted `daemonState` field on the `Machine` object (typed in the app as `any` fields, then validated). This matches how `memTotal`/`memFree` are already consumed in `MachinesSidebarPanel.tsx`.

### Decision 4: OAuth access token from credentials file as the sole credential

**Chosen**: Read `~/.claude/.credentials.json` for `claudeAiOauth.accessToken` only. No tier detection, no JSONL scanning, no estimated limits.

**Why not joyful's own `access.key`**: That file holds joyful server auth credentials (TweetNaCl keypair), not Claude account information.

**Fallback**: If `~/.claude/.credentials.json` is missing or contains no `accessToken`, the RPC returns `{ type: 'error', reason: 'no-credentials' }` and the widget stays hidden. If the API returns non-200 (e.g. expired token), the handler returns `{ type: 'error', reason: 'api-error' }` and the widget continues showing last cached values.

### Decision 5: Widget placement — above Machines, no header, no section title

**Chosen**: `ClaudeQuotaPanel` rendered above `MachinesSidebarPanel` in the sidebar. Two rows (5h, 7d), each: a 3px filled bar with a 1px time-cursor tick + label text (`5h · 73% · in 47m`). No section header. Separated from Machines by a hairline divider below the panel.

**Why no header**: The bars are self-labeling (`5h`, `7d`). A section title adds height and visual weight for something meant to be ambient.

**Why above Machines**: Quota is account-level, not machine-level. Placing it inside or below the machine list would imply a per-machine relationship.

## Risks / Trade-offs

- **OAuth token expiry** → The access token in `.credentials.json` has a finite lifetime. An expired token returns HTTP 401; the handler returns `{ type: 'error', reason: 'api-error' }` and the widget continues showing last cached values. Mitigation: the user re-authenticates with `claude` login as normal; the token file is refreshed automatically by Claude Code.
- **Credentials file location** → `~/.claude/.credentials.json` path is a Claude Code convention; could change. Mitigation: the fetcher returns `no-credentials` and the widget stays hidden; no crash.
- **Stale data when app is backgrounded** → Quota may be hours old. Mitigation: show `claudeQuotaFetchedAt` as a staleness hint (e.g. "updated 2h ago") when older than 5 hours.
- **One Haiku call consumed per poll** → Each 5-minute poll consumes a minimal API call. This is negligible against any subscription tier and is the same trade-off made by Claude-Usage-Tracker.

## Open Questions

- Should the widget be hidden entirely when no `claudeQuota*` fields are present on any machine, or show a placeholder "—" state? (Current plan: hidden.)
- Should the time-cursor tick also appear on the 7d bar showing day-of-week progress (Mon=0% → Sun=100% or Mon=reset → following Mon=100%)? (Current plan: yes, calculated from `claudeQuota7dReset`.)
