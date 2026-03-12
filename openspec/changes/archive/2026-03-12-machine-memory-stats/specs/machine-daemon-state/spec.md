## ADDED Requirements

### Requirement: DaemonState includes optional memory fields
The `DaemonState` wire schema SHALL include three optional numeric fields for machine memory reporting. All values are in bytes.

- `memTotal` (`number`, optional): Total installed RAM as reported by `os.totalmem()`
- `memFree` (`number`, optional): Available (free) RAM as reported by `os.freemem()`
- `memDaemonRss` (`number`, optional): Resident Set Size of the daemon process as reported by `process.memoryUsage().rss`

#### Scenario: Schema accepts state with memory fields
- **WHEN** a `DaemonState` object includes `memTotal`, `memFree`, and `memDaemonRss` as numbers
- **THEN** the Zod schema SHALL parse it successfully

#### Scenario: Schema accepts state without memory fields
- **WHEN** a `DaemonState` object omits `memTotal`, `memFree`, and `memDaemonRss`
- **THEN** the Zod schema SHALL parse it successfully (fields are optional)
