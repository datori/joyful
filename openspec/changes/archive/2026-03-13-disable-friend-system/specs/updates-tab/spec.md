## ADDED Requirements

### Requirement: Updates tab replaces Inbox tab
The app SHALL display a tab named "Updates" (not "Inbox") that shows only app update availability and changelog notifications. The tab SHALL NOT display friend requests, pending friend requests, accepted friends, or feed notifications of any kind.

#### Scenario: Tab is named Updates
- **WHEN** the user views the tab bar or sidebar navigation
- **THEN** the tab is labeled "Updates" in all supported languages

#### Scenario: Updates tab shows app update notification
- **WHEN** a new app version is available
- **THEN** the Updates tab content shows the update notification and the tab badge is visible

#### Scenario: Updates tab shows changelog notification
- **WHEN** there are unread changelog entries
- **THEN** the Updates tab content shows the changelog entry and the tab badge is visible

#### Scenario: Updates tab shows empty state when no updates
- **WHEN** there are no pending app updates and no unread changelog entries
- **THEN** the Updates tab shows an empty state (no friend-related copy)

#### Scenario: No friend content is shown
- **WHEN** the user opens the Updates tab
- **THEN** no friend requests, pending requests, friends list, or social feed items are displayed

### Requirement: No network requests for feed or friends
The app SHALL NOT make any HTTP requests to `GET /v1/feed` and SHALL NOT listen for `new-feed-post` WebSocket events. All feed-related sync code SHALL be removed.

#### Scenario: App session produces no feed requests
- **WHEN** the app connects to the server and establishes a session
- **THEN** no request is made to the feed endpoint and no feed socket listener is registered

### Requirement: Server disables friend and feed routes
The server SHALL return 404 for all friend and feed API routes. These routes SHALL NOT be registered.

#### Scenario: Feed endpoint returns 404
- **WHEN** a client calls `GET /v1/feed`
- **THEN** the server responds with 404

#### Scenario: Friend routes return 404
- **WHEN** a client calls any friend management endpoint
- **THEN** the server responds with 404

### Requirement: Updates tab badge reflects update/changelog state only
The tab badge SHALL appear when `updateAvailable` is true OR there are unread changelog entries. It SHALL NOT appear due to friend requests or feed items.

#### Scenario: Badge appears for app update
- **WHEN** `updateAvailable` is true
- **THEN** the Updates tab badge is visible

#### Scenario: Badge does not appear for friend requests
- **WHEN** there are incoming friend requests but no app updates or unread changelog
- **THEN** the Updates tab badge is NOT visible
