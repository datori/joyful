## 1. Physical Directory and Workspace Rename

- [x] 1.1 Rename `packages/happy-app` → `packages/joyful-app`
- [x] 1.2 Rename `packages/happy-cli` → `packages/joyful-cli`
- [x] 1.3 Rename `packages/happy-server` → `packages/joyful-server`
- [x] 1.4 Rename `packages/happy-wire` → `packages/joyful-wire`
- [x] 1.5 Rename `packages/happy-agent` → `packages/joyful-agent`
- [x] 1.6 Update root `package.json` workspaces array to reference new directory names

## 2. Package Names and Cross-Package Dependencies

- [x] 2.1 Update `packages/joyful-cli/package.json`: name `happy-coder` → `joyful`, bin `happy` → `joyful`
- [x] 2.2 Update `packages/joyful-app/package.json`: name `happy-app` → `joyful-app`
- [x] 2.3 Update `packages/joyful-server/package.json`: name `happy-server` → `joyful-server`
- [x] 2.4 Update `packages/joyful-wire/package.json`: name `@slopus/happy-wire` → `joyful-wire` (drop scope)
- [x] 2.5 Update `packages/joyful-agent/package.json`: name `@slopus/agent` → `joyful-agent`
- [x] 2.6 Update all package.json dependency references from `@slopus/happy-wire` → `joyful-wire` across all packages
- [x] 2.7 Run `yarn install` to rebuild workspace links and verify all packages resolve

## 3. CLI Binary Entrypoints

- [x] 3.1 Rename `packages/joyful-cli/bin/happy.mjs` → `joyful.mjs` and update shebang/contents if needed
- [x] 3.2 Rename `packages/joyful-cli/bin/happy-dev.mjs` → `joyful-dev.mjs`
- [x] 3.3 Rename `packages/joyful-cli/bin/happy-mcp.mjs` → `joyful-mcp.mjs` (if exists)
- [x] 3.4 Rename `packages/joyful-agent/bin/happy-agent.mjs` → `joyful-agent.mjs` (if exists)
- [x] 3.5 Update all `bin` fields in respective `package.json` files to match new filenames

## 4. Environment Variables and Config Paths

- [x] 4.1 Rename all `HAPPY_*` env vars to `JOYFUL_*` in `packages/joyful-cli/src/configuration.ts`
- [x] 4.2 Update `~/.happy` path references to `~/.joyful` in configuration.ts and any related files
- [x] 4.3 Rename `EXPO_PUBLIC_HAPPY_SERVER_URL` → `EXPO_PUBLIC_JOYFUL_SERVER_URL` in `packages/joyful-app`
- [x] 4.4 Update `SKIP_HAPPY_WIRE_BUILD` → `SKIP_JOYFUL_WIRE_BUILD` in build scripts
- [x] 4.5 Update all `.env.*` and `.env.example` files across all packages

## 5. Self-Hosting: Remove Cloud Defaults and Add Startup Validation

- [x] 5.1 Remove hardcoded `https://api.cluster-fluster.com` default from CLI configuration
- [x] 5.2 Remove hardcoded `https://app.happy.engineering` default from CLI configuration
- [x] 5.3 Remove hardcoded upstream server URL default from `packages/joyful-app/sources/sync/serverConfig.ts`
- [x] 5.4 Remove hardcoded upstream server URL default from `packages/joyful-agent/src/config.ts`
- [x] 5.5 Add CLI startup validation: if no server URL configured, print actionable error and exit non-zero
- [x] 5.6 Remove upstream push notification endpoint from `packages/joyful-cli/src/api/pushNotifications.ts`

## 6. Source Code: Internal Variable Names and Imports

- [x] 6.1 Rename internal variable `happyServer` → `joyfulServer` across all packages (grep and replace)
- [x] 6.2 Rename internal variable `happyHomeDir` → `joyfulHomeDir` across all packages
- [x] 6.3 Update all `import ... from '@slopus/happy-wire'` → `from 'joyful-wire'` across all source files
- [x] 6.4 Update MCP tool name prefix `mcp__happy__` → `mcp__joyful__` in CLI source
- [x] 6.5 Rename `HAPPY_` prefixed constants in source (distinct from env vars — e.g., internal string literals)

## 7. App Identifiers and Platform Config

- [x] 7.1 Update `packages/joyful-app/app.config.js`: name, slug, scheme, bundle IDs (all happy → joyful)
- [x] 7.2 Update `packages/joyful-app/app.config.js`: remove `applinks:app.happy.engineering`
- [x] 7.3 Update `packages/joyful-app/src-tauri/tauri.conf.json`: productName, identifier (com.slopus.happy → com.slopus.joyful)
- [x] 7.4 Update `packages/joyful-app/src-tauri/tauri.dev.conf.json` and `tauri.preview.conf.json` similarly
- [x] 7.5 Update `packages/joyful-app/public/.well-known/apple-app-site-association` bundle ID references
- [x] 7.6 Update `packages/joyful-app/public/.well-known/assetlinks.json` package name references

## 8. Deployment and Docker Files

- [x] 8.1 Update `Dockerfile`, `Dockerfile.server`, `Dockerfile.webapp` — rename image labels and any internal references
- [x] 8.2 Update `packages/joyful-server/deploy/handy.yaml` — rename deployment/service names from happy-* to joyful-*
- [x] 8.3 Update `packages/joyful-server/deploy/happy-redis.yaml` — rename file and its internal resource names
- [x] 8.4 Update `packages/joyful-app/deploy/happy-app.yaml` — rename file and its internal resource names
- [x] 8.5 Update S3/storage references from `happy` bucket name to `joyful` in deploy configs

## 9. Documentation and CLAUDE.md

- [x] 9.1 Update root `CLAUDE.md` — project name, package table, commands section
- [x] 9.2 Update root `README.md` — all CLI commands (`happy` → `joyful`), package names
- [x] 9.3 Update `packages/joyful-app/CLAUDE.md` if present
- [x] 9.4 Update `packages/joyful-cli/CLAUDE.md` if present
- [x] 9.5 Update `packages/joyful-server/CLAUDE.md` if present
- [x] 9.6 Update all files under `docs/` (protocol.md, architecture docs, etc.)
- [x] 9.7 Update package-level `README.md` files

## 10. Release Configs and CI

- [x] 10.1 Update `packages/joyful-cli/.release-it.json` — package name reference
- [x] 10.2 Update `packages/joyful-agent/.release-it.json` — package name reference
- [x] 10.3 Update `.github/workflows/cli-smoke-test.yml` — binary name (`happy` → `joyful`) and package name
- [x] 10.4 Update `scripts/release.cjs` — any `happy-*` references
- [x] 10.5 Update root `package.json` scripts (e.g., `yarn cli` script references)

## 11. Verification

- [x] 11.1 Run `grep -r "happy" packages/ --include="*.ts" --include="*.tsx" --include="*.js" -l` and review remaining hits for legitimacy (English word vs identity reference)
- [x] 11.2 Run `yarn workspace joyful-wire build` to confirm shared types package builds
- [x] 11.3 Run `yarn workspace joyful-cli build` to confirm CLI builds
- [x] 11.4 Run `yarn workspace joyful-app typecheck` to confirm app typechecks
- [x] 11.5 Run `yarn workspace joyful-server build` to confirm server builds
- [x] 11.6 Confirm `joyful` binary runs and fails with actionable error when no server URL is set
