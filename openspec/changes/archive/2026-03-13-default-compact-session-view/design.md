## Context

The app has a `compactSessionView` boolean setting (default: `false`) that controls whether the sessions list renders `ActiveSessionsGroupCompact` or `ActiveSessionsGroup`. Currently users must opt in to compact view via Appearance settings. The compact view is strictly better as a default: it shows more sessions without scrolling and reduces visual noise.

The appearance toggle currently reads "Compact Session View" — enabling it turns on compact. After this change, the toggle reads "Expanded Session View" — enabling it turns on the expanded (non-compact) view.

## Goals / Non-Goals

**Goals:**
- Compact view is shown to all users by default (new and existing)
- The Appearance toggle allows opting into expanded view instead
- All translation strings updated across 9 languages

**Non-Goals:**
- Migrating existing user preferences — users who previously toggled compact ON will now be toggled to `false` (expanded). This is an acceptable edge case since the new default is what they wanted anyway; the semantics invert cleanly.
- Changing the underlying setting key name (`compactSessionView` stays as-is)

## Decisions

**Keep `compactSessionView` key, change default to `true`**
Alternatives: rename to `expandedSessionView` (inverted polarity) or add a new setting. Keeping the same key is the minimal diff — only the default and UI label change. The key name is internal; users never see it.

**Invert the toggle binding in the UI**
The `Switch` in `appearance.tsx` currently binds directly to `compactSessionView`. After the change the toggle represents "Expanded Session View", so the switch value must be `!compactSessionView` and the `onValueChange` must write `!value`. This keeps the stored boolean correct while presenting the right user-facing polarity.

## Risks / Trade-offs

- **Existing users with `compactSessionView: false` (the old default)**: Their stored preference was "I want expanded view" and after the change `false` means the same thing (expanded). No behavior change for them. ✓
- **Existing users with `compactSessionView: true` (manually opted in to compact)**: Their stored preference was "I want compact view" and after the change `true` still means compact. No behavior change for them either. ✓
- **Net effect**: Only brand-new users (or users who never changed the setting) are affected — they get compact by default instead of expanded. This is the desired outcome.
