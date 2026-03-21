## 1. Storage Types

- [x] 1.1 Add `OpenSpecArtifact` interface to `sources/sync/storageTypes.ts` with fields: `path: string`, `filename: string`, `type: 'proposal' | 'design' | 'tasks' | 'config' | 'spec' | 'other'`
- [x] 1.2 Add `OpenSpecSpecGroup` interface with fields: `name: string`, `artifacts: OpenSpecArtifact[]`
- [x] 1.3 Add `OpenSpecChange` interface with fields: `name: string`, `isArchived: boolean`, `artifacts: OpenSpecArtifact[]`, `deltaSpecs: OpenSpecSpecGroup[]`, `taskStats: { completed: number; total: number } | null`
- [x] 1.4 Add `OpenSpecStatus` interface with fields: `hasOpenspec: boolean`, `activeChanges: OpenSpecChange[]`, `archivedChanges: OpenSpecChange[]`, `mainSpecs: OpenSpecSpecGroup[]`, `lastUpdatedAt: number`

## 2. Storage State & Selectors

- [x] 2.1 Add `projectOpenspecStatus: Record<string, OpenSpecStatus | null>` to the Zustand store state in `sources/sync/storage.ts` (initialized as `{}`)
- [x] 2.2 Add `updateProjectOpenSpecStatus(projectKey: string, status: OpenSpecStatus | null): void` action to the store
- [x] 2.3 Add `useSessionProjectOpenSpecStatus(sessionId: string): OpenSpecStatus | null` selector hook (derives project key from session metadata, same pattern as `useSessionProjectGitStatus`)

## 3. OpenSpec Sync Module

- [x] 3.1 Create `sources/sync/openspecSync.ts` — copy the structure of `gitStatusSync.ts`; class `OpenSpecSync` with `projectSyncMap`, `sessionToProjectKey`, `getSync(sessionId)`, `invalidate(sessionId)` methods
- [x] 3.2 Implement `fetchOpenSpecStatusForProject(sessionId, projectKey)` in `openspecSync.ts`: run the bash command via `sessionBash` with `cwd` set to the session's `metadata.path`
- [x] 3.3 The bash command: `{ find openspec -type f 2>/dev/null | sort; for f in openspec/changes/*/tasks.md openspec/changes/archive/*/tasks.md; do [ -f "$f" ] && printf "TASKS:%s:%s:%s\n" "$f" "$(grep -c '\[x\]' "$f" 2>/dev/null || echo 0)" "$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)"; done; } 2>/dev/null`
- [x] 3.4 Implement `parseOpenSpecOutput(stdout: string): OpenSpecStatus` — split lines by newline; lines starting with `TASKS:` parse as task stats (split on `:` max 4 parts); all other lines are file paths used to reconstruct the hierarchy
- [x] 3.5 In the parser: detect `hasOpenspec` by presence of any `openspec/` path; classify active changes as paths matching `openspec/changes/<name>/` (excluding `archive`); archived changes as `openspec/changes/archive/<name>/`; main specs as `openspec/specs/<name>/`
- [x] 3.6 Classify each artifact's `type` field: `proposal.md` → `'proposal'`, `design.md` → `'design'`, `tasks.md` → `'tasks'`, `.openspec.yaml` → `'config'`, files in `specs/` subdirs → `'spec'`, everything else → `'other'`
- [x] 3.7 Export a singleton `openspecSync` instance from `openspecSync.ts`

## 4. Explore Mode Toggle

- [x] 4.1 Add `exploreModeArmed: boolean` state (`useState(false)`) to `SessionViewLoaded` in `sources/-session/SessionView.tsx`
- [x] 4.2 Modify the `onSend` handler in `SessionViewLoaded`: when `exploreModeArmed` is true AND `message.trim()` is non-empty, prepend `/opsx:explore ` to the message before calling `sync.sendMessage`, then call `setExploreModeArmed(false)`
- [x] 4.3 Add `onExplorePress` prop to `AgentInput` in `sources/components/AgentInput.tsx` (optional `() => void`) and `exploreModeArmed?: boolean` prop
- [x] 4.4 Add the Explore toggle button to the `AgentInput` left toolbar: use `Ionicons` `"telescope-outline"` icon, 16px, secondary tint color when unarmed, primary/accent color when armed; place it as the first button on the left (before the gear); only render when `onExplorePress` is provided
- [x] 4.5 Wire `onExplorePress={() => setExploreModeArmed(prev => !prev)}` and `exploreModeArmed={exploreModeArmed}` from `SessionViewLoaded` to `AgentInput`; only pass `onExplorePress` when `session.active === true`

## 5. OpenSpec Sync Integration in Session View

- [x] 5.1 Import `openspecSync` singleton in `SessionView.tsx`; call `openspecSync.getSync(sessionId)` inside the `useLayoutEffect` that already calls `gitStatusSync.getSync(sessionId)`
- [x] 5.2 Add `onOpenspecPress` handler in `SessionViewLoaded`: navigate to `/session/${sessionId}/openspec` via `router.push`
- [x] 5.3 Read `openspecStatus` from `useSessionProjectOpenSpecStatus(sessionId)` in `SessionViewLoaded`
- [x] 5.4 Pass `openspecStatus` and `onOpenspecPress` as new props to `AgentInput`

## 6. OpenSpec Button in AgentInput

- [x] 6.1 Add `openspecStatus?: OpenSpecStatus | null` and `onOpenspecPress?: () => void` props to `AgentInputProps` interface
- [x] 6.2 Add the OpenSpec toolbar button to the left toolbar (after the Explore toggle, before the gear button): only render when `openspecStatus?.hasOpenspec === true` and `onOpenspecPress` is provided
- [x] 6.3 Use `Octicons` `"stack"` icon (or `"layers"` if available, else `"list-unordered"`) at 16px in secondary tint color
- [x] 6.4 Show a small numeric badge (circular pill with count text) overlaid on the icon when `openspecStatus.activeChanges.length > 0` — use a `View` positioned absolutely with the count as `Text`

## 7. OpenSpec Panel Screen

- [x] 7.1 Create `sources/app/(app)/session/[id]/openspec.tsx` — full-screen scrollable screen; read `sessionId` from `useLocalSearchParams<{ id: string }>()`
- [x] 7.2 Add a header using `ChatHeaderView` (or the standard navigation header) with title `t('openspec.panelTitle')` and a refresh `Ionicons "refresh"` button on the right that calls `openspecSync.invalidate(sessionId)`
- [x] 7.3 Read `openspecStatus` from `useSessionProjectOpenSpecStatus(sessionId)`; show `ActivityIndicator` when status is null and `lastUpdatedAt === 0`
- [x] 7.4 Implement the **Active Changes** section: section header "ACTIVE CHANGES (N)"; each change is a collapsible row (expanded by default) showing: change name, task progress bar (`View` with background fill proportional to `taskStats.completed / taskStats.total`), and text label "X/Y tasks" (or "No tasks file" if `taskStats` is null)
- [x] 7.5 When a change row is expanded, show its artifacts as tappable rows with `FileIcon` and filename; tapping navigates to `/session/[id]/file?path=<btoa(artifact.path)>`
- [x] 7.6 Below artifacts, show delta specs (if any) under a "specs/" sub-header; each spec group is a collapsible row showing its artifacts the same way
- [x] 7.7 Implement the **Main Specs** section: section header "MAIN SPECS (N)"; each spec group is a collapsible row (collapsed by default) that expands to show its `spec.md` file as a tappable row
- [x] 7.8 Implement the **Archived Changes** section: section header "ARCHIVED (N)"; entire section is collapsed by default; when expanded shows each archived change as a collapsible row (collapsed by default) that shows its artifacts when expanded
- [x] 7.9 Show empty state ("No active changes") in the Active Changes section when `activeChanges` is empty

## 8. Translation Strings

- [x] 8.1 Add the following keys to `sources/text/translations/en.ts` (in an `openspec` section): `panelTitle`, `activeChanges`, `mainSpecs`, `archived`, `noActiveChanges`, `tasksProgress`, `noTasksFile`, `refreshing`
- [x] 8.2 Add the same keys to all 8 remaining translation files: `ru.ts`, `pl.ts`, `es.ts`, `ca.ts`, `it.ts`, `pt.ts`, `ja.ts`, `zh-Hans.ts`
- [x] 8.3 Add the `openspec` section to `sources/text/_default.ts` (the default/fallback translation object)

## 9. Typecheck & QA

- [x] 9.1 Run `yarn workspace joyful-app typecheck` and fix all type errors
- [ ] 9.2 Verify: open a session in a directory with `openspec/` → OpenSpec button appears with correct active-change count
- [ ] 9.3 Verify: open a session in a directory without `openspec/` → no OpenSpec button
- [ ] 9.4 Verify: tap OpenSpec button → panel opens; active changes expanded; archived collapsed; main specs collapsed
- [ ] 9.5 Verify: tap any artifact file → file viewer opens with correct markdown content
- [ ] 9.6 Verify: tap Explore button → button highlights; send a message → message is prefixed with `/opsx:explore `; button resets
- [ ] 9.7 Verify: tap Explore button twice (arm then disarm) → no prefix applied on next send
- [ ] 9.8 Verify: tap refresh in panel header → data reloads within 2 seconds
