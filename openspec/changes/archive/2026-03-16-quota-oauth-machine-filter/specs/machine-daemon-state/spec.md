## ADDED Requirements

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
