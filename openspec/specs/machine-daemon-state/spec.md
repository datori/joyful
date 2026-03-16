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

### Requirement: DaemonState includes hasOAuthCredentials field
The `DaemonStateSchema` in `joyful-cli/src/api/types.ts` SHALL include one additional optional boolean field:

- `hasOAuthCredentials` (`boolean`, optional): `true` if the daemon found a valid `claudeAiOauth.accessToken` in `~/.claude/.credentials.json` at startup; `false` if the file exists but the field is absent or empty; `undefined` (field omitted) for daemon versions predating this change.

The daemon SHALL set this field during startup, before the first `machine-update-state` broadcast, by calling the same credential-read helper used by `quotaFetcher.ts`.

#### Scenario: Schema accepts state with hasOAuthCredentials true
- **WHEN** a `DaemonState` object includes `hasOAuthCredentials: true`
- **THEN** the Zod schema SHALL parse it successfully

#### Scenario: Schema accepts state with hasOAuthCredentials false
- **WHEN** a `DaemonState` object includes `hasOAuthCredentials: false`
- **THEN** the Zod schema SHALL parse it successfully

#### Scenario: Schema accepts state without hasOAuthCredentials
- **WHEN** a `DaemonState` object omits `hasOAuthCredentials`
- **THEN** the Zod schema SHALL parse it successfully (field is optional)

#### Scenario: Daemon sets true when credentials file has OAuth token
- **WHEN** `~/.claude/.credentials.json` exists and contains a non-empty `claudeAiOauth.accessToken`
- **THEN** the daemon SHALL include `hasOAuthCredentials: true` in its initial daemonState broadcast

#### Scenario: Daemon sets false when credentials file has no OAuth token
- **WHEN** `~/.claude/.credentials.json` is absent, malformed, or has no `claudeAiOauth.accessToken`
- **THEN** the daemon SHALL include `hasOAuthCredentials: false` in its initial daemonState broadcast
