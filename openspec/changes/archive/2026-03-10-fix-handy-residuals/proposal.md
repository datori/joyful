## Why

After the happy→joyful rename, a handful of residual `handy`/`happy` references remain in runtime code. The most critical is `generateAppUrl()` returning `handy://` — the app registers `joyful://`, so mobile QR authentication is completely broken. The others are metadata and test hygiene issues.

## What Changes

- **Fix `handy://` URL scheme**: `packages/joyful-cli/src/api/auth.ts` line 42 returns `handy://${seed}` — change to `joyful://`
- **Fix wrong repository URLs**: `packages/joyful-cli/package.json`, `packages/joyful-wire/package.json`, `packages/joyful-agent/package.json` still reference upstream `slopus/happy-cli` or `slopus/happy` repo URLs
- **Fix stale comment**: `packages/joyful-cli/src/ui/logger.ts` has a comment referencing `~/.handy/logs/`
- **Fix test URL**: `packages/joyful-cli/src/ui/qrcode.test.ts` uses `handy://` in the test QR data, which masks the real scheme bug

## Capabilities

### New Capabilities
<!-- none — this is a pure bug/cleanup fix -->

### Modified Capabilities
- `project-identity`: The `joyful://` URL scheme requirement now has a code-level bug documented and fixed; the runtime behavior now matches the spec

## Impact

- `packages/joyful-cli/src/api/auth.ts` — mobile QR auth restored
- `packages/joyful-cli/src/ui/logger.ts` — comment only
- `packages/joyful-cli/src/ui/qrcode.test.ts` — test URL corrected
- `packages/joyful-cli/package.json`, `packages/joyful-wire/package.json`, `packages/joyful-agent/package.json` — metadata only, no runtime impact
