## Context

The worktree feature is an experimental capability gated behind `experimentsEnabled` that allows users to spawn AI agent sessions in isolated git worktrees. Currently:

- **Creation works**: `createWorktree()` in `joyful-app/sources/utils/createWorktree.ts` generates a name, validates the repo, and runs `git worktree add -b {name} .dev/worktree/{name}` via `machineBash` RPC to the daemon.
- **Everything after creation is missing**: No cleanup on session deletion, no branch cleanup, no listing, no management UI, no merge-back mechanism.
- **happy-app upstream has partial fixes** (worktree removal, `isWorktreePath` marker check) that were never ported to joyful-app.
- All worktree operations are **client-side** (app → machineBash RPC → daemon executes git commands). The server never sees worktree state — it only stores encrypted session metadata blobs.

Key constraint: worktree operations execute on **remote machines** via the `machineBash` RPC. There is no local git access — every git command is a shell string sent over the wire to the daemon.

## Goals / Non-Goals

**Goals:**
- Prevent orphaned worktree directories and branches from accumulating
- Provide users visibility into worktree state (listing, status, branch info)
- Offer a guided merge-back path so agent work can be consolidated into the main branch
- Make the name generation robust enough for heavy use
- Ensure shell safety for all git commands executed via `machineBash`

**Non-Goals:**
- Automatic conflict resolution — conflicts require human judgment; we surface them, not solve them
- Server-side worktree awareness — the server remains encryption-blind; worktree metadata lives in encrypted session metadata
- Rebase workflows — squash-merge and regular merge only; rebase is too complex for a one-button UI
- Multi-repo worktree support — worktrees are scoped to a single git repository per session

## Decisions

### 1. Consolidate into a single `worktree.ts` utility module

**Decision**: Merge `createWorktree.ts` and `generateWorktreeName.ts` into a single `sources/utils/worktree.ts` file, adding `removeWorktree()`, `isWorktreePath()`, `listWorktrees()`, and `mergeWorktree()`.

**Why**: Single module for all worktree operations reduces import scatter and makes the lifecycle cohesive. Matches the pattern happy-app upstream adopted.

**Alternative considered**: Keep separate files per function. Rejected because these functions share constants (`WORKTREE_PATH_MARKER`, directory conventions) and are always used in related flows.

### 2. Shell-escape via template literal quoting

**Decision**: Wrap all dynamic values in single quotes with internal single-quote escaping (`'${val.replace(/'/g, "'\\''")}'`) when constructing shell commands for `machineBash`.

**Why**: Paths can contain spaces, parentheses, and other shell metacharacters. The current code passes `basePath` unquoted into `git worktree add -b ${name} ${worktreePath}`. While `name` comes from a hardcoded word list, `basePath` comes from user-selected directories.

**Alternative considered**: A proper shell-escape library. Rejected because we can't install packages on the daemon side — we're constructing strings in the app that get sent verbatim. A simple quoting function in `worktree.ts` is sufficient and auditable.

### 3. Name generation: expand lists + random suffix fallback

**Decision**: Expand to 50 adjectives × 50 nouns (2,500 base names). If the base name and 3 numbered retries all fail, append a 4-character random hex suffix (e.g., `clever-ocean-a3f1`) for a final attempt before failing.

**Why**: 225 names is too small for users running many parallel agents across sessions. 2,500 base names with a hex fallback makes collisions effectively impossible in practice.

**Alternative considered**: Use timestamps (e.g., `2024-03-28-clever-ocean`). Rejected because timestamp-prefixed names are less human-friendly and harder to reference in conversation.

### 4. Best-effort cleanup with user-visible fallback

**Decision**: On session deletion, attempt `git worktree remove --force` then `git branch -D`. If either fails, log the error but still delete the session. Show a non-blocking warning to the user ("Worktree cleanup failed — you may need to manually remove .dev/worktree/X").

**Why**: Cleanup failure shouldn't block session deletion. The user may have already manually deleted the worktree, the machine may be offline, or the branch may have been merged. Blocking on cleanup would make the delete button unreliable.

**Alternative considered**: Require cleanup success before allowing session deletion. Rejected because it makes deletion fragile and blocks on network/machine availability.

### 5. Squash-merge as default consolidation strategy

**Decision**: The "Merge to main" action performs `git merge --squash {branch}` from the base branch, followed by `git commit -m "..."`. Users can opt into regular merge (non-squash) via a toggle.

**Why**: AI agents produce noisy commit histories (incremental attempts, backtracking, self-corrections). Squash-merge produces one clean commit per agent task, which is easy to review and easy to revert. Regular merge is available for users who want the full granular history.

**Alternative considered**: Rebase-then-merge for linear history. Rejected because rebase can fail interactively on conflicts and requires a more complex UI (conflict-per-commit resolution). Squash-merge surfaces all conflicts in one step.

### 6. Diff preview via `git diff` before merge

**Decision**: Before executing the merge, show the user a summary of changes using `git diff --stat {base}...{branch}` (file list with insertions/deletions) and the total commit count. A "View full diff" option shows `git diff {base}...{branch}` in a scrollable code view.

**Why**: Users need to understand what the agent produced before merging it into their main branch. The stat view gives a quick overview; the full diff is available for thorough review.

### 7. Worktree metadata in session metadata (encrypted)

**Decision**: Add an optional `worktree` field to the session metadata object (the encrypted blob stored server-side): `{ branchName: string, baseRepoPath: string, isWorktree: true }`. The worktree path is already stored as the session's `path` field.

**Why**: Currently the only way to know if a session is a worktree session is to check if its path contains `/.dev/worktree/`. Explicit metadata allows the UI to show branch info without re-parsing paths, and allows future features (like branch status polling) to work reliably.

**Alternative considered**: Store in a separate worktree tracking table on the server. Rejected because the server is encryption-blind — it would need to be a new encrypted field anyway, and session metadata already exists for this purpose.

### 8. OpenSpec-aware merge: detect divergence, pull-then-resync

**Decision**: The merge-back flow is OpenSpec-aware in two lightweight ways:

1. **Unarchived change detection**: Before merging, scan `openspec/changes/` (excluding `.archive/`) in the worktree. If unarchived changes are found, warn the user and recommend archiving before merging. This ensures delta specs are synced into the worktree's local `openspec/specs/` before the merge lands on main.

2. **Spec divergence detection + pull-first offer**: Before merging, compare `openspec/specs/` between the worktree branch's merge-base and main's current HEAD. If main's specs have advanced (another worktree already merged), the squash-merge will conflict on spec files. Instead of attempting programmatic delta re-application, the flow offers to **pull main into the worktree branch first**. This makes the worktree's specs current, at which point the user runs `/opsx:sync` to reconcile the delta against the now-current specs — leveraging the existing LLM-powered sync mechanism rather than replicating it. After that, the squash-merge proceeds cleanly.

The concrete flow when divergence is detected:
```
1. Warn: "openspec/specs/ has diverged from main — merging now would conflict."
2. Offer: "Pull main into this worktree branch and re-sync?"
3. If confirmed:
   a. git merge main → into the worktree branch
   b. Prompt user to run /opsx:sync if spec conflicts remain
   c. After sync, proceed with squash-merge to main → clean
4. If declined: proceed with merge (user accepts potential spec conflicts)
```

**Why not programmatic delta re-application**: Spec reconciliation isn't a text-patching problem — it requires understanding whether two changes to the same requirement are compatible. The LLM-powered `/opsx:sync` already does this well. Replicating it programmatically would be fragile and would still fall back to human judgment for the interesting cases.

**Why not just warn and stop**: The pull-then-resync path is automatable and covers the majority case (non-overlapping changes to the same spec file). Offering it as a one-tap action removes friction without overstepping.

### 9. Gitignore seeding on first worktree creation

**Decision**: Before creating the first worktree, check if `.dev/worktree/` appears in the repo's `.gitignore`. If not, append `\n# Joyful worktrees\n.dev/worktree/\n` to the existing `.gitignore` (or create one if absent).

**Why**: Without this, users will see the entire worktree checkout as untracked files in their git status. This is a very common source of confusion.

**Alternative considered**: Use `.dev/` as the gitignore pattern. Rejected because users may use `.dev/` for other purposes — we should only ignore our specific subdirectory.

## Risks / Trade-offs

**[Force removal destroys uncommitted work]** → The `--force` flag on `git worktree remove` will destroy uncommitted changes. Mitigation: the merge-back action checks for uncommitted changes before proceeding and warns the user. Session deletion warns that uncommitted work will be lost.

**[Offline machine blocks worktree operations]** → All git commands run via `machineBash` RPC, requiring the machine's daemon to be online. Mitigation: the session deletion still succeeds (deletes server-side session) even if worktree cleanup fails. The orphaned worktree persists but the session is cleaned up.

**[Merge conflicts cannot be resolved in-app]** → If squash-merge encounters conflicts, the app cannot provide an interactive conflict resolution UI. Mitigation: detect conflicts before committing, abort the merge, and show the user a clear message listing conflicting files with instructions to resolve manually in the terminal.

**[Race condition: session active during cleanup]** → If the agent is still running when the user deletes the session, `git worktree remove --force` could corrupt the agent's working state. Mitigation: only allow worktree deletion when the session is not active (already enforced — delete button only shows for inactive sessions).

**[Branch name collision across repos]** → Two different repos could have worktrees with the same branch name. This is fine — branch names are local to each repository.

**[Spec divergence after pull-then-resync may still conflict]** → If two worktrees modified the same requirement in the same spec, pulling main and re-running `/opsx:sync` will surface the conflict to the LLM/user rather than silently applying both. This is the correct behavior — semantic conflicts require judgment, not automation.
