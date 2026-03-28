## ADDED Requirements

### Requirement: Consolidated worktree utility module
The system SHALL provide a single `sources/utils/worktree.ts` module containing all worktree operations: `createWorktree()`, `removeWorktree()`, `isWorktreePath()`, `listWorktrees()`, and `generateWorktreeName()`. The existing `createWorktree.ts` and `generateWorktreeName.ts` files SHALL be removed.

#### Scenario: Module exports all worktree functions
- **WHEN** a consumer imports from `@/utils/worktree`
- **THEN** the module SHALL export `createWorktree`, `removeWorktree`, `isWorktreePath`, `listWorktrees`, `generateWorktreeName`, and the `WORKTREE_PATH_MARKER` constant

### Requirement: Worktree cleanup on session deletion
The system SHALL attempt to remove the git worktree directory and delete its associated git branch when a worktree session is deleted. Cleanup SHALL be best-effort — failure MUST NOT prevent session deletion.

#### Scenario: Successful cleanup on delete
- **WHEN** a user deletes a session whose path contains the worktree path marker (`/.dev/worktree/`)
- **THEN** the system SHALL call `git worktree remove {path} --force` followed by `git branch -D {branchName}` on the session's machine
- **AND** then delete the session from the server

#### Scenario: Cleanup failure does not block deletion
- **WHEN** worktree removal or branch deletion fails (machine offline, already removed, etc.)
- **THEN** the session SHALL still be deleted from the server
- **AND** a non-blocking warning SHALL be displayed to the user indicating manual cleanup may be needed

#### Scenario: Non-worktree session deletion unchanged
- **WHEN** a user deletes a session whose path does NOT contain the worktree path marker
- **THEN** no worktree cleanup SHALL be attempted

### Requirement: Worktree path detection
The system SHALL provide an `isWorktreePath(path: string)` function that returns `true` if the path contains `/.dev/worktree/` and `false` otherwise.

#### Scenario: Detect worktree path
- **WHEN** `isWorktreePath("/home/user/project/.dev/worktree/clever-ocean")` is called
- **THEN** it SHALL return `true`

#### Scenario: Detect non-worktree path
- **WHEN** `isWorktreePath("/home/user/project")` is called
- **THEN** it SHALL return `false`

### Requirement: Worktree removal function
The system SHALL provide `removeWorktree(machineId, worktreePath)` that removes the git worktree directory and deletes the associated branch.

#### Scenario: Remove worktree and branch
- **WHEN** `removeWorktree(machineId, "/home/user/project/.dev/worktree/clever-ocean")` is called
- **THEN** the system SHALL execute `git worktree remove '/home/user/project/.dev/worktree/clever-ocean' --force` with cwd set to the base repository path (extracted by splitting on the worktree path marker)
- **AND** execute `git branch -D 'clever-ocean'` to delete the branch

#### Scenario: Reject non-worktree path
- **WHEN** `removeWorktree` is called with a path that does not contain the worktree path marker
- **THEN** it SHALL return `{ success: false }` without executing any git commands

### Requirement: Shell argument safety
All dynamic values (paths, branch names) passed to `machineBash` in worktree operations SHALL be properly single-quoted with internal single-quote escaping to prevent shell injection.

#### Scenario: Path with spaces is handled safely
- **WHEN** a worktree is created in a repo at `/home/user/my project/app`
- **THEN** the git commands SHALL use properly quoted paths (e.g., `git worktree add -b 'clever-ocean' '.dev/worktree/clever-ocean'` with cwd `'/home/user/my project/app'`)

#### Scenario: Path with shell metacharacters
- **WHEN** a worktree is created in a repo path containing `$`, `` ` ``, or `()` characters
- **THEN** the characters SHALL be escaped within single quotes and not interpreted by the shell

### Requirement: Expanded name generation
The name generator SHALL use at least 50 adjectives and 50 nouns (2,500+ base combinations). If the generated name and 3 numbered retries all fail, the system SHALL make a final attempt using the name with a 4-character random hex suffix before reporting failure.

#### Scenario: Normal name generation
- **WHEN** `generateWorktreeName()` is called
- **THEN** it SHALL return a string in `{adjective}-{noun}` format from the expanded word lists

#### Scenario: All retries exhausted with hex fallback
- **WHEN** the base name and suffixes `-2`, `-3`, `-4` all collide with existing worktrees
- **THEN** the system SHALL attempt one final creation with suffix `-{4-char-hex}` (e.g., `clever-ocean-a3f1`)

### Requirement: Gitignore seeding
On first worktree creation in a repository, the system SHALL ensure `.dev/worktree/` is listed in the repo's `.gitignore`.

#### Scenario: Gitignore exists without worktree entry
- **WHEN** a worktree is created and the repo's `.gitignore` does not contain `.dev/worktree/`
- **THEN** the system SHALL append `\n# Joyful worktrees\n.dev/worktree/\n` to the `.gitignore`

#### Scenario: Gitignore already contains entry
- **WHEN** a worktree is created and the repo's `.gitignore` already contains `.dev/worktree/`
- **THEN** no modification SHALL be made to `.gitignore`

#### Scenario: No gitignore exists
- **WHEN** a worktree is created in a repo with no `.gitignore` file
- **THEN** the system SHALL create a `.gitignore` with the content `# Joyful worktrees\n.dev/worktree/\n`

### Requirement: Worktree listing
The system SHALL provide `listWorktrees(machineId, basePath)` that returns all git worktrees in a repository with their paths and branch names.

#### Scenario: List worktrees in a repo with multiple worktrees
- **WHEN** `listWorktrees(machineId, "/home/user/project")` is called on a repo with worktrees `clever-ocean` and `swift-star`
- **THEN** it SHALL return an array of objects containing at minimum `{ path, branch, isMain }` for each worktree, parsed from `git worktree list --porcelain`

#### Scenario: List worktrees in a repo with no worktrees
- **WHEN** `listWorktrees` is called on a repo with only the main worktree
- **THEN** it SHALL return a single entry for the main worktree with `isMain: true`

### Requirement: Worktree metadata in session metadata
Session metadata SHALL include an optional `worktree` field containing `{ branchName: string, baseRepoPath: string, isWorktree: true }` for worktree sessions.

#### Scenario: Worktree session stores metadata
- **WHEN** a worktree session is created
- **THEN** the session metadata SHALL include the `worktree` field with the branch name and base repository path

#### Scenario: Simple session has no worktree metadata
- **WHEN** a simple (non-worktree) session is created
- **THEN** the session metadata SHALL NOT include the `worktree` field
