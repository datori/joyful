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
