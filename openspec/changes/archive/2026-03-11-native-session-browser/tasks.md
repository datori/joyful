## 1. Daemon: NativeSessionInfo type and file reader

- [x] 1.1 Define `NativeSessionInfo` type in `joyful-cli/src/api/types.ts` with fields: `sessionId: string`, `lastModified: number`, `summary: string | null`, `firstMessage: string | null`
- [x] 1.2 Create `joyful-cli/src/claude/utils/listNativeSessions.ts` that accepts a `directory` string, uses `getProjectPath` to find the `.jsonl` folder, reads each file's first 50 lines in parallel, and returns `NativeSessionInfo[]` sorted by `lastModified` descending
- [x] 1.3 Implement summary extraction: look for `{"type":"summary"}` line, extract `.summary` string
- [x] 1.4 Implement firstMessage extraction: look for first `{"type":"user"}` line, extract text content from `.message.content` (array or string), truncate to 100 chars
- [x] 1.5 Handle malformed JSONL lines with try/catch per line; skip corrupt files silently

## 2. Daemon: list-native-sessions RPC handler

- [x] 2.1 Add `list-native-sessions` RPC handler in `joyful-cli/src/api/apiMachine.ts` that calls `listNativeSessions(directory)` and returns the result array
- [x] 2.2 Validate that `directory` param is present; throw if missing

## 3. Daemon: resumeNativeSessionId spawn support

- [x] 3.1 Add `resumeNativeSessionId?: string` to the `spawnSession` options destructuring in `joyful-cli/src/daemon/run.ts`
- [x] 3.2 Thread `resumeNativeSessionId` into `LoopOptions` in `joyful-cli/src/claude/loop.ts` (add optional field)
- [x] 3.3 In `loop.ts`, initialize `session.sessionId` from `opts.resumeNativeSessionId ?? null` instead of hardcoded `null`
- [x] 3.4 Pass `resumeNativeSessionId` from `run.ts` spawn logic through to `loop.ts` call

## 4. App: RPC hook for native session listing

- [x] 4.1 Add `useNativeSessions(machineId: string, directory: string)` hook (or inline async function) that calls the `list-native-sessions` RPC and returns `NativeSessionInfo[]`
- [x] 4.2 Add `isTracked` decoration: after fetching, compute a `Set<string>` of `claudeSessionId` values from all Joyful sessions and annotate each result with `isTracked: boolean`

## 5. App: NativeSessionBrowser modal component

- [x] 5.1 Create `packages/joyful-app/sources/components/NativeSessionBrowser.tsx` with a modal/bottom-sheet container
- [x] 5.2 Implement session list: show 10 most recent by default; "Show all (N)" expands to full list
- [x] 5.3 Implement search input that filters by `summary` or `firstMessage` (case-insensitive)
- [x] 5.4 Render each session item: time-ago label, title (summary → firstMessage → short ID), selection state
- [x] 5.5 Render tracked sessions greyed out and non-interactive (disabled tap)
- [x] 5.6 Render empty state when the returned array is empty
- [x] 5.7 Add "Resume in Joyful" confirm button (enabled only when an untracked session is selected)
- [x] 5.8 Add i18n strings for all UI chrome to `_default.ts` and all 10 language files

## 6. App: Wizard integration

- [x] 6.1 In `packages/joyful-app/sources/app/(app)/new/index.tsx`, add a "Browse native sessions" trigger below the path selector (visible only when a path is selected and machine is online)
- [x] 6.2 Wire the trigger to open `NativeSessionBrowser` modal with the selected directory and machineId
- [x] 6.3 On "Resume in Joyful" confirm from the modal: call `machineSpawnNewSession` with the selected `sessionId` as `resumeNativeSessionId` (extend `SpawnSessionOptions` to include this field)
- [x] 6.4 Extend `SpawnSessionOptions` in `packages/joyful-app/sources/sync/ops.ts` to include `resumeNativeSessionId?: string`
- [x] 6.5 Pass `resumeNativeSessionId` through the `spawn-joyful-session` RPC call in `machineSpawnNewSession`

## 7. Typecheck and build

- [x] 7.1 Run `yarn workspace joyful-app typecheck` and fix any errors
- [x] 7.2 Run `yarn workspace joyful build` and fix any CLI build errors
