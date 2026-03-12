## Why

When `joyful daemon start` is run from within an active Claude Code terminal session, the process inherits `CLAUDECODE=1` from the parent environment. This variable is passed down to every child process, including the native `claude` binary the daemon spawns to handle user messages. Claude Code's own nesting guard rejects any invocation where `CLAUDECODE` is set, causing every session attempt to fail immediately with "Process exited unexpectedly".

## What Changes

- Strip `CLAUDECODE` (and other Claude Code session env markers like `CLAUDE_CODE_ENTRYPOINT`) from the environment before spawning the `claude` subprocess in `query.ts`
- Also strip these vars in `claude_version_utils.cjs` when spawning the native binary via `runClaudeCli`
- Improve error logging in `claudeRemoteLauncher.ts` to log `error.message` instead of `JSON.stringify(error)` (which gives `{}` for Error objects, making debugging impossible)

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- This is a pure bug fix — no spec-level requirement changes, only implementation behavior. -->

## Impact

- `packages/joyful-cli/src/claude/sdk/query.ts` — strip env vars before spawn
- `packages/joyful-cli/scripts/claude_version_utils.cjs` — strip env vars in `runClaudeCli`
- `packages/joyful-cli/src/claude/claudeRemoteLauncher.ts` — improve error logging
- No protocol or API changes; fix is entirely internal to the CLI
