## 1. Wire schema

- [x] 1.1 Add `memTotal`, `memFree`, `memDaemonRss` as optional number fields to `DaemonStateSchema` in `joyful-wire`

## 2. CLI daemon — collect and report memory stats

- [x] 2.1 In `apiMachine.ts` `updateDaemonState()`, include `memTotal: os.totalmem()`, `memFree: os.freemem()`, `memDaemonRss: process.memoryUsage().rss` in the state payload
- [x] 2.2 Add a 60-second interval in `apiMachine.ts` that calls `updateDaemonState()` to refresh memory stats periodically (clear interval on disconnect/destroy)

## 3. App — display memory indicator

- [x] 3.1 Add a `formatMemory(bytes: number): string` helper (e.g., `"12.3 GB"`) in `joyful-app` utils
- [x] 3.2 Find where machine cards/rows are rendered and add a memory usage line (e.g., `"12.3 / 16.0 GB used"`) using `daemonState.memFree` and `daemonState.memTotal`; hide when fields are absent
- [x] 3.3 Add i18n string for the memory display label to all 10 translation files

## 4. Sidebar panel (post-planning addition)

- [x] 4.1 Create `MachinesSidebarPanel` component — collapsible section above sessions list showing all machines with online dot and memory usage, tappable to machine detail
- [x] 4.2 Wire `MachinesSidebarPanel` into `MainView` sidebar variant above session content
- [x] 4.3 Add `sidebar.machines` i18n key to all 10 translation files

## 5. Typecheck

- [x] 5.1 Run `yarn workspace joyful-app typecheck` and fix any errors
- [x] 5.2 Run `yarn workspace joyful build` and fix any CLI build errors
