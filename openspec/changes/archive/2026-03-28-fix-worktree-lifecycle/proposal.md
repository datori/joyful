## Why

The worktree feature lets users spawn AI agent sessions in isolated git worktrees so multiple agents can work on the same repo in parallel without file conflicts. Creation works, but everything after creation is broken or missing: sessions leave orphaned worktrees and branches on deletion, there's no way to list or manage worktrees, and there's no mechanism to consolidate agent work back into the main branch. This makes the feature a liability — users silently accumulate gigabytes of orphaned checkouts and have no assisted path to merge results.

## What Changes

- **Worktree cleanup on session deletion**: Add `removeWorktree()` and `isWorktreePath()` utilities; call them before deleting a worktree session so the git worktree directory and its branch are removed
- **Branch cleanup**: Delete the worktree's git branch (`git branch -D`) after removing the worktree directory
- **Shell argument safety**: Quote/escape all dynamic values passed to `machineBash` git commands to prevent injection via paths containing shell metacharacters
- **Larger name pool**: Expand adjective/noun lists from 15×15 (225 combinations) to 50+×50+ (2500+) and add a random suffix fallback when all retries are exhausted
- **Gitignore seeding**: On first worktree creation in a user's repo, ensure `.dev/worktree/` is in the project's `.gitignore`
- **Worktree listing**: Add `listWorktrees()` utility using `git worktree list --porcelain` and expose it in the new-session wizard (pick existing worktree or create new)
- **Worktree management UI**: Show worktree branch, path, and status on the session info screen; add an orphan detection and cleanup action
- **Consolidation / merge-back**: Add a "Merge to main" action on worktree sessions that squash-merges the worktree branch into the base branch, with a diff preview and graceful conflict handling
- **Worktree-aware session metadata**: Add structured worktree fields to session metadata so the system can reason about worktree state beyond a raw path string

## Capabilities

### New Capabilities
- `worktree-lifecycle`: Covers worktree creation robustness (name generation, shell safety, gitignore seeding), cleanup on session deletion (worktree removal + branch deletion), and listing/reuse of existing worktrees
- `worktree-management-ui`: Session info worktree details panel, orphan detection and cleanup UI, worktree picker in new-session wizard
- `worktree-consolidation`: Merge-back action (squash-merge by default, optional regular merge), diff preview before merge, conflict detection and user guidance, post-merge cleanup of worktree and branch

### Modified Capabilities
<!-- No existing spec-level requirements are changing — this is all new capability -->

## Impact

- **joyful-app**: Primary package affected — new utilities in `sources/utils/`, UI changes in new-session wizard and session info screen, new hooks for worktree state
- **joyful-wire**: Optional addition of worktree metadata fields to session metadata types (non-breaking — new optional fields)
- **joyful-cli**: Minor — may need to surface worktree metadata in session metadata updates; profile `defaultSessionType` already exists
- **joyful-server**: No changes — server only relays encrypted blobs; worktree operations happen client-side via `machineBash` RPC
- **User repos**: `.dev/worktree/` added to `.gitignore` on first use; worktree directories created/removed in `.dev/worktree/`
