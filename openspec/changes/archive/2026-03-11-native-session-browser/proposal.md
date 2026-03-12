## Why

Claude Code users accumulate native sessions (created by running `claude` directly in the terminal) that are invisible to the Joyful app. There is no way to discover, browse, or continue those conversations from the mobile/web UI — they exist only as JSONL files on the host machine. This creates a split workflow: power users who switch between the terminal and the app lose continuity.

## What Changes

- **New daemon RPC** `list-native-sessions`: scans `~/.claude/projects/<path-id>/` for JSONL session files and returns structured metadata (summary, first message, modified time) for each, filtered to a single working directory.
- **New app modal** `NativeSessionBrowser`: a searchable, scrollable modal that shows native sessions for the current working directory, with sessions already tracked by Joyful shown greyed out.
- **Resume flow**: selecting a native session from the browser creates a new Joyful session that immediately forks from the native session on first use (via `--resume`), preserving the original session untouched.
- **Wizard integration**: a "Browse native sessions" link appears in the new-session wizard after the working directory is selected, opening the browser modal.
- **Spawn RPC extension**: `spawn-joyful-session` accepts a new `resumeNativeSessionId` parameter that pre-wires the fork target before the first Claude process is spawned.

## Capabilities

### New Capabilities
- `native-session-browser`: Daemon RPC for enumerating native Claude sessions by directory; app browser UI for discovering and resuming them; spawn flow extension for native session forking.

### Modified Capabilities
<!-- none — spawn protocol change is additive/backward-compatible -->

## Impact

- **joyful-cli**: New `list-native-sessions` RPC handler in daemon; `spawnSession` option threading; `Session` and `loop.ts` initialization to accept initial `sessionId`.
- **joyful-app**: New `NativeSessionBrowser` modal component; new RPC hook; integration into the new-session wizard path section.
- **joyful-wire**: No changes needed (RPC types are defined in the CLI; browser is a pure UI component).
- **No breaking changes**: `resumeNativeSessionId` is optional; the RPC is additive.
