## ADDED Requirements

### Requirement: Server URL must be explicitly configured
The CLI and app SHALL NOT have any hardcoded default server URL. If no server URL is configured, the system SHALL fail with a clear, actionable error message rather than attempting a connection.

#### Scenario: CLI starts with no server URL configured
- **WHEN** the CLI starts and neither `JOYFUL_SERVER_URL` nor a server URL in `~/.joyful/config` is present
- **THEN** the CLI prints an error message indicating that `JOYFUL_SERVER_URL` must be set and exits with a non-zero status code

#### Scenario: CLI starts with server URL configured
- **WHEN** `JOYFUL_SERVER_URL` is set or a server URL exists in config
- **THEN** the CLI proceeds normally using that URL

#### Scenario: App has no server URL
- **WHEN** the app launches and no server URL has been configured by the user
- **THEN** the app shows a configuration screen or error prompting the user to enter their server URL

---

### Requirement: No upstream cloud service defaults
The codebase SHALL NOT contain hardcoded references to upstream Happy Coder cloud infrastructure, including:
- `api.cluster-fluster.com`
- `app.happy.engineering`
- `files.cluster-fluster.com`
- Any `happy.engineering` or `cluster-fluster.com` domain

#### Scenario: Source code audit
- **WHEN** the codebase is searched for upstream cloud domains
- **THEN** no matches are found in any source file, config file, or documentation that would be used at runtime

---

### Requirement: No upstream push notification service
The CLI and server SHALL NOT send push notifications through the upstream Happy Coder push notification infrastructure. Push notification code referencing the upstream endpoint SHALL be removed.

#### Scenario: Push notification endpoint removed
- **WHEN** the codebase is searched for upstream push notification URLs
- **THEN** no such references exist in runtime code (references may exist in comments documenting the removal)

---

### Requirement: Standalone server runs on port 3007
When running in standalone mode (PGlite embedded database, no external PostgreSQL or Redis), the joyful server SHALL default to port 3007. This avoids conflicts with the upstream happy-coder server, which defaults to port 3005, allowing both to coexist on the same developer machine.

The port is configurable via the `PORT` environment variable; 3007 is the default documented in `.env.standalone.example`.

#### Scenario: Standalone server does not conflict with happy-server
- **WHEN** both joyful-server standalone and happy-coder server are running on the same machine with their default ports
- **THEN** they bind to different ports (3007 and 3005 respectively) and do not conflict

#### Scenario: Port override
- **WHEN** the `PORT` environment variable is set to a value other than 3007
- **THEN** the standalone server binds to that port instead

---

### Requirement: Voice requires self-hoster-supplied ElevenLabs credentials
Self-hosters SHALL be able to enable voice functionality by supplying their own ElevenLabs Conversational AI agent ID (via app settings) and their own `ELEVENLABS_API_KEY` (via server environment variable). The system SHALL NOT require access to any upstream-controlled ElevenLabs resources.

#### Scenario: Self-hoster configures voice end-to-end
- **WHEN** a self-hoster sets `ELEVENLABS_API_KEY` on the server and enters their ElevenLabs agent ID in the app's Voice settings
- **THEN** voice sessions start successfully using only the self-hoster's ElevenLabs account, with no dependency on upstream Happy Coder infrastructure

#### Scenario: Voice is clearly unavailable when not configured
- **WHEN** a self-hoster has not configured ElevenLabs credentials (no agent ID in settings, no env var, no baked value)
- **THEN** the voice feature is visibly marked as requiring setup, and the mic button shows an actionable error rather than silently failing
