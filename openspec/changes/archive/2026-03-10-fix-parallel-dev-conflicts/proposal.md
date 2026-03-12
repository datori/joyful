## Why

The joyful monorepo contains three bugs that make it unsafe or broken to run joyful in parallel with an existing happy-coder installation. These need fixing before any dev/test workflow can begin alongside the production happy daemon.

## What Changes

- **Fix `doctor.ts` process detection**: The `isJoyful` filter uses `cmd.includes('dist/index.mjs')` which is too broad — it matches the running `happy-coder/dist/index.mjs` daemon, meaning `joyful doctor clean` would kill the happy daemon. Narrow the match to only catch joyful-specific paths.
- **Fix `link-dev.cjs`**: Script creates a `happy-dev` symlink pointing at `bin/happy-dev.mjs`, but that file was renamed to `bin/joyful-dev.mjs` in the rename. Update the script to create a `joyful-dev` symlink pointing at `bin/joyful-dev.mjs`.
- **Fix `build:standalone` output name**: The script outputs `dist/happy-server` — rename to `dist/joyful-server`.
- **Fix `joyful-server` repository URL**: `package.json` still points to `slopus/happy-server.git`; update to `datori/joyful.git`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- These are implementation-only fixes; no spec-level requirement changes -->

## Impact

- `packages/joyful-cli/src/daemon/doctor.ts` — process detection logic
- `packages/joyful-cli/scripts/link-dev.cjs` — symlink creation
- `packages/joyful-server/package.json` — build script + repository URL
