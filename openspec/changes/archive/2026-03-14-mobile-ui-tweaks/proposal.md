## Why

Three small mobile UI regressions affect usability: agent messages with wide content overflow the screen without wrapping, the machine/RAM panel visible on the desktop sidebar is absent from the mobile sessions tab, and the slash-command autocomplete popup appears too high on screen when the keyboard is open.

## What Changes

- Add `maxWidth: '100%'` to `agentMessageContainer` in `MessageView.tsx` so agent text always wraps within the screen width.
- Render `MachinesSidebarPanel` at the top of the sessions tab content on mobile phones in `MainView.tsx`.
- Reposition the autocomplete overlay in `AgentInput.tsx` so it anchors to the input bar itself (not the full AgentInput component height), causing it to hover directly above the chat area when the keyboard is visible.

## Capabilities

### New Capabilities
- `mobile-message-wrapping`: Correct wrapping of agent messages on mobile screens.
- `mobile-machines-panel`: Display of machine/RAM info on mobile sessions tab.
- `mobile-autocomplete-position`: Correct positioning of slash-command popup on mobile with keyboard.

### Modified Capabilities
<!-- No existing spec-level behavior changes -->

## Impact

- `packages/joyful-app/sources/components/MessageView.tsx` — style change to `agentMessageContainer`
- `packages/joyful-app/sources/components/MainView.tsx` — add `MachinesSidebarPanel` to phone sessions tab
- `packages/joyful-app/sources/components/AgentInput.tsx` — restructure autocomplete overlay positioning
