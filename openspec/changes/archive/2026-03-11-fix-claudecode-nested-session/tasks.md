## 1. Strip Claude session env vars in query.ts

- [x] 1.1 In `packages/joyful-cli/src/claude/sdk/query.ts`, build a cleaned `spawnEnv` by spreading the base env and deleting `CLAUDECODE` and `CLAUDE_CODE_ENTRYPOINT` before passing to `spawn()`

## 2. Strip Claude session env vars in claude_version_utils.cjs

- [x] 2.1 In `packages/joyful-cli/scripts/claude_version_utils.cjs`, in `runClaudeCli()`, build `const env = { ...process.env }` and delete `env.CLAUDECODE` and `env.CLAUDE_CODE_ENTRYPOINT` before passing to `spawn()`

## 3. Fix error logging in claudeRemoteLauncher.ts

- [x] 3.1 In `packages/joyful-cli/src/claude/claudeRemoteLauncher.ts`, change the launch error log line to use `(e instanceof Error ? e.message : String(e))` instead of relying on JSON serialization of the error object

## 4. Build and verify

- [x] 4.1 Run `yarn workspace joyful build` to compile the TypeScript changes
- [x] 4.2 Restart the daemon (`JOYFUL_SERVER_URL=http://localhost:3007 JOYFUL_HOME_DIR=~/.joyful-dev npx yarn cli daemon start`) to pick up the new binary
- [x] 4.3 Send a test message from the web app and verify it processes without "Process exited unexpectedly"
- [x] 4.4 Confirm daemon log shows actual error text (not `{}`) for any failures
