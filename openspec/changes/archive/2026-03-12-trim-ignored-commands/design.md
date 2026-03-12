## Context

`IGNORED_COMMANDS` in `suggestionCommands.ts` is a hardcoded array of slash command names that are filtered out before the autocomplete picker displays suggestions. The list has 31 entries with no documented rationale.

The intended principle: only hide commands that require an interactive terminal (PTY) to function or are one-time installation/maintenance tools. Everything else should be visible.

## Goals / Non-Goals

**Goals:**
- Reduce `IGNORED_COMMANDS` to only the 8 commands that are genuinely terminal/PTY-specific or installation-only
- Expose config, diagnostic, auth, and review commands in autocomplete

**Non-Goals:**
- Changing how autocomplete rendering works
- Adding descriptions for newly exposed commands (can be done separately)
- Making the list runtime-configurable

## Decisions

**Keep `resume` hidden** — joyful provides its own session-resume UI (native session browser). Exposing `/resume` would be confusing since joyful intercepts session management.

**Single file change** — only `IGNORED_COMMANDS` in `suggestionCommands.ts` changes. No schema, wire, or server changes needed.

## Risks / Trade-offs

Some newly exposed commands (e.g., `/upgrade`, `/migrate-installer`) may produce confusing terminal output when run via the mobile chat interface. This is an acceptable tradeoff — the command is available if needed, and users who send it will see the raw output in the session stream.
