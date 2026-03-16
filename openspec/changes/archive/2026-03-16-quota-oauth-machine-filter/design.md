## Context

The quota widget polls a daemon via RPC (`fetch-quota`) to get Claude subscription utilization. The daemon reads `~/.claude/.credentials.json` to obtain an OAuth token and calls the Anthropic Messages API; only OAuth (Claude.ai subscription) machines can do this — API-key machines have no such file and return `no-credentials`.

The app currently selects the **first active machine** (newest by `createdAt`) as the poll target. When that machine uses an API key, every fetch silently fails. If an older subscription machine exists, its daemonState may hold stale quota data that the app displays but never refreshes.

## Goals / Non-Goals

**Goals:**
- App only sends `fetch-quota` RPC to machines that have OAuth credentials.
- Daemon advertises its credential status in `daemonState` on startup, so the app can make this decision without a trial-and-error probe.
- No visible behavior change for single-machine OAuth users.

**Non-Goals:**
- Token refresh or OAuth lifecycle management.
- Showing a quota panel for API-key-only users (those users have different rate-limit semantics; out of scope).
- Retrying failed fetches on multiple machines in a single poll cycle (one successful poll per trigger is sufficient).

## Decisions

### 1. Daemon self-reports `hasOAuthCredentials` in daemonState

**Decision**: Add `hasOAuthCredentials: boolean` to `DaemonStateSchema`. The daemon checks the credentials file once on startup and sets the field before the first `machine-update-state` broadcast.

**Alternatives considered**:
- *Trial-and-error*: App sends RPC, inspects error reason, then tries next machine. Requires a new response channel (current RPC is fire-and-forget from app's perspective; the daemon updates state, app reads it asynchronously). Adds latency and complicates the hook.
- *Separate RPC to probe credentials*: Extra round-trip per poll cycle; redundant since the daemon already knows on startup.

Self-reporting is the minimal, explicit solution. One field added, one filter added.

### 2. Credential check uses the existing `readAccessToken` helper from `quotaFetcher.ts`

**Decision**: Extract `readAccessToken()` from `quotaFetcher.ts` into a shared helper (or expose it as an export). Call it once during daemon startup and store the result as `hasOAuthCredentials`.

Re-check on each `fetch-quota` invocation is already happening inside `fetchQuota()`, so the startup check is purely for advertising capability — it doesn't replace the runtime check.

### 3. App filter: `hasOAuthCredentials === true` (strict, not just truthy)

**Decision**: In `useClaudeQuota.ts`, the `sendFetchQuota` callback filters machines to those where `(daemonState as any).hasOAuthCredentials === true`. Machines with `hasOAuthCredentials === false` or `undefined` (older daemon versions) are skipped for polling.

**Behavior for older daemon versions**: A daemon that predates this change will not have `hasOAuthCredentials` in its state. `undefined === true` is false, so the app skips it. This is intentional: we can't know whether an old daemon has credentials, so we conservatively skip it. Once the daemon is updated, the field will be present.

**Alternative**: Treat `undefined` as "try anyway" (opt-in skip rather than opt-in poll). Rejected: it restores the original broken behavior for unupdated daemons, and the daemon update path is typically automatic (daemon self-updates on version change).

### 4. No change to the quota data read path

The `quotaData` useMemo already reads from "first machine with quota fields" — this naturally favors whichever machine last had a successful fetch, regardless of ordering. No change needed here.

## Risks / Trade-offs

- **Old daemon versions excluded** → Once `hasOAuthCredentials` becomes required for polling, users running an older daemon binary won't be polled even if they have valid credentials. Mitigation: daemon auto-updates on version change; manual `yarn dev:daemon:restart` for dev.
- **Credential revocation not detected** → If a user's OAuth token expires after startup, `hasOAuthCredentials` remains `true` but fetches will return `api-error`. The panel will show stale data with no explanation. Acceptable for now; the staleness indicator (>5h label) covers this case visually.
- **Single field, no re-check** → Credentials could theoretically be added after daemon startup (e.g., user logs into Claude for the first time while daemon is running). The daemon won't flip `hasOAuthCredentials` to `true` without a restart. Edge case; acceptable.
