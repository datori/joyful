## Context

The app has a social layer (friend requests, feed notifications) inherited from upstream Happy Coder. For this fork, the social/friend system is unused and actively wastes network requests on every app session. The Inbox tab currently mixes social feed content with useful update/changelog notifications — we want to keep the latter and remove the former entirely.

## Goals / Non-Goals

**Goals:**
- Eliminate all network activity related to the friend/feed system (no `GET /v1/feed`, no `new-feed-post` socket event handling)
- Rename "Inbox" tab to "Updates" and show only app-update and changelog notifications
- Disable server-side friend and feed routes so they return 404
- Delete dead client-side code (feed sync, feed state, friend UI components)

**Non-Goals:**
- Removing the `UserFeedItem` DB table or running migrations (no-op, table just stays empty)
- Removing feed/friend wire types from `joyful-wire` (minimal diff preference)
- Changing the update-available or changelog notification mechanisms (they stay as-is)

## Decisions

### Decision: Delete feed sync code rather than feature-flag it
Rationale: This is a permanent fork divergence. Feature flags add complexity with no benefit. Deleting the code makes the intent clear and removes the maintenance burden.
Alternatives considered: commenting out calls — rejected, leaves dead code in tree.

### Decision: Disable server routes (return 404) rather than delete route files
Rationale: Minimal diff from upstream. Disabling at the route-registration level is a one-line change per route group; deleting the underlying action files is more invasive and harder to reconcile with future upstream merges.
Alternatives considered: full deletion — possible but increases upstream diff.

### Decision: Keep the Updates tab (repurpose, don't remove)
Rationale: The tab badge for "app update available" and "unread changelog" is useful UX. Removing the tab loses this. Repurposing costs minimal effort.

### Decision: `useInboxHasContent` badge logic — remove feed/friend signals only
The hook currently gates the badge on: `feedItems.length > 0 || friendRequests.length > 0 || updateAvailable || unreadChangelog`. After this change it becomes: `updateAvailable || unreadChangelog`. The hook file stays but is simplified.

## Risks / Trade-offs

- [Risk] Upstream rebase brings back feed sync → Mitigation: changes are concentrated in well-named files; a rebase conflict will be obvious.
- [Risk] `InboxView.tsx` has interleaved friend and non-friend rendering — removing friend sections may break layout → Mitigation: read the file carefully before editing; test on web dev server.
- [Risk] Server route disable breaks a client that still calls the feed endpoint → Mitigation: we control both client and server; client changes land first, server changes are additive.

## Migration Plan

1. App changes first: remove feed sync, gut InboxView, rename tab
2. Server changes second: disable feed + friend routes
3. No DB migration required
4. Verify with `yarn typecheck` in joyful-app after app changes
