## Why

Voice via ElevenLabs exists in the upstream codebase but is hard-coded to the upstream team's hosted deployment — the ElevenLabs agent ID is baked into their production binary and the server-side API key is undocumented. Self-hosters who run their own instance get a silently broken mic button with no explanation or path to fix it. Since self-hosting is the core focus of this fork, voice should work for anyone who brings their own ElevenLabs credentials.

## What Changes

- The ElevenLabs agent ID becomes runtime-configurable via the Voice settings screen (stored in local app settings), eliminating the need to rebuild native binaries or set env vars
- The Voice settings screen surfaces configuration status — "configured" vs "setup required" — and includes inline setup guidance
- The mic button, when tapped with no agent ID configured, shows an actionable error pointing to Settings → Voice instead of silently doing nothing
- The server propagates a clear error when `ELEVENLABS_API_KEY` is missing, and the app surfaces it as a user-visible message
- CLAUDE.md and in-app copy document the three things a self-hoster needs: ElevenLabs account, Conversational AI agent (with correct tools/variables), and API key on the server

## Capabilities

### New Capabilities
- `voice-self-host-config`: Runtime configuration of ElevenLabs agent ID in voice settings, configuration status display, and actionable setup guidance when voice is unconfigured

### Modified Capabilities
- `self-hosting-mode`: Voice configuration requirements added to the self-hosting surface area

## Impact

- `joyful-app`: `sources/realtime/RealtimeSession.ts`, `sources/sync/appConfig.ts`, `sources/sync/storage.ts`, `sources/app/(app)/settings/voice.tsx`, `sources/app/(app)/settings/voice/` (new setup screen)
- `joyful-server`: `sources/app/api/routes/voiceRoutes.ts` (better error response when API key missing)
- `CLAUDE.md`: document `ELEVENLABS_API_KEY` as a server env var for voice
- No new npm dependencies; no protocol/wire changes; no breaking changes
