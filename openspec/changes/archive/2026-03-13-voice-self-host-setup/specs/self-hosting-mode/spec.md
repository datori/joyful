## ADDED Requirements

### Requirement: Voice requires self-hoster-supplied ElevenLabs credentials
Self-hosters SHALL be able to enable voice functionality by supplying their own ElevenLabs Conversational AI agent ID (via app settings) and their own `ELEVENLABS_API_KEY` (via server environment variable). The system SHALL NOT require access to any upstream-controlled ElevenLabs resources.

#### Scenario: Self-hoster configures voice end-to-end
- **WHEN** a self-hoster sets `ELEVENLABS_API_KEY` on the server and enters their ElevenLabs agent ID in the app's Voice settings
- **THEN** voice sessions start successfully using only the self-hoster's ElevenLabs account, with no dependency on upstream Happy Coder infrastructure

#### Scenario: Voice is clearly unavailable when not configured
- **WHEN** a self-hoster has not configured ElevenLabs credentials (no agent ID in settings, no env var, no baked value)
- **THEN** the voice feature is visibly marked as requiring setup, and the mic button shows an actionable error rather than silently failing
