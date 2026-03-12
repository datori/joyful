## Context

The sessions list currently shows active sessions at the top (in `active-sessions` group) and all inactive sessions below them, grouped by date headers (Today, Yesterday, N days ago). This interleaving means archived/inactive sessions take up significant list space even though they're rarely the primary focus.

"Archive" in the current UI calls `sessionKill`, stopping the session — the session remains as `active: false`. There is no separate "archived" field; inactive == archived for display purposes.

The `Session` type has `active: boolean`. `buildSessionListViewData` in `storage.ts` already separates active vs inactive sessions, then groups inactives by date. `SessionListViewItem` is a union type with `header`, `active-sessions`, `project-group`, and `session` variants.

## Goals / Non-Goals

**Goals:**
- Inactive sessions appear in a collapsed "Archived" section at the bottom of the list
- Section is collapsed by default; tapping header expands/collapses
- Archived session rows are visually de-emphasized (dimmer, slightly smaller)
- `hideInactiveSessions` setting continues to work (hides archived section entirely)

**Non-Goals:**
- No new backend fields or API changes
- No changes to how archive/delete actions work
- No persistence of the expanded/collapsed state across app restarts
- No changes to the date-grouping for active sessions

## Decisions

**Decision 1: New `archived-section-header` list item type**

Add `{ type: 'archived-section-header'; count: number }` to the `SessionListViewItem` union. Replace the per-date `header` items and `session` items for inactive sessions with this single header followed by flat (non-date-grouped) `session` items with `variant: 'archived'`.

Alternatives considered:
- Keep `type: 'header'` date groups and handle collapsing entirely in `SessionsList` by tracking which items to skip — rejected because the data and rendering logic become entangled; the list component would need to understand the semantics of the data structure.
- Add a single `archived-sessions` container item (like `active-sessions`) — would require `SessionsList` to render a nested list; complicates scroll behavior.

**Decision 2: Collapse state lives in `SessionsList` component**

`isArchivedExpanded: boolean` (default `false`) as `useState` in `SessionsList`. Not persisted — reset to collapsed on every mount. This is intentional: the primary view should be clean on every open.

**Decision 3: Drop date grouping within archived section**

The date headers (Today, Yesterday, N days ago) for inactive sessions are removed. Inside the archived section, sessions are shown flat sorted by `updatedAt DESC`. The collapsed-by-default nature means the section is rarely browsed; date granularity is low-value here.

**Decision 4: Visual treatment for archived rows**

Wrap archived session rows in a `View` with `opacity: 0.55` and reduce title font size by ~1pt (via the `variant: 'archived'` prop passed down to `SessionRow`). Do not change row height — keeps scroll math simple and avoids layout jank.

## Risks / Trade-offs

- [Existing `type: 'header'` items currently only exist for inactive sessions] → After this change, `type: 'header'` items will no longer appear in the list data at all (replaced by `archived-section-header`). The `SessionsList` `renderItem` case for `header` becomes dead code — leave it in place for safety, remove in a follow-up.
- [hideInactiveSessions hook] → `useVisibleSessionListViewData` must filter out `archived-section-header` items and `session` items with `variant: 'archived'` when the setting is on. Currently it only checks `item.session.active` for session items — the filter logic needs a small update.

## Open Questions

None — scope is fully defined.
