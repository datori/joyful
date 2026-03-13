## Why

The chat settings popup (permissions/model/effort) stacks all options vertically, requiring significant scroll on mobile and cluttering the chat UI. Each of the three sections renders full radio rows with descriptions, leading to 13+ stacked items totalling ~400px of height.

## What Changes

- Replace vertical radio button lists in the settings popup with horizontal chip/pill rows — one row per setting
- Each chip row shows all available options as tappable chips; the selected chip is highlighted
- Chips scroll horizontally if options overflow the container width
- Descriptions are removed from the popup (already visible in the status bar below input)
- Net result: popup shrinks from ~400px tall to ~3 rows + headers (~180px), no scroll needed

## Capabilities

### New Capabilities

- `chat-settings-popup`: Compact horizontal-chip layout for the floating settings overlay in AgentInput

### Modified Capabilities

_(none — no spec-level data or behavior changes)_

## Impact

- `packages/joyful-app/sources/components/AgentInput.tsx` — replace overlay section rendering
- No wire protocol, server, or CLI changes
- No translation string changes (existing section titles reused; descriptions removed from popup view)
