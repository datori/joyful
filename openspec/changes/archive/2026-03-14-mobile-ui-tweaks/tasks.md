## 1. Message Wrapping Fix

- [x] 1.1 In `packages/joyful-app/sources/components/MessageView.tsx`, add `maxWidth: '100%'` to the `agentMessageContainer` style object
- [x] 1.2 Run `yarn workspace joyful-app typecheck` and confirm no type errors

## 2. Machines Panel on Mobile Sessions Tab

- [x] 2.1 In `packages/joyful-app/sources/components/MainView.tsx`, in the `renderTabContent` callback, for the `'sessions'` case: wrap the current content in a `View` with `flex: 1` and insert `<MachinesSidebarPanel />` above the session list content
- [x] 2.2 Verify `MachinesSidebarPanel` is already imported (it is used in the sidebar branch); add import if missing
- [x] 2.3 Run `yarn workspace joyful-app typecheck` and confirm no type errors

## 3. Autocomplete Popup Positioning

- [x] 3.1 In `packages/joyful-app/sources/components/AgentInput.tsx`, locate the JSX structure of the input area to identify the inner View that wraps just the text input row (distinct from the full AgentInput container)
- [x] 3.2 Wrap the text input row in a `View` with `position: 'relative'` if it isn't already, and move the `autocompleteOverlay` and `settingsOverlay` inside that inner View so `bottom: '100%'` is calculated relative to the input row height only
- [x] 3.3 Verify the `overlayBackdrop` (full-screen dismiss tap target) still covers the full screen — it uses `top/left/right/bottom: -1000` which should be unaffected by the anchor change, but confirm
- [x] 3.4 Run `yarn workspace joyful-app typecheck` and confirm no type errors
