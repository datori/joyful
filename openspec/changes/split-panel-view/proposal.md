## Why

On large viewports (web, macOS desktop, iPad 12.9"+) the app wastes significant screen real estate by showing only one session at a time. Power users running multiple parallel agent sessions have no way to monitor or interact with more than one session without constant context-switching.

## What Changes

- On viewports ≥1200px wide, the app switches from a single-content-area layout to a three-column layout: sidebar | left panel | right panel
- A new "Open in right panel" action appears on session list items (long-press on iPad, right-click/context menu on web)
- A new `RightPanelContainer` component manages the right panel's lifecycle and local navigation stack
- `SidebarNavigator` gains wide-viewport awareness and renders the three-column layout in place of the Expo Router `<Drawer>` when triggered
- Global state tracks the right panel's active session and local view stack
- Sub-navigation triggered from within the right panel opens as full-screen modals (not pushing to the left panel's Expo Router stack)

## Capabilities

### New Capabilities
- `split-panel-view`: Side-by-side session viewing on wide viewports — layout switching, right-panel state management, and the UX affordance to open a session in the right panel

### Modified Capabilities

## Impact

- **joyful-app only** — no server, CLI, or wire changes required
- `SidebarNavigator.tsx` — primary layout change; must detect viewport width and conditionally render three-column flex layout vs existing Drawer
- `SessionsList.tsx` / `SessionsListWrapper.tsx` — add context action for "Open in right panel"
- New files: `RightPanelContainer.tsx`, panel state store/context
- `useIsTablet()` and `useWindowDimensions()` already available — no new responsive utilities needed
- `SessionView` is already a pure prop-driven component (`id` prop) — can be rendered directly in the right panel without routing changes
