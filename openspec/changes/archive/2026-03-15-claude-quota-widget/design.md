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

### Decision 1: Parse local JSONL session files, not an API ping

**Chosen**: Scan `~/.claude/projects/**/*.jsonl` for assistant messages with `usage.input_tokens` / `usage.output_tokens` fields and a `timestamp`. Sum tokens within the last 5h and 7d rolling windows. Normalise against estimated tier limits read from `rateLimitTier` in `~/.claude/.credentials.json`.

**Why not a Messages API ping**: `api.anthropic.com/v1/messages` returns HTTP 401 `"OAuth authentication is currently not supported."` for all Pro/Max subscription credentials (`sk-ant-oat01-...`). The API only accepts `sk-ant-api...` API keys, which subscription users do not have. Both `Authorization: Bearer` and `x-api-key` headers were tested and rejected. The `/api/oauth/claude_cli/create_api_key` exchange endpoint was also tried but requires `org:create_api_key` scope which the subscription OAuth token does not carry.

**Why not the dedicated usage endpoint**: Anthropic disabled `api.anthropic.com/api/oauth/usage`. The `claude.ai` web API is blocked by Cloudflare for non-browser clients.

**Why JSONL parsing works**: Claude Code writes a JSONL entry for every assistant message into `~/.claude/projects/<project>/<session>.jsonl`. Each entry carries the model's token usage and an ISO timestamp. This is the same data source used by the open-source Claude-Usage-Tracker project. It requires no network access and works for all subscription tiers.

**Accuracy**: Utilization is computed as `tokens_used / estimated_tier_limit`. The tier is read from `rateLimitTier` in `.credentials.json`. Tier-to-limit mapping is a conservative estimate (Anthropic does not publish exact per-tier token budgets). The bars are for directional guidance; the percentage shown matches typical usage closely but is not Anthropic's own authoritative utilization figure.

**Cost**: No API calls, no quota consumed by the widget itself.

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

### Decision 4: Tier detection from credentials file, JSONL files as the usage source

**Chosen**: Read `~/.claude/.credentials.json` solely for `claudeAiOauth.rateLimitTier` (e.g. `"default_claude_max_5x"`). Map the tier to estimated limits via a hardcoded table in `quotaFetcher.ts`. Token counts come from `~/.claude/projects/**/*.jsonl`, not from the credentials file.

**Why not joyful's own `access.key`**: That file holds joyful server auth credentials (TweetNaCl keypair), not Claude account information.

**Tier-limit mapping** (conservative estimates):
```
default_claude_max_5x  → 5M tokens / 5h,  25M tokens / 7d
default_claude_max     → 1M tokens / 5h,   5M tokens / 7d
default_claude_pro     → 500k tokens / 5h, 2.5M tokens / 7d
(default fallback)     → 1M tokens / 5h,   5M tokens / 7d
```

**Fallback**: If `~/.claude/.credentials.json` is missing or the tier is unknown, the default limits are used. If `~/.claude/projects/` is unreadable, the RPC returns `{ type: 'error', reason: 'no-projects-dir' }` and the widget stays hidden.

### Decision 5: Widget placement — above Machines, no header, no section title

**Chosen**: `ClaudeQuotaPanel` rendered above `MachinesSidebarPanel` in the sidebar. Two rows (5h, 7d), each: a 3px filled bar with a 1px time-cursor tick + label text (`5h · 73% · in 47m`). No section header. Separated from Machines by a hairline divider below the panel.

**Why no header**: The bars are self-labeling (`5h`, `7d`). A section title adds height and visual weight for something meant to be ambient.

**Why above Machines**: Quota is account-level, not machine-level. Placing it inside or below the machine list would imply a per-machine relationship.

## Risks / Trade-offs

- **Estimated limits may be inaccurate** → The tier-to-limit mapping is a conservative estimate; Anthropic does not publish exact per-tier token budgets. The percentage shown is directionally correct but not authoritative. Mitigation: show the bars as ambient guidance, not as a hard threshold.
- **JSONL file format may change** → Claude Code could change how it writes session files. Mitigation: the parser skips malformed lines; on total parse failure the widget simply shows last cached data or stays hidden.
- **Only counts input + output tokens** → Cache creation and cache read tokens may or may not count against the unified rate limit. The current implementation counts only `input_tokens + output_tokens` to avoid double-counting.
- **Credentials file location** → `~/.claude/.credentials.json` path is a Claude Code convention; could change. Mitigation: fall back to default tier limits silently.
- **Stale data when app is backgrounded** → Quota may be hours old. Mitigation: show `claudeQuotaFetchedAt` as a staleness hint (e.g. "updated 2h ago") when older than 5 hours.
- **Scan cost on large histories** → Users with many projects and sessions will have thousands of JSONL files. Mitigation: the scanner skips files whose `mtime` predates the 7d cutoff, keeping most scans fast.

## Open Questions

- Should the widget be hidden entirely when no `claudeQuota*` fields are present on any machine, or show a placeholder "—" state? (Current plan: hidden.)
- Should the time-cursor tick also appear on the 7d bar showing day-of-week progress (Mon=0% → Sun=100% or Mon=reset → following Mon=100%)? (Current plan: yes, calculated from `claudeQuota7dReset`.)
