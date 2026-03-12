## 1. Data Layer

- [x] 1.1 Add `getRecentCommands()` to `suggestionCommands.ts` — scans all sessions in storage, collects and deduplicates `slashCommands`, filters `IGNORED_COMMANDS`, merges with `DEFAULT_COMMANDS`
- [x] 1.2 Add `searchRecentCommands(query, options)` to `suggestionCommands.ts` — same Fuse.js path as `searchCommands` but uses `getRecentCommands()` instead of a session's metadata

## 2. i18n

- [x] 2.1 Add `autocomplete.recentCommands` key to `_default.ts` and all 10 translation files

## 3. Autocomplete Picker UI

- [x] 3.1 Add optional `suggestionsLabel` prop to `AgentInputAutocomplete` — when provided, renders a small muted section header above the suggestion list

## 4. New Session Screen Wiring

- [x] 4.1 In `app/(app)/new/index.tsx`: change `autocompletePrefixes` from `[]` to `['/']` and pass a `getSuggestions` function that wraps `searchRecentCommands` with the `suggestionsLabel` set to `t('autocomplete.recentCommands')`

## 5. Typecheck

- [x] 5.1 Run `yarn workspace joyful-app typecheck` and fix any errors
