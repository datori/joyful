## 1. Session route: autoSendMessage param

- [ ] 1.1 Add `autoSendMessage` to `useLocalSearchParams` in `sources/app/(app)/session/[id].tsx` and pass as prop to `SessionView`
- [ ] 1.2 Add `autoSendMessage?: string` prop to `SessionViewLoaded` in `sources/-session/SessionView.tsx`
- [ ] 1.3 Add `useEffect` in `SessionViewLoaded` that calls `sync.sendMessage(sessionId, autoSendMessage)` on mount when `autoSendMessage` is present and `session.active === true`
- [ ] 1.4 When `session.active === false`, fall back to pre-filling input via `setMessage(autoSendMessage)` (same as `initialMessage`)

## 2. Conflict resolution action

- [ ] 2.1 Add `buildConflictResolutionPrompt(conflictFiles: string[], branchName: string): string` helper in `sources/utils/worktree.ts`
- [ ] 2.2 Add i18n strings for "Resolve with AI" action label and button subtitle to `sources/text/_default.ts`
- [ ] 2.3 Add "Resolve with AI" `Item` to the `'conflict'` step state in `merge.tsx`, navigating to `/session/{id}` with `autoSendMessage` set to the prompt
- [ ] 2.4 Add all new i18n strings to the remaining 8 language files

## 3. Spec reconciliation action

- [ ] 3.1 Add `getSpecDiff(machineId: string, basePath: string, mergeBase: string): Promise<string>` helper in `sources/utils/worktree.ts` — runs `git -C {basePath} diff {mergeBase}..main -- openspec/specs/` with `cwd: '/'`, truncates to 8000 chars
- [ ] 3.2 Add `buildSpecReconciliationPrompt(specDiff: string, branchName: string): string` helper in `sources/utils/worktree.ts`
- [ ] 3.3 Add i18n strings for "Sync specs with AI" action label and subtitle to `sources/text/_default.ts`
- [ ] 3.4 Add "Sync specs with AI" `Item` as primary action to the `'openspec-divergence'` step state in `merge.tsx` — fetches spec diff then navigates with `autoSendMessage`
- [ ] 3.5 Move existing "Pull + Resync" action below the new AI action on the divergence screen
- [ ] 3.6 Add all new i18n strings to the remaining 8 language files

## 4. Merge screen re-checks on focus (already works via mount; verify)

- [ ] 4.1 Confirm `loadMergeData` is called on every mount of the merge screen (stack navigation re-mounts on back-navigate); add `useFocusEffect` fallback only if re-mount is not guaranteed

## 5. Typecheck and verification

- [ ] 5.1 Run `yarn workspace joyful-app typecheck` and fix any errors
