## Context

The joyful fork is fully renamed from happy-coder but cannot be run locally because:
1. No env file exists for the standalone server → server won't start
2. The CLI dev env file points to port 3005 (happy-server's port) → auth fails
3. Creating an account requires an already-logged-in app (chicken-and-egg) → impossible for a fresh dev
4. The app's restore screen still says "Open Happy" → confusing UX

The standalone server uses PGlite (embedded SQLite-compatible) — no PostgreSQL or Redis needed. The auth system uses public-key cryptography: a 32-byte seed generates an Ed25519 keypair; `POST /v1/auth` performs challenge+signature and returns a JWT. This is the only fully self-contained auth path.

## Goals / Non-Goals

**Goals:**
- Enable a developer to start the full joyful stack locally in ~5 minutes with no external dependencies
- Break the auth chicken-and-egg: account creation must work without an existing logged-in device
- Ensure joyful and happy-coder can coexist on the same machine without port or data conflicts

**Non-Goals:**
- Production deployment changes
- New agent features or protocol changes
- Changing HANDY_MASTER_SECRET env var name (that's a separate rename task)
- Changing the auth protocol itself

## Decisions

### Decision 1: Port 3007 for joyful standalone server
**Rationale**: Happy-server uses 3005. Using 3007 avoids conflicts for developers who have both installed. The gap is intentional to leave room for future services.

**Alternative considered**: Dynamic port assignment. Rejected — makes CLI config more complex.

### Decision 2: `joyful dev bootstrap` as a CLI subcommand
**Rationale**: The bootstrap flow (generate seed → POST /v1/auth → save creds) is 3 steps that must happen atomically from the CLI's perspective. A dedicated subcommand under a `dev` parent command (similar to how many CLIs structure dev-only utilities) makes it discoverable without polluting the main command namespace.

**Alternative considered**: A standalone script. Rejected — requires users to know where to find it and doesn't benefit from CLI's configuration loading.

**Implementation**:
- Generate 32 random bytes with `crypto.getRandomValues` (Node crypto)
- Derive keypair: `nacl.sign.keyPair.fromSeed(seed)`
- Call existing `authGetToken(seed)` from `src/api/auth.ts` which does the challenge/signature flow
- Save via existing `writeCredentialsLegacy({ secret: base64url(seed), token })` from `src/persistence.ts`
- Print the base64url seed so the user can paste it into the web app's `restore/manual` screen

### Decision 3: Commit `.env.standalone.example`, gitignore `.env.standalone`
**Rationale**: The actual env file contains a placeholder master secret that each developer fills in. Committing the template with safe defaults makes onboarding fast. The actual file should not be committed (contains secrets).

### Decision 4: i18n for restore screen fix
**Rationale**: The restore screen text is already in the i18n system — "Open Happy on your mobile device" is just a missed string in the rename. It must be added to all 9 language files per project convention.

### Decision 5: Use existing `authGetToken` in bootstrap
**Rationale**: `src/api/auth.ts` already implements `authGetToken(secret: Uint8Array)` which does the full challenge/signature flow. Reusing it avoids code duplication and ensures the bootstrap flow stays in sync with the actual auth implementation.

## Risks / Trade-offs

- **[Risk] HANDY_MASTER_SECRET env var name**: The standalone server still reads `HANDY_MASTER_SECRET`. The `.env.standalone` file uses this name. If the env var is renamed later, the file needs updating. → Mitigation: Add a comment in the env file documenting this.
- **[Risk] Port 3007 conflict**: If the user has another service on 3007. → Mitigation: Document this, let user override via PORT env var.
- **[Risk] `dev bootstrap` run twice**: Will create a new seed/account on second run, orphaning the first. → Mitigation: Check for existing `access.key` and warn/abort unless `--force` passed.

## Open Questions

- Should `joyful dev bootstrap` also print the server URL to paste into the web app, or is that handled by documentation?
  → Decision: Print both the seed AND a note about setting `EXPO_PUBLIC_JOYFUL_SERVER_URL=http://localhost:3007`.
