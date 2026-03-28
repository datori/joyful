## ADDED Requirements

### Requirement: Merge-back action on worktree sessions
The session info screen SHALL provide a "Merge to main" action for worktree sessions that consolidates the worktree branch into the base branch.

#### Scenario: Merge action visibility
- **WHEN** a user views the info screen for an inactive worktree session that has commits ahead of the base branch
- **THEN** a "Merge to main" button SHALL be displayed

#### Scenario: Merge action hidden for simple sessions
- **WHEN** a user views the info screen for a non-worktree session
- **THEN** no merge action SHALL be displayed

#### Scenario: Merge action hidden for active sessions
- **WHEN** a user views the info screen for an active worktree session (agent still running)
- **THEN** the merge action SHALL be disabled or hidden to prevent merging incomplete work

### Requirement: Squash-merge as default consolidation strategy
The merge action SHALL default to squash-merge, producing a single commit on the base branch that combines all changes from the worktree branch.

#### Scenario: Successful squash merge
- **WHEN** the user confirms a squash merge with no conflicts
- **THEN** the system SHALL execute `git checkout {baseBranch}` then `git merge --squash {worktreeBranch}` then `git commit -m "{message}"` on the machine
- **AND** the commit message SHALL default to a summary referencing the session (e.g., "Agent task: {session prompt summary}")

#### Scenario: User opts for regular merge
- **WHEN** the user toggles to "Regular merge" mode before confirming
- **THEN** the system SHALL execute `git checkout {baseBranch}` then `git merge {worktreeBranch}` (preserving full commit history)

### Requirement: Diff preview before merge
Before executing a merge, the system SHALL show the user a summary of changes that will be merged.

#### Scenario: Diff stat preview
- **WHEN** the user taps "Merge to main"
- **THEN** the system SHALL display the output of `git diff --stat {baseBranch}...{worktreeBranch}` showing files changed, insertions, and deletions
- **AND** show the total number of commits on the worktree branch

#### Scenario: Full diff view
- **WHEN** the user taps "View full diff" from the preview
- **THEN** the system SHALL display the full `git diff {baseBranch}...{worktreeBranch}` output in a scrollable code view

### Requirement: Merge conflict detection and handling
The system SHALL detect merge conflicts before finalizing the merge and provide clear guidance to the user.

#### Scenario: Conflicts detected during squash merge
- **WHEN** `git merge --squash {branch}` produces conflicts
- **THEN** the system SHALL abort the merge (`git merge --abort`)
- **AND** display an error listing the conflicting files
- **AND** instruct the user to resolve conflicts manually in the terminal

#### Scenario: No conflicts
- **WHEN** the merge completes without conflicts
- **THEN** the system SHALL commit the result and show a success message

### Requirement: Uncommitted changes check before merge
The system SHALL check for uncommitted changes in both the worktree and the base worktree before attempting a merge.

#### Scenario: Uncommitted changes in worktree branch
- **WHEN** the user initiates a merge and the worktree has uncommitted changes
- **THEN** the system SHALL warn the user and ask them to commit or discard changes before merging

#### Scenario: Uncommitted changes in base worktree
- **WHEN** the user initiates a merge and the main worktree (base branch) has uncommitted changes
- **THEN** the system SHALL warn the user and block the merge until the base worktree is clean

### Requirement: Unarchived OpenSpec change detection
Before executing a merge, the system SHALL check the worktree branch for unarchived OpenSpec changes and warn the user.

#### Scenario: Unarchived changes detected
- **WHEN** the user initiates a merge and the worktree contains directories in `openspec/changes/` that are not in `.archive/`
- **THEN** the system SHALL display a warning listing the unarchived change names
- **AND** recommend archiving them before merging
- **AND** allow the user to proceed anyway or cancel

#### Scenario: All changes archived
- **WHEN** the user initiates a merge and all OpenSpec changes in the worktree are archived (or no changes exist)
- **THEN** the merge SHALL proceed without an OpenSpec warning

### Requirement: Spec divergence detection and pull-first offer
Before executing a merge, the system SHALL detect whether `openspec/specs/` files on the base branch have been modified since the worktree branch diverged, and offer to pull main into the worktree before merging.

#### Scenario: Specs have diverged — offer pull-first
- **WHEN** the base branch's `openspec/specs/` directory contains commits newer than the worktree's merge-base
- **THEN** the system SHALL display a warning explaining that spec files have diverged and a squash-merge would conflict
- **AND** offer a "Pull main and re-sync" action that: (a) runs `git merge main` into the worktree branch, and (b) prompts the user to run `/opsx:sync` to reconcile any remaining spec conflicts before proceeding
- **AND** also offer "Merge anyway" for users who want to handle conflicts themselves

#### Scenario: No spec divergence
- **WHEN** the base branch's `openspec/specs/` files are unchanged since the worktree branched
- **THEN** the merge SHALL proceed normally without a divergence warning

#### Scenario: After pull-then-resync, merge proceeds cleanly
- **WHEN** the user completes the pull-main + re-sync flow and all spec conflicts are resolved
- **THEN** the merge-back action SHALL become available again and proceed with a clean squash-merge

### Requirement: Post-merge cleanup
After a successful merge, the system SHALL offer to clean up the worktree and its branch.

#### Scenario: Cleanup after successful merge
- **WHEN** a merge completes successfully
- **THEN** the system SHALL prompt the user: "Merge successful. Clean up worktree and branch?"
- **AND** if confirmed, execute `removeWorktree()` to delete the worktree directory and branch

#### Scenario: User declines cleanup
- **WHEN** the user declines post-merge cleanup
- **THEN** the worktree and branch SHALL be preserved for continued use
