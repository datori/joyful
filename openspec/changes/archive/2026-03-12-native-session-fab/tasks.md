## 1. Resume picker modal component

- [x] 1.1 Create `packages/joyful-app/sources/components/NativeSessionResumePicker.tsx` — modal with machine selector (hidden when only 1 online machine) and path text input
- [x] 1.2 "Find Sessions" button: disabled when path is empty; on press opens `NativeSessionBrowser` with the selected machine and path
- [x] 1.3 On `NativeSessionBrowser.onResume`: call `machineSpawnNewSession` with `resumeNativeSessionId`, close both modals, navigate to the new session
- [x] 1.4 Add i18n strings to `_default.ts` and all 10 language files: `nativeSessionResumePicker.title`, `.machinePlaceholder`, `.pathPlaceholder`, `.findSessions`, `.cancel`

## 2. Split FAB component

- [x] 2.1 Modify `packages/joyful-app/sources/components/FABWide.tsx` to accept an optional `onResume?: () => void` prop and render a split layout when provided: "New Session" (~60%) | divider | resume icon+label (~40%)
- [x] 2.2 The resume half uses the same `fab` theme colors; disabled (opacity 0.4, non-interactive) when `onResume` is undefined or when passed a `resumeDisabled` boolean prop
- [x] 2.3 Add i18n string `newSession.resumeNative` (short label, e.g. "Resume") to `_default.ts` and all 10 language files

## 3. MainView wiring

- [x] 3.1 In `packages/joyful-app/sources/components/MainView.tsx`, import `useAllMachines` and `isMachineOnline` to determine if any machine is online
- [x] 3.2 Add `resumePickerVisible` state; pass `onResume={() => setResumePickerVisible(true)}` and `resumeDisabled={!hasOnlineMachine}` to `FABWide`
- [x] 3.3 Render `<NativeSessionResumePicker visible={resumePickerVisible} onClose={() => setResumePickerVisible(false)} />` alongside the FAB

## 4. Wizard cleanup

- [x] 4.1 In `packages/joyful-app/sources/app/(app)/new/index.tsx`, remove the `nativeBrowserVisible` and `resumeNativeSessionId` state variables
- [x] 4.2 Remove the `NativeSessionBrowser` import and JSX block (including the `<>` fragment wrapper added for it)
- [x] 4.3 Remove the inline "Browse native sessions" `Pressable` trigger and its `Ionicons` import (if no longer used elsewhere in the file)
- [x] 4.4 Remove the `nativeSessionsTrigger` and `nativeSessionsTriggerText` styles
- [x] 4.5 Remove `resumeNativeSessionId` from the `machineSpawnNewSession` call and any related `TrackedNativeSession` import

## 5. Bug fixes (post-testing)

- [x] 5.1 Fix tilde expansion in `packages/joyful-cli/src/claude/utils/path.ts` — `resolve('~/foo')` treated `~` literally; pre-expand to `homedir()` before `resolve()`
- [x] 5.2 Show single-machine read-only label in `NativeSessionResumePicker` when exactly one machine is online, so the user can see the selected machine
- [x] 5.3 Replay native session history to the app in `claudeRemoteLauncher` (`replayNativeSessionHistory`) so conversation history is visible immediately on resume

## 6. Typecheck and build

- [x] 6.1 Run `yarn workspace joyful-app typecheck` and fix any errors
- [x] 6.2 Run `yarn workspace joyful build` and fix any CLI build errors
