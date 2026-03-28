## Context

The app currently renders one session at a time regardless of viewport size. On wide displays (web, macOS Tauri, iPad 12.9"+) this wastes significant horizontal space. The sidebar occupies 250–360px; the remaining 800–1100px shows a single session view.

`SessionView` is already a pure React component that accepts an `id` prop and has no dependency on Expo Router internals. `SidebarNavigator` already uses `useWindowDimensions()` and `useIsTablet()` to compute sidebar width. These are the two primary integration points.

## Goals / Non-Goals

**Goals:**
- Two fully interactive session panels side by side on viewports ≥1200px
- Left panel remains Expo Router–driven (URL reflects it, browser history works)
- Right panel is state-driven with its own lightweight local navigation for within-session sub-views
- "Open in right panel" available on session list items (long-press iPad, right-click/context-menu web)
- Right panel closeable; split layout degrades gracefully when viewport narrows below threshold
- joyful-app only — no server, CLI, or wire changes

**Non-Goals:**
- Browser back/forward for the right panel
- More than two panels
- Resizable split divider (fixed 50/50 for now)
- iPad 11" or smaller (1024px — too tight at ~370px per panel)

## Decisions

### Decision 1: Custom flex layout replaces Drawer on wide viewports

**Choice:** When `windowWidth >= 1200`, `SidebarNavigator` renders a manual three-column `View` (flexDirection: row) instead of the Expo Router `<Drawer>`. The Drawer is preserved unchanged for all narrower viewports.

**Alternatives considered:**
- Inject a second column inside the Drawer's main content area: Expo Router's Drawer doesn't expose a slot to wrap the main content pane without forking the navigator. Custom flex layout is cleaner and avoids upstream coupling.
- Replace Drawer entirely: Unnecessary — the Drawer works fine on phones and tablets below the threshold.

### Decision 2: Right panel uses a local view-stack (not a React Navigation navigator)

**Choice:** A lightweight Zustand slice (or co-located `useState`) tracks `rightPanelStack: RightPanelScreen[]`. `RightPanelContainer` renders the top of the stack as a direct component render (not a route).

```typescript
type RightPanelScreen =
  | { type: 'session'; id: string }
  | { type: 'files'; sessionId: string }
  | { type: 'file'; sessionId: string; path: string }
  | { type: 'info'; sessionId: string }
  | { type: 'recent'; sessionId: string }
```

`push` / `pop` / `replace` are provided via a `RightPanelNavContext`. Components rendered in the right panel that need to navigate check this context first; if absent they fall back to `router.push` (existing behavior, left panel / phone).

**Alternatives considered:**
- Independent `<NavigationContainer independent={true}>` per panel: Correct isolation but requires extracting all screen components from their Expo Router route adapters and setting up a parallel navigation config. Large refactor for marginal user-facing gain.
- Share the Expo Router stack for both panels: Navigation from the right panel mutates the left panel's URL — immediately confusing.

### Decision 3: Sub-navigation from right panel opens as modals

**Choice:** When `RightPanelNavContext` is present, navigation calls from within the right panel's screen components push onto the right panel's local stack. The existing Expo Router modal routes (already configured in `_layout.tsx`) remain available as an escape hatch for flows not worth porting to the local stack (e.g., deep file viewers).

**Why this is sufficient:** The primary interaction in both panels is the chat view. Sub-views (files, info) are infrequently visited. A local stack covering the common sub-views gives a seamless feel without a full navigation rewrite.

### Decision 4: Right panel session ID persisted in URL query param (`?r=<sessionId>`) on web

**Choice:** On web/macOS, the right panel session ID is reflected in the URL as `?r=sessionId`. This allows page refresh to restore the split state.

**Alternatives considered:**
- In-memory only: Simpler, but split view is lost on refresh — poor experience for web.
- Full sub-route encoding in URL: Over-engineered; the local stack state (which sub-view is open) is ephemeral enough not to warrant URL serialization.

### Decision 5: `useSplitPanelStore` Zustand store

A dedicated Zustand store owns the right panel's state:

```typescript
interface SplitPanelStore {
  rightStack: RightPanelScreen[];       // [] means panel is closed
  openRight: (screen: RightPanelScreen) => void;
  pushRight: (screen: RightPanelScreen) => void;
  popRight: () => void;
  closeRight: () => void;
}
```

The store is separate from the existing session/machine stores to keep concerns isolated.

## Risks / Trade-offs

- **Viewport resize while split**: If the user resizes the browser below 1200px while the right panel is open, the right panel closes (its stack is cleared). This is intentional — the layout can't gracefully collapse two panels into one. The right panel session ID is remembered so the user can reopen it on resize-up. → Mitigation: preserve `lastRightSessionId` in the store; show it pre-populated when threshold is crossed again.

- **Two SessionView instances, two socket subscriptions**: Both panels independently subscribe to their sessions via the existing realtime layer. This is correct behavior but doubles the subscription count. → No action needed; the realtime layer already handles concurrent subscriptions.

- **Navigation context ambiguity**: If a component rendered in the right panel calls `router.push` (instead of `usePanelNav`), it navigates the left panel. Any navigation call sites in `ChatHeaderView` and sub-view trigger components need to be updated to use `usePanelNav`. → Mitigation: audit all `router.push` calls inside `SessionView` and its child components during implementation.

- **`RightPanelNavContext` must not bleed into left panel**: The context provider must wrap only the right panel's render tree, not the entire app. → Mitigation: mount it at the `RightPanelContainer` root only.

## Open Questions

- Should the panel divider be a visible separator (1px border) or a gap? Visual design TBD during implementation.
- Should closing the right panel animate (slide out) or snap? Keep it simple — snap for now.
