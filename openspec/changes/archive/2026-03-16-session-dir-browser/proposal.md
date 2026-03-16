## Why

Selecting a working directory for a new session currently requires typing a path or picking from recent/suggested paths — there's no way to explore the remote machine's filesystem. This is a friction point for users who don't know the exact path they want or are starting fresh on a machine.

## What Changes

- New machine-level RPC `browse-directory` on the daemon: takes an absolute path, returns directory entries (unrestricted, unlike the session-scoped `listDirectory` handler).
- New `machineBrowseDirectory(machineId, path)` function in the app's ops layer.
- New `new/pick/browse.tsx` screen: interactive directory navigator with breadcrumb, hidden-dir toggle, and a "Use this directory" confirm action.
- Updated `new/pick/path.tsx`: adds a "Browse filesystem" item that opens the browser screen; disabled when machine is offline. On return, populates the path text input.

## Capabilities

### New Capabilities

- `session-dir-browser`: Interactive filesystem browser for selecting a working directory when creating a new session. Supports breadcrumb navigation, hidden-directory toggle, and populates the path picker input on confirmation.

### Modified Capabilities

<!-- none -->

## Impact

- **joyful-cli** (`packages/joyful-cli/src/api/apiMachine.ts`): new RPC handler registered at machine level.
- **joyful-app** (`packages/joyful-app/sources/sync/ops.ts`): new `machineBrowseDirectory` function.
- **joyful-app** (`packages/joyful-app/sources/app/(app)/new/pick/`): new `browse.tsx` screen; updated `path.tsx`.
- **joyful-app** i18n: new translation keys in all 9 language files.
- No wire type changes; no server changes; no database changes.
