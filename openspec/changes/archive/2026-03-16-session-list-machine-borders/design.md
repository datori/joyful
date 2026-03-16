## Context

The session list in `joyful-app` groups active sessions by project path, then by machine within each project (`ActiveSessionsGroup.tsx`). Machine names appear in group headers only. Archived sessions have no machine context whatsoever — they render as a flat list.

When a user has two or more machines registered, identifying which session belongs to which machine requires reading group headers or tapping into a session. This is low-friction for one machine, but breaks down quickly with multiple.

## Goals / Non-Goals

**Goals:**
- Add a colored left border to each session row (active + archived) identifying its machine
- Suppress the feature entirely when only one machine is registered
- Use deterministic, stable color assignment so machine colors don't shift across app restarts

**Non-Goals:**
- Text machine labels on individual session rows (too noisy; addressed in explore phase)
- User-configurable machine colors
- Accessibility accommodations beyond color (patterns, icons) — out of scope for v1
- Any server, CLI, or wire protocol changes

## Decisions

### 1. Left border, not badge or tint

**Decision**: 3px colored `borderLeftWidth` on the session row container.

**Alternatives considered**:
- Inline chip/badge: adds text or bordered element to every row; rejected as too cluttered
- Avatar tint: harder to distinguish at a glance; clashes with existing status dot colors
- Row background tint: subtle and potentially confusing with selection state

Left border is an established pattern (Slack unread indicator, VS Code file tabs) and adds no layout shift — it occupies existing padding space.

### 2. Deterministic color via sort-stable machine index

**Decision**: Sort machines by `createdAt` ascending, assign palette index by position. The same `machineId` always maps to the same index as long as no machines are deleted.

**Alternatives considered**:
- Hash `machineId` directly to palette slot: simpler but collisions possible with small palettes; also produces arbitrary colors that don't track "first machine" = "primary"
- User-assigned colors: too much setup friction for the problem being solved

Sorting by `createdAt` gives a natural "first machine registered = index 0" ordering that matches user intuition.

### 3. Thread `machineColor` through `SessionListViewItem`, not resolve in component

**Decision**: `buildSessionListViewData()` in `storage.ts` resolves the color and attaches it to each `{ type: 'session' }` list item. Components receive it as a prop.

**Alternatives considered**:
- Look up `machineId` → color inside `SessionItem`/`CompactSessionRow`: requires passing the full machines map or a lookup function into every row component; breaks separation of concerns

Keeping components dumb is consistent with the existing pattern where `displayPath` and other derived values are pre-computed in storage.

### 4. Palette definition

**Decision**: 5 hardcoded hues drawn from Unistyles theme-compatible values. First machine (index 0) gets no border (`undefined`) since it's the "default" — this reduces noise further in the common 2-machine case.

Palette: `['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#E74C3C']` (blue, orange, green, purple, red). Chosen for mutual distinctness in both light and dark themes.

## Risks / Trade-offs

- **Colorblind accessibility** → Mitigation: colors are chosen for luminance contrast, not hue-only differentiation; acceptable for v1, can add patterns later
- **>5 machines** → Mitigation: colors cycle (palette index modulo length); rare edge case
- **Machine deleted and re-added** → sort order shifts, color changes for all subsequent machines → acceptable; machine deletion is a rare, manual action

## Open Questions

- Should the first machine (index 0) get a border or no border? Current decision: no border for index 0, border starts at index 1. Revisit if users find it confusing that "one machine has a border and the other doesn't."
