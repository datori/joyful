## Why

Every socket reconnect (tab reopen, network blip) invalidates all N sessions unconditionally and fires N concurrent REST fetches before the user sees current content. With 11 sessions, this produces 11 parallel `GET /v3/sessions/:sessionId/messages` calls and a 295–430ms window of stale content on every reconnect — regardless of whether any session actually has new messages.

## What Changes

- **Server**: On socket connect, emit a `connect-state` event containing a map of `{ sessionId → latestMessageSeq }` for all of the user's sessions (single `Session.findMany` query)
- **App `apiSocket.ts`**: Register a handler for `connect-state` and expose `onConnectState` listener registration
- **App `sync.ts`**: Replace the unconditional per-session invalidation in `onReconnected` with selective invalidation: only invalidate sessions whose server seq exceeds the client's cached `sessionLastSeq`; sessions that are already up-to-date skip their REST refetch entirely

## Capabilities

### New Capabilities

- `selective-reconnect-invalidation`: On reconnect, server sends current per-session message seqs; client skips REST refetches for sessions it is already up-to-date on

### Modified Capabilities

<!-- No spec-level changes to existing capabilities -->

## Impact

- `packages/joyful-server/sources/app/api/socket.ts` — emit `connect-state` on connect
- `packages/joyful-app/sources/sync/apiSocket.ts` — `onConnectState` listener, handle `connect-state` socket event
- `packages/joyful-app/sources/sync/sync.ts` — selective invalidation in reconnect handler
- No wire schema changes; `connect-state` is a new socket event with an inline payload shape
- No database schema changes; uses existing `Session.seq` field
