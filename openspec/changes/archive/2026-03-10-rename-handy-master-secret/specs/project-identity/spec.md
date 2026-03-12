## MODIFIED Requirements

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
