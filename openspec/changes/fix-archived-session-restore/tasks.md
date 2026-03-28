## 1. Verify session metadata fields

- [x] 1.1 Confirm `session.metadata.claudeSessionId` is consistently populated for archived sessions (check `runClaude.ts` around `onSessionFound` callback where it updates metadata with the Claude session ID)
- [x] 1.2 Confirm `session.metadata.machineId` is reliably set (check CLI `runClaude.ts` / `apiSession.ts` to see when `machineId` is written into session metadata)

## 2. Add `initialMessage` param to session route

- [x] 2.1 In `sources/app/(app)/session/[id].tsx`, read the optional `initialMessage` query param via `useLocalSearchParams` and pass it as a prop to `SessionView`
- [x] 2.2 Add `initialMessage?: string` prop to `SessionView` in `sources/-session/SessionView.tsx`
- [x] 2.3 In `SessionView`, use a `useEffect` or controlled state to pre-fill the message input with `initialMessage` when it is provided (set message state to `initialMessage` on mount if non-empty)

## 3. Implement resume logic in `SessionView.onSend`

- [x] 3.1 In `sources/-session/SessionView.tsx`, wrap the `onSend` handler to check `session.active` before proceeding
- [x] 3.2 If `session.active === false` and `session.metadata?.claudeSessionId` is set: call `machineSpawnNewSession({ machineId: session.metadata.machineId, directory: session.metadata.path, resumeNativeSessionId: session.metadata.claudeSessionId })` — use `useJoyfulAction` for error handling
- [x] 3.3 On `{ type: 'success', sessionId: newId }`: navigate to `/session/${newId}` with the typed message passed as `initialMessage` query param (encode with `encodeURIComponent`)
- [x] 3.4 If `session.active === false` but `claudeSessionId` is falsy: fall through to normal `sync.sendMessage` (no change from current behavior)

## 4. Translation strings

- [x] 4.1 Check if any new user-visible strings are needed (the existing error handling via `useJoyfulAction` may be sufficient); if needed, add to all 9 language files in `sources/text/translations/`

## 5. Typecheck

- [x] 5.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
