## 1. Parsers

- [x] 1.1 Create `sources/sync/git-parsers/parseGitLog.ts` — parses `git log --format="%H|%h|%s|%an|%ar"` output into `GitCommit[]` with fields `{ fullHash, shortHash, subject, author, relativeTime }`
- [x] 1.2 Audit and extend `sources/sync/git-parsers/parseBranch.ts` to correctly handle `git branch -vv` output including remote-tracking branches (lines starting with `remotes/`) and detached HEAD state; return `GitBranchEntry[]` with `{ name, isCurrent, isRemote, ahead, behind }`

## 2. Route Registration

- [x] 2.1 Register `session/[id]/git` in `sources/app/(app)/_layout.tsx` with `headerShown: true` and a translated `headerTitle`

## 3. Git Screen

- [x] 3.1 Create `sources/app/(app)/session/[id]/git.tsx` — screen component (wrapped in `memo`) that:
  - reads `sessionId` from route params
  - reads `sessionPath` from session metadata
  - fetches branch list and commit log via `sessionBash` on `useFocusEffect`
  - passes results to two `ItemGroup` sections (Branches, Recent Commits)
  - shows loading indicator while fetching
  - shows empty state if not a git repo (`git` commands return non-zero)
  - supports pull-to-refresh
- [x] 3.2 Implement the Branches section: local branches grouped first (current highlighted with filled dot), remote-tracking branches in a separate "Remote" subsection; show ahead/behind counts where available
- [x] 3.3 Implement the Commits section: list of up to 30 commits each showing short hash (monospace), subject (truncated at ~60 chars), author name, and relative time
- [x] 3.4 Handle 5-second timeout per `sessionBash` call — show error state per section independently so a slow `git log` doesn't block the branch list

## 4. Files Screen — Tappable Branch Pill

- [x] 4.1 In `sources/app/(app)/session/[id]/files.tsx`, convert the branch name text in the header to a `Pressable` that calls `router.push(`/session/${sessionId}/git`)` — only when branch is non-null
- [x] 4.2 Add a right-chevron icon next to the branch name to indicate it is tappable; hide it when branch is null

## 5. Translations

- [x] 5.1 Add translation keys for all new user-visible strings in the git screen and updated files screen (screen title, section headers "Branches" / "Remote" / "Recent Commits", empty state messages, loading text, error/retry message) to all 9 language files: `en`, `ru`, `pl`, `es`, `ca`, `it`, `pt`, `ja`, `zh-Hans`

## 6. Typecheck

- [x] 6.1 Run `yarn workspace joyful-app typecheck` and fix all type errors
