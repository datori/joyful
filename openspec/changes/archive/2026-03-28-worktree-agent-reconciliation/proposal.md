## Why

The worktree merge screen currently leaves users stranded when merge conflicts or spec divergence are detected — the only options are manual git resolution or proceeding blindly. Since sessions already have full project context, the natural resolution path is to resume the existing worktree session with a targeted prompt, letting the agent do the work while the user stays in the app.

## What Changes

- When a merge conflict is detected, the conflict screen gains a **"Resolve with AI"** action that resumes the worktree session pre-filled with a conflict resolution prompt instructing the agent to merge main into the worktree branch and resolve the conflicts there.
- When spec divergence is detected, the divergence screen gains a **"Sync specs with AI"** action that resumes the worktree session pre-filled with a prompt containing the spec diff and instructions to update the implementation to match.
- In both cases, the user is navigated to the session view to watch the agent work. The merge screen re-runs all prechecks when it comes back into focus, so the user simply navigates back to retry once the agent signals it's done.
- The pre-filled prompt is surfaced as a draft message in the session input (visible and editable before sending), not auto-sent.

## Capabilities

### New Capabilities
- `worktree-conflict-resolution`: "Resolve with AI" action on the merge conflict screen — resumes the worktree session with a pre-filled prompt describing the conflicting files and instructing the agent to merge main into the worktree branch, resolve conflicts, and commit.
- `worktree-spec-reconciliation`: "Sync specs with AI" action on the spec divergence screen — resumes the worktree session with a pre-filled prompt containing the spec diff and instructing the agent to update its implementation to match the current specs on main.

### Modified Capabilities
- `worktree-merge`: The merge screen's conflict and spec-divergence states each gain a new primary action. The spec divergence "pull+resync" git operation remains as a secondary option alongside the new AI action.

## Impact

- `packages/joyful-app/sources/app/(app)/session/[id]/merge.tsx` — new actions on conflict and divergence step states; navigation to session view with pre-fill param
- `packages/joyful-app/sources/-session/SessionView.tsx` — needs to accept and surface a pre-fill query param as a draft message in the input
- `packages/joyful-app/sources/app/(app)/_layout.tsx` — no route changes needed; session route already exists
- `packages/joyful-app/sources/text/_default.ts` (+ 9 translations) — new strings for both new actions and their prompts
- No server, CLI, or wire changes required
