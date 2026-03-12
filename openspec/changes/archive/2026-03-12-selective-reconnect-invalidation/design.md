## Context

The app's reconnect handler (`sync.ts`) calls `getMessagesSync(id).invalidate()` for every session in `sessionsData` unconditionally. The client already tracks the highest message seq it has fetched per session in `sessionLastSeq: Map<string, number>`. The server's `Session.seq` field is incremented once per new message (via `allocateSessionSeq`), so `Session.seq === max(SessionMessage.seq)` for that session. These two values are directly comparable: if `sessionLastSeq.get(id) >= Session.seq`, the client has all messages and no refetch is needed.

The missing piece is that the client has no way to learn the server's current `Session.seq` values at reconnect time without making N individual requests. A single `connect-state` socket event from the server delivers all of them in one shot.

## Goals / Non-Goals

**Goals:**
- Skip REST refetches for sessions whose server seq matches the client's cached seq
- Keep correctness: always refetch if there is any doubt (seq unknown, seq ahead, or session not in client's map)
- Single additional query on connect (one `Session.findMany` for the user)

**Non-Goals:**
- Eliminating the sessions list refetch on reconnect (kept; needed for new sessions created while disconnected)
- Eliminating non-session data invalidations (machines, artifacts, friends, feed — kept unconditional)
- Tracking per-session client seq on the server (would require persistent state per connection)
- Changing the reconnect behavior when `socket.recovered === true` (already skips invalidation)

## Decisions

**Emit `connect-state` from the server on every connect, not only reconnects**

The server cannot distinguish a fresh connect from a reconnect at the socket layer without additional state. Emitting on every connect is harmless: on a fresh session the client's `sessionLastSeq` map is empty, so all sessions appear "behind" and are invalidated normally. The event is cheap (one DB query).

**Payload: `{ sessions: Record<string, number> }` inline shape**

No new wire schema entry needed. The payload is only consumed by the reconnect path and has no versioning concern. If the event is missing or the client receives it before `sessionsData` is populated, it falls back to full invalidation (safe default).

**Client receives `connect-state`, then `onReconnected` fires**

Socket.io emits `connect` synchronously before any subsequent `onAny` messages. The `connect-state` event arrives as a regular server-emitted message shortly after connect. The reconnect handler therefore splits into two parts:
1. `onReconnected` — invalidates non-session data immediately on connect
2. `onConnectState` handler — performs selective session invalidation when `connect-state` arrives

**Fallback: if `connect-state` never arrives, invalidate all after timeout**

If the server does not emit `connect-state` (e.g., older server version), the client should not leave sessions stale forever. A 3-second timeout after `onReconnected` triggers full session invalidation as the safe fallback.

## Risks / Trade-offs

**Race between `connect-state` and incoming update events** — If a `new-message` update arrives before `connect-state` is processed, the client may already have the new message via the fast path. The selective invalidation check (`serverSeq > clientLastSeq`) will then correctly skip the refetch. No correctness issue.

**`Session.seq` vs `SessionMessage.seq` alignment** — `Session.seq` is incremented by `allocateSessionSeq` when storing a message; `sessionLastSeq` on the client is set to the max `SessionMessage.seq` from `fetchMessages` responses. These are the same counter and are directly comparable. After the `batch-seq-allocation` change, they remain aligned.

**New sessions created while disconnected** — The sessions list invalidation (`sessionsSync.invalidate()`) is kept unconditional so new sessions appear. Their `sessionLastSeq` entry won't exist, so `selectiveInvalidate` will treat them as "behind" and fetch them. Correct.

**One extra query per connect** — `Session.findMany({ where: { accountId: userId }, select: { id, seq } })` is a small indexed query. Acceptable overhead; it replaces up to 11 message-history queries that happened unconditionally before.
