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

The polling effect SHALL NOT re-trigger on daemon state changes. Because a successful `fetch-quota` RPC causes the daemon to update its `daemonState`, and `daemonState` propagates to the app as `machines` state, a naïve implementation that depends on `machines` inside the polling effect creates a feedback loop: fetch → state update → effect re-run → fetch again. The implementation SHALL use a stable ref (updated each render) so the interval/foreground effect runs only once on mount and is not sensitive to `machines` identity changes.

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

#### Scenario: Successful fetch does not immediately trigger another fetch
- **WHEN** a `fetch-quota` RPC completes and daemon state is updated
- **THEN** the app SHALL NOT immediately send another `fetch-quota` RPC as a result of the state update; the next fetch SHALL occur only on the next foreground event or 5-minute interval tick

### Requirement: fetch-quota RPC handler on daemon
The daemon SHALL register a `fetch-quota` RPC handler. When invoked, the handler SHALL:
1. Read `~/.claude/.credentials.json` and extract `claudeAiOauth.accessToken`. If the file is missing or the field is absent, return `{ type: 'error', reason: 'no-credentials' }` without modifying daemon state.
2. Make a `POST https://api.anthropic.com/v1/messages` request with:
   - `Authorization: Bearer {accessToken}`
   - `anthropic-version: 2023-06-01`
   - `anthropic-beta: oauth-2025-04-20`
   - Body: `{ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }`
3. On a non-200 HTTP status, return `{ type: 'error', reason: 'api-error' }` without modifying daemon state.
4. Read the rate-limit headers from the response:
   - `anthropic-ratelimit-unified-5h-utilization` (0.0–1.0 float)
   - `anthropic-ratelimit-unified-5h-reset` (Unix timestamp in seconds)
   - `anthropic-ratelimit-unified-7d-utilization` (0.0–1.0 float)
   - `anthropic-ratelimit-unified-7d-reset` (Unix timestamp in seconds)
5. Convert reset timestamps to ISO 8601 strings (`new Date(ts * 1000).toISOString()`). If a header is absent, default to `now + window_duration`.
6. Call `updateDaemonState()` to merge the parsed values plus `claudeQuotaFetchedAt: Date.now()`.
7. Return `{ type: 'success' }`.

#### Scenario: Successful API call updates daemon state
- **WHEN** the OAuth token is present and the Messages API returns 200
- **THEN** `daemonState` SHALL be updated with `claudeQuota5hUtil`, `claudeQuota5hReset`, `claudeQuota7dUtil`, `claudeQuota7dReset`, and `claudeQuotaFetchedAt`

#### Scenario: Missing credentials returns error
- **WHEN** `~/.claude/.credentials.json` does not exist or contains no `accessToken`
- **THEN** the handler SHALL return `{ type: 'error', reason: 'no-credentials' }` and daemon state SHALL NOT be modified

#### Scenario: API error returns error
- **WHEN** the Messages API returns a non-200 status (e.g. 401 for an expired token)
- **THEN** the handler SHALL return `{ type: 'error', reason: 'api-error' }` and daemon state SHALL NOT be modified

#### Scenario: Missing rate-limit headers fall back to defaults
- **WHEN** the API returns 200 but one or more rate-limit headers are absent
- **THEN** the absent utilization value SHALL default to `0` and the absent reset time SHALL default to `now + window_duration`

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
