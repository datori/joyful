## Context

`AgentInput.tsx` is the central input component used for both new session creation and active session messaging. It renders:
- A status bar row above the input (connection status left, permission/model/effort right)
- An optional machine+path box
- The text input field
- An action row below the input: OpenSpec/explore/patch buttons, gear icon, profile selector, agent selector, abort button, send button
- A floating overlay (opened by the gear) with chip rows for permission mode, model, and effort level

`modelModeOptions.ts` defines the hardcoded Claude model list (default, Opus 4.6, Opus 4.6 1M, Sonnet 4.6, Sonnet 4.6 1M, Haiku 4.5, Bedrock variants).

This change simplifies the UI surface for this fork's single-agent (Claude-only) context.

## Goals / Non-Goals

**Goals:**
- Remove the gear overlay pattern for model selection; expose it inline
- Surface Sonnet/Opus and Std/1M as two binary toggles where the gear was
- Move effort and permission to compact tap-to-cycle selectors on the right of the action row
- Remove the "claude" agent label and the status bar right column (both now redundant)
- Remove Haiku and `default` model key from the hardcoded Claude model list

**Non-Goals:**
- Changing how models are stored or sent to the CLI (wire protocol unchanged)
- Modifying Codex or Gemini session UI (those flavors retain their existing gear pattern)
- Adding bedrock model toggles (Bedrock options are out of scope)
- Changing the Shift+Tab keyboard shortcut (retains existing permission cycling)

## Decisions

### D1: Binary toggles, not segmented control component

Two `Pressable` pairs rendered inline (like existing action row buttons) rather than a generic `SegmentedControl` component. **Why**: avoids introducing a new abstraction for a two-use case; the visual style (filled vs transparent background) is already established for action row buttons.

The toggle state is derived from the current model key:
```
tier = modelKey.startsWith('claude-opus') ? 'opus' : 'sonnet'
context = modelKey.endsWith('[1m]') ? '1m' : 'std'
```
Changing either toggle recombines:
```
newKey = `claude-${tier}-4-6${context === '1m' ? '[1m]' : ''}`
```

### D2: Tap-to-cycle for effort and permission

A single `Pressable` per setting showing the current value label. Each tap calls a `cycleNext(options, currentKey)` helper that finds the current index and returns `options[(i + 1) % options.length]`. **Why**: no overlay needed; fast for the common case (cycling through 4–5 options); keeps the action row uncluttered.

Visual style: `fontSize: 11`, `color: theme.colors.textSecondary` with no background. Slightly larger tap target via `hitSlop`. Uses the existing `hapticsLight()` on tap.

### D3: Fallback for legacy model keys

Sessions stored with `model: 'default'` or `model: 'claude-haiku-4-5'` SHALL resolve to `claude-sonnet-4-6` in `resolveCurrentOption`. No migration of persisted data needed — the resolution happens at read-time in `modelModeOptions.ts`.

`getClaudeModelModes()` is slimmed to four entries:
```
claude-sonnet-4-6      Sonnet 4.6
claude-sonnet-4-6[1m]  Sonnet 4.6 (1M)
claude-opus-4-6        Opus 4.6
claude-opus-4-6[1m]    Opus 4.6 (1M)
```

`getDefaultModelKey()` returns `'claude-sonnet-4-6'` for Claude flavor.

### D4: Gear icon removed; settings overlay removed for Claude

The gear button is only rendered when `props.onPermissionModeChange` is provided. After this change, the gear is removed from the action row for Claude sessions. The overlay logic (`showSettings` state, `FloatingOverlay`, chip rows) can be fully removed from the Claude path. **Why**: all settings are now directly accessible inline; the overlay adds tap overhead and visual bulk.

Codex/Gemini sessions still use the overlay since they don't get the inline toggles.

### D5: Status bar right column guarded by flavor

The right column (`displayPermissionMode`, `props.modelMode`, `displayEffortLevel`) is conditionally hidden when session flavor is `claude`. **Why**: avoids duplication — the same info is now visible directly in the action row.

## Risks / Trade-offs

- **Narrow action row on small screens** → The action row gains two toggle pairs. On very narrow phones (<360px), this could be tight. Mitigation: the toggles use `paddingHorizontal: 6` (compact), and the "claude" agent button (which had similar width) is removed, net space is comparable.
- **Codex/Gemini divergence** → The gear overlay is retained for Codex/Gemini. The action row rendering becomes flavor-conditional. This is manageable since the flavor is already threaded through `AgentInput` props.
- **`default` key in storage** → Existing sessions may have `model: 'default'` persisted. The read-time fallback handles this silently; no server migration needed.

## Migration Plan

Pure client-side UI change. No server, wire, or CLI changes. Deploy as a standard app release. Roll back by reverting `AgentInput.tsx` and `modelModeOptions.ts`.

## Open Questions

_(none)_
