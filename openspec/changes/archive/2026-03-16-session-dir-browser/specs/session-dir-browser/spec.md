## ADDED Requirements

### Requirement: Daemon exposes browse-directory RPC
The daemon SHALL register a machine-level RPC handler named `browse-directory` that accepts `{ path: string }` and returns `{ success: boolean, entries?: DirectoryEntry[], error?: string }` where `DirectoryEntry` is `{ name: string, type: 'file' | 'directory' | 'other', isSymlink?: boolean }`. The handler SHALL NOT restrict paths to any working directory.

#### Scenario: Readable directory
- **WHEN** the RPC is called with an absolute path to a readable directory
- **THEN** the handler returns `{ success: true, entries: [...] }` with all entries in that directory

#### Scenario: Unreadable directory (permissions)
- **WHEN** the RPC is called with a path the daemon process cannot read
- **THEN** the handler returns `{ success: false, error: "<message>" }` without throwing

#### Scenario: Non-existent path
- **WHEN** the RPC is called with a path that does not exist
- **THEN** the handler returns `{ success: false, error: "<message>" }` without throwing

### Requirement: App exposes machineBrowseDirectory operation
The app's ops layer SHALL expose a `machineBrowseDirectory(machineId: string, path: string)` function that calls `machineRPC('browse-directory', { path })` on the specified machine and returns the result.

#### Scenario: Successful call
- **WHEN** `machineBrowseDirectory` is called with a valid machineId and path
- **THEN** it returns the DirectoryEntry array from the daemon

#### Scenario: Machine offline
- **WHEN** `machineBrowseDirectory` is called and the machine is not connected
- **THEN** the promise rejects with an error

### Requirement: Path picker shows Browse entry when machine is online
The path picker screen (`new/pick/path.tsx`) SHALL display a "Browse filesystem" item below the path text input group. The item SHALL be enabled only when the selected machine has an online daemon status.

#### Scenario: Machine online
- **WHEN** the user is on the path picker screen and the machine is online
- **THEN** the "Browse filesystem" item is visible and tappable

#### Scenario: Machine offline
- **WHEN** the user is on the path picker screen and the machine is offline or status is unknown
- **THEN** the "Browse filesystem" item is visible but disabled (not tappable)

### Requirement: Browse entry opens directory browser at appropriate starting path
When tapped, the "Browse filesystem" item SHALL navigate to the browse screen (`new/pick/browse.tsx`), starting at the path currently in the text input if it is a non-empty absolute path, otherwise at the machine's `homeDir`.

#### Scenario: Text input contains an absolute path
- **WHEN** the text input contains `/home/user/projects` and the user taps "Browse filesystem"
- **THEN** the browser opens showing the contents of `/home/user/projects`

#### Scenario: Text input is empty
- **WHEN** the text input is empty and the user taps "Browse filesystem"
- **THEN** the browser opens showing the contents of the machine's `homeDir`

### Requirement: Directory browser displays navigable directory list
The browse screen SHALL display only `type === 'directory'` entries from the RPC response, sorted alphabetically. A "Parent folder" entry SHALL appear at the top of the list when the current path is not the filesystem root (`/`). Hidden directories (names starting with `.`) SHALL be hidden by default and shown only when the hidden-dir toggle is enabled.

#### Scenario: Normal directory listing
- **WHEN** the browser loads a directory containing subdirectories and files
- **THEN** only subdirectories are shown; files are not displayed

#### Scenario: Hidden directories hidden by default
- **WHEN** a directory contains entries whose names start with `.`
- **THEN** those entries are NOT shown unless the hidden-dir toggle is enabled

#### Scenario: Hidden directories shown with toggle
- **WHEN** the user enables the hidden-dir toggle in the header
- **THEN** entries whose names start with `.` become visible in the list

#### Scenario: Navigating into a subdirectory
- **WHEN** the user taps a directory entry
- **THEN** the browser fetches and displays the contents of that subdirectory, and the breadcrumb updates to reflect the new path

#### Scenario: Navigating to parent
- **WHEN** the user taps "Parent folder"
- **THEN** the browser navigates to the parent directory and the breadcrumb updates accordingly

### Requirement: Directory browser shows breadcrumb navigation
The browse screen SHALL display the current path as a tappable breadcrumb. Each segment of the path SHALL be tappable and navigate directly to that ancestor directory. The breadcrumb SHALL be left-truncated when the path is too long to display fully.

#### Scenario: Breadcrumb segment tapped
- **WHEN** the user taps an ancestor segment in the breadcrumb
- **THEN** the browser navigates to that ancestor directory

### Requirement: Directory browser shows loading state during navigation
The browse screen SHALL display a loading indicator while the `browse-directory` RPC is in flight after a navigation action.

#### Scenario: Navigation in progress
- **WHEN** the user taps a directory and the RPC is pending
- **THEN** a loading indicator is shown and further navigation taps are not processed until the response arrives

### Requirement: Directory browser shows inline error on RPC failure
If the `browse-directory` RPC returns `success: false` or rejects, the browse screen SHALL display an inline error message and allow the user to navigate elsewhere (e.g., tap the breadcrumb to go to a parent).

#### Scenario: Unreadable directory tapped
- **WHEN** the user taps a directory that the daemon cannot read
- **THEN** an inline error is shown; the breadcrumb remains interactive

### Requirement: Directory browser confirms selection back to path picker
The browse screen SHALL display a sticky "Use [currentPath]" confirm button at the bottom. When tapped, it SHALL navigate back to the path picker and populate the path text input with the selected path.

#### Scenario: Confirm tapped
- **WHEN** the user taps the "Use [currentPath]" button
- **THEN** the app returns to the path picker screen with the text input populated with the selected path

### Requirement: Device back button exits browser to path picker
Pressing the native back button on the browse screen SHALL navigate back to the path picker screen without any directory-navigation history in the stack.

#### Scenario: Back button pressed during browsing
- **WHEN** the user has navigated several directories deep and presses the device back button
- **THEN** the app returns directly to the path picker screen, not to the previous directory
