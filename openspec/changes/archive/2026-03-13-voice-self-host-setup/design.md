## Context

Voice in the upstream codebase uses ElevenLabs Conversational AI: the app connects to an ElevenLabs-hosted agent that receives real-time audio, understands session context pushed to it via contextual updates, and calls back into the app via client tools (`messageClaudeCode`, `processPermissionRequest`). The agent ID required to start this session is currently read only from build-time baked config (`app.json` → `extra.app`) or from `EXPO_PUBLIC_*` env vars evaluated at Metro bundle time — neither is usable by a self-hoster running a pre-built binary or the web app without modifying source.

The result: the mic button silently does nothing for any deployment that isn't the upstream's production app. No error, no guidance, no path forward.

## Goals / Non-Goals

**Goals:**
- Allow voice to be enabled on any self-hosted instance by entering an ElevenLabs agent ID in the app settings UI at runtime (no rebuild required)
- Show clear, actionable UI when voice is not yet configured (settings link, setup instructions)
- Surface server-side errors (`ELEVENLABS_API_KEY` missing) as user-visible messages rather than silent failures
- Document the full ElevenLabs setup requirements for self-hosters

**Non-Goals:**
- Replacing ElevenLabs with a different provider
- Auto-provisioning an ElevenLabs agent on behalf of the user (possible future enhancement)
- Any changes to the voice session protocol, contextual update logic, or client tools

## Decisions

### Decision: Agent ID stored in local app settings (Zustand/MMKV), not env vars

**Chosen**: Extend the existing `settings` Zustand store (already persisted via MMKV) with an `elevenLabsAgentId` field. The config loading in `appConfig.ts` reads from local settings first, falling back to env vars, then to the build-time baked value. This gives the settings screen read/write access without any env var or rebuild.

**Alternative considered**: Keep env var only, document it better. Rejected: on native builds, `EXPO_PUBLIC_*` vars are evaluated at Metro bundle time, not at runtime. Self-hosters using a pre-built binary have no way to set them. The settings-first approach works universally across web and native.

**Alternative considered**: Store in the server's KV store (synced across devices). Rejected: the agent ID is per-deployment infrastructure config, not per-user preference — it belongs on-device next to the server URL setting. Also avoids a server round-trip before voice can start.

### Decision: Config priority order: local settings > EXPO_PUBLIC env var > build-time baked value

This preserves backward compatibility for the upstream's production build (agent IDs baked in) while allowing self-hosters to override via settings. The settings UI can show where the value came from ("configured in settings" vs "from environment").

### Decision: Unconfigured mic tap → modal with Settings link, not silent return

Currently `RealtimeSession.ts` does `console.error + return` when agent ID is absent. This must become a `Modal.alert` (the project's standard for user-facing errors, not `Alert`) with a message explaining what to configure and a direct link to Settings → Voice. Consistent with how other missing-config situations are handled in the app.

### Decision: Voice settings screen extended with Configuration section, not a separate screen

The existing voice settings screen is a single page with a language picker. Adding a "Configuration" section to the same screen (with status indicator + agent ID input field) is sufficient — a separate setup screen would add a navigation layer with no benefit given the small amount of configuration.

### Decision: Server voice error propagation — return 503 (not 400) when API key is missing

The current server code returns 400 when `ELEVENLABS_API_KEY` is absent, but 400 is meant for bad client requests. A missing server-side env var is a server configuration error → 503 with a clear `error` field. The app already handles non-200 responses from this endpoint; the error message just needs to be shown to the user rather than swallowed.

## Risks / Trade-offs

**[Risk] Agent ID stored unencrypted in MMKV local settings** → The ElevenLabs agent ID is not a secret (it's the public agent identifier, not the API key), so storage in MMKV without encryption is acceptable. The server-side `ELEVENLABS_API_KEY` is never sent to the app.

**[Risk] Self-hoster enters the wrong agent ID** → The session will connect to ElevenLabs but the agent will behave unexpectedly (wrong system prompt, missing tools). Mitigation: the setup instructions in the UI must be explicit about what agent configuration is required. Future: a "test connection" button could validate the agent ID against the ElevenLabs API.

**[Risk] Upstream divergence** → Any upstream changes to `appConfig.ts` or `RealtimeSession.ts` will require merging against our additions. Mitigation: the changes are additive (new settings field, new UI section, error modal) rather than structural rewrites — merge conflicts should be minimal.

## Migration Plan

No migration required. Changes are additive:
- New `elevenLabsAgentId` field in settings (optional, defaults to undefined → voice unconfigured)
- New Configuration section in voice settings (visible to all users, shows "Not configured" state by default)
- Existing behavior for users with env var or baked agent ID is unchanged (config priority order)

## Open Questions

- Should the settings UI offer separate dev/prod agent ID fields, matching the existing `elevenLabsAgentIdDev/Prod` split? The dev/prod split was designed for the upstream's deployment pipeline. For self-hosters there is typically one deployment → a single field is simpler. Decision: single field for now; map to both dev and prod slots in config.
