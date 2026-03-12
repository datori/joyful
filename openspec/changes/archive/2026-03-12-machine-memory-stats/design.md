## Context

The daemon already maintains a `DaemonState` encrypted blob synced to the server on connect and periodically (20-second heartbeat). The app decrypts and reads this to show daemon status (running/stopped, pid, port). Memory stats fit naturally into this existing channel.

Node.js provides `os.totalmem()` and `os.freemem()` (cross-platform, no dependencies) and `process.memoryUsage().rss` for the daemon's own footprint. No new packages needed.

## Goals / Non-Goals

**Goals:**
- Extend `DaemonState` with 3 optional memory fields (`memTotal`, `memFree`, `memDaemonRss`)
- Populate them in `updateDaemonState()` on the existing connect + heartbeat cadence
- Display a memory indicator (used/total, human-readable) on machine cards/rows in the app

**Non-Goals:**
- Per-session memory breakdown (would require per-process RSS polling and per-session state updates)
- Real-time memory streaming (20s cadence is sufficient for monitoring)
- Memory threshold alerts / push notifications (future work)

## Decisions

**1. Extend `DaemonState` rather than adding a new message type**
The encrypted `daemonState` blob is already versioned, synced, and decoded by the app. Adding fields there requires zero new wire protocol surface. Alternative (new `machine-stats` message) would need new server handler, new wire schema entry, new app handler — more moving parts with no benefit.

**2. `os.totalmem()` / `os.freemem()` — no native modules or polling process trees**
Cross-platform, instant, no extra dependencies. Per-session RSS would require walking `/proc` trees (Linux-only) or spawning `ps` (macOS). The user's goal is machine-level monitoring; machine-level stats are sufficient and far simpler.

**3. Optional fields in schema (`z.number().optional()`)**
Older daemon versions won't send memory fields. The app must handle absence gracefully (hide the indicator). This avoids a hard version dependency between daemon and app.

**4. Collect on existing connect + daemonState update cadence**
`updateDaemonState()` is called on connect and on shutdown. The heartbeat (`machine-alive`) is separate and lightweight (no payload). We piggyback memory stats on `updateDaemonState()` calls rather than adding memory to every heartbeat — keeping heartbeats cheap.

The 20-second heartbeat triggers a `machine-alive` event (no state update). To get fresh memory readings periodically, we call `updateDaemonState()` on a separate interval in addition to the existing connect-time call. A 60-second interval is sufficient for memory monitoring.

**5. App display: inline text indicator, not a progress bar**
A compact `X / Y MB` or `X% used` text next to the machine name/status is enough. A progress bar requires a custom component for marginal UX gain.

## Risks / Trade-offs

- **Stale data if daemon is stuck**: If the daemon stops updating (e.g., event loop blocked), memory stats stop refreshing. The user would see old numbers. Mitigation: none needed — if the daemon is stuck, the machine online/offline indicator will also stop updating, giving a clear signal.
- **Encrypted state size**: 3 extra number fields add ~50 bytes to the encrypted daemonState blob per update. Negligible.
- **`os.freemem()` is system-wide, not daemon-scoped**: This is intentional — the user wants to know if the *machine* is running low, not just this one process.
