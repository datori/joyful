## Context

The app already has a working git status sync pipeline (`gitStatusSync` → `sessionBash` → parsers). The files screen (`/session/[id]/files`) shows branch name and file-level changes but provides no way to see available branches or commit history.

The `sessionBash` RPC (used today by the file viewer to run `git diff`) is the right primitive for on-demand git queries — no new protocol work needed.

## Goals / Non-Goals

**Goals:**
- New `/session/[id]/git` screen with two read-only sections: branch list + commit log
- Branch pill in the files screen header becomes a tappable navigation entry point
- On-demand data fetch (not part of the continuous status sync)
- All user-visible strings use `t()` with translations in all 9 languages

**Non-Goals:**
- Branch switching (`git checkout` / `git switch`) — future change
- Commit detail view (files changed in a commit) — future extension
- Stash management
- Any server or CLI changes

## Decisions

### 1. On-demand fetch, not continuous sync

The branch list and commit log are not latency-sensitive. Unlike file status (which auto-refreshes to reflect Claude's ongoing work), history and branches are fetched once on screen focus via `useFocusEffect` + `sessionBash`. This avoids adding two more commands to the continuous polling loop.

**Alternative considered**: Add to `GitStatusSync` polling. Rejected — git log output can be large and is stale-ok for read-only display.

### 2. Two `git` commands via `sessionBash`

```
git log --format="%H|%h|%s|%an|%ar" -30
  → last 30 commits: fullHash|shortHash|subject|authorName|relativeTime

git branch -vv
  → * main  a3f2b1 [origin/main: ahead 2] Commit subject
    feature/auth  9e29e9 Start auth work
    remotes/origin/dev  ...
```

`git branch -vv` already has a parser skeleton (`parseBranch.ts`). A new `parseGitLog.ts` will be added to `sync/git-parsers/`.

**Alternative for branches**: `git branch --format="..."`. Rejected — `-vv` output includes upstream tracking info in a single command and `parseBranch.ts` already handles it.

### 3. Single screen with two sections (not tabs)

Branches are typically short (< 10 entries). History is longer (30 entries). A single scrollable screen with two `ItemGroup` sections is simpler than a segmented control and keeps the UI consistent with the files screen. If the list grows, tabs can be added later.

### 4. Entry point: tappable branch pill in files screen header

The branch name is already rendered at the top of the files screen. Converting it to a `Pressable` that pushes `/session/[id]/git` is the most discoverable entry point — zero new UI elements required.

### 5. Behind `experiments` flag (same as files screen)

Since the git screen is only reachable from the files screen, it inherits the experiments gate automatically. No additional gating needed.

### 6. Data types defined in screen, not in storageTypes

The git log and branch data are ephemeral (not persisted, not synced). Types are local to the git screen or a thin `gitHistoryTypes.ts` helper. No changes to `storageTypes.ts`.

## Risks / Trade-offs

- **Large repos**: `git log -30` is fast in practice but could be slow on very large repos with shallow clones. Mitigation: 5s timeout (same as file diff), show loading state, fail silently with an empty list.
- **Detached HEAD**: `git branch -vv` output differs in detached HEAD state. Mitigation: `parseBranch.ts` already handles this — show "(HEAD detached)" as a non-selectable entry.
- **Non-git directories**: Session may not be in a git repo. Mitigation: `git log` and `git branch` return non-zero; treat as empty state with a "Not a git repository" message (same pattern as the files screen).
- **`parseBranch.ts` coverage gaps**: Existing parser may not cover all `-vv` output formats. Mitigation: fall back to showing just the branch name without tracking info if parsing fails.

## Open Questions

- Should the commit history show a visual indicator for commits that are "ahead" of upstream (not yet pushed)? Could be derived from `ahead` count in git status. Deferred — can add later without changing the screen shape.
