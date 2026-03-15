## ADDED Requirements

### Requirement: Quota panel displayed above Machines in sidebar
The app SHALL render a `ClaudeQuotaPanel` component in the sidebar, positioned immediately above the `MachinesSidebarPanel`. The panel SHALL have no section header or title. The panel SHALL be hidden entirely when no `claudeQuota5hUtil` or `claudeQuota7dUtil` values are available on any machine's `daemonState`. The panel SHALL be separated from the Machines panel by a hairline divider.

#### Scenario: Panel visible when quota data is available
- **WHEN** at least one machine has `claudeQuota5hUtil` present in its `daemonState`
- **THEN** the `ClaudeQuotaPanel` SHALL be rendered above the Machines panel in the sidebar with no section header

#### Scenario: Panel hidden when no quota data exists
- **WHEN** no machine has `claudeQuota5hUtil` in its `daemonState`
- **THEN** the `ClaudeQuotaPanel` SHALL not be rendered (returns null)

### Requirement: Two compact bar rows showing 5h and 7d utilization
The panel SHALL contain exactly two rows: one for the 5-hour window and one for the 7-day window. Each row SHALL contain:
- A filled progress bar (height 3pt, `borderRadius: 1.5`, full available width) where the filled portion represents utilization (0–1).
- A 1pt-wide time-cursor tick positioned at the elapsed fraction of the current window, rendered as an absolutely-positioned overlay on the bar.
- A label string rendered in `fontSize: 11`, `color: textSecondary` format: `"5h · {util%} · {resetLabel}"` or `"7d · {util%} · {resetLabel}"` where `{util%}` is the utilization rounded to the nearest integer percent and `{resetLabel}` is a human-readable countdown (e.g. `"in 2h 14m"` or `"Mon"`).

#### Scenario: 5h row shows correct utilization
- **WHEN** `claudeQuota5hUtil` is `0.73` and reset is 2 hours from now
- **THEN** the 5h bar SHALL be filled to 73% of its width and the label SHALL read `"5h · 73% · in 2h"`

#### Scenario: 7d row shows correct utilization
- **WHEN** `claudeQuota7dUtil` is `0.31` and reset is next Monday
- **THEN** the 7d bar SHALL be filled to 31% of its width and the label SHALL read `"7d · 31% · Mon"`

#### Scenario: Time cursor positioned at elapsed fraction
- **WHEN** the 5-hour window started 2.5 hours ago (50% elapsed) and reset is 2.5 hours from now
- **THEN** the time-cursor tick SHALL be positioned at 50% of the bar's width

#### Scenario: 7d time cursor reflects day-of-week progress
- **WHEN** the 7-day window resets on Monday and today is Thursday (approx 57% through the week)
- **THEN** the time-cursor tick on the 7d bar SHALL be positioned at approximately 57% of the bar's width

### Requirement: Bar fill colour reflects pace relative to elapsed time
The filled portion of each bar SHALL use a colour derived from the relationship between utilization and elapsed window fraction:
- Utilization less than or equal to elapsed fraction (on pace or under): muted blue / `theme.colors.textSecondary` tint.
- Utilization greater than elapsed fraction by more than 20 percentage points: amber / warning colour.
- Utilization above 85%: red / destructive colour.

#### Scenario: Under-pace colouring
- **WHEN** utilization is 40% and elapsed fraction is 50%
- **THEN** the bar fill SHALL use the muted / on-pace colour

#### Scenario: Over-pace colouring
- **WHEN** utilization is 80% and elapsed fraction is 50%
- **THEN** the bar fill SHALL use the amber warning colour

#### Scenario: Near-limit colouring
- **WHEN** utilization is 90% regardless of elapsed fraction
- **THEN** the bar fill SHALL use the red destructive colour

### Requirement: App triggers fetch-quota RPC on foreground and interval
The app SHALL send a `fetch-quota` RPC request to exactly one online machine when:
- The app comes to the foreground (AppState change from background/inactive to active).
- Approximately 5 minutes have elapsed since the last successful fetch while the app remains foregrounded.
The app SHALL select the first machine for which `isMachineOnline(machine)` returns true. If no machine is online, the app SHALL skip the RPC silently and retry on the next trigger.

#### Scenario: Quota fetched on app foreground
- **WHEN** the app transitions from background to active and at least one machine is online
- **THEN** the app SHALL send a `fetch-quota` RPC to the first online machine within 1 second of becoming active

#### Scenario: Quota refreshed on 5-minute interval
- **WHEN** the app has been foregrounded continuously for 5 minutes since the last fetch
- **THEN** the app SHALL send another `fetch-quota` RPC to the first online machine

#### Scenario: No RPC when no machine online
- **WHEN** the app comes to the foreground and no machine is online
- **THEN** no `fetch-quota` RPC SHALL be sent and the widget SHALL continue displaying the last cached values

#### Scenario: Only one machine polled even when multiple are online
- **WHEN** three machines are online simultaneously
- **THEN** the `fetch-quota` RPC SHALL be sent to exactly one machine (the first online machine)

### Requirement: fetch-quota RPC handler on daemon
The daemon SHALL register a `fetch-quota` RPC handler. When invoked, the handler SHALL:
1. Optionally read `~/.claude/.credentials.json` to extract `claudeAiOauth.rateLimitTier`; fall back to a default tier if the file is missing or the field is absent.
2. Scan all `.jsonl` files under `~/.claude/projects/` whose filesystem `mtime` falls within the last 7 days.
3. Parse each line; accumulate `input_tokens + output_tokens` from assistant messages whose `timestamp` falls within the last 5 hours and within the last 7 days respectively.
4. Compute reset timestamps: `oldest_entry_in_window + window_duration` for each window (ISO string).
5. Compute utilization as `tokens / tier_limit` clamped to [0, 1].
6. Call `updateDaemonState()` to merge the computed values plus `claudeQuotaFetchedAt: Date.now()`.
7. Return `{ type: 'success' }`.
On any unrecoverable error (projects directory unreadable), the handler SHALL return `{ type: 'error', reason: string }` without updating daemon state. Malformed JSONL lines SHALL be silently skipped.

**Background**: The Anthropic Messages API (`api.anthropic.com/v1/messages`) returns HTTP 401 "OAuth authentication is currently not supported" for all Pro/Max OAuth credentials (`sk-ant-oat01-...`). The API-ping approach only works for `sk-ant-api...` API key users. JSONL parsing is the universally-working alternative.

#### Scenario: Successful scan updates daemon state
- **WHEN** `~/.claude/projects/` is readable and contains recent session files
- **THEN** `daemonState` SHALL be updated with `claudeQuota5hUtil`, `claudeQuota5hReset`, `claudeQuota7dUtil`, `claudeQuota7dReset`, and `claudeQuotaFetchedAt`

#### Scenario: Zero usage shows 0% utilization
- **WHEN** no JSONL entries fall within the 5h or 7d windows
- **THEN** `claudeQuota5hUtil` and `claudeQuota7dUtil` SHALL both be `0` and reset timestamps SHALL be set to `now + window_duration`

#### Scenario: Projects directory unreadable returns error
- **WHEN** `~/.claude/projects/` does not exist or is not readable
- **THEN** the handler SHALL return `{ type: 'error', reason: 'no-projects-dir' }` and daemon state SHALL NOT be modified

#### Scenario: Malformed JSONL lines are skipped
- **WHEN** a session file contains some malformed JSON lines alongside valid ones
- **THEN** valid lines SHALL be counted and malformed lines SHALL be silently skipped

#### Scenario: Unknown tier falls back to default limits
- **WHEN** `~/.claude/.credentials.json` is absent or `rateLimitTier` is not in the known mapping
- **THEN** the handler SHALL use default estimated limits and still return `{ type: 'success' }`

### Requirement: Manual refresh button
The panel SHALL render a small icon button (Ionicons `refresh-outline`, 13pt) at the top-right of the panel. Tapping the button SHALL immediately trigger a `fetch-quota` RPC to the first online machine (same logic as the automatic poll trigger). The button SHALL only be rendered when an `onRefresh` callback is provided (i.e. when a machine is available).

#### Scenario: Refresh button triggers immediate RPC
- **WHEN** the user taps the refresh button and at least one machine is online
- **THEN** a `fetch-quota` RPC SHALL be sent immediately to the first online machine

### Requirement: Staleness indicator when quota data is old
The panel SHALL display the `claudeQuotaFetchedAt` timestamp as a relative age label (e.g. `"updated 2h ago"`) appended below the two bars when the fetch age exceeds the shorter of the two window durations (i.e. older than 5 hours). When fetch age is within 5 hours, no staleness label SHALL be shown.

#### Scenario: Fresh data shows no staleness label
- **WHEN** `claudeQuotaFetchedAt` is 30 minutes ago
- **THEN** no staleness label SHALL be rendered below the bars

#### Scenario: Stale data shows age label
- **WHEN** `claudeQuotaFetchedAt` is 6 hours ago
- **THEN** a label reading approximately `"updated 6h ago"` SHALL be rendered below the bars in `color: textSecondary`
