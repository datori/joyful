## Why

After completing the happy→joyful rename, the local dev stack cannot actually be started: the standalone server has no env file, the CLI env file points to wrong ports, and there is no way to create an initial account without an already-logged-in app instance (chicken-and-egg). This blocks all further development and testing.

## What Changes

- Add `packages/joyful-server/.env.standalone` with PORT=3007, DATA_DIR, and HANDY_MASTER_SECRET placeholder so the standalone server can start without conflicting with the happy-server on port 3005
- Update `packages/joyful-cli/.env.dev-local-server` to point JOYFUL_SERVER_URL at port 3007
- Add a `joyful dev bootstrap` CLI subcommand that generates a fresh 32-byte seed, POSTs to `/v1/auth` to create an account, saves legacy credentials to `~/.joyful-dev/access.key`, and prints the base64url-encoded seed for pasting into the web app's restore screen
- Fix hardcoded "Open Happy on your mobile device" string in the restore screen to say "Joyful" (with i18n in all 9 languages)
- Add root-level convenience scripts / README instructions documenting the 3-terminal startup sequence

## Capabilities

### New Capabilities
- `dev-bootstrap`: CLI subcommand for creating a fresh local account without requiring an existing logged-in app instance

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- `packages/joyful-server/.env.standalone` — new file (gitignored after creation; template committed)
- `packages/joyful-cli/.env.dev-local-server` — port number change
- `packages/joyful-cli/src/commands/` — new `dev.ts` command file with `bootstrap` subcommand
- `packages/joyful-cli/src/index.ts` (or equivalent entry) — register new `dev` command
- `packages/joyful-app/sources/app/(app)/restore/index.tsx` — i18n string fix
- `packages/joyful-app/sources/text/translations/*.ts` — new key in all 9 languages
- No schema, protocol, or API changes
