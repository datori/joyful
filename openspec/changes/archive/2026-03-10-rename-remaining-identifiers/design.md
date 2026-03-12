## Context

Three previous changes handled the most impactful identity renames: packages, env vars, binary name, QR URL scheme, and server master secret. A follow-up audit found a residual layer: internal code identifiers (`HappyError`, `useHappyAction`, `spawnHappyCLI`), a K8s deployment config file (`deploy/handy.yaml`), local dev DB name, and developer documentation still using old names.

These are all mechanical renames — no behavior changes. The main complexity is breadth: `useHappyAction` is used throughout the app, and the K8s file rename has operational implications for self-hosters.

## Goals / Non-Goals

**Goals:**
- Rename `HappyError` → `JoyfulError` and update all import sites
- Rename `useHappyAction` → `useJoyfulAction` and update all import sites
- Rename `spawnHappyCLI` → `spawnJoyfulCLI` and update all call sites
- Rename `deploy/handy.yaml` → `deploy/joyful.yaml` with updated K8s names/image refs/secrets
- Update `POSTGRES_DB=handy` → `POSTGRES_DB=joyful` in server `package.json`
- Fix developer documentation: README, CONTRIBUTING, CLAUDE.md files

**Non-Goals:**
- Renaming user-visible translated strings (those go through the i18n system)
- Renaming any upstream `happy` generic English words used as adjectives (e.g., in name generators)
- Changes to the wire protocol or encrypted payloads

## Decisions

### Rename HappyError, useHappyAction, spawnHappyCLI atomically
These are all pure TypeScript identifier renames — no exported API surface visible outside the monorepo. Find all import/call sites and update them in the same pass. TypeScript's type checker will catch any missed sites at build time. Verify with `yarn typecheck` after.

### deploy/handy.yaml → deploy/joyful.yaml
Delete the old file, create the new one with updated content. The K8s resource names inside (`name: handy-server`, `secretRef: handy-secrets`, image path `handy-server`) all need updating to `joyful-server`/`joyful-secrets`. This is a **deployment-level** rename — self-hosters using this file need to update their CI/deploy pipeline references and re-create K8s secrets under the new names.

### POSTGRES_DB=handy → POSTGRES_DB=joyful
This is the `yarn db` local development script in `package.json`. It only affects a locally-created Docker PostgreSQL database. No migration needed — developers running this script will get a fresh database named `joyful`. Anyone with an existing local `handy` database can either drop and recreate, or update their local `docker-compose` / Docker run alias.

### Documentation updates are cosmetic only
README, CONTRIBUTING, CLAUDE.md files contain `HAPPY_*` env var names and `~/.happy` paths that are wrong and mislead contributors. These are text-only changes.

## Risks / Trade-offs

- [Risk] `useHappyAction` is the primary async action handler in joyful-app — widely imported. A missed import site would be a TypeScript compile error (not silent). → Mitigation: Run `yarn workspace joyful-app typecheck` after rename; TypeScript will surface any missed sites.
- [Risk] `deploy/handy.yaml` rename: a self-hoster with CI referencing the old filename would have a broken deploy. → Mitigation: Document in commit message. Low risk — this is a fork with likely 0 or 1 external self-hosters.
- [Risk] Local `handy` database isn't automatically migrated when POSTGRES_DB changes. → Acceptable: local dev DB, developers will recreate.

## Migration Plan

For self-hosters using `deploy/handy.yaml`:
1. Rename deployment references from `handy.yaml` → `joyful.yaml` in their CI
2. Re-create K8s secrets under new names (`joyful-secrets` instead of `handy-secrets`)
3. Update image references from `handy-server` → `joyful-server`

For local developers:
- `yarn db` will create a new `joyful` database. Existing `handy` database can be dropped.
