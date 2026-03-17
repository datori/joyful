## Why

The app already tracks git status (branch name, staged/unstaged file counts, line changes) and surfaces it in the files screen, but there is no way to see what branches exist or what commits have been made. Users need this context to understand the state of the repository before or during an AI coding session — especially to see what Claude has committed and what branches are available.

## What Changes

- New screen `/session/[id]/git` showing two sections: a branch list and a recent commit log
- The branch name display in `/session/[id]/files` becomes a tappable button that navigates to the new screen
- On-demand git data fetching (branch list + commit log) using the existing session bash execution pattern
- New parsers for `git branch -vv` output and `git log` output
- No branch switching — read-only visibility only

## Capabilities

### New Capabilities
- `git-history-branch-list`: Read-only screen showing available branches (local + remote, current highlighted, ahead/behind counts) and recent commit history (last 30 commits with short hash, subject, author, relative time) for the current session's working directory.

### Modified Capabilities
- `native-session-browser`: The files screen (`/session/[id]/files`) gains a tappable branch pill that navigates to the new git screen.

## Impact

- **joyful-app**: New screen `sources/app/(app)/session/[id]/git.tsx`; updated `sources/app/(app)/session/[id]/files.tsx` (branch pill becomes tappable); new parsers in `sources/sync/git-parsers/`; new on-demand fetch hook; route registered in `sources/app/(app)/_layout.tsx`
- **No CLI/server changes** — git commands run as bash via existing session execution, same as `git diff` in the file viewer
- **No wire protocol changes**
