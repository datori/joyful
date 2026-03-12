## Why

The `IGNORED_COMMANDS` list in `suggestionCommands.ts` over-aggressively hides slash commands from autocomplete — suppressing useful config, diagnostic, and auth commands that users would legitimately want to type in a chat context. There is no documented rationale; the list appears to have been assembled by gut feel.

## What Changes

- Reduce `IGNORED_COMMANDS` from 31 entries down to ~8, keeping only commands that are terminal/PTY-specific or one-time installation tools
- Expose: `login`, `logout`, `config`, `settings`, `model`, `mcp`, `memory`, `hooks`, `permissions`, `cost`, `doctor`, `status`, `bug`, `review`, `security-review`, `pr-comments`, `help`, `agents`, `bashes`, `add-dir`, `init`, `export`, `upgrade`, `release-notes`
- Keep hidden: `exit`, `vim`, `ide`, `terminal-setup`, `migrate-installer`, `install-github-app`, `statusline`, `resume` (resume is kept hidden because joyful provides its own session-resume UI)

## Capabilities

### New Capabilities
- `slash-command-visibility`: Which slash commands are shown vs. hidden in the autocomplete picker

### Modified Capabilities
<!-- none -->

## Impact

- `packages/joyful-app/sources/sync/suggestionCommands.ts` — `IGNORED_COMMANDS` array only
