## 1. seq.ts: Add allocateUserSeqBatch

- [x] 1.1 In `packages/joyful-server/sources/storage/seq.ts`, add `allocateUserSeqBatch(userId: string, count: number, tx?: SeqClient): Promise<number[]>` — single `UPDATE Account SET seq = seq + count RETURNING seq`, compute `startSeq = endSeq - count + 1`, return `Array.from({ length: count }, (_, i) => startSeq + i)`; return `[]` immediately when `count === 0`
- [x] 1.2 Export `allocateUserSeqBatch` from `seq.ts` alongside the existing exports

## 2. v3SessionRoutes.ts: Fix REST path N+1

- [x] 2.1 In `packages/joyful-server/sources/app/api/routes/v3SessionRoutes.ts`, locate the post-creation loop that calls `allocateUserSeq(userId)` once per message
- [x] 2.2 Replace that loop with a single `allocateUserSeqBatch(userId, txResult.createdMessages.length, tx)` call inside the transaction, then assign each message its seq by index when building the update payload and calling `eventRouter.emitUpdate`

## 3. sessionUpdateHandler.ts: Fix socket streaming path N+1

- [x] 3.1 In `packages/joyful-server/sources/app/api/socket/sessionUpdateHandler.ts`, read and understand how the handler currently calls `allocateSessionSeq` + `allocateUserSeq` per message
- [x] 3.2 Refactor the handler to collect all messages for the current batch, then call `allocateSessionSeqBatch(sessionId, count, tx)` and `allocateUserSeqBatch(userId, count, tx)` once each inside a single transaction, assigning seqs to messages by index before emitting

## 4. Verification

- [x] 4.1 Restart the dev server (done), trigger a Claude streaming response, then check `data/perf.ndjson` — `ws.msg.slow` with `reason: seq_gap` should be absent or near-zero during streaming
- [x] 4.2 Confirm `ws.msg.fast` rate is ≥95% of all websocket messages during a streaming session
- [x] 4.3 Confirm `Account.update` DB event count equals the number of REST flushes (not the number of individual messages)
