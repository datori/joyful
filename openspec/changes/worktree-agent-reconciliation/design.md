## Context

The merge screen (`merge.tsx`) currently handles two blocking pre-merge states:
- **Conflict state**: `git merge` failed with conflicting files
- **Spec divergence state**: main has new commits on `openspec/specs/` since the worktree branched

Both states leave the user with no good path forward inside the app. The manual resolution flow requires the user to leave the app entirely, use the terminal, and return. The existing "pull+resync" git operation on the divergence screen is opaque and risky.

The session view (`/session/[id]`) already supports an `initialMessage` URL param that pre-fills the input. Session sending uses `sync.sendMessage(sessionId, text)`, which works on any active session. Both of these are the building blocks for auto-send on navigate.

## Goals / Non-Goals

**Goals:**
- Add "Resolve with AI" action on the conflict screen → navigates to worktree session, auto-sends conflict resolution prompt
- Add "Sync specs with AI" action on the divergence screen → navigates to worktree session, auto-sends spec diff + update prompt
- Merge screen re-runs all prechecks on focus so retrying after agent work requires no extra action

**Non-Goals:**
- Polling or detecting when the agent finishes — the user navigates back manually when ready
- Auto-navigating back to the merge screen after the agent completes
- Changing the session send flow for any case other than this new auto-send path
- Modifying the CLI or server

## Decisions

### Auto-send via new `autoSendMessage` route param

The session route (`/session/[id]`) gains an `autoSendMessage` param alongside the existing `initialMessage`. When present, `SessionViewLoaded` calls `sync.sendMessage(sessionId, autoSendMessage)` in a `useEffect` on mount rather than pre-filling the input.

**Why not reuse `initialMessage`?** `initialMessage` semantics are "pre-fill and let user review". Auto-sending is meaningfully different (no user confirmation), so a separate param keeps the distinction explicit and avoids breaking the resume flow that already uses `initialMessage`.

**Why not call `sync.sendMessage` from `merge.tsx` before navigating?** Calling send before navigating means the message fires with no visible UI feedback. Calling it in the session view mount gives the user immediate visual confirmation the message was sent and the agent started.

### Conflict resolution strategy: merge main → worktree

The conflict resolution prompt instructs the agent to run `git merge main` inside the worktree branch. This resolves conflicts in the feature branch rather than in the base, which is the standard git workflow. After a clean resolution, the squash merge from worktree → main will proceed without conflicts.

**Alternative considered**: abort squash, use regular merge with conflict resolution in main. Rejected — puts conflict debris directly on the main branch.

### Spec divergence prompt includes the diff inline

The divergence screen already has the data from `detectSpecDivergence()` — the list of spec files changed on main since the branch point. The auto-send prompt includes `git diff {mergeBase}..main -- openspec/specs/` output inline so the agent has the full context without needing to run extra commands.

### Merge screen re-runs prechecks on every mount

`merge.tsx` already runs `loadMergeData()` in a `useEffect` on mount. Since the merge route is a stack screen, navigating away and back causes a fresh mount and re-runs all checks automatically. No `useFocusEffect` needed.

### Prompt template for conflict resolution

```
There are merge conflicts preventing this branch from merging into main.

Please resolve them:
1. Run: git merge main
2. Resolve conflicts in: {files}
3. Stage and commit the resolution

Reply "Ready to merge" when done so I know to return to the merge screen.
```

### Prompt template for spec reconciliation

```
The main branch has updated spec files since this branch was created. Please update the implementation to match before merging.

Spec changes on main:
{specDiff}

Review the changes, update the implementation in this branch to match the new requirements, and commit. Reply "Ready to merge" when done.
```

## Risks / Trade-offs

**[Risk] Auto-send fires if user navigates to session for unrelated reason** → Mitigation: the param is only set when navigating from the "Resolve with AI" / "Sync specs with AI" actions, not from normal session navigation. Route params are not persisted.

**[Risk] Session is not active when user taps action** → Mitigation: if `session.active` is false when the session view mounts with `autoSendMessage`, skip auto-send and fall back to pre-filling the input (same as `initialMessage`). The user can still send manually.

**[Risk] Spec diff is very large, producing an oversized prompt** → Mitigation: truncate diff output to 8000 characters with a `[truncated]` suffix; the agent can run `git diff` itself for full context.

**[Risk] Conflict prompt sends but user already resolved conflicts manually** → Low risk — the agent will simply find no conflicts and report that. Wasted agent turn but harmless.

## Open Questions

- Should the "Sync specs with AI" action replace the existing "pull+resync" git button or sit alongside it? (Current proposal: sit alongside as primary action; pull+resync becomes secondary.)
