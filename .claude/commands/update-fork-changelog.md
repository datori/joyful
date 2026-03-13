---
name: "Update Fork Changelog"
description: Review commits since the last changelog tag, check for secrets, update the README changelog, and advance the tag.
---

Use the **update-fork-changelog** skill to run the full changelog update workflow:

1. Find the most recent `changelog-summary-*` tag
2. Review all commits since that tag
3. Scan the diff for secrets or sensitive data — stop and report if any are found
4. Summarise user-visible changes and add them to the appropriate sections in `README.md`
5. Commit the README update
6. Force-update the changelog tag to HEAD and push
