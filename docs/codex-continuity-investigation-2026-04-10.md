# Codex Continuity Investigation

Date: 2026-04-10

This document consolidates the Codex continuity investigation across the existing unstaged work in this repository and the additional findings and fixes from April 10, 2026.

It is intended to answer four questions:

1. What failure did the user observe?
2. What has already been changed in the repo to diagnose or mitigate it?
3. What new root causes were confirmed on April 10?
4. What remains unresolved?

## User-Reported Symptom

The reported problem is that one Joyful session can appear to "randomly lose context" even though the Joyful chat continues uninterrupted. From the user's perspective:

- Joyful still shows a single ongoing session.
- Codex sometimes behaves as if it started fresh mid-conversation.
- This seems to happen more often when switching between devices, especially phone <-> desktop.
- The effort icon in the Joyful UI is sometimes wrong or flattened to the default line state.
- The problem is specific to Codex. The user does not report the same behavior with Claude Code.

The concrete IDs supplied during this investigation were:

- Initial Codex conversation/session ID from the Codex TUI: `<codex-session-id-a>`
- Joyful session ID from the UI: `<joyful-session-id>`
- Current Codex ID from the Joyful UI: `<codex-session-id-b>`

These IDs are important because they match both local Codex rollout files and Joyful daemon logs.

## Executive Summary

There is not one single continuity problem. There are at least three distinct failure modes:

### 1. Weak Codex provider lineage

Codex often exposes a provider `sessionId`, but does not always expose a distinct `conversationId`. In many observed cases the useful lineage value appears as `thread_id` instead. Earlier repo work already addressed this by:

- extracting lineage from `thread_id` / `threadId`
- persisting `codexSessionId` and `codexConversationId`
- warning when Joyful must synthesize conversation lineage from the session id

This reduced ambiguity, but it did not eliminate resets.

### 2. Joyful can intentionally restart the underlying Codex provider session while keeping the same Joyful session

`runCodex.ts` groups queued messages by a mode hash that includes:

- permission mode
- model
- effort level

If that hash changes, Joyful intentionally clears the current provider session and starts a new one. That behavior is not inherently wrong, but it means one Joyful session can legitimately span multiple Codex provider sessions. If that restart is not obvious to the user, it looks like random amnesia.

### 3. Cross-device mode drift was causing false Codex restarts

This was the major new finding on April 10.

The Joyful session UI already resolved current mode from several sources, including metadata fallbacks:

- `session.permissionMode` or `metadata.currentOperatingModeCode`
- `session.modelMode` or `metadata.currentModelCode`
- `session.effortLevel` or `metadata.currentThoughtLevelCode`

But the outgoing message path did not use the same fallback logic. It only used the raw synced session fields. That means:

- one device could display the active Codex mode correctly
- another device could send the next message with different mode values
- Joyful would compute a new mode hash
- Joyful would restart Codex
- the user would experience a context reset

This is the most convincing explanation for the user's "switching platforms causes context loss" report.

### 4. Archived Codex resume plumbing was partially implemented but broken in the machine RPC bridge

The app-side archived-session resume flow and daemon-side spawn flow were already prepared to carry:

- `resumeCodexSessionId`
- `resumeCodexConversationId`

But `packages/joyful-cli/src/api/apiMachine.ts` was dropping those fields before invoking `spawnSession`. That meant Joyful could appear to support archived Codex resume while actually starting a fresh provider session.

This was confirmed and fixed on April 10.

## Evidence Collected

## 1. Codex rollout evidence

The following rollout file exists locally:

- `~/.codex/sessions/2026/04/10/rollout-<timestamp>-<codex-session-id-b>.jsonl`

That rollout contains the user prompt:

- `Conversation status?`

and Codex responds as if it is in a fresh session:

- `No active task yet in this session...`

That is not the response expected from a resumed, context-rich continuation.

## 2. Joyful daemon evidence

The strongest daemon-side evidence is in:

- `~/.joyful-dev/logs/<timestamp>-pid-<pid>.log`

This log shows:

- `Mode changed – restarting Codex session`
- the prior provider session being cleared
- a new Codex provider session starting
- the next prompt being answered in a fresh-context way

This confirms that a single Joyful session can span multiple underlying Codex sessions.

## 3. Historical lineage evidence

Earlier logs showed a consistent pattern where:

- `codexSessionId` existed
- `codexConversationId` was often `null`
- Codex later emitted `thread_id`
- sometimes `thread_id` matched `session_id`

This is why the earlier repo work expanded lineage extraction and warnings around session-only lineage.

## 4. UI consistency evidence

The app already used metadata fallback logic for displaying the current Codex mode in:

- `packages/joyful-app/sources/-session/SessionView.tsx`

But outgoing message metadata did not use that same fallback logic in:

- `packages/joyful-app/sources/sync/messageMeta.ts`

This asymmetry is a direct explanation for cross-device mode drift.

## Existing Unstaged Work Before April 10

The repository already contained substantial continuity-related changes before the April 10 fixes. Those changes were mostly in three categories.

### 1. Better provider lineage extraction and diagnostics

Files:

- `packages/joyful-cli/src/codex/codexMcpClient.ts`
- `packages/joyful-cli/src/codex/__tests__/codexMcpClient.test.ts`

What this work does:

- extracts identifiers from top-level payloads, nested `meta`, nested `data`, and `structuredContent`
- treats `thread_id` / `threadId` as conversation lineage when `conversationId` is absent
- logs when Joyful continues with synthesized lineage derived from the provider session id
- logs lineage state after `startSession()` and `continueSession()`
- strips inherited Codex lineage environment variables before launching Codex:
  - `CODEX_THREAD_ID`
  - `CODEX_SESSION_ID`
  - `CODEX_CONVERSATION_ID`

Why it matters:

- it improves observability
- it reduces false continuity caused by stale inherited environment state
- it makes "Codex never gave us a conversation id" visible in logs instead of silent

### 2. Archived session resume plumbing for Codex

Files:

- `packages/joyful-app/sources/-session/SessionView.tsx`
- `packages/joyful-app/sources/sync/ops.ts`
- `packages/joyful-cli/src/modules/common/registerCommonHandlers.ts`
- `packages/joyful-cli/src/daemon/run.ts`

What this work does:

- allows archived Codex sessions to be resumed using provider lineage
- carries `resumeCodexSessionId` and `resumeCodexConversationId` from the app to the daemon
- seeds daemon-spawned Codex processes with:
  - `JOYFUL_CODEX_RESUME_SESSION_ID`
  - `JOYFUL_CODEX_RESUME_CONVERSATION_ID`
- reads those env vars in `runCodex.ts` and seeds the new Joyful session metadata with provider lineage

Why it matters:

- this is the foundation for "resume archived Codex session into a new Joyful session"
- without this, resume always degenerates into a fresh provider session

### 3. Better continuity status surfaced in the app

Files:

- `packages/joyful-app/sources/app/(app)/session/[id]/info.tsx`
- `packages/joyful-app/sources/sync/storageTypes.ts`
- `packages/joyful-cli/src/api/types.ts`

What this work does:

- exposes `codexSessionId` and `codexConversationId` on the session info screen
- adds `codexContinuityNote` metadata
- allows continuity diagnostics to be visible in the mobile UI instead of only in logs

Why it matters:

- it makes real-world reproduction easier
- it lets users compare Joyful session ids and provider ids directly

### 4. More defensive transcript-replay and recovery machinery

Files:

- `packages/joyful-cli/src/codex/runCodex.ts`
- `packages/joyful-cli/src/codex/runCodex.helpers.ts`
- `packages/joyful-cli/src/codex/__tests__/emitReadyIfIdle.test.ts`

What this work does:

- adds explicit context strategy logging:
  - `in_process_continue`
  - `persisted_ids_continue`
  - `transcript_resume`
  - `fresh_start`
- adds idle transcript replay helpers
- improves abort recovery and session recovery logic
- records `codexContinuityNote` when Joyful abandons provider continuity and replays a transcript instead

Why it matters:

- it explains why continuity was lost
- it distinguishes provider reuse from transcript replay
- it makes "fresh provider session hidden behind same Joyful session" diagnosable

## New Confirmed Findings From April 10

## 1. The machine RPC bridge was dropping Codex resume identifiers

Confirmed in:

- `packages/joyful-cli/src/api/apiMachine.ts`

Problem:

- app-side code could send `resumeCodexSessionId` and `resumeCodexConversationId`
- daemon-side code could consume them
- but the machine RPC bridge silently discarded them

Impact:

- archived Codex resume could look wired up in the app
- daemon spawn could still start a fresh Codex provider session

Fix:

- `apiMachine.ts` now forwards both fields
- regression test added in `packages/joyful-cli/src/api/apiMachine.test.ts`

## 2. Cross-device mode resolution was inconsistent

Confirmed in:

- `packages/joyful-app/sources/-session/SessionView.tsx`
- `packages/joyful-app/sources/sync/messageMeta.ts`

Problem:

- UI display path used metadata fallbacks
- outgoing message path did not

Impact:

- the same Codex session could render as one mode on one device
- but send the next message using a different mode on another device
- `runCodex.ts` would detect a mode-hash change
- Codex would restart

Fix:

- `resolveMessageModeMeta()` now falls back to:
  - `metadata.currentOperatingModeCode`
  - `metadata.currentModelCode`
  - `metadata.currentThoughtLevelCode`
- tests added in `packages/joyful-app/sources/sync/messageMeta.test.ts`

This is the strongest explanation for the user's phone/desktop switching report.

## 3. Codex was not publishing current mode metadata as consistently as Claude

Confirmed by comparing:

- `packages/joyful-cli/src/claude/claudeRemoteLauncher.ts`
- `packages/joyful-cli/src/codex/runCodex.ts`

Problem:

- Claude explicitly publishes `models`, `thoughtLevels`, and the current model/effort codes into session metadata
- Codex had weaker metadata publication

Impact:

- the Joyful UI could fall back to default-looking mode state
- effort icon rendering could be inconsistent
- cross-device restoration had less reliable mode context

Fix:

- `runCodex.helpers.ts` now contains `mergeCodexSessionConfigIntoMetadata()`
- `runCodex.ts` now syncs Codex mode/model/effort options and current selections into session metadata
- tests were added in `packages/joyful-cli/src/codex/__tests__/emitReadyIfIdle.test.ts`

This does not prove that all effort-icon issues are solved, but it closes an obvious parity gap between Claude and Codex.

## How The Current Continuity Chain Works

The intended continuity path is now:

1. Joyful app stores and displays provider lineage:
   - `codexSessionId`
   - `codexConversationId`

2. Archived-session resume or provider-resume requests carry lineage through app RPC:
   - `machineSpawnNewSession()`

3. Machine RPC bridge forwards those values:
   - `packages/joyful-cli/src/api/apiMachine.ts`

4. Daemon spawn seeds the agent process environment:
   - `JOYFUL_CODEX_RESUME_SESSION_ID`
   - `JOYFUL_CODEX_RESUME_CONVERSATION_ID`

5. `runCodex.ts` reads those values and seeds Joyful session metadata

6. `CodexMcpClient` hydrates persisted lineage and attempts:
   - provider-id continuation
   - transcript replay when provider continuity is unavailable or unsafe

7. Joyful logs which continuity strategy was actually used

That is the correct architecture. The issues found in this investigation were not that the architecture was impossible, but that specific handoff layers were incomplete or inconsistent.

## Why This Mostly Affects Codex, Not Claude

The user explicitly noted that this is a Codex-specific problem.

That matches the codebase:

- Claude has a more mature native session id contract.
- Claude publishes model/effort metadata more consistently.
- Codex continuity depends on provider session/thread lineage that is less stable and sometimes only partially reported.
- Joyful's Codex path had extra fallback behavior such as:
  - synthesized conversation lineage
  - transcript replay
  - provider-session restarts on mode changes

Those differences make Codex more vulnerable to cross-device or mid-session ambiguity.

## Remaining Risks And Open Questions

The following are still not fully resolved.

### 1. Provider semantic continuity is still not guaranteed

Even if Joyful reuses the right provider identifiers, Codex may still behave as if context is weak or absent after long idle periods. Joyful can now distinguish this case better, but it cannot force the provider to retain semantic memory.

### 2. `thread_id` and `session_id` are sometimes the same value

That may be valid provider behavior, but it weakens the distinction between "session lineage exists" and "conversation lineage exists".

### 3. Some mode changes are legitimate and still restart Codex

Joyful intentionally restarts Codex when the effective mode hash changes. That is still expected behavior. The remaining UX question is whether the app should surface that more explicitly so a user understands that the provider session was rotated.

### 4. Effort icon inconsistencies may still have provider-side causes

The metadata publication gap has been closed, but if Codex internally chooses defaults without explicitly reporting them, the UI can still only display what Joyful knows.

## Files Most Relevant To Future Debugging

If this issue resurfaces, start with these files:

- `packages/joyful-cli/src/codex/codexMcpClient.ts`
- `packages/joyful-cli/src/codex/runCodex.ts`
- `packages/joyful-cli/src/codex/runCodex.helpers.ts`
- `packages/joyful-cli/src/api/apiMachine.ts`
- `packages/joyful-cli/src/daemon/run.ts`
- `packages/joyful-app/sources/sync/messageMeta.ts`
- `packages/joyful-app/sources/-session/SessionView.tsx`
- `packages/joyful-app/sources/app/(app)/session/[id]/info.tsx`

And these logs:

- `~/.joyful-dev/logs/...`
- `~/.codex/sessions/...`

Look specifically for:

- `Mode changed – restarting Codex session`
- `context_strategy=...`
- `Continuing with synthesized conversation lineage`
- `Response did not include conversation/thread lineage`
- `Provider continuity was abandoned in favor of transcript replay`

## Verification Completed For The April 10 Changes

The following focused tests passed after the April 10 fixes:

- `yarn workspace joyful-app vitest run sources/sync/messageMeta.test.ts`
- `yarn workspace joyful vitest run src/codex/__tests__/emitReadyIfIdle.test.ts src/api/apiMachine.test.ts`

## Practical Conclusion

The original user report was valid.

The confusing experience was not just "Codex being flaky." Joyful had real continuity bugs and asymmetries:

- one missing machine-RPC pass-through for Codex resume ids
- one confirmed cross-device mode-resolution mismatch
- weaker Codex metadata publication than Claude

On top of that, Codex provider lineage itself remains less robust than Claude's, which is why earlier instrumentation, transcript replay, and continuity-note work was also justified.

The current repo state is materially better than before this investigation:

- provider lineage extraction is broader
- stale inherited lineage env vars are scrubbed
- archived Codex resume plumbing now reaches the daemon correctly
- cross-device mode resolution is aligned between UI and outgoing messages
- Codex now publishes more useful mode/model/effort metadata
- continuity failures are more visible in both logs and the session info screen

What remains is mostly product hardening and provider-behavior validation, not basic missing plumbing.
