## Context

After the happy→joyful monorepo rename, an audit of runtime code found residual `handy`/`happy` identifiers. The most critical is `generateAppUrl()` in `packages/joyful-cli/src/api/auth.ts` which constructs the QR code payload for mobile device linking. It returns `handy://${seed}` but the app's registered URL scheme is `joyful://`, making mobile QR auth silently broken.

The remaining issues are metadata (package.json repo URLs) and non-runtime code (a comment and a test) that mask or echo the scheme bug.

## Goals / Non-Goals

**Goals:**
- Fix the `handy://` → `joyful://` URL scheme bug in `auth.ts` (restore mobile QR auth)
- Update package.json repo URLs to point to the actual joyful repository
- Fix the stale `~/.handy/logs/` comment in `logger.ts`
- Fix the `handy://` test URL in `qrcode.test.ts` so it validates the correct scheme

**Non-Goals:**
- Renaming `HANDY_MASTER_SECRET` or `service: 'handy'` — tracked separately as `rename-handy-master-secret`
- Renaming any remaining `handy`/`happy` in documentation only (not runtime-critical)
- Any new features

## Decisions

### Fix auth.ts directly (no abstraction)
The `generateAppUrl()` function has a single call site and a trivial fix: change the string literal. No need for a config constant or abstraction — the scheme is a stable identity value that belongs inline.

### Update qrcode.test.ts to use `joyful://`
The test currently uses `handy://` as test data, which means the QR encoder test passes even if the scheme is wrong. Correcting it to `joyful://` makes the test an accurate regression guard.

### Package.json repo URLs
These are metadata only; no runtime impact. Update them to whatever the correct joyful repository URL is. If the canonical URL isn't known yet, use the best available (e.g., `github.com/slopus/joyful`).

## Risks / Trade-offs

- [Risk] The `handy://` fix changes QR code output — any device that scanned a QR with `handy://` won't benefit from the fix but those links were already broken.
  → No migration needed; old QR codes were already non-functional.

## Open Questions

- What is the canonical repository URL for the joyful fork? Used to update package.json `repository` fields.
