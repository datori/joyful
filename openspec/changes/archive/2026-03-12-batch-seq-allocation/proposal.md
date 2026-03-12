## Why

During Claude streaming, the server allocates a separate sequence number per message via individual DB writes, causing non-contiguous seqs at the app. The app detects seq gaps and falls back to REST refetches — empirically measured at 35% of all websocket messages hitting the slow path, each triggering 2.2 unnecessary REST calls averaging 55ms each.

## What Changes

- Add `allocateUserSeqBatch(userId, count, tx?)` to `seq.ts` alongside the existing `allocateSessionSeqBatch`
- In `sessionUpdateHandler.ts` (socket streaming path): collect all messages for a session update in a single transaction, allocate session seqs and user seqs in one batch call each
- In `v3SessionRoutes.ts` (REST message creation path): replace the per-message `allocateUserSeq` loop with a single `allocateUserSeqBatch` call

## Capabilities

### New Capabilities

- `batch-seq-allocation`: Server allocates contiguous blocks of sequence numbers for multi-message operations in a single atomic DB write, eliminating seq gaps that force the app onto the slow REST-refetch path

### Modified Capabilities

<!-- No spec-level requirement changes to existing capabilities -->

## Impact

- `packages/joyful-server/sources/storage/seq.ts` — new `allocateUserSeqBatch` function
- `packages/joyful-server/sources/app/api/socket/sessionUpdateHandler.ts` — batch seq allocation in streaming path
- `packages/joyful-server/sources/app/api/routes/v3SessionRoutes.ts` — batch user seq allocation in REST path
- No wire protocol changes; no client changes required
- No database schema changes; uses existing `Session.seq` and `Account.seq` increment pattern
