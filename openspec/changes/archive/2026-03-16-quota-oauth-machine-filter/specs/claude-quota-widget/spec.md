## MODIFIED Requirements

### Requirement: App triggers fetch-quota RPC on foreground and interval
The app SHALL send a `fetch-quota` RPC request to exactly one machine when:
- The app comes to the foreground (AppState change from background/inactive to active).
- Approximately 5 minutes have elapsed since the last successful fetch while the app remains foregrounded.

The app SHALL select the first machine (from `useAllMachines()`, sorted newest-first) for which **both** conditions hold:
1. `isMachineOnline(machine)` returns `true`, AND
2. `(machine.daemonState as any).hasOAuthCredentials === true`

If no machine satisfies both conditions, the app SHALL skip the RPC silently and retry on the next trigger. Machines with `hasOAuthCredentials === false` or `hasOAuthCredentials` absent (older daemon) SHALL be skipped entirely as poll targets.

The polling effect SHALL NOT re-trigger on daemon state changes. The implementation SHALL use a stable ref (updated each render) so the interval/foreground effect runs only once on mount and is not sensitive to `machines` identity changes.

#### Scenario: OAuth machine polled when subscription machine is present
- **WHEN** two machines are active: machine A (`hasOAuthCredentials: false`, newer) and machine B (`hasOAuthCredentials: true`, older)
- **THEN** the `fetch-quota` RPC SHALL be sent to machine B, not machine A

#### Scenario: No RPC when all active machines are API-key only
- **WHEN** all active machines have `hasOAuthCredentials: false`
- **THEN** no `fetch-quota` RPC SHALL be sent; the widget SHALL continue displaying last cached values (or remain hidden if never fetched)

#### Scenario: No RPC when no machine online
- **WHEN** the app comes to the foreground and no machine is online
- **THEN** no `fetch-quota` RPC SHALL be sent

#### Scenario: Older daemon (no hasOAuthCredentials) is skipped
- **WHEN** the only active machine has `hasOAuthCredentials` absent (undefined) in its daemonState
- **THEN** no `fetch-quota` RPC SHALL be sent

#### Scenario: Quota fetched on app foreground with OAuth machine
- **WHEN** the app transitions from background to active and at least one machine is online with `hasOAuthCredentials: true`
- **THEN** the app SHALL send a `fetch-quota` RPC to the first such machine within 1 second of becoming active

#### Scenario: Quota refreshed on 5-minute interval
- **WHEN** the app has been foregrounded continuously for 5 minutes since the last fetch and an OAuth machine is online
- **THEN** the app SHALL send another `fetch-quota` RPC to the first OAuth machine

#### Scenario: Successful fetch does not immediately trigger another fetch
- **WHEN** a `fetch-quota` RPC completes and daemon state is updated
- **THEN** the app SHALL NOT immediately send another `fetch-quota` RPC as a result of the state update; the next fetch SHALL occur only on the next foreground event or 5-minute interval tick
