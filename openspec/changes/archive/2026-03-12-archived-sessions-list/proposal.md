## Why

The sessions list mixes active and archived sessions together, creating visual noise. Users want to keep archived sessions for potential resumption without them cluttering the main list. A collapsed "Archived" section at the bottom gives users a clean primary view while preserving access to archived sessions.

## What Changes

- Sessions list gains an "Archived" section at the bottom, collapsed by default
- Archived sessions render smaller and dimmer than active sessions
- Tapping the "Archived" header toggles the section open/closed
- Non-archived sessions continue to render exactly as today
- The existing `hideInactiveSessions` toggle remains unchanged

## Capabilities

### New Capabilities

- `archived-sessions-list`: Collapsed bottom section in the sessions list for archived sessions, with visual de-emphasis (dimmer, smaller text) and tap-to-expand behavior

### Modified Capabilities

<!-- None — no existing spec-level behavior changes -->

## Impact

- `packages/joyful-app/sources/components/SessionsList.tsx` — primary change site
- `packages/joyful-app/sources/hooks/useVisibleSessionListViewData.ts` — may need to separate archived from non-archived sessions
- `packages/joyful-app/sources/text/` — new i18n string for "Archived" section header (all 10 language files)
