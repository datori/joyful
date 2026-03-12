## 1. Implementation

- [x] 1.1 Replace `IGNORED_COMMANDS` in `suggestionCommands.ts` with the trimmed list: `exit`, `vim`, `ide`, `terminal-setup`, `migrate-installer`, `install-github-app`, `statusline`, `resume`
- [x] 1.2 Remove dead entries from `COMMAND_DESCRIPTIONS` that describe commands now in the ignore list (none — all descriptions are for commands that will remain visible or stay hidden for the right reasons)

## 2. Verification

- [x] 2.1 Run `yarn workspace joyful-app typecheck` and confirm no errors
