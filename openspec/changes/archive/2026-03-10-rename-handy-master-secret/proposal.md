## Why

The joyful-server still reads `HANDY_MASTER_SECRET` as its master secret env var and uses `service: 'handy'` as the token service name in privacy-kit. Both are inherited from the upstream handy-server naming. This is a documented known deviation in `openspec/specs/project-identity/spec.md` (Server-side env vars use JOYFUL_ prefix). The rename is needed to complete the project identity change and eliminate confusion for self-hosters who must configure the server.

The two changes are tightly coupled: `HANDY_MASTER_SECRET` is the seed for the privacy-kit `createPersistentTokenGenerator` with `service: 'handy'`. Changing one without the other would produce an incoherent transition. They must be done in the same deploy.

## What Changes

- **Rename env var**: `HANDY_MASTER_SECRET` → `JOYFUL_MASTER_SECRET` in all server source files, README, and env example files (**BREAKING** for existing deployments)
- **Rename service name**: `service: 'handy'` → `service: 'joyful'` in `sources/app/auth/auth.ts` lines 29 and 35 (**BREAKING**: invalidates all existing auth tokens — users must re-authenticate)
- **Update all references**: `sources/modules/encrypt.ts`, `sources/standalone.ts`, `packages/joyful-server/README.md`, `packages/joyful-server/.env.standalone.example`, `packages/joyful-server/.env.dev`, `packages/joyful-cli/src/commands/dev.ts` (the bootstrap startup hint)
- **Update spec**: Remove the "known deviation" note from `openspec/specs/project-identity/spec.md` now that it's resolved

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `project-identity`: Remove the `HANDY_MASTER_SECRET` known deviation footnote from the "Server-side env vars use JOYFUL_ prefix" requirement — the deviation is now resolved

## Impact

- **Self-hosters**: Must update their `.env` / deployment secrets before upgrading. Old `HANDY_MASTER_SECRET` will be ignored; server will fail to start if `JOYFUL_MASTER_SECRET` is not set.
- **All users**: All existing JWT auth tokens are invalidated. Every device must re-authenticate after the server is updated.
- Affected files: `packages/joyful-server/sources/app/auth/auth.ts`, `packages/joyful-server/sources/modules/encrypt.ts`, `packages/joyful-server/sources/standalone.ts`, `packages/joyful-server/README.md`, `packages/joyful-server/.env.standalone.example`, `packages/joyful-server/.env.dev`, `packages/joyful-cli/src/commands/dev.ts`
