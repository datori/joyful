## ADDED Requirements

### Requirement: Worktree details on session info screen
The session info screen SHALL display worktree-specific details when the session is a worktree session, including the branch name, worktree path, and base repository path.

#### Scenario: Worktree session info display
- **WHEN** a user views the info screen for a worktree session
- **THEN** the screen SHALL show a "Worktree" section containing the branch name (e.g., "clever-ocean"), the worktree path, and the base repository path

#### Scenario: Simple session info display
- **WHEN** a user views the info screen for a non-worktree session
- **THEN** no worktree section SHALL be displayed

### Requirement: Worktree picker in new session wizard
The new session wizard SHALL allow users to select an existing worktree or create a new one when the session type is set to "worktree".

#### Scenario: No existing worktrees
- **WHEN** the user selects worktree session type in a repo with no existing worktrees
- **THEN** the system SHALL proceed directly to create a new worktree (no picker shown)

#### Scenario: Existing worktrees available
- **WHEN** the user selects worktree session type in a repo that has existing worktrees in `.dev/worktree/`
- **THEN** the wizard SHALL display a picker listing existing worktrees (showing branch name and path) plus a "Create new" option

#### Scenario: User selects existing worktree
- **WHEN** the user selects an existing worktree from the picker
- **THEN** the session SHALL be spawned in that worktree's directory without creating a new worktree

#### Scenario: User selects create new
- **WHEN** the user selects "Create new" from the worktree picker
- **THEN** a new worktree SHALL be created using the standard `createWorktree()` flow

### Requirement: Orphan worktree detection
The system SHALL detect orphaned worktrees — worktrees that exist on disk but have no associated active session.

#### Scenario: Detect orphaned worktrees
- **WHEN** a user opens the worktree picker or a worktree management view
- **THEN** the system SHALL compare the list of worktrees from `git worktree list` against active session paths to identify worktrees with no associated session

### Requirement: Orphan worktree cleanup action
The system SHALL provide a UI action to clean up orphaned worktrees, removing both the worktree directory and its branch.

#### Scenario: Clean up single orphan
- **WHEN** a user triggers cleanup on a specific orphaned worktree
- **THEN** the system SHALL execute `removeWorktree()` for that worktree and update the worktree list

#### Scenario: Clean up all orphans
- **WHEN** a user triggers "Clean up all" for orphaned worktrees
- **THEN** the system SHALL execute `removeWorktree()` for each orphaned worktree sequentially and report results

#### Scenario: Cleanup with uncommitted changes warning
- **WHEN** an orphaned worktree has uncommitted changes (detected via `git status` in the worktree)
- **THEN** the system SHALL warn the user that uncommitted work will be lost before proceeding with cleanup
