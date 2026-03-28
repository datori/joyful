## 1. State & Navigation Foundation

- [ ] 1.1 Create `useSplitPanelStore` Zustand store with `rightStack: RightPanelScreen[]`, `openRight`, `pushRight`, `popRight`, `closeRight`, and `lastRightSessionId` fields
- [ ] 1.2 Define the `RightPanelScreen` discriminated union type (`session`, `files`, `file`, `info`, `recent`) in a shared types file
- [ ] 1.3 Create `RightPanelNavContext` React context with `push`, `pop`, `replace` functions
- [ ] 1.4 Create `usePanelNav()` hook that returns the `RightPanelNavContext` if present, otherwise falls back to Expo Router's `router`

## 2. Right Panel Container

- [ ] 2.1 Create `RightPanelContainer` component that wraps its content in `RightPanelNavContext.Provider` and renders the current top-of-stack screen
- [ ] 2.2 Implement screen dispatch inside `RightPanelContainer`: render `SessionView`, files view, file view, info view, or recent view based on `rightStack` top
- [ ] 2.3 Add a close button to `RightPanelContainer` that calls `closeRight()` from the store
- [ ] 2.4 Add a panel border/divider between left and right panels

## 3. Layout Switch in SidebarNavigator

- [ ] 3.1 Read `windowWidth` via `useWindowDimensions()` in `SidebarNavigator` (already imported — verify)
- [ ] 3.2 Add `isSplitLayout` boolean: `isTablet && windowWidth >= 1200` (must not activate on phones regardless of width)
- [ ] 3.3 When `isSplitLayout` is false: render existing `<Drawer>` unchanged
- [ ] 3.4 When `isSplitLayout` is true: render a `flexDirection: 'row'` View containing `<SidebarView>`, a `flex: 1` wrapper around `<Slot>` (left panel), and `<RightPanelContainer>` (right panel, `flex: 1`, visible only when `rightStack.length > 0`)
- [ ] 3.5 When viewport shrinks below 1200px, clear the right panel display (do NOT clear `lastRightSessionId`)
- [ ] 3.6 When viewport grows back to ≥1200px, restore right panel if `lastRightSessionId` is set

## 4. URL Persistence (web/macOS)

- [ ] 4.1 In `RightPanelContainer` (or a sibling hook), sync the right panel's active session ID to/from URL query param `?r=<sessionId>` using `useRouter` / `router.setParams` (web only, guard with `Platform.OS === 'web'`)
- [ ] 4.2 On mount with `isSplitLayout`, read `?r` from URL params and call `openRight({ type: 'session', id })` if present
- [ ] 4.3 When right panel closes, remove `?r` from URL params

## 5. "Open in Right Panel" UX

- [ ] 5.1 Add a context menu / long-press handler to session rows in `SessionsList.tsx` — only visible when `isSplitLayout` is true
- [ ] 5.2 Context menu option calls `openRight({ type: 'session', id: session.id })`
- [ ] 5.3 Add the "Open in right panel" string to all 9 translation files (`sources/text/translations/`)

## 6. Navigation Call Site Updates

- [ ] 6.1 Audit all `router.push` calls inside `SessionView` and its direct children (`ChatHeaderView`, etc.) — list every call site that navigates to a session sub-route
- [ ] 6.2 Replace each sub-route `router.push` call site with `usePanelNav().push(...)` so right-panel navigations go to the local stack instead of the global router
- [ ] 6.3 Verify that navigation from the left panel is unaffected (fallback path in `usePanelNav` delegates to `router.push` when context is absent)

## 7. Sub-View Components

- [ ] 7.1 Confirm that the files view component can be rendered directly with props (not via route params) — refactor if needed
- [ ] 7.2 Confirm that the file detail view component can be rendered directly with props — refactor if needed
- [ ] 7.3 Confirm that the info view component can be rendered directly with props — refactor if needed
- [ ] 7.4 Confirm that the recent sessions view component can be rendered directly with props — refactor if needed

## 8. Polish & Edge Cases

- [ ] 8.1 Handle the case where both panels show the same session (should be allowed, not blocked)
- [ ] 8.2 Ensure the right panel's `SessionView` has its own independent scroll position (verify no shared ref)
- [ ] 8.3 Verify that permission toasts, banners, and modals spawned from the right panel render correctly over both panels
- [ ] 8.4 Run `yarn workspace joyful-app typecheck` and fix all type errors

## 9. QA Checklist

- [ ] 9.1 Web: split activates at ≥1200px, reverts below
- [ ] 9.2 Web: `?r=` query param is set/cleared correctly; refresh restores right panel
- [ ] 9.3 macOS Tauri: split activates, both panels fully interactive
- [ ] 9.4 iPad 12.9" landscape (simulated): split activates, both panels usable
- [ ] 9.5 iPad 11" landscape (simulated): split does NOT activate
- [ ] 9.6 Phone: split does NOT activate regardless of orientation
- [ ] 9.7 Left panel navigation does not affect right panel and vice versa
- [ ] 9.8 Closing right panel restores left panel to full width
