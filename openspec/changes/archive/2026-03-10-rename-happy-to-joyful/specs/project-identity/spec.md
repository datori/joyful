## ADDED Requirements

### Requirement: CLI binary is named joyful
The project SHALL provide a CLI binary named `joyful` (not `happy`). The binary entrypoint file SHALL be named `joyful.mjs`.

#### Scenario: User invokes CLI
- **WHEN** a user runs `joyful` from the terminal
- **THEN** the joyful CLI starts successfully

#### Scenario: Old binary name not present
- **WHEN** a user runs `happy` from the terminal after installing joyful
- **THEN** the command is not found (no `happy` alias or shim is provided)

---

### Requirement: Config home directory is ~/.joyful
The CLI SHALL store all configuration, session data, and daemon state under `~/.joyful`. The directory `~/.happy` SHALL NOT be created or read.

#### Scenario: First run creates correct directory
- **WHEN** the CLI runs for the first time
- **THEN** configuration is written to `~/.joyful/` and not `~/.happy/`

---

### Requirement: Environment variable prefix is JOYFUL_
All project-specific environment variables SHALL use the `JOYFUL_` prefix. The following variables SHALL be recognized:
- `JOYFUL_SERVER_URL`
- `JOYFUL_WEBAPP_URL`
- `JOYFUL_HOME_DIR`
- `JOYFUL_VARIANT`
- `JOYFUL_EXPERIMENTAL`
- `JOYFUL_DISABLE_CAFFEINATE`
- `EXPO_PUBLIC_JOYFUL_SERVER_URL`

`HAPPY_*` prefixed variables SHALL NOT be read.

#### Scenario: Server URL from env
- **WHEN** `JOYFUL_SERVER_URL` is set in the environment
- **THEN** the CLI uses that URL to connect to the server

#### Scenario: Old env var ignored
- **WHEN** `HAPPY_SERVER_URL` is set but `JOYFUL_SERVER_URL` is not
- **THEN** the CLI does not read `HAPPY_SERVER_URL` and behaves as if no server URL is configured

---

### Requirement: Package names use joyful identity
All monorepo packages SHALL use joyful-prefixed names:
- `packages/joyful-app` — package name `joyful-app`
- `packages/joyful-cli` — package name `joyful` (the published binary)
- `packages/joyful-server` — package name `joyful-server`
- `packages/joyful-wire` — package name `joyful-wire`
- `packages/joyful-agent` — package name `joyful-agent`

No package SHALL be named `happy-*`, `happy-coder`, `@slopus/happy-wire`, or `@slopus/agent`.

#### Scenario: Cross-package import uses joyful-wire
- **WHEN** any package imports the shared wire types
- **THEN** the import path is `joyful-wire` (e.g., `import { ... } from 'joyful-wire'`)

---

### Requirement: App display name and identifiers use joyful
The mobile/desktop application SHALL:
- Display name: "Joyful"
- URL scheme: `joyful://`
- iOS bundle ID prefix: `com.slopus.joyful`
- Android package: `com.slopus.joyful`
- Tauri identifier: `com.slopus.joyful`
- Expo slug: `joyful`

#### Scenario: App deep link
- **WHEN** a deep link with scheme `joyful://` is opened
- **THEN** the app handles the link correctly

---

### Requirement: MCP tool namespace is joyful
Internal MCP tool names exposed by the CLI SHALL use the `mcp__joyful__` prefix (not `mcp__happy__`).

#### Scenario: MCP tool registration
- **WHEN** the CLI registers MCP tools
- **THEN** tool names follow the pattern `mcp__joyful__<tool-name>`
