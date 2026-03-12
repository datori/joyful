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

### Requirement: CLI generates joyful:// QR codes for device linking
When the CLI generates a QR code payload for linking a mobile device (e.g., for account restore / add device), the payload URL SHALL use the `joyful://` scheme. The CLI SHALL NOT generate QR payloads using `handy://` or any other scheme.

#### Scenario: QR code uses correct URL scheme
- **WHEN** the CLI generates a QR code for mobile device linking
- **THEN** the QR payload starts with `joyful://`

#### Scenario: App can handle the QR link
- **WHEN** the mobile app scans a CLI-generated QR code
- **THEN** the app recognizes the `joyful://` deep link and processes the auth payload successfully

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

---

### Requirement: Internal code identifiers use joyful naming
All internal TypeScript identifiers that are part of the project's own API surface SHALL use joyful-prefixed names. Specifically:
- The error class exported from `joyful-app` SHALL be named `JoyfulError`
- The async action hook in `joyful-app` SHALL be named `useJoyfulAction`
- The CLI spawn utility in `joyful-cli` SHALL be named `spawnJoyfulCLI`

No exported identifier SHALL be named `HappyError`, `useHappyAction`, or `spawnHappyCLI`.

#### Scenario: Error class uses joyful name
- **WHEN** a component imports the project error class
- **THEN** the import is `JoyfulError` from the errors module, not `HappyError`

#### Scenario: Async action hook uses joyful name
- **WHEN** a screen component uses the standard async action handler
- **THEN** it imports `useJoyfulAction`, not `useHappyAction`

#### Scenario: CLI spawn utility uses joyful name
- **WHEN** the daemon spawns a child CLI process
- **THEN** it calls `spawnJoyfulCLI`, not `spawnHappyCLI`

---

### Requirement: K8s deployment config uses joyful identity
The Kubernetes deployment manifest for joyful-server SHALL:
- Be located at `packages/joyful-server/deploy/joyful.yaml` (not `handy.yaml`)
- Use `joyful-server` as the resource name and image name
- Reference secrets as `joyful-secrets` (not `handy-secrets`)
- Use `/joyful-*` secret key paths (not `/handy-*`)

No file named `deploy/handy.yaml` SHALL exist in the repository.

#### Scenario: Deployment file has correct name
- **WHEN** a deployer looks for the K8s manifest
- **THEN** the file is found at `packages/joyful-server/deploy/joyful.yaml`

#### Scenario: Secret references use joyful names
- **WHEN** the K8s manifest references secrets
- **THEN** all secretRef names and key paths use the `joyful` prefix

---

### Requirement: Server-side env vars use JOYFUL_ prefix
All server environment variables introduced by this fork SHALL use the `JOYFUL_` prefix. The server SHALL read `JOYFUL_MASTER_SECRET` as its master secret. The variable `HANDY_MASTER_SECRET` SHALL NOT be read.

#### Scenario: Server starts with JOYFUL_MASTER_SECRET set
- **WHEN** `JOYFUL_MASTER_SECRET` is set in the server environment
- **THEN** the server initializes auth and encryption using that value

#### Scenario: Server fails without JOYFUL_MASTER_SECRET
- **WHEN** `JOYFUL_MASTER_SECRET` is not set and `HANDY_MASTER_SECRET` is also not set
- **THEN** the server fails to start with a clear error message indicating `JOYFUL_MASTER_SECRET` is required

#### Scenario: Old env var not read
- **WHEN** only `HANDY_MASTER_SECRET` is set (not `JOYFUL_MASTER_SECRET`)
- **THEN** the server does not use the old variable and fails to start with the same clear error
