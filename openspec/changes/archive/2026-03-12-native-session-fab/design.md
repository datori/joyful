## Context

The `FABWide` component currently renders a single "New Session" button floating above the sessions list. The `NativeSessionBrowser` modal, shipped in `native-session-browser`, is only reachable via a conditional inline link inside the new-session wizard — invisible until the user selects both a machine and a path.

The goal is to surface native session resumption as a parallel first-class action at the same level as starting a new session.

## Goals / Non-Goals

**Goals:**
- Replace the single FAB with a split FAB: "New Session" (left/primary) + "Resume" (right/secondary)
- The "Resume" action opens a lightweight machine+path picker, then the `NativeSessionBrowser` modal
- Remove the redundant inline link from the new-session wizard
- Only the "Resume" side is disabled when no online machine is available

**Non-Goals:**
- Cross-machine or directory-scanning session discovery (path is still required)
- Persisting recently-used paths (nice-to-have, out of scope)
- Changes to the daemon or RPC layer (all backend work is done)

## Decisions

### Split FAB layout
Two buttons side-by-side in the same floating container: "New Session" takes ~60% width (primary action), "Resume" takes ~40% (secondary). Both use the same `fab` theme colors. Vertical divider between them.

**Why not two separate FABs?** Single container keeps the visual footprint the same, avoids z-index/positioning complexity, and signals that both actions are in the same "start a session" category.

### Machine+path picker in a modal, not a separate screen
The "Resume" tap opens a modal (not a new route) that contains:
1. Machine selector (dropdown/list if >1 machine, auto-selected if only 1 online)
2. Path text input
3. "Find Sessions" → fetches and opens `NativeSessionBrowser`

**Why not a separate screen?** The interaction is quick (pick machine, type path, browse). A modal avoids the navigation stack overhead and keeps the sessions list visible behind it.

### State lives in the modal
The machine+path picker modal owns its own state (`selectedMachineId`, `directory`). On confirm it passes those values into `NativeSessionBrowser` (which already accepts `machineId` and `directory` as props). The `MainView` only tracks `resumePickerVisible: boolean`.

### Remove wizard inline link
The conditional "Browse native sessions" link in `new/index.tsx` is removed. The split FAB is the canonical entry point. This simplifies the wizard and removes duplicated state (`nativeBrowserVisible`, `resumeNativeSessionId` state in new/index already handles spawning on confirm).

**Note:** The wizard still passes `resumeNativeSessionId` to `machineSpawnNewSession` — that wiring stays because `NativeSessionBrowser.onResume` still routes through it (now triggered from the modal rather than from inside the wizard).

### How spawning works from the FAB path
`NativeSessionBrowser.onResume(session)` → parent modal calls `machineSpawnNewSession` with `resumeNativeSessionId` → navigates to the new session (same flow as before, just triggered outside the wizard). The `new/` wizard is not involved.

## Risks / Trade-offs

- [Narrow screen] Two buttons may be cramped on small phones → Mitigation: "Resume" label abbreviated to an icon + short text, or icon-only on very small screens. Use `flexShrink` on the resume side.
- [No machines online] Resume button should appear disabled (greyed) with a tooltip/toast explaining why → Mitigation: `disabled` prop + opacity, same pattern as wizard.
- [Only 1 machine] Machine selector step can be skipped, auto-selecting the single online machine for a faster flow.
