## Why

The native session browser (recently shipped) is only reachable via a conditional link buried mid-wizard — visible only after the user has already selected a machine and path. This makes session discovery feel like a hidden afterthought rather than a first-class action. Users who want to resume a Claude Code session have to commit to the new-session flow before they can even discover what's available.

## What Changes

- Replace the single `FABWide` ("New Session") with a split FAB: left side starts a new session, right side opens a "Resume from Claude Code" flow
- The "Resume" side opens a lightweight path/machine picker (pre-filling recently-used paths), then immediately shows the `NativeSessionBrowser` modal
- Remove the conditional "Browse native sessions" inline link from the new session wizard (it becomes redundant)

## Capabilities

### New Capabilities
- `native-session-fab`: Split FAB UI pattern with a dedicated "Resume native session" entry point accessible from the main sessions list screen

### Modified Capabilities
- `native-session-browser`: Entry point changes — no longer embedded in the new-session wizard; triggered from the split FAB instead

## Impact

- `packages/joyful-app/sources/components/FABWide.tsx` — replaced with a split-button variant
- `packages/joyful-app/sources/components/MainView.tsx` — renders the new split FAB
- `packages/joyful-app/sources/components/NativeSessionBrowser.tsx` — now needs to work standalone (machine + directory state managed at the FAB level, not wizard level)
- `packages/joyful-app/sources/app/(app)/new/index.tsx` — remove the inline "Browse native sessions" trigger and associated state
- i18n strings for the new FAB label
