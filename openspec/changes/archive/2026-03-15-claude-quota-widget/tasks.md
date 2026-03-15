## 1. Wire Schema — DaemonState quota fields

- [x] 1.1 Add `claudeQuota5hUtil`, `claudeQuota5hReset`, `claudeQuota7dUtil`, `claudeQuota7dReset`, `claudeQuota5hUtil` (all `z.number().optional()` or `z.string().optional()`) and `claudeQuotaFetchedAt` (`z.number().optional()`) to `DaemonStateSchema` in `joyful-cli/src/api/types.ts`
- [x] 1.2 Verify TypeScript compiles cleanly in joyful-cli (`yarn workspace joyful build` or typecheck)

## 2. CLI Daemon — fetch-quota RPC handler

- [x] 2.1 Create `joyful-cli/src/daemon/quotaFetcher.ts` that scans `~/.claude/projects/**/*.jsonl` for token usage within 5h and 7d rolling windows, reads `rateLimitTier` from `~/.claude/.credentials.json` to select estimated tier limits, computes utilization (0–1) and reset timestamps, and returns a typed result object or error. **Note**: The Anthropic Messages API returns 401 for OAuth tokens (`sk-ant-oat01-...`) used by Pro/Max subscribers — the API-ping approach is not viable for subscription users. JSONL parsing is the universally-working alternative.
- [x] 2.2 Register a `fetch-quota` RPC handler in `joyful-cli/src/api/apiMachine.ts` (alongside existing handlers) that calls `quotaFetcher`, calls `updateDaemonState()` with parsed quota fields on success, and returns `{ type: 'success' }` or `{ type: 'error', reason: string }`
- [x] 2.3 Verify the handler is wired into the daemon correctly by checking the handler registration in `run.ts`

## 3. App — useClaudeQuota hook

- [x] 3.1 Create `joyful-app/sources/hooks/useClaudeQuota.ts` that reads quota fields from the first machine with `claudeQuota5hUtil` present in its `daemonState`
- [x] 3.2 Add `AppState` listener (foreground event) that sends `fetch-quota` RPC to the first online machine via the existing RPC mechanism
- [x] 3.3 Add a 5-minute interval (while app is foregrounded) that sends `fetch-quota` RPC to the first online machine; cancel interval on background
- [x] 3.4 Ensure the hook returns `null` when no quota data is available (panel will be hidden)
- [x] 3.5 Expose `refresh` callback from the hook (`{ quota, refresh }`) so the panel can trigger an on-demand fetch

## 4. App — ClaudeQuotaPanel component

- [x] 4.1 Create `joyful-app/sources/components/ClaudeQuotaPanel.tsx` with two rows (5h and 7d); each row has a 3pt bar with absolutely-positioned 1pt time-cursor tick and a label string
- [x] 4.2 Implement bar fill colour logic: muted (on-pace), amber (>20pp over elapsed), red (>85% utilization)
- [x] 4.3 Implement reset countdown label: `"in Xh Ym"` format for 5h window; day-of-week short name (`"Mon"`) for 7d window when reset is on a recognisable day
- [x] 4.4 Implement time-cursor position calculation: `elapsed = (windowDuration - (resetTime - now)) / windowDuration`, clamped to [0, 1]; 5h window = 5×3600s; 7d window = 7×86400s
- [x] 4.5 Add staleness label below bars when `claudeQuotaFetchedAt` is older than 5 hours (e.g. `"updated 6h ago"`)
- [x] 4.6 Return `null` from the component when quota data is absent (hides panel entirely)
- [x] 4.7 Add Unistyles stylesheet at end of file; use `theme.colors.textSecondary` and `theme.colors.destructive` for bar colours
- [x] 4.8 Add manual refresh button (`Ionicons refresh-outline`, 13pt) pinned to top-right of panel; calls `onRefresh` prop when tapped

## 5. App — i18n strings

- [x] 5.1 Add `quota.fiveHour`, `quota.sevenDay`, `quota.updatedAgo`, `quota.inTime` (or equivalent keys) to all 9 translation files in `joyful-app/sources/text/translations/` (en, ru, pl, es, ca, it, pt, ja, zh-Hans)
- [x] 5.2 Replace any hardcoded strings in `ClaudeQuotaPanel.tsx` with `t(...)` calls

## 6. App — Sidebar integration

- [x] 6.1 Import and render `<ClaudeQuotaPanel>` above `<MachinesSidebarPanel>` in the sidebar layout file (locate the sidebar composition component)
- [x] 6.2 Confirm `useClaudeQuota` hook is called at the sidebar level (or passed as props to the panel)

## 7. Typecheck and review

- [x] 7.1 Run `yarn workspace joyful-app typecheck` — fix any TypeScript errors
- [x] 7.2 Visually verify panel in web dev server (`yarn web`) with mock `daemonState` values: panel appears, bars render, time cursor is visible, colours change appropriately
- [x] 7.3 Verify panel is hidden when no quota fields are present in any machine's `daemonState`

