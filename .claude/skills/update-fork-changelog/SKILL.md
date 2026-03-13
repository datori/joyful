---
name: update-fork-changelog
description: Review commits since the most recent changelog-summary tag, check for secrets, update the README changelog section, commit, and advance the tag.
license: MIT
metadata:
  author: datori
  version: "1.0"
---

Update the fork changelog in README.md to cover all commits since the last summary tag.

## Steps

### 1. Find the most recent changelog tag

```bash
git tag --list 'changelog-summary-*' --sort=-version:refname | head -1
```

Note the tag name (e.g. `changelog-summary-2026-03-12`). All subsequent steps use this tag as the base.

### 2. List commits since the tag

```bash
git log <tag>..HEAD --format="%h %s"
```

If there are no commits (only doc/chore commits with no user-visible changes), tell the user there is nothing to add and stop.

### 3. Scan the diff for secrets

Run the following to catch hardcoded credentials in changed files:

```bash
git diff <tag>..HEAD -- . ':(exclude)node_modules' ':(exclude)*.lock' ':(exclude)openspec' \
  | grep -E '^\+' \
  | grep -iE '(secret|password|token|api[_-]?key|private[_-]?key|bearer|sk-|ghp_|github_pat|MASTER_SECRET)[[:space:]]*[=:][[:space:]]*["'"'"']?[A-Za-z0-9+/]{10,}' \
  | grep -v '^\+\+\+'
```

- **If matches are found**: show them to the user, explain the risk, and stop. Do NOT proceed with the push.
- **If clean**: continue.

### 4. Review each feature commit

For every non-doc, non-chore commit since the tag, read the full commit message:

```bash
git show <hash> --stat --format="%s%n%n%b" -s
```

Identify which commits represent user-visible changes worth documenting. Skip pure refactors, internal tooling, and doc-only commits unless they are significant.

### 5. Update the README changelog

Open `README.md`. The changelog lives between:
```
<!-- changelog-summary: ... -->
...
<!-- end-changelog-summary -->
```

Add new bullet points **at the top** of the most appropriate existing subheading (Session management, Claude Code integration, Performance, Monitoring, UI & UX, Voice, Infrastructure). If a change doesn't fit any existing heading, add a new `####` subheading before the others.

Format for each entry:
```
- **Short title** — one-sentence description of what changed and why it matters to users
```

Update the date in the `<!-- changelog-summary: ... -->` comment to today's date. Keep the fork base hash unchanged.

### 6. Commit the README update

```bash
git add README.md
git commit -m "docs: update fork changelog with latest features

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 7. Advance the changelog tag

```bash
git tag -f <tag-name>
git push origin main
git push origin --tags --force
```

If the push is rejected due to remote changes ahead of local, rebase first:
```bash
git pull --rebase origin main
git push origin main
git push origin --tags --force
```

## Guardrails

- **Never push if secrets are found.** Show the user what was found and stop.
- **Skip commits that are only internal** (openspec scaffolding, lock file changes, pure renames with no behaviour change). Only document what a user of the app or CLI would notice.
- **Do not create a new tag name** — always reuse and force-update the existing `changelog-summary-*` tag.
- **Do not rewrite history** — only add a new commit on top of HEAD.
