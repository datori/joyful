## ADDED Requirements

### Requirement: DaemonState includes optional Claude quota fields
The `DaemonStateSchema` in `joyful-cli/src/api/types.ts` SHALL include five additional optional fields for Claude API quota reporting:

- `claudeQuota5hUtil` (`number`, optional): Utilization of the 5-hour rolling window as a fraction 0–1, sourced from the `anthropic-ratelimit-unified-5h-utilization` response header.
- `claudeQuota5hReset` (`string`, optional): ISO 8601 timestamp of when the 5-hour window resets, sourced from the `anthropic-ratelimit-unified-5h-reset` response header.
- `claudeQuota7dUtil` (`number`, optional): Utilization of the 7-day rolling window as a fraction 0–1, sourced from the `anthropic-ratelimit-unified-7d-utilization` response header.
- `claudeQuota7dReset` (`string`, optional): ISO 8601 timestamp of when the 7-day window resets, sourced from the `anthropic-ratelimit-unified-7d-reset` response header.
- `claudeQuotaFetchedAt` (`number`, optional): Unix epoch milliseconds recording when quota data was last successfully fetched. Used by the app to detect stale data.

#### Scenario: Schema accepts state with quota fields
- **WHEN** a `DaemonState` object includes all five quota fields with valid types
- **THEN** the Zod schema SHALL parse it successfully

#### Scenario: Schema accepts state without quota fields
- **WHEN** a `DaemonState` object omits all quota fields
- **THEN** the Zod schema SHALL parse it successfully (all fields are optional)

#### Scenario: Schema accepts state with partial quota fields
- **WHEN** a `DaemonState` object includes only `claudeQuota5hUtil` and `claudeQuota5hReset`
- **THEN** the Zod schema SHALL parse it successfully
