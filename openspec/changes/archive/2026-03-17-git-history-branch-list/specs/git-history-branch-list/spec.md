## ADDED Requirements

### Requirement: Git screen shows branch list for the session's working directory
The app SHALL provide a `/session/[id]/git` screen that displays all local and remote branches for the session's working directory. The current branch SHALL be visually distinguished. Each branch SHALL show its name, and, where available, ahead/behind counts relative to its upstream.

#### Scenario: Current branch is highlighted
- **WHEN** the git screen loads for a session on branch `main`
- **THEN** `main` is shown with a distinct indicator (e.g. filled dot or checkmark) and all other branches are shown without that indicator

#### Scenario: Local branches shown with tracking info
- **WHEN** a local branch has an upstream configured (e.g. `origin/main: ahead 2`)
- **THEN** the branch row shows the ahead/behind counts alongside the branch name

#### Scenario: Remote branches shown in a separate group
- **WHEN** the working directory has remote-tracking branches (e.g. `remotes/origin/dev`)
- **THEN** they are listed under a visually distinct "Remote" section below local branches

#### Scenario: Detached HEAD state shown
- **WHEN** the working directory is in detached HEAD state
- **THEN** the branch list shows a "(HEAD detached)" entry as the current position, non-interactive

#### Scenario: Non-git directory shows empty state
- **WHEN** the session's working directory is not inside a git repository
- **THEN** the screen shows an empty state message indicating no git repository was found (no error thrown)

#### Scenario: Loading state while fetching
- **WHEN** the screen is opened and the branch data has not yet been fetched
- **THEN** a loading indicator is shown until the data arrives or the request times out

### Requirement: Git screen shows recent commit history for the current branch
The app SHALL display the most recent 30 commits on the current branch. Each commit entry SHALL show: short hash, subject line, author name, and relative time.

#### Scenario: Commit list populated on screen focus
- **WHEN** the git screen receives focus (useFocusEffect)
- **THEN** `git log --format="%H|%h|%s|%an|%ar" -30` is executed via `sessionBash` and the results are displayed

#### Scenario: Commit rows show required fields
- **WHEN** commit data is loaded
- **THEN** each row shows short hash, subject (truncated if needed), author name, and relative time (e.g. "2h ago")

#### Scenario: Empty commit history shown for new repo
- **WHEN** the repository has no commits
- **THEN** the history section shows an empty state message

#### Scenario: Fetch timeout handled gracefully
- **WHEN** `git log` or `git branch` does not respond within 5 seconds
- **THEN** the section shows an error/empty state without crashing; a retry is available on pull-to-refresh

### Requirement: Branch pill in files screen navigates to the git screen
The branch name displayed in the header area of the `/session/[id]/files` screen SHALL be a tappable element. Tapping it SHALL push the `/session/[id]/git` route.

#### Scenario: Branch pill is tappable
- **WHEN** the user views the files screen and taps the branch name pill
- **THEN** the app navigates to `/session/[id]/git`

#### Scenario: Branch pill shows chevron affordance
- **WHEN** the branch pill is rendered
- **THEN** a right-chevron or similar affordance is visible to indicate it is tappable

#### Scenario: Branch pill with no git repo is non-interactive
- **WHEN** the session's working directory is not a git repository (branch is null)
- **THEN** the branch display is not tappable and shows no navigation affordance

### Requirement: Git data is fetched on-demand via sessionBash
The git screen SHALL fetch branch and log data by executing git commands through the existing `sessionBash` RPC. The fetch SHALL be triggered on screen focus and on explicit pull-to-refresh. The data SHALL NOT be added to the continuous git status polling loop.

#### Scenario: Data fetched on focus
- **WHEN** the git screen comes into focus
- **THEN** both `git branch -vv` and `git log` are executed and the screen updates with results

#### Scenario: Pull-to-refresh re-fetches data
- **WHEN** the user pulls to refresh on the git screen
- **THEN** both commands are re-executed and the displayed data is updated

#### Scenario: Data not re-fetched in background
- **WHEN** the git screen is not focused (user is on another screen)
- **THEN** no polling or background fetch of git history/branch data occurs
