## 1. Server Environment Setup

- [x] 1.1 Create `packages/joyful-server/.env.standalone.example` with PORT=3007, HANDY_MASTER_SECRET placeholder, and DATA_DIR default, with comments explaining each variable
- [x] 1.2 Verify `.gitignore` in `packages/joyful-server/` excludes `.env.standalone` (add if missing)
- [x] 1.3 Update `packages/joyful-cli/.env.dev-local-server` to set JOYFUL_SERVER_URL=http://localhost:3007 (was 3005)

## 2. CLI `dev bootstrap` Command

- [x] 2.1 Create `packages/joyful-cli/src/commands/dev.ts` with `handleDevCommand(args)` that dispatches to `bootstrap` subcommand; include help text
- [x] 2.2 Implement `bootstrap` subcommand in `dev.ts`: check for existing access.key (abort with warning unless --force); generate 32 random bytes; call `authGetToken(seed)` from `@/api/auth`; call `writeCredentialsLegacy({ secret: seed, token })` from `@/persistence`; print base64url seed and server URL hint
- [x] 2.3 Register `dev` command in `packages/joyful-cli/src/index.ts` (add `else if (subcommand === 'dev')` block with the same error-handling pattern used by `auth` and `connect`)

## 3. App Restore Screen i18n Fix

- [x] 3.1 Add translation keys to `packages/joyful-app/sources/text/translations/en.ts` for `restore.linkDeviceInstructions` (the 4-step "Open Joyful on your mobile device" text) and `restore.restoreWithSecretKey` ("Restore with Secret Key Instead")
- [x] 3.2 Add the same keys to all remaining 9 language files (ru, pl, es, ca, it, pt, ja, zh-Hans, zh-Hant) with appropriate translations
- [x] 3.3 Update `packages/joyful-app/sources/app/(app)/restore/index.tsx` to use `t('restore.linkDeviceInstructions')` and `t('restore.restoreWithSecretKey')` instead of the hardcoded strings

## 4. Typecheck

- [x] 4.1 Run `yarn workspace joyful build` (CLI typecheck) and fix any errors
- [x] 4.2 Run `yarn workspace joyful-app typecheck` and fix any errors
