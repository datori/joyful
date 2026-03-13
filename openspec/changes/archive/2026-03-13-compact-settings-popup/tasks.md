## 1. Refactor Popup Overlay Layout

- [x] 1.1 Replace the permission mode radio list in the settings overlay (AgentInput.tsx ~lines 571–631) with a horizontal chip row — one chip per available mode, selected chip highlighted
- [x] 1.2 Replace the model radio list (AgentInput.tsx ~lines 640–722) with a horizontal chip row — wrap in a horizontal ScrollView so extra models scroll
- [x] 1.3 Replace the effort level radio list (AgentInput.tsx ~lines 724–805) with a horizontal chip row — same pattern, only shown when availableEffortLevels.length > 0
- [x] 1.4 Remove per-option description text from all three sections in the overlay

## 2. Styling

- [x] 2.1 Add chip styles to the AgentInput StyleSheet: container chip row (`flexDirection: 'row'`, `flexWrap: 'nowrap'`), individual chip (border, borderRadius, padding), selected chip variant (filled background + contrasting text)
- [x] 2.2 Reduce overlay `maxHeight` from 400 to an appropriate smaller value (~260) now that descriptions and tall radio rows are gone
- [x] 2.3 Verify chip tap targets are adequate on mobile (min ~34px height); add `hitSlop` if needed

## 3. Verification

- [x] 3.1 Manually test on web: open popup, verify all three sections visible without scroll, tap chips to change each setting
- [x] 3.2 Run `yarn workspace joyful-app typecheck` and confirm no type errors
