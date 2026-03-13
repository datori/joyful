## Context

The settings popup in `AgentInput.tsx` renders three stacked sections (permission mode, model, effort level) as vertical radio lists inside a `FloatingOverlay` with `maxHeight: 400`. With up to 13+ items and descriptions, the popup frequently requires scrolling, which is jarring in a chat UI — especially on smaller mobile screens where vertical space is at a premium.

The existing `FloatingOverlay` container and overall trigger mechanism (gear icon → `showSettings` state) are sound and will be preserved.

## Goals / Non-Goals

**Goals:**
- Reduce popup height so no scrolling is needed in the common case
- Present all three settings simultaneously without hiding any behind tabs
- Work well on both mobile (iOS/Android primary) and web

**Non-Goals:**
- Changing how settings are stored, wired, or communicated to the CLI
- Adding new settings or options
- Changing the trigger (gear icon) or the status bar display below the input

## Decisions

### Replace radio lists with horizontal chip rows

Each section (`permissionMode`, `model`, `effortLevel`) becomes a single horizontal row of tappable chips. The selected chip is highlighted (filled background); unselected chips are outlined. A `ScrollView horizontal` wraps each row so it degrades gracefully if options overflow (e.g., many models).

**Why chips over tabs?** Tabs would show one section at a time, requiring navigation. Chips show all three sections at once — no interaction needed to see what's available. The popup becomes a glanceable summary with tappable choices.

**Why remove descriptions from the popup?** Descriptions are long (1–2 lines each) and multiply the row count. The status bar already surfaces the selected option name. Power users know the options; new users can explore without needing descriptions inline. This alone eliminates ~60% of the popup height.

### Keep the FloatingOverlay container

No new libraries or sheet primitives needed. The overlay is repositioned absolutely above the input, which works on all platforms. The `maxHeight` can be reduced significantly (from 400 to ~260) once descriptions are gone and layout is horizontal.

### Chip sizing and wrapping

Chips use `paddingHorizontal: 10, paddingVertical: 5` with a `borderRadius: 12`. Font size 13. On narrow screens (<320px) option names are truncated with ellipsis. `ScrollView` is horizontal with `showsHorizontalScrollIndicator: false`.

## Risks / Trade-offs

- **Discoverability of descriptions**: Users who relied on hover/read descriptions to learn options lose that. Mitigation: descriptions remain accessible (future: long-press tooltip), and the status bar shows current selection.
- **Many models overflow**: If the CLI exposes 8+ models, the chip row will require horizontal scroll. Mitigation: horizontal `ScrollView` handles this gracefully; most users have ≤5 models.
- **Small chip tap targets on mobile**: Chips at 13px font with vertical padding of 5 give ~34px tap height — within acceptable range for mobile. `hitSlop` can be added if QA feedback warrants it.
