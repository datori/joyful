## ADDED Requirements

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
