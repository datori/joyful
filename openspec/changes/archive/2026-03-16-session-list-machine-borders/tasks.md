## 1. Color Utility

- [x] 1.1 Add `getMachineColor(machineId: string, machines: Record<string, Machine>): string | undefined` to `machineUtils.ts` — sorts machines by `createdAt`, returns `undefined` for index 0, cycles through palette for index 1+
- [x] 1.2 Define the 5-color palette constant in `machineUtils.ts`: `['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#E74C3C']`

## 2. Storage — Thread Color Through List Items

- [x] 2.1 Add `machineColor?: string` to the `{ type: 'session' }` variant of `SessionListViewItem` in `storage.ts`
- [x] 2.2 In `buildSessionListViewData()`, compute `machineCount = Object.keys(machines).length` and only resolve colors when `machineCount >= 2`
- [x] 2.3 For each session item pushed to the list, call `getMachineColor(session.metadata?.machineId, machines)` and attach as `machineColor`

## 3. Active Sessions Rendering

- [x] 3.1 In `ActiveSessionsGroup.tsx`, pass `machineColor` from the session list item (or derive via `getMachineColor`) to the `CompactSessionRow` / session row component
- [x] 3.2 Apply `borderLeftWidth: 3, borderLeftColor: machineColor` to the session row container in `ActiveSessionsGroup.tsx` when `machineColor` is defined

## 4. Archived Sessions Rendering

- [x] 4.1 In `SessionsList.tsx`, read `machineColor` from the `{ type: 'session', variant: 'archived' }` item
- [x] 4.2 Apply `borderLeftWidth: 3, borderLeftColor: machineColor` to the archived session row container when `machineColor` is defined

## 5. Typecheck

- [x] 5.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
