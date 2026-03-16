## 1. Daemon: browse-directory RPC

- [x] 1.1 Add `browse-directory` RPC handler in `packages/joyful-cli/src/api/apiMachine.ts` — accepts `{ path: string }`, reads the directory with `fs.readdir` (with `withFileTypes: true`), returns `{ success: true, entries: [...] }` or `{ success: false, error }` on failure
- [x] 1.2 Map each `fs.Dirent` to `{ name, type: 'file' | 'directory' | 'other', isSymlink }` — use `dirent.isDirectory()`, `dirent.isFile()`, `dirent.isSymbolicLink()` to set fields correctly

## 2. App: ops function

- [x] 2.1 Add `machineBrowseDirectory(machineId: string, path: string)` to `packages/joyful-app/sources/sync/ops.ts` — calls `apiSocket.machineRPC('browse-directory', { path })` and returns the result typed as `{ success: boolean, entries?: Array<{ name: string, type: string, isSymlink?: boolean }>, error?: string }`

## 3. App: browse screen

- [x] 3.1 Create `packages/joyful-app/sources/app/(app)/new/pick/browse.tsx` — Expo Router screen accepting `machineId` and `initialPath` route params
- [x] 3.2 Implement path stack state (`string[]`) initialized with `initialPath`; derive `currentPath` as last element
- [x] 3.3 Implement `loadDirectory(path)` — calls `machineBrowseDirectory`, sets `entries` state, handles loading/error states
- [x] 3.4 Fetch directory on mount and on each path stack change
- [x] 3.5 Filter entries to `type === 'directory'` (include symlinks pointing to dirs), sort alphabetically
- [x] 3.6 Render "Parent folder" item at top of list when `currentPath !== '/'`
- [x] 3.7 Render hidden-dir toggle icon button in header; when off, filter out entries whose `name` starts with `.`
- [x] 3.8 Render tappable breadcrumb — split `currentPath` on `/`, left-truncate if more than 4 segments, each segment navigates to that ancestor path
- [x] 3.9 Render directory entries as `Item` components with folder icon and chevron; tapping pushes path to stack and loads next directory
- [x] 3.10 Show loading indicator (ActivityIndicator or Item with spinner) while RPC is in flight; disable tap interactions during loading
- [x] 3.11 Show inline error message when RPC returns `success: false` or rejects; allow breadcrumb navigation while error is shown
- [x] 3.12 Render sticky "Use [currentPath]" confirm button at bottom — on press, dispatch `setParams({ selectedPath: currentPath })` to the `path.tsx` route and call `router.back()`
- [x] 3.13 Wrap screen in `memo`; put styles at end of file using `StyleSheet.create` from `react-native-unistyles`

## 4. App: update path picker

- [x] 4.1 In `packages/joyful-app/sources/app/(app)/new/pick/path.tsx`, read `selectedPath` from route params and sync it to `customPath` state via `useEffect`
- [x] 4.2 Determine machine online status — check `machine.daemonState` or equivalent; derive `isOnline: boolean`
- [x] 4.3 Add a "Browse filesystem" `Item` below the text input `ItemGroup` — disabled when `!isOnline`; on press navigate to `new/pick/browse?machineId=xxx&initialPath=[customPath if absolute else homeDir]`

## 5. App: i18n

- [x] 5.1 Add new translation keys to `packages/joyful-app/sources/text/translations/en.ts`: `newSession.browseFilesystem`, `newSession.browseTitle`, `newSession.parentFolder`, `newSession.useDirectory`, `newSession.hiddenDirsToggle`, `newSession.browseLoadError`
- [x] 5.2 Add the same keys to all 8 remaining language files: `ru.ts`, `pl.ts`, `es.ts`, `ca.ts`, `it.ts`, `pt.ts`, `ja.ts`, `zh-Hans.ts`

## 6. Typecheck

- [x] 6.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
- [x] 6.2 Run `yarn workspace joyful build` to verify daemon-side changes compile cleanly
