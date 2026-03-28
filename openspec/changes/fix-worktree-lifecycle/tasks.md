## 1. Core Worktree Utility Module

- [x] 1.1 Create `sources/utils/worktree.ts` with `WORKTREE_PATH_MARKER` constant, `isWorktreePath()`, `shellQuote()` helper, and move `generateWorktreeName()` (with expanded 50×50 word lists + hex fallback) into it
- [x] 1.2 Move `createWorktree()` into `worktree.ts`, apply `shellQuote()` to all dynamic values in git commands, and add gitignore seeding logic (check/append `.dev/worktree/` to repo `.gitignore`)
- [x] 1.3 Add `removeWorktree(machineId, worktreePath)` that extracts base path from worktree marker, runs `git worktree remove --force`, then `git branch -D`, with shell-quoted arguments
- [x] 1.4 Add `listWorktrees(machineId, basePath)` that runs `git worktree list --porcelain` and parses output into `{ path, branch, isMain }[]`
- [x] 1.5 Delete old `createWorktree.ts` and `generateWorktreeName.ts`, update all imports to use `@/utils/worktree`

## 2. Session Deletion Cleanup

- [x] 2.1 In `session/[id]/info.tsx`, update `performDelete` to call `removeWorktree()` (best-effort with `.catch()`) before `sessionDelete()` when `isWorktreePath(session.metadata?.path)` is true
- [x] 2.2 Add non-blocking warning toast/message when worktree cleanup fails during session deletion

## 3. Worktree Metadata

- [x] 3.1 Add optional `worktree?: { branchName: string, baseRepoPath: string, isWorktree: true }` field to session metadata type in `sync/storageTypes.ts`
- [x] 3.2 Update session creation in `new/index.tsx` to populate `worktree` metadata field when creating a worktree session (branch name from `createWorktree` result, base repo path from selected path)

## 4. Worktree Picker in New Session Wizard

- [x] 4.1 Create `useWorktreeList` hook that calls `listWorktrees()` when session type is 'worktree' and a machine+path are selected, returning the worktree list with loading state
- [x] 4.2 Create `WorktreePicker` component showing existing worktrees (branch name + path) plus "Create new" option, using `ItemList` and `Item` components
- [x] 4.3 Integrate `WorktreePicker` into `NewSessionWizard` — show after path selection when session type is 'worktree' and existing worktrees are found; skip picker and create new when none exist
- [x] 4.4 When user picks an existing worktree, use its path directly (skip `createWorktree()`); when user picks "Create new", run the existing creation flow

## 5. Session Info Worktree Details

- [x] 5.1 Add worktree details section to `session/[id]/info.tsx` showing branch name, worktree path, and base repo path — visible only when session has worktree metadata or `isWorktreePath(path)` is true
- [x] 5.2 Add i18n strings for worktree UI across all 9+ language files (branch, worktree path, base repo, merge actions, cleanup messages, warnings)

## 6. Orphan Detection and Cleanup

- [x] 6.1 Create `useOrphanWorktrees` hook that compares `listWorktrees()` output against active session paths to identify worktrees with no associated session
- [x] 6.2 Add orphan indicator in worktree picker (e.g., "No active session" label on orphaned entries)
- [x] 6.3 Add "Clean up" action per orphaned worktree and "Clean up all" batch action, calling `removeWorktree()` for each with progress feedback
- [x] 6.4 Before cleaning orphans, check for uncommitted changes via `git -C {path} status --porcelain` and show warning if dirty

## 7. Merge-Back / Consolidation

- [x] 7.1 Add `mergeWorktree(machineId, basePath, branchName, options: { squash: boolean, commitMessage: string })` to `worktree.ts` that checks for uncommitted changes in both worktree and base, then executes merge sequence
- [x] 7.2 Add `getWorktreeDiffStat(machineId, basePath, branchName)` to `worktree.ts` that returns `git diff --stat` and commit count for the branch
- [x] 7.3 Create `MergePreview` component showing diff stat (files changed, insertions, deletions), commit count, and a toggle for squash vs regular merge
- [x] 7.4 Create `MergeWorktreeModal` that orchestrates the flow: preview → confirm → execute → show result (success or conflict list)
- [x] 7.5 Add "Merge to main" button on session info screen for inactive worktree sessions, launching `MergeWorktreeModal`
- [x] 7.6 Handle merge conflicts: detect via exit code, run `git merge --abort`, show conflicting file list with manual resolution instructions
- [x] 7.7 After successful merge, prompt to clean up worktree+branch; if confirmed, call `removeWorktree()`

## 8. OpenSpec-Aware Merge

- [x] 8.1 Add `detectUnarchivedChanges(machineId, worktreePath)` that runs `ls openspec/changes/` (excluding `.archive/`) and returns a list of unarchived change names; used in pre-merge check
- [x] 8.2 Add pre-merge warning in `MergeWorktreeModal`: if unarchived changes found, show warning listing change names with "Archive first (recommended)" and "Proceed anyway" options
- [x] 8.3 Add `detectSpecDivergence(machineId, basePath, worktreeBranch)` that runs `git log {mergeBase}..main -- openspec/specs/` to check if main has new commits touching spec files since the worktree branched
- [x] 8.4 Add spec divergence warning in `MergeWorktreeModal`: if divergence detected, explain the risk and offer "Pull main + re-sync" (runs `git merge main` in the worktree branch) and "Merge anyway" options
- [x] 8.5 Add i18n strings for OpenSpec merge warnings (unarchived changes, spec divergence, pull-resync prompt) across all 9 language files

## 9. Typecheck and Verification

- [x] 9.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
- [ ] 9.2 Manually verify worktree creation, listing, session deletion cleanup, and merge flow against the dev stack
- [ ] 9.3 Test spec divergence path: create two worktrees, archive a change in each touching the same spec, merge first, then attempt to merge second — verify divergence is detected and pull-resync flow is offered
