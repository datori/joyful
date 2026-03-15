## Context

Three independent mobile UI bugs in `joyful-app`. All fixes are confined to `sources/components/` and require no protocol, server, or CLI changes.

**Message wrapping**: `agentMessageContainer` uses `alignSelf: 'flex-start'` (shrink-to-content) with no `maxWidth`. React Native's Yoga layout measures intrinsic content width before constraining, so long unbreakable strings (paths, identifiers, URLs) widen the container past the screen edge instead of wrapping.

**Machines panel on mobile**: `MachinesSidebarPanel` is only rendered in the `variant === 'sidebar'` branch of `MainView`. The phone branch's sessions tab has no equivalent. The component is already self-contained (handles 0-machine case, collapsible).

**Autocomplete popup position**: The `autocompleteOverlay` in `AgentInput` is `position: absolute, bottom: '100%'` relative to the entire `AgentInput` root View. When the keyboard is open, the input animates upward via `translateY` (in `AgentContentView.ios.tsx`), but `bottom: '100%'` is still calculated from the full (pre-keyboard) `AgentInput` height — which includes attachment chips, settings rows, etc. — pushing the popup further up the screen than intended.

## Goals / Non-Goals

**Goals:**
- Agent message text always wraps within the visible screen width on phones.
- Machine/RAM info visible on mobile sessions tab (matching desktop sidebar parity).
- Slash-command popup appears directly above the input bar on mobile, hovering over chat messages, not mid-screen.

**Non-Goals:**
- No changes to desktop/tablet layout or sidebar.
- No changes to the autocomplete popup on web.
- No new data fetching or server communication.

## Decisions

### 1. Message wrapping: `maxWidth: '100%'` on `agentMessageContainer`

Add `maxWidth: '100%'` to the existing `agentMessageContainer` style. This caps the container at its parent's computed width (`messageContent`, which is `flexGrow:1, flexBasis:0` — the full row width). The existing `alignSelf: 'flex-start'` is preserved so agent messages don't stretch full-width unnecessarily; `maxWidth` just prevents overflow.

**Alternative considered**: Remove `alignSelf: 'flex-start'` entirely (let agent messages stretch). Rejected — the visual intent is that agent message containers don't forcibly stretch; they're sized to content up to the screen width.

### 2. Machines panel: insert above sessions list in phone tab

In `MainView.tsx`, in the `renderTabContent` callback, for the `'sessions'` case: wrap the existing `SessionsListWrapper` in a `View` with `flex: 1`, and prepend `MachinesSidebarPanel` above it. Since `MachinesSidebarPanel` returns `null` when there are no machines, no guard is needed.

**Alternative considered**: Add a dedicated screen or header. Rejected — the sidebar panel component is designed for exactly this inline use; reusing it keeps the diff minimal.

### 3. Autocomplete popup: anchor to input bar, not full AgentInput

The root cause is that `position: absolute, bottom: '100%'` is relative to the AgentInput's full View bounds. The fix is to wrap only the text input row (not the full component) in a `View` with `position: 'relative'`, and move the `autocompleteOverlay` inside that inner wrapper. This makes `bottom: '100%'` relative to just the input row height, placing the popup immediately above the text field regardless of how tall the surrounding AgentInput component grows.

**Alternative considered**: Render the overlay as a sibling outside `AgentInput` (in `SessionView` or `AgentContentView`). Rejected — it would require threading callbacks and measurement refs through multiple layers, making the diff much larger.

**Alternative considered**: Use a fixed pixel offset calculated from keyboard height. Rejected — fragile across device sizes and keyboard types.

## Risks / Trade-offs

- **Wrapping fix**: `maxWidth: '100%'` in a flex-start context is well-supported by Yoga. No known risk.
- **Machines panel on mobile**: The panel is always-on; if a user has many machines, the sessions list is pushed down. Acceptable — same behavior as desktop sidebar. The panel is collapsible.
- **Autocomplete anchor change**: Moving the overlay anchor from the full AgentInput to the inner input row requires careful reading of the JSX structure to find the right wrapping point. If the input row view is nested inside other views that add margin/padding, the popup may be offset. Should be verified on device.
