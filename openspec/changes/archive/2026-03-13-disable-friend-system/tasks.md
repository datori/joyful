## 1. Remove Feed Sync from Client

- [x] 1.1 In `sync/sync.ts`: remove `fetchFeed()` call on connect and remove `new-feed-post` socket event listener
- [x] 1.2 Delete `sync/apiFeed.ts` (feed HTTP client, now dead code)
- [x] 1.3 In `sync/feedTypes.ts`: delete file (FeedItem, FeedBody types, now unused)
- [x] 1.4 In `sync/storage.ts`: remove feed state slices (`feedItems`, `feedHead`, `feedTail`, `feedLoaded`, `useFeedItems`, `useFeedLoaded`, `applyFeedItems`)

## 2. Repurpose Inbox Tab → Updates Tab

- [x] 2.1 In `components/TabBar.tsx`: rename "Inbox" label to "Updates" (update `t()` key and all 9 translation files)
- [x] 2.2 In `hooks/useInboxHasContent.ts`: remove friend request and feed item signals; keep only `updateAvailable` and unread changelog logic
- [x] 2.3 Rewrite `components/InboxView.tsx`: remove friend sections (incoming requests, outgoing requests, friends list, feed notification items); keep only app-update and changelog content; update empty state copy to remove friend references

## 3. Clean Up Dead App Code

- [x] 3.1 Delete or gut `components/FeedItemCard.tsx` if it is only used for feed notifications
- [x] 3.2 Remove any remaining imports of deleted feed/friend modules; confirm no TypeScript errors with `yarn workspace joyful-app typecheck`

## 4. Disable Server Routes

- [x] 4.1 In `joyful-server` feed routes (`sources/app/api/routes/feedRoutes.ts`): comment out or remove route registration so `GET /v1/feed` returns 404
- [x] 4.2 In `joyful-server` friend routes: locate and disable friend add/accept/reject/list route registrations
- [x] 4.3 Confirm server still starts cleanly (`yarn workspace joyful-server build`)
