# Codex Continuity Fixes

Date: 2026-04-09

Note: This was the original narrow fix note from April 9. For the consolidated April 9-10 investigation, confirmed root causes, and current repo status, see `docs/codex-continuity-investigation-2026-04-10.md`.

## Background

Joyful already logged Codex continuity strategy decisions, but the observed failure mode could still slip through:

- Joyful could choose a reuse strategy and successfully call `codex-reply`.
- Codex could still behave as if prior context were missing.
- The existing logs mostly recorded Joyful's transport strategy, not whether Codex returned usable lineage identifiers.

During investigation of the live dev stack, the most relevant findings were:

- Live logs consistently showed `sessionId`, but `conversationId` was often `null`.
- Codex MCP event payloads included `thread_id` values that were not being treated as conversation lineage.
- Joyful silently fell back to `conversationId ?? sessionId` when continuing a Codex session.
- The app/server metadata path did not appear to be dropping `codexConversationId`; the weak point was the CLI/provider boundary.
- Joyful was forwarding inherited process environment variables into the Codex subprocess, which left room for stale lineage env vars such as `CODEX_THREAD_ID` to contaminate a new Joyful-managed Codex session.
- Repeated quota failures in the daemon were coming from Anthropic quota fetches, not from OpenAI/Codex continuity paths.

## Changes Applied

### 1. Broader Codex lineage extraction

Updated the Codex MCP client to treat `thread_id` / `threadId` as valid conversation lineage when `conversationId` is absent.

The client now extracts identifiers from:

- top-level response objects
- nested `meta`
- nested `data`
- nested `structuredContent`
- response content items
- MCP event payloads

This closes the most obvious extraction gap from the live logs, where Codex emitted `thread_id` but Joyful persisted `conversationId: null`.

### 2. Explicit warnings for synthesized lineage

Joyful already continued with `conversationId ?? sessionId`, but that fallback was silent.

Added warnings in two places:

- `CodexMcpClient.continueSession()` now warns when it has to synthesize conversation lineage from `sessionId`.
- `runCodex()` now warns when a continue strategy is being used while the active Codex lineage is still session-only.

This makes the risky case visible in logs even when the transport-level strategy still looks successful.

### 3. Post-response lineage diagnostics

After `startSession()` and `continueSession()`, the Codex MCP client now logs whether the response actually established conversation/thread lineage.

That gives a direct signal for the previously missing distinction:

- strategy succeeded
- but provider lineage is still incomplete

### 4. Session Info diagnostics in the app

The session info screen now exposes persisted:

- `codexSessionId`
- `codexConversationId`

Both are copyable, matching the existing Claude session diagnostics pattern. This makes it much easier to verify what lineage Joyful actually persisted for a real session without digging through logs.

### 5. Codex subprocess environment sanitization

Joyful now strips inherited Codex lineage environment variables before launching the Codex MCP subprocess.

Specifically, Joyful removes:

- `CODEX_THREAD_ID`
- `CODEX_SESSION_ID`
- `CODEX_CONVERSATION_ID`

This matters because a stale inherited thread id can cause Joyful and the underlying Codex CLI to disagree about which conversation lineage is active. That is a strong candidate explanation for sessions that look continuous from Joyful's perspective but behave like a different or forgotten Codex conversation.

## Why This Is the Right First Fix

These changes are intentionally narrow:

- no protocol changes
- no server persistence changes
- no daemon behavior changes
- no resume-strategy rewrite

They address the strongest concrete issue found in the investigation:

- Joyful was not extracting all lineage identifiers that Codex already appears to emit.

They also improve observability around the remaining uncertainty:

- whether a nominally successful `codex-reply` actually preserves semantic conversation continuity after long idle periods

## Remaining Risk

This patch improves extraction and diagnostics, but it does not prove semantic continuity by itself.

If Codex sometimes accepts reused ids while still losing conversational memory after long idle windows, the next likely step would be a deeper continuity probe or a stricter provider-lineage contract. This patch is the right precursor because it makes those failures easier to distinguish from Joyful-side identifier loss.

## Related Finding: Quota Errors

The repeated quota failures observed during investigation are separate from the continuity issue.

- They come from Joyful's Anthropic quota fetch path.
- The daemon reads `~/.claude/.credentials.json`.
- It calls Anthropic's `POST /v1/messages` endpoint to inspect rate-limit headers.
- The logged `401` failures indicate an invalid or expired Claude credential, not an OpenAI/Codex problem.

No changes were made to that path in this patch.
