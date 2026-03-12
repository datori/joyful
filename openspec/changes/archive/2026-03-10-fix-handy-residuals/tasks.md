## 1. Fix Critical Runtime Bug

- [x] 1.1 In `packages/joyful-cli/src/api/auth.ts`, change `generateAppUrl()` to return `joyful://${secretBase64Url}` instead of `handy://${secretBase64Url}`

## 2. Fix Test

- [x] 2.1 In `packages/joyful-cli/src/ui/qrcode.test.ts`, update the test QR data URL from `handy://...` to `joyful://...` so it validates the correct scheme

## 3. Fix Metadata and Comments

- [x] 3.1 In `packages/joyful-cli/package.json`, update the `repository` URL to point to the joyful repository (not `slopus/happy-cli`)
- [x] 3.2 In `packages/joyful-wire/package.json`, update the `repository` URL to point to the joyful repository (not `slopus/happy`)
- [x] 3.3 In `packages/joyful-agent/package.json`, update the `repository` URL to point to the joyful repository (not `slopus/happy`)
- [x] 3.4 In `packages/joyful-cli/src/ui/logger.ts`, fix the stale comment referencing `~/.handy/logs/` to reference `~/.joyful/logs/`

## 4. Verify

- [x] 4.1 Run `yarn workspace joyful build` to confirm no TypeScript errors
