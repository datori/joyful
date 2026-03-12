## Why

The new session creation screen has no slash command autocomplete — the user must already know the exact command names. Since a directory is selected at creation time, we can surface recently-used slash commands from prior sessions to help power users compose their opening message.

## What Changes

- Add `getRecentCommands()` to `suggestionCommands.ts` — collects and deduplicates `slashCommands` from all sessions in storage, filtered by `IGNORED_COMMANDS`
- Add `searchRecentCommands(query, options)` — same Fuse.js path as `searchCommands` but without a session ID
- New session screen (`app/(app)/new/index.tsx`): enable `/` autocomplete prefix, wire up `searchRecentCommands`
- Autocomplete picker: render a "Recent commands" section header when operating in new-session mode
- Active session screen: no changes — continues using session-specific `searchCommands(sessionId, ...)`

## Capabilities

### New Capabilities
- `new-session-recent-commands`: Slash command autocomplete on the new session screen, powered by a cache of recently seen commands across all prior sessions, with a visible "Recent commands" label above the suggestion list

### Modified Capabilities
<!-- none -->

## Impact

- `packages/joyful-app/sources/sync/suggestionCommands.ts` — new exports
- `packages/joyful-app/sources/components/AgentInput.tsx` — new prop to signal new-session mode or accept a custom getSuggestions override
- `packages/joyful-app/sources/components/AgentInputAutocomplete.tsx` — section header rendering
- `packages/joyful-app/sources/app/(app)/new/index.tsx` — enable autocomplete, pass recent-commands suggestion function
- `packages/joyful-app/sources/text/_default.ts` + all 10 translation files — "Recent commands" label
