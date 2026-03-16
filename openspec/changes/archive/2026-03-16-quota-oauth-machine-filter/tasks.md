## 1. CLI — Schema

- [x] 1.1 Add `hasOAuthCredentials: z.boolean().optional()` to `DaemonStateSchema` in `joyful-cli/src/api/types.ts`

## 2. CLI — Credential Check Helper

- [x] 2.1 Export `readAccessToken()` from `quotaFetcher.ts` (or extract to a shared helper) so daemon startup can call it without duplicating the file-read logic

## 3. CLI — Daemon Startup

- [x] 3.1 In `apiMachine.ts` (or wherever `updateDaemonState` is first called on startup), call `readAccessToken()` and set `hasOAuthCredentials: accessToken !== null` in the initial daemonState

## 4. App — Hook Filter

- [x] 4.1 In `useClaudeQuota.ts`, update `sendFetchQuota` to filter machines with `machines.find(m => isMachineOnline(m) && (m.daemonState as any).hasOAuthCredentials === true)` instead of `machines.find(isMachineOnline)`

## 5. Typecheck

- [x] 5.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
