## Why

The session input area carries unnecessary visual weight: a "Claude" agent label that is always Claude, a gear icon that hides model/effort/permission behind an extra tap, and a status bar row that repeats selections the user just made. The UI should surface the most-used controls (model tier, context window size) inline and keep secondary controls (effort, permission) accessible but visually quiet.

## What Changes

- **Remove** the Claude agent selector button from the input action row (it always says "Claude" — no information added)
- **Replace** the gear icon with two inline binary toggles: `Sonnet | Opus` and `Std | 1M`, covering the four supported model combinations directly
- **Move** Effort and Permission selectors into the right side of the input action row as small, dimmed tap-to-cycle controls (replacing the floating chip overlay for these settings)
- **Remove** Haiku (`claude-haiku-4-5`) from the Claude model list — unsupported in this fork
- **Drop** the `default` model key — Sonnet 4.6 (`claude-sonnet-4-6`) becomes the hardcoded default
- **Remove** the right-column of the status bar above the input (permission mode / model name / effort badge) — those values are now visible directly in the action row

## Capabilities

### New Capabilities

_(none — all changes are to existing UI behaviour)_

### Modified Capabilities

- `chat-settings-popup`: The floating chip overlay for model/effort/permission is replaced. Model selection moves to inline binary toggles; effort and permission become compact tap-to-cycle selectors in the action row. The popup concept is effectively retired for Claude sessions.

## Impact

- `packages/joyful-app/sources/components/AgentInput.tsx` — primary change surface (action row, status bar, overlay)
- `packages/joyful-app/sources/components/modelModeOptions.ts` — remove Haiku, remove `default` model key, keep only the four Sonnet/Opus ± 1M options
- Translation files (`sources/text/translations/*.ts`) — may need minor updates if model-related keys are removed
- No wire protocol changes, no server changes, no CLI changes
