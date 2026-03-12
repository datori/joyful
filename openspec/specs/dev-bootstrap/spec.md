## ADDED Requirements

### Requirement: Bootstrap creates a fresh local account
The `joyful dev bootstrap` command SHALL generate a fresh 32-byte random seed, derive an Ed25519 keypair, authenticate with the local server via the challenge/signature flow (`POST /v1/auth`), save the resulting credentials in legacy format to the configured home directory, and print the base64url-encoded seed and setup instructions to stdout.

#### Scenario: Fresh bootstrap on a clean machine
- **WHEN** no `access.key` file exists in the joyful home directory and the user runs `joyful dev bootstrap`
- **THEN** the command generates a fresh seed, obtains a JWT from the server, writes `access.key` with `{ type: "legacy", secret: "<base64url-seed>", token: "<jwt>" }`, prints the base64url seed and instructions for pasting into the web app

#### Scenario: Bootstrap aborts if credentials already exist
- **WHEN** an `access.key` file already exists in the joyful home directory and the user runs `joyful dev bootstrap`
- **THEN** the command SHALL print a warning and exit without overwriting, unless `--force` flag is passed

#### Scenario: Bootstrap with --force overwrites existing credentials
- **WHEN** an `access.key` file exists and the user runs `joyful dev bootstrap --force`
- **THEN** the command SHALL generate a new seed, overwrite `access.key`, and print the new seed

#### Scenario: Bootstrap fails if server is unreachable
- **WHEN** the configured server URL is not responding and the user runs `joyful dev bootstrap`
- **THEN** the command SHALL print a clear error message indicating the server URL and exit with a non-zero code

### Requirement: Bootstrap output includes all info needed to complete setup
The `joyful dev bootstrap` command SHALL print the base64url seed AND the `EXPO_PUBLIC_JOYFUL_SERVER_URL` value to configure in the web app, so the developer can complete the auth loop without consulting documentation.

#### Scenario: Output includes seed and server URL hint
- **WHEN** bootstrap succeeds
- **THEN** the output SHALL include the base64url seed on its own line AND a note showing the server URL to set for the web app
