## Context

The server uses two independent sequence counters per message event:

1. **Session message seq** (`SessionMessage.seq` / `Session.seq`): incremented once per message stored, used by the app to detect whether it has seen all messages in a session. The app's fast path accepts a websocket message only when `incomingSeq === lastSeq + 1`; any gap forces a REST refetch.

2. **User update seq** (`Account.seq`): incremented once per update event emitted to the client, used to order the update stream.

Both are currently allocated one-at-a-time. In the socket streaming path (`sessionUpdateHandler.ts`), each message that arrives from the daemon triggers two separate `UPDATE ... SET seq = seq + 1 RETURNING seq` calls. Under rapid streaming (Claude generating multiple tokens quickly), these calls interleave across messages and produce non-contiguous seqs at the app — empirically 35% of websocket messages triggered slow-path REST refetches, each cascading into 2.2 additional HTTP calls.

`allocateSessionSeqBatch` already exists in `seq.ts` and handles session message seqs correctly. `allocateUserSeqBatch` does not exist yet.

## Goals / Non-Goals

**Goals:**
- Eliminate seq gaps during streaming by allocating seqs for a batch of messages atomically
- Apply the fix in both the socket streaming path and the REST message creation path
- Zero client-side changes required

**Non-Goals:**
- Changing the seq model itself (still per-session integers, still monotonic)
- Batching across different sessions in a single allocation
- Changing the outbox flush behavior or message delivery protocol

## Decisions

**Add `allocateUserSeqBatch` to `seq.ts`**

Mirrors the existing `allocateSessionSeqBatch` signature: `allocateUserSeqBatch(userId: string, count: number, tx?: SeqClient): Promise<number[]>`. Single `UPDATE Account SET seq = seq + count RETURNING seq`, computes start/end from the returned value. This is the same pattern already proven by `allocateSessionSeqBatch`.

**Batch in the socket handler — collect then emit**

`sessionUpdateHandler.ts` currently processes each message individually as it arrives. The fix collects all messages for a single session update batch, allocates seqs for the whole batch in one transaction (`allocateSessionSeqBatch` + `allocateUserSeqBatch`), then emits each update with its pre-assigned seq. This keeps the existing per-message emit interface intact downstream.

**REST path fix is simpler**

`v3SessionRoutes.ts` already uses `allocateSessionSeqBatch` for message seqs correctly. The N+1 is only in the post-creation loop that calls `allocateUserSeq` once per message. Replacing that loop with a single `allocateUserSeqBatch(userId, createdMessages.length, tx)` call and assigning seqs by index is a one-function swap.

**Transaction scope**

Both seq allocations (session + user) must happen inside the same transaction as the message creates to avoid partial allocation on rollback. `allocateSessionSeqBatch` already accepts `tx?`; `allocateUserSeqBatch` will too.

## Risks / Trade-offs

**Burst ordering** — If the socket handler receives messages for the same session in very rapid succession before the batch is flushed, batching could introduce a small delay before the first seq is emitted. Mitigation: batch only messages already queued at the time the handler runs (no artificial delay); single-message batches are equivalent to current behavior.

**Seq skip on partial failure** — If a batch allocates seqs 10–15 but message creation fails partway through, seqs 10–14 are consumed and seq 15 is never emitted. The app would detect a permanent gap and keep refetching. Mitigation: wrap the entire batch (allocation + creation + emit) in a single transaction so partial failure rolls back the seq increment.

**`allocateUserSeqBatch` is a new function** — Low risk; it's a direct analogue of the existing `allocateSessionSeqBatch` using the same `UPDATE ... SET seq = seq + N` pattern.

## Migration Plan

Server-only change. Deploy replaces the running server; no migration needed. If rolled back, the seq counter will have gaps from any batched allocations — the app handles gaps by falling back to REST refetch, so correctness is preserved at the cost of some extra fetches during the rollback window.
