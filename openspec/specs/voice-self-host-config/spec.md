## ADDED Requirements

### Requirement: ElevenLabs agent ID is configurable at runtime via settings
The app SHALL allow a user to enter their ElevenLabs Conversational AI agent ID in the Voice settings screen without requiring an app rebuild or environment variable change. The entered value SHALL be persisted in local app settings (MMKV) and survive app restarts.

#### Scenario: User enters agent ID in settings
- **WHEN** a user navigates to Settings → Voice and enters a valid ElevenLabs agent ID in the configuration field
- **THEN** the value is saved to local settings and voice becomes available immediately without restarting the app

#### Scenario: Agent ID persists across restarts
- **WHEN** a user has configured an agent ID and restarts the app
- **THEN** the agent ID is still present in the voice settings field and voice remains available

#### Scenario: Agent ID can be cleared
- **WHEN** a user clears the agent ID field in voice settings
- **THEN** the value is removed from local settings and voice returns to an unconfigured state

---

### Requirement: Config priority order preserves backward compatibility
The agent ID resolution SHALL follow the priority order: (1) local settings value, (2) `EXPO_PUBLIC_ELEVENLABS_AGENT_ID_DEV/PROD` environment variable, (3) build-time baked value from `app.json` extra config. The first non-empty value wins.

#### Scenario: Local settings take precedence over env var
- **WHEN** both a local settings agent ID and an `EXPO_PUBLIC_ELEVENLABS_AGENT_ID_DEV` env var are present
- **THEN** the local settings value is used

#### Scenario: Upstream production build still works
- **WHEN** agent ID is baked into the native binary via `app.json` extra.app config and no local settings value is set
- **THEN** the baked-in value is used, preserving upstream behavior unchanged

---

### Requirement: Voice settings screen shows configuration status
The Voice settings screen SHALL display a visible status indicator showing whether voice is configured (agent ID present) or not configured (agent ID absent), and SHALL include an agent ID input field with setup guidance.

#### Scenario: Unconfigured state display
- **WHEN** a user opens Voice settings and no agent ID is configured
- **THEN** the screen shows a "Not configured" status indicator, the agent ID input field is empty, and setup guidance text is visible explaining what is needed

#### Scenario: Configured state display
- **WHEN** a user opens Voice settings and an agent ID is configured
- **THEN** the screen shows a "Configured" status indicator and the agent ID field shows the configured value (or a masked version)

---

### Requirement: Mic button tap when unconfigured shows actionable error
When the user taps the microphone button to start a voice session and no agent ID is configured, the app SHALL show a user-visible error modal (using `Modal.alert`) explaining that voice requires setup, with clear instructions to navigate to Settings → Voice. The app SHALL NOT silently return without feedback.

#### Scenario: Mic tap with no agent ID
- **WHEN** a user taps the microphone button and no ElevenLabs agent ID is configured in settings, env vars, or build config
- **THEN** a modal dialog appears explaining voice is not configured and directing the user to Settings → Voice

#### Scenario: Mic tap with agent ID configured
- **WHEN** a user taps the microphone button and an agent ID is configured
- **THEN** voice session startup proceeds normally (existing behavior)

---

### Requirement: Server voice API key error is surfaced to the user
When the app requests a voice token from the server and the server responds with an error due to a missing `ELEVENLABS_API_KEY`, the app SHALL display the error message to the user rather than swallowing it silently.

#### Scenario: Server missing API key
- **WHEN** the user starts a voice session, the app requests a token, and the server returns a 503 error with `{ error: "Missing ElevenLabs API key — set ELEVENLABS_API_KEY on the server" }`
- **THEN** the app shows a modal with a message indicating the server is not configured for voice and advising the administrator to set `ELEVENLABS_API_KEY`

---

### Requirement: Voice setup guidance is available in the settings UI
The Voice settings screen SHALL include concise inline text explaining the three prerequisites for self-hosted voice: (1) an ElevenLabs account with a Conversational AI agent, (2) the agent configured with the required client tools and dynamic variables, (3) `ELEVENLABS_API_KEY` set on the server.

#### Scenario: Setup instructions visible
- **WHEN** a user opens Voice settings
- **THEN** setup guidance text is visible on the screen (not hidden behind a modal or external link) describing what is required to enable voice
