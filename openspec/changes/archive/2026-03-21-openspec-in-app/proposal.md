## Why

All development in this repo flows through OpenSpec changes, yet the Joyful app has no awareness of them. Developers must context-switch to their terminal to check change status, read artifacts, or invoke OpenSpec commands — breaking the mobile-first remote-control workflow that Joyful is designed to provide.

## What Changes

- Add a one-shot **Explore Mode** toggle button to the `AgentInput` toolbar: when tapped, arms the button (visual highlight); the next sent message is prefixed with `/opsx:explore ` then the button immediately resets — it never stays on
- Add a new **OpenSpec sync module** (`openspecSync.ts`) that scans the session's working directory for an `openspec/` folder via `sessionBash`, parses the change/spec hierarchy and task completion stats, and stores the result per project (machine + path) in app state — following the exact pattern of `gitStatusSync`
- Add an **OpenSpec toolbar button** to `AgentInput` that appears only when an `openspec/` directory is detected; shows a badge with the count of active changes; tapping opens the new panel
- Add a new **OpenSpec panel screen** at `sources/app/(app)/session/[id]/openspec.tsx` showing the full OpenSpec hierarchy: active changes (expanded by default with task progress), main specs, and archived changes (collapsed); any file can be tapped to open in the existing file viewer

## Capabilities

### New Capabilities

- `openspec-status-sync`: Sync OpenSpec directory state (changes, specs, task completion) from the session machine to the app, using `sessionBash` and project-keyed `InvalidateSync`, following the `gitStatusSync` pattern
- `openspec-panel`: In-app hierarchical browser for OpenSpec changes, specs, and archived changes, with per-artifact file viewing via the existing file viewer screen
- `openspec-explore-toggle`: One-shot toolbar button in `AgentInput` that prefixes the next sent message with `/opsx:explore ` and immediately resets — never persists across sends

### Modified Capabilities

*(none — no existing spec-level behavior changes)*

## Impact

- `packages/joyful-app/sources/sync/storageTypes.ts` — new `OpenSpecStatus`, `OpenSpecChange`, `OpenSpecArtifact`, `OpenSpecSpecGroup` types
- `packages/joyful-app/sources/sync/storage.ts` — new `projectOpenspecStatus` state slice, `updateProjectOpenSpecStatus` action, `useSessionProjectOpenSpecStatus` selector
- `packages/joyful-app/sources/sync/openspecSync.ts` — new file (mirrors `gitStatusSync.ts`)
- `packages/joyful-app/sources/components/AgentInput.tsx` — two new optional props: `onExplorePress`/`exploreModeArmed`, `openspecStatus`/`onOpenspecPress`
- `packages/joyful-app/sources/-session/SessionView.tsx` — wire explore mode state and openspec navigation
- `packages/joyful-app/sources/app/(app)/session/[id]/openspec.tsx` — new screen
- All 9 translation files — new i18n strings for labels in the OpenSpec panel and toolbar button
