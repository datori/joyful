## Why

The fork already renamed packages, env vars, binary names, and the QR URL scheme to `joyful`. A second audit revealed a remaining layer of `happy`/`handy` references in source code identifiers, deployment config, and developer documentation. These create confusion for contributors, break documentation accuracy (users following the README will use wrong env vars), and leave cosmetic inconsistency in the codebase.

## What Changes

- **`HappyError` class** (`joyful-app`) renamed to `JoyfulError`; all import sites updated (~5 components)
- **`useHappyAction` hook** (`joyful-app`) renamed to `useJoyfulAction`; all import sites updated (~10+ components)
- **`spawnHappyCLI` function** (`joyful-cli`) renamed to `spawnJoyfulCLI`; all call sites updated
- **`deploy/handy.yaml`** (`joyful-server`) renamed to `deploy/joyful.yaml` with updated K8s names, image references, secret names (`handy-*` → `joyful-*`)
- **`POSTGRES_DB=handy`** in server `package.json` `yarn db` script updated to `POSTGRES_DB=joyful`
- **`packages/joyful-cli/README.md`** — fix `HAPPY_*` env var names → `JOYFUL_*`, command examples, install instructions
- **`packages/joyful-cli/CONTRIBUTING.md`** — fix `~/.happy` path references, clone URLs, setup instructions
- **`packages/joyful-cli/CLAUDE.md`** — fix title "Happy CLI" → "Joyful CLI", path references
- **`packages/joyful-server/CLAUDE.md`** — fix title "Handy Server" → "Joyful Server"
- **`packages/joyful-cli/src/daemon/CLAUDE.md`** — fix `~/.happy` example paths
- **`packages/joyful-server/README.md`** — fix remaining "Happy Server" references

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `project-identity`: Code identifiers (`HappyError`, `useHappyAction`, `spawnHappyCLI`) and deployment config still use old names; all must use joyful identity

## Impact

- **joyful-app**: Rename `HappyError` and `useHappyAction` — pure identifier rename, ~15 files touched, no behavior change
- **joyful-cli**: Rename `spawnHappyCLI` — internal utility, ~5 files touched, no behavior change
- **joyful-server**: Rename `deploy/handy.yaml` → `deploy/joyful.yaml` — affects K8s deployment; self-hosters using this file must update their deploy references; update `POSTGRES_DB` in package.json (local dev only)
- **Docs**: README, CONTRIBUTING, CLAUDE.md files — no runtime impact, high developer-UX impact
