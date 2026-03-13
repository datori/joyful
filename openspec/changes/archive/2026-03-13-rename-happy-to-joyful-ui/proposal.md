## Why

The app still displays "Happy Coder" and "Happy" branding inherited from the upstream fork, but this fork is named Joyful. User-visible strings should consistently reflect the Joyful brand.

## What Changes

- All user-displayed strings in the app translation files that read "Happy Coder" become "Joyful Coder"
- All user-displayed strings that read "Happy" (as brand name) become "Joyful"
- Applies to all 10 language files (`en`, `ru`, `pl`, `es`, `ca`, `it`, `pt`, `ja`, `zh-Hans`, `zh-Hant`)
- Affected string keys: `settings.aboutFooter`, `newSession.noMachinesFound`, `server.notValidHappyServer`, `sessionInfo.failedToCopySessionId`, `components.emptyMainScreen.installCli`, `sidebar.sessionsTitle`, `terminal.terminalRequestDescription`
- Does **not** rename translation keys, internal variable names, or CLI output

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none — this is a text-only branding change with no spec-level behavior changes -->

## Impact

- `packages/joyful-app/sources/text/translations/*.ts` (10 files, ~7 strings each)
- No API, protocol, or behavioral changes
