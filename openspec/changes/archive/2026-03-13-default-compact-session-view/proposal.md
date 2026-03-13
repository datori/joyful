## Why

The compact session view is the better experience for most users — it shows more sessions without scrolling and reduces visual noise. Currently users must discover and manually enable it via Appearance settings; the expanded view (which is less useful as a default) is what everyone sees out of the box.

## What Changes

- Change `compactSessionView` setting default from `false` to `true` so compact is shown by default
- Invert the appearance toggle: rename it from "Compact Session View" to "Expanded Session View" (users now opt **in** to expanded, not compact)
- Update the toggle description to match the new framing
- Update all 9 language translation files with the new label and description strings

## Capabilities

### New Capabilities

- `session-view-default`: The session list display mode setting — compact is the default, expanded is the opt-in variant. Covers the toggle label, description, default value, and inversion logic.

### Modified Capabilities

<!-- No existing specs cover this feature -->

## Impact

- `packages/joyful-app/sources/sync/settings.ts` — default value change for `compactSessionView`
- `packages/joyful-app/sources/app/(app)/settings/appearance.tsx` — toggle label/description and inversion of the bound value
- `packages/joyful-app/sources/text/translations/*.json` + `sources/text/_default.ts` — 9 language files updated with new strings
