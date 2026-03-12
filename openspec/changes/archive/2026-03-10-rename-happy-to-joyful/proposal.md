## Why

This codebase is a fork of Happy Coder. To avoid confusion with the upstream project — in naming, Docker containers, connections, and tooling — we rename the project identity from "happy" to "joyful" throughout. We also remove all upstream cloud service defaults, as this fork is self-hosted only.

## What Changes

- **BREAKING** CLI binary renamed: `happy` → `joyful`
- **BREAKING** Home/config directory renamed: `~/.happy` → `~/.joyful`
- **BREAKING** All `HAPPY_*` environment variables renamed to `JOYFUL_*`
- **BREAKING** Default server/webapp URLs removed; server URL is now required (fails loudly if unset)
- Package directories renamed: `packages/happy-*` → `packages/joyful-*`
- Package names updated: `happy-app`, `happy-cli`, `happy-server`, `happy-wire`, `happy-agent` → `joyful-*` equivalents; `happy-coder` → `joyful`; `@slopus/happy-wire` → `joyful-wire`; `@slopus/agent` → `joyful-agent`
- App bundle IDs, schemes, and display names updated from `happy` → `joyful`
- Tauri desktop app identifier updated: `com.slopus.happy` → `com.slopus.joyful`
- Internal variable names (`happyServer`, `happyHomeDir`, etc.) renamed to `joyfulServer`, `joyfulHomeDir`
- MCP tool namespace updated: `mcp__happy__` → `mcp__joyful__`
- Deployment/Docker names updated from `happy-*` → `joyful-*`
- All docs, CLAUDE.md files, and README files updated
- `@slopus` npm scope dropped; packages are unscoped (private monorepo, not published)
- Push notification / upstream cloud API references removed

## Capabilities

### New Capabilities

- `project-identity`: Defines the canonical naming conventions, env var prefixes, directory paths, package names, and app identifiers for the joyful project
- `self-hosting-mode`: Self-hosting-only operation — no upstream cloud defaults; server URL required at startup; behavior when unconfigured

### Modified Capabilities

<!-- None — no existing specs to modify -->

## Impact

- All 5 packages and their source files (~200 files with `happy` references)
- CLI binary entrypoints (`bin/happy.mjs` → `bin/joyful.mjs`)
- Package directory structure (physical rename of `packages/happy-*`)
- Expo app config, Tauri config, bundle IDs
- Deployment YAML/Dockerfile names
- Documentation and CLAUDE.md files across the monorepo
