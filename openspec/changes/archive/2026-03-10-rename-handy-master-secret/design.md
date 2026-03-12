## Context

The joyful-server uses `privacy-kit` for auth token generation. The `createPersistentTokenGenerator` and `createPersistentTokenVerifier` calls both take a `{ service, seed }` config. The `service` value is embedded in the token payload — changing it changes the token format, which means old tokens can't be verified by a server using the new service name.

Currently: `service: 'handy'`, `seed: process.env.HANDY_MASTER_SECRET`
Target: `service: 'joyful'`, `seed: process.env.JOYFUL_MASTER_SECRET`

The `encrypt.ts` module also uses `HANDY_MASTER_SECRET` as a symmetric encryption key. Renaming it here changes the encryption key — any data encrypted with the old key will be undecryptable. However, `encrypt.ts` is used for ephemeral/session-scoped data, not persistent stored data, so this does not cause data loss but does invalidate active sessions.

## Goals / Non-Goals

**Goals:**
- Rename `HANDY_MASTER_SECRET` → `JOYFUL_MASTER_SECRET` everywhere
- Rename `service: 'handy'` → `service: 'joyful'` in auth token generation/verification
- Update all documentation and env example files
- Remove the known-deviation note from the `project-identity` spec

**Non-Goals:**
- A migration path that preserves old tokens (not worth the complexity for a self-hosted project with few deployments)
- Dual-reading both env vars (adds complexity; clean cutover is preferable)
- Any other renaming beyond this specific pair

## Decisions

### Hard cutover, no dual-read
The server will only read `JOYFUL_MASTER_SECRET`. If it's absent, the server fails at startup (as it does today for `HANDY_MASTER_SECRET`). This is the cleanest approach — no lingering `HANDY_` reading, no conditional logic.

### Rename service name atomically with env var
Both changes must land in the same commit/deploy. The deployment upgrade procedure is: (1) update env/secrets first, (2) deploy new server binary, (3) all users re-auth. Splitting across two deploys would leave a broken intermediate state.

### Token invalidation is acceptable
All JWTs are invalidated on service name change. For a self-hosted tool this is a one-time migration cost — users see a re-auth prompt and log back in. No data is lost.

## Risks / Trade-offs

- [Risk] Self-hosters forget to rename env var before upgrading → server fails to start with a clear error (JOYFUL_MASTER_SECRET is required).
  → Mitigation: Update README and `.env.standalone.example` prominently; document in release notes.

- [Risk] `encrypt.ts` key change could decrypt ephemeral data incorrectly → active sessions fail gracefully; no persistent data loss.
  → Mitigation: Acceptable; users re-auth and restart sessions.

## Migration Plan

For self-hosters upgrading:
1. Rename `HANDY_MASTER_SECRET` → `JOYFUL_MASTER_SECRET` in all deployment secrets / `.env` files
2. Deploy the new server version
3. Notify users to re-authenticate (all tokens invalidated)

## Open Questions

- None — the approach is well-understood.
