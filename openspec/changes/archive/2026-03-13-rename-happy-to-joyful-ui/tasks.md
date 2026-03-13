## 1. Update Translation String Values

- [x] 1.1 Update `en.ts` — replace all "Happy Coder" → "Joyful Coder" and "Happy" → "Joyful" in string values
- [x] 1.2 Update `ru.ts` — same replacements
- [x] 1.3 Update `pl.ts` — same replacements
- [x] 1.4 Update `es.ts` — same replacements
- [x] 1.5 Update `ca.ts` — same replacements
- [x] 1.6 Update `it.ts` — same replacements
- [x] 1.7 Update `pt.ts` — same replacements
- [x] 1.8 Update `ja.ts` — same replacements
- [x] 1.9 Update `zh-Hans.ts` — same replacements
- [x] 1.10 Update `zh-Hant.ts` — same replacements

## 2. Verify

- [x] 2.1 Run `grep -r "Happy" packages/joyful-app/sources/text/translations/` and confirm zero remaining hits
- [x] 2.2 Run `yarn workspace joyful-app typecheck` to confirm no type errors
