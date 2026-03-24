## 1. Model options cleanup (modelModeOptions.ts)

- [x] 1.1 Remove `default` and `claude-haiku-4-5` entries from `getClaudeModelModes()`, keeping only `claude-sonnet-4-6`, `claude-sonnet-4-6[1m]`, `claude-opus-4-6`, `claude-opus-4-6[1m]`
- [x] 1.2 Remove Bedrock entries from `getClaudeModelModes()` (out of scope for this fork)
- [x] 1.3 Update `getDefaultModelKey()` to return `'claude-sonnet-4-6'` for Claude flavor (instead of `'default'`)

## 2. Legacy key fallback (AgentInput / SessionView)

- [x] 2.1 In `resolveCurrentOption` call site (SessionView.tsx), add fallback logic: if stored model key is `'default'` or `'claude-haiku-4-5'`, resolve to `'claude-sonnet-4-6'`

## 3. Remove agent selector button (AgentInput.tsx)

- [x] 3.1 Remove the `agentType && onAgentClick` agent selector `Pressable` block from the action row (the cpu icon + "Claude" text button)

## 4. Replace gear icon with inline model toggles (AgentInput.tsx)

- [x] 4.1 Remove the gear settings `Pressable` button from the action row
- [x] 4.2 Remove the floating overlay (`showSettings` state, `FloatingOverlay`, settings chip rows) for Claude sessions — guard existing overlay on `!isClaude` so Codex/Gemini retain it
- [x] 4.3 Add a `ModelToggle` helper (inline in AgentInput or small extracted component) that renders two pressable pairs: `[Sonnet] [Opus]` and `[Std] [1M]`
- [x] 4.4 Derive `tier` (`'sonnet'|'opus'`) and `ctx` (`'std'|'1m'`) from `props.modelMode?.key`
- [x] 4.5 On tier toggle press: compute new key as `claude-${newTier}-4-6${ctx === '1m' ? '[1m]' : ''}` and call `props.onModelModeChange`
- [x] 4.6 On context toggle press: compute new key as `claude-${tier}-4-6${newCtx === '1m' ? '[1m]' : ''}` and call `props.onModelModeChange`
- [x] 4.7 Style: selected segment gets `theme.colors.button.primary.background` fill; unselected is transparent — matching the existing explore/patch button style

## 5. Effort and permission tap-to-cycle selectors (AgentInput.tsx)

- [x] 5.1 Add a `cycleNext<T extends { key: string }>(options: T[], currentKey: string): T` helper function
- [x] 5.2 Add a compact effort selector `Pressable` on the right side of the action row: shows `effortLevel.name` (or `t('agentInput.effort.default')` when key is `'default'`), calls `cycleNext(availableEffortLevels, currentKey)` on press
- [x] 5.3 Add a compact permission selector `Pressable` to the right of the effort selector: shows `permissionMode.name`, calls `cycleNext(availableModes, currentKey)` on press
- [x] 5.4 Style both selectors: `fontSize: 11`, `color: theme.colors.textSecondary`, no background, `hitSlop` for tap target; use `hapticsLight()` on press
- [x] 5.5 Keep the destructive-mode color logic for permission (yolo/bypassPermissions uses `theme.colors.success`, not textSecondary)

## 6. Remove status bar right column for Claude sessions (AgentInput.tsx)

- [x] 6.1 Guard the right-column `View` (permission mode text, model name text, effort badge) so it is hidden when `isClaude` is true

## 7. Translation / i18n hygiene

- [x] 7.1 Check translation keys: if any keys referenced only the removed `default` model or Haiku model names exist in translation files, remove them from all 9 language files

## 8. Typecheck and verify

- [x] 8.1 Run `yarn workspace joyful-app typecheck` and fix any TypeScript errors
- [x] 8.2 Visual smoke test: open a Claude session, confirm toggles render, both toggle pairs work, effort and permission selectors cycle correctly, no "claude" label visible, status bar right column absent
