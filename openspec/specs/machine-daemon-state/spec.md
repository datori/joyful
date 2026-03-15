## ADDED Requirements

### Requirement: DaemonState includes optional memory fields
The `DaemonState` wire schema SHALL include three optional numeric fields for machine memory reporting. All values are in bytes.

- `memTotal` (`number`, optional): Total installed RAM as reported by `os.totalmem()`
- `memFree` (`number`, optional): Available (free) RAM as reported by `os.freemem()`
- `memDaemonRss` (`number`, optional): Resident Set Size of the daemon process as reported by `process.memoryUsage().rss`

#### Scenario: Schema accepts state with memory fields
- **WHEN** a `DaemonState` object includes `memTotal`, `memFree`, and `memDaemonRss` as numbers
- **THEN** the Zod schema SHALL parse it successfully

#### Scenario: Schema accepts state without memory fields
- **WHEN** a `DaemonState` object omits `memTotal`, `memFree`, and `memDaemonRss`
- **THEN** the Zod schema SHALL parse it successfully (fields are optional)

### Requirement: DaemonState includes optional Claude quota fields
The `DaemonStateSchema` in `joyful-cli/src/api/types.ts` SHALL include five additional optional fields for Claude API quota reporting:

- `claudeQuota5hUtil` (`number`, optional): Utilization of the 5-hour rolling window as a fraction 0–1, as reported in the `anthropic-ratelimit-unified-5h-utilization` response header from the Anthropic Messages API.
- `claudeQuota5hReset` (`string`, optional): ISO 8601 timestamp of when the 5-hour window resets, derived from the `anthropic-ratelimit-unified-5h-reset` header (Unix seconds).
- `claudeQuota7dUtil` (`number`, optional): Utilization of the 7-day rolling window as a fraction 0–1, as reported in the `anthropic-ratelimit-unified-7d-utilization` response header from the Anthropic Messages API.
- `claudeQuota7dReset` (`string`, optional): ISO 8601 timestamp of when the 7-day window resets, derived from the `anthropic-ratelimit-unified-7d-reset` header (Unix seconds).
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
