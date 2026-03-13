## Why

The friend/social system (friend requests, feed notifications, social inbox) is not needed for this fork. It wastes network requests on every session and clutters the UI with unneeded social features. Removing it simplifies the product and reduces unnecessary server traffic.

## What Changes

- **BREAKING** Remove friend request / friend management UI from the Inbox screen
- Rename the "Inbox" tab to "Updates" and repurpose it to show only app update and changelog notifications
- Remove feed sync from the client: no more `GET /v1/feed` polling and no `new-feed-post` WebSocket listener
- Disable friend and feed API routes on the server (return 404/disabled)
- Delete dead code: feed API client, feed state slices, friend notification logic

## Capabilities

### New Capabilities
- `updates-tab`: Repurposed tab showing only app update availability and changelog notifications (no social/friend content)

### Modified Capabilities
- `inbox`: Existing inbox capability — requirements change from social feed + friends to updates-only display; no network requests for feed data

## Impact

- **joyful-app**: `InboxView.tsx`, `TabBar.tsx`, `useInboxHasContent.ts`, `sync/sync.ts`, `sync/apiFeed.ts`, `sync/storage.ts`, `sync/feedTypes.ts`
- **joyful-server**: Feed routes (`feedRoutes.ts`), friend routes, `feedGet.ts`, `feedPost.ts`, `friendNotification.ts`
- **No wire/protocol changes required** — feed and friend wire types can be left as-is (dead code on client)
- **No migrations needed** — `UserFeedItem` table can remain in DB schema untouched
