## Context

This is a large-scale cross-cutting rename across a 5-package monorepo (~200 files). The upstream project uses "happy" as its identity token throughout: CLI binary name, home directory, env vars, package names, Docker images, app bundle IDs, and source variable names. As a fork, we must establish a distinct identity ("joyful") to avoid confusion.

The change is primarily mechanical — search-and-replace with precision — but has a few non-trivial decisions around physical directory renaming, package scoping, and cloud service removal.

## Goals / Non-Goals

**Goals:**
- All user-visible surfaces say "joyful" (CLI binary, home dir, env vars, app name)
- All package names reference "joyful" (no `@slopus/happy-*` in imports)
- Physical package directories renamed (`packages/happy-*` → `packages/joyful-*`)
- Cloud service defaults removed; server URL must be explicitly configured
- Codebase compiles and tests pass after rename

**Non-Goals:**
- npm publishing setup (deferred — private monorepo for now)
- Infrastructure changes (Kubernetes, Docker registry — separate concern)
- Backward compatibility shims (no `HAPPY_SERVER_URL` fallback, no `happy` binary alias)
- App Store / Google Play publishing updates (not yet published under this identity)

## Decisions

### Decision 1: Rename physical directories now
**Choice**: Rename `packages/happy-*` → `packages/joyful-*` immediately.
**Rationale**: Fork just occurred, working tree is clean, history continuity is not a concern. Deferring creates persistent confusion between directory names and package names. Cost is low now; increases over time.
**Alternative considered**: Keep dirs, rename package names only. Rejected — inconsistency between filesystem and package identity is a recurring source of friction.

### Decision 2: Drop `@slopus` npm scope, use unscoped names
**Choice**: `@slopus/happy-wire` → `joyful-wire`; `@slopus/agent` → `joyful-agent`. No scope.
**Rationale**: Not publishing to npm. Scope only matters for registry isolation. In a private workspace monorepo, unscoped names are simpler and don't imply a relationship to an npm org we don't own.
**Alternative considered**: Use own scope (e.g., `@joyful/wire`). Rejected — overhead without benefit until we decide to publish.

### Decision 3: Fail loudly on missing server URL
**Choice**: CLI startup aborts with a clear error message if `JOYFUL_SERVER_URL` is not set and no server URL is found in config. No hardcoded default.
**Rationale**: Self-hosting-only. A default URL (even localhost) would be silently wrong for most deployments. Explicit configuration is safer and makes the operator model clear.
**Alternative considered**: Default to `http://localhost:3000`. Rejected — would succeed silently when server isn't running, producing confusing connection errors downstream.

### Decision 4: No backward-compatibility shims
**Choice**: Old env vars (`HAPPY_*`), old binary (`happy`), old home dir (`~/.happy`) are not supported after rename.
**Rationale**: This is a fresh fork with no existing user base under the "joyful" identity. Shims add complexity and imply a migration path that doesn't exist. Anyone running this after the rename should configure fresh.

### Decision 5: Rename order — directories first, then package names, then source
**Choice**: Execute rename in layers: (1) physical dirs + root workspace config, (2) package.json names + cross-package imports, (3) env vars + source variable names, (4) app identifiers + configs, (5) docs.
**Rationale**: Layers have a natural dependency — workspace config must know the directory names before packages can resolve; imports use package names not directory names. Doing source variable renames last keeps the codebase buildable at each step.

## Risks / Trade-offs

- **yarn.lock divergence** → After physical directory renames and package name changes, `yarn install` must be re-run to regenerate workspace links. Lock file will change substantially.
- **Expo app config** → `app.config.js` bundle IDs and schemes affect native builds. If any native artifacts exist (iOS/Android builds), they'd need clean rebuilds.
- **Missed references** → Automated rename is thorough but `happy` appears as a common English word in some strings. Case-sensitive grep limits false positives; review required.
- **"handy" naming in deploy files** → Upstream uses "handy" as a secondary codename in some Kubernetes configs. These are out of scope for this change but noted for future infra work.

## Migration Plan

1. Rename physical directories (`packages/happy-*` → `packages/joyful-*`)
2. Update root `package.json` workspaces array
3. Update each package's `package.json` (name, deps referencing `@slopus/happy-wire`)
4. Rename binary entrypoint files (`bin/happy.mjs` → `bin/joyful.mjs`)
5. Update all `HAPPY_*` env var references in source + config files
6. Update internal variable names (`happyServer` → `joyfulServer`, etc.)
7. Update app identifiers (Expo config, Tauri config, bundle IDs, scheme)
8. Update deployment files (Dockerfile, Docker Compose names)
9. Update docs and CLAUDE.md files
10. Run `yarn install` to rebuild workspace links
11. Run `yarn typecheck` across all packages to confirm no broken imports

**Rollback**: Git revert. No database migrations involved.

## Open Questions

- **Deployment infrastructure**: `handy.yaml` and associated Kubernetes configs reference upstream infra (S3 bucket `happy`, image registry `docker.korshakov.com`). These will need addressing when infra is set up for joyful, but are out of scope here.
- **Push notifications**: Upstream push notification endpoint hardcoded in `happy-cli`. Remove for now or stub out?
