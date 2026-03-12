## ADDED Requirements

### Requirement: Batch user seq allocation
The server SHALL expose `allocateUserSeqBatch(userId, count, tx?)` in `storage/seq.ts` that increments `Account.seq` by `count` in a single atomic DB write and returns an array of `count` contiguous sequential integers. When `count` is 0, it SHALL return an empty array without touching the DB.

#### Scenario: Batch allocation returns contiguous seqs
- **WHEN** `allocateUserSeqBatch(userId, 3)` is called and `Account.seq` is currently 10
- **THEN** `Account.seq` becomes 13 and the function returns `[11, 12, 13]`

#### Scenario: Zero-count is a no-op
- **WHEN** `allocateUserSeqBatch(userId, 0)` is called
- **THEN** the function returns `[]` and no DB write occurs

#### Scenario: Runs inside a provided transaction
- **WHEN** `allocateUserSeqBatch(userId, 2, tx)` is called with a transaction client
- **THEN** the DB write uses `tx` and participates in the caller's transaction boundary

### Requirement: Contiguous session message seqs during streaming
The socket streaming handler SHALL allocate session message seqs and user update seqs for all messages in a single flush as one atomic batch, so the seqs assigned to consecutive messages in a stream are contiguous integers with no gaps.

#### Scenario: Streaming burst produces contiguous seqs
- **WHEN** the daemon emits N messages for the same session in rapid succession
- **THEN** those N messages receive session seqs `k, k+1, …, k+N-1` with no gaps between them

#### Scenario: Single message is unaffected
- **WHEN** exactly one message arrives for a session
- **THEN** it receives exactly one seq, identical to current single-allocation behavior

### Requirement: Contiguous user update seqs in REST message creation
The `POST /v3/sessions/:sessionId/messages` handler SHALL allocate user update seqs for all created messages in a single `allocateUserSeqBatch` call within the existing transaction, replacing the per-message `allocateUserSeq` loop.

#### Scenario: Multi-message POST allocates user seqs in one call
- **WHEN** a POST body contains M messages and all are created successfully
- **THEN** exactly one `Account.seq` increment of size M occurs (not M increments of size 1)

#### Scenario: Transaction rollback releases seq reservation
- **WHEN** message creation fails mid-batch inside the transaction
- **THEN** the entire transaction rolls back including the seq increment, leaving no permanent gaps
