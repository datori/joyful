## 1. Settings default

- [x] 1.1 In `packages/joyful-app/sources/sync/settings.ts`, change `compactSessionView` default from `false` to `true`

## 2. Appearance toggle UI

- [x] 2.1 In `packages/joyful-app/sources/app/(app)/settings/appearance.tsx`, invert the Switch binding: read `!compactSessionView` for the displayed value and write `!value` on change
- [x] 2.2 Update the toggle title key from `settingsAppearance.compactSessionView` to `settingsAppearance.expandedSessionView`
- [x] 2.3 Update the toggle description key from `settingsAppearance.compactSessionViewDescription` to `settingsAppearance.expandedSessionViewDescription`

## 3. Translation strings

- [x] 3.1 In `packages/joyful-app/sources/text/_default.ts`, replace `compactSessionView` / `compactSessionViewDescription` keys with `expandedSessionView` / `expandedSessionViewDescription` and set appropriate English values
- [x] 3.2 Update all 9 language files under `packages/joyful-app/sources/text/translations/` (en, ru, pl, es, ca, it, pt, ja, zh-Hans) with the new keys and translated strings

## 4. Verification

- [x] 4.1 Run `yarn workspace joyful-app typecheck` and confirm no type errors
