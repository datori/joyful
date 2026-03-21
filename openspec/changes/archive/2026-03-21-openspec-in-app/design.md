## Context

The Joyful app already has a proven pattern for syncing machine-side filesystem state to the mobile UI: `gitStatusSync.ts` uses `sessionBash` (an RPC call that runs a bash command in the session's working directory) to read git state, parses the output in the app, and stores results per-project in Zustand state. The git status badge in `AgentInput` then reads this state reactively.

OpenSpec has a predictable directory structure at `openspec/` relative to the project root. All data needed for a useful panel view (change names, artifact presence, task completion counts) can be extracted with a single bash invocation and parsed entirely in the app — no server changes needed.

The existing `/session/[id]/file` screen already reads arbitrary files via `sessionReadFile` RPC and renders them with `SimpleSyntaxHighlighter` (including markdown). Tapping any OpenSpec artifact will reuse this screen directly.

## Goals / Non-Goals

**Goals:**
- Surface OpenSpec change/spec hierarchy inside the app with zero server-side changes
- Follow the `gitStatusSync` pattern exactly (project-keyed, `InvalidateSync`, `sessionBash`)
- Provide one-shot Explore Mode toggle that arms the input for a single `/opsx:explore`-prefixed send
- Allow reading any OpenSpec artifact file via the existing file viewer

**Non-Goals:**
- Writing or editing OpenSpec files from the app
- Real-time change watching (push from CLI) — pull-on-demand is sufficient
- Server-side storage of OpenSpec state
- Running OpenSpec commands directly from the panel (the explore toggle in the input is sufficient)
- Handling non-`openspec/` project structures

## Decisions

### Decision 1: Pull via `sessionBash`, not a dedicated RPC

**Chosen:** Run a bash one-liner via existing `sessionBash` RPC to collect all file paths and task stats in a single round trip, parse in-app.

**Alternatives considered:**
- New CLI daemon RPC for OpenSpec scanning — requires CLI changes and re-build/restart; unnecessary overhead.
- Multiple `sessionBash` calls — one per artifact or per change — would multiply round trips with no benefit.

**Rationale:** `sessionBash` is already proven for exactly this use case (git status). No CLI changes needed. One bash call covers the entire `openspec/` tree.

The bash command:
```bash
{ find openspec -type f 2>/dev/null | sort; for f in openspec/changes/*/tasks.md openspec/changes/archive/*/tasks.md; do [ -f "$f" ] && printf "TASKS:%s:%s:%s\n" "$f" "$(grep -c '\[x\]' "$f" 2>/dev/null || echo 0)" "$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)"; done; } 2>/dev/null
```

Lines not prefixed with `TASKS:` are file paths; `TASKS:` lines carry task completion counts.

### Decision 2: Store OpenSpec status per-project (not per-session)

**Chosen:** Key OpenSpec status by `machineId:path`, same as `gitStatusSync` projects. All sessions in the same project share one status object.

**Rationale:** Multiple sessions can be open for the same directory. Syncing per-project avoids redundant fetches and keeps status consistent across sessions. Matches the gitStatus pattern.

### Decision 3: Explore Mode as ephemeral local state (not persisted)

**Chosen:** `exploreModeArmed: boolean` state lives in `SessionViewLoaded` as `useState`, resets on every send.

**Alternatives considered:**
- Persist to draft storage alongside message draft — unnecessary; Explore Mode is conversational context, not content.
- Store in session settings — would survive navigation, but the one-shot intent means that's undesirable.

**Rationale:** The user explicitly wants this to be one-shot. Local `useState` that resets after `onSend` is the simplest correct implementation.

### Decision 4: OpenSpec panel as a dedicated route, not a modal/overlay

**Chosen:** New screen at `sources/app/(app)/session/[id]/openspec.tsx`, navigated to via Expo Router.

**Alternatives considered:**
- FloatingOverlay above the input (like the settings overlay) — limited space, poor for a hierarchical tree with many items.
- Bottom sheet modal — works on mobile but doesn't compose well with the existing file viewer navigation.

**Rationale:** A full-screen route is consistent with how the file browser and info screen work. It provides full scroll height and clean back-navigation to the session. The route also works correctly in the split-panel-view when that change lands.

### Decision 5: Toolbar button in `AgentInput` (not in header)

**Chosen:** Add the OpenSpec button to the `AgentInput` left toolbar alongside the gear and git-status buttons. Add the Explore toggle button there too.

**Rationale:** The toolbar is already the home for session-context actions (settings, git, abort). The OpenSpec button naturally belongs here — it's context-sensitive to the active session's directory. Keeping it out of the header avoids header crowding and keeps the header for navigation/identity.

The OpenSpec button is hidden when `openspecStatus?.hasOpenspec` is falsy (non-OpenSpec projects see no change). The Explore button is hidden when the session is archived/inactive.

## Risks / Trade-offs

- **`sessionBash` latency** → The bash command is fast (filesystem read only, no git operations), but network RTT to the CLI daemon adds latency. Mitigated by `InvalidateSync` caching — the panel shows stale data instantly and refreshes in background. A manual refresh button in the panel header lets users force a re-fetch.

- **Large archive directory** → With many archived changes (currently 22, growing), `find` output and parsing time is still negligible. The archive section is collapsed by default so the list doesn't feel overwhelming.

- **`sessionBash` not available** → If the session is offline or the CLI doesn't support bash RPC, the scan silently returns null. The toolbar button doesn't appear. No error state is shown.

- **Bash parsing brittleness** → The `TASKS:` line format is simple enough to be robust. File paths with colons would break the split — mitigated by using `printf` with explicit field separators and limiting splits to first 3 colons.

- **Explore button visibility** → Only show when session is active (`session.active === true` and `session.metadata?.flavor === 'claude'` or compatible). Don't show for archived sessions where sending `/opsx:explore` as a new message would trigger a resume flow.

## Open Questions

*(none — all decisions resolved)*
