## Context

The new session screen (`app/(app)/new/index.tsx`) currently passes `autocompletePrefixes=[]` to `AgentInput`, disabling all autocomplete. Slash command data is only available after a session is spawned — the CLI daemon extracts it from the Claude SDK `system:init` message and syncs it into `session.metadata.slashCommands`.

All sessions in storage already carry their `slashCommands` metadata. Scanning them provides a naive but instantaneous cache with no new infrastructure.

## Goals / Non-Goals

**Goals:**
- Power users can type `/` on the new session screen and see recently-used commands
- Autocomplete is clearly labelled "Recent commands" so users understand it is not guaranteed to be complete or current
- Active session autocomplete is completely unaffected
- No new RPC endpoints, no new storage schema, no daemon changes

**Non-Goals:**
- Per-machine or per-directory command filtering (naive global cache)
- Freshness guarantees — cache is whatever sessions already synced
- Pre-spawn live discovery (no daemon query)
- `@` mention autocomplete on new session screen (unchanged, stays off)

## Decisions

### Decision: Scan all sessions in storage, no filtering by path or machine

**Chosen**: Collect `slashCommands` from all sessions indiscriminately, deduplicate, apply `IGNORED_COMMANDS` filter.

**Rationale**: The primary use case is power users who know the command they want — they just need autocomplete to confirm the name. Global dedup is maximally useful with zero added complexity. Per-directory or per-machine filtering would require joining session metadata in ways that could easily produce empty results for unfamiliar directories.

**Alternative considered**: Filter by `session.metadata.path === selectedDirectory`. Rejected — new directories would show nothing, and it requires directory to be selected first before autocomplete activates.

### Decision: `getRecentCommands()` lives in `suggestionCommands.ts`, reads directly from `storage.getState()`

**Rationale**: Consistent with existing `getCommandsFromSession()` which also reads from `storage.getState()`. Keeps all command suggestion logic in one file.

### Decision: New-session mode signalled via a `suggestionsMode` prop on `AgentInput` (or a custom `getSuggestions` override)

**Chosen**: Pass a custom `getSuggestions` function from the new session screen that wraps `searchRecentCommands`. `AgentInput` already accepts a `getSuggestions` prop. The "recent commands" header is rendered inside `AgentInputAutocomplete` when a `suggestionsLabel` prop is provided.

**Rationale**: Keeps `AgentInput` generic — it doesn't need to know about sessions or recent commands. The new session screen owns the wiring. Active session screen (`SessionView`) is untouched.

### Decision: "Recent commands" label as a section header above the suggestion list in `AgentInputAutocomplete`

**Rationale**: Single label is cleaner than per-row subtitles. Header makes it clear the entire list is in the "recent" category, not just some items.

## Risks / Trade-offs

- **Stale commands** → Mitigated by "Recent commands" label. Users understand it's approximate.
- **Empty state (no prior sessions)** → Falls back to `DEFAULT_COMMANDS` (`compact`, `clear`). Acceptable — better than nothing.
- **Large session count performance** → Scanning all sessions is O(n) over session count. Sessions have small metadata blobs; this is negligible.

## Open Questions

None — design is fully resolved.
