## 1. Data Layer

- [x] 1.1 Add `archived-section-header` item type to `SessionListViewItem` union in `storage.ts` with shape `{ type: 'archived-section-header'; count: number }`
- [x] 1.2 Modify `buildSessionListViewData` in `storage.ts` to replace per-date `header` items for inactive sessions with a single `archived-section-header` item (count = number of inactive sessions) followed by flat `session` items with `variant: 'archived'`
- [x] 1.3 Update `useVisibleSessionListViewData` hook to filter out `archived-section-header` items and `variant: 'archived'` session items when `hideInactiveSessions` is true

## 2. UI — Sessions List

- [x] 2.1 Add `isArchivedExpanded` state (default `false`) to `SessionsList`
- [x] 2.2 Add render case for `archived-section-header` in `SessionsList.renderItem`: shows "Archived (N)" label with a chevron, toggles `isArchivedExpanded` on press
- [x] 2.3 Filter out `variant: 'archived'` session items from the rendered data when `isArchivedExpanded` is `false`
- [x] 2.4 Apply visual de-emphasis for `variant: 'archived'` session rows: `opacity: 0.55` wrapper and slightly smaller title font size

## 3. i18n

- [x] 3.1 Add `sessionList.archived` string to `_default.ts` (English: "Archived") and all 10 translation files (en, ru, pl, es, ca, it, pt, ja, zh-Hans, zh-Hant)

## 4. Typecheck

- [x] 4.1 Run `yarn workspace joyful-app typecheck` and fix any type errors
