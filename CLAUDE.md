# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fork of Happy Coder — a monorepo providing mobile, web, and desktop clients for Claude Code, Codex, and Gemini with end-to-end encryption. Users run `joyful` instead of `claude` (or `joyful codex`/`joyful gemini`) to control AI coding sessions from iOS, Android, web, or desktop.

**Fork policy**: Prefer minimal diffs from upstream where possible. Document intentional divergences.

## Monorepo Structure

| Package | Purpose | Tech |
|---------|---------|------|
| `joyful-app` | Cross-platform UI client | React Native 0.81, Expo 54, Expo Router v6, Unistyles, Tauri (macOS) |
| `joyful-cli` | CLI wrapper for Claude Code/Codex/Gemini with daemon | Node.js, Ink (React TUI), `@anthropic-ai/claude-code` SDK, Socket.IO |
| `joyful-server` | Backend for encrypted sync, auth, sessions | Fastify 5, Prisma, PostgreSQL (or PGlite standalone), Redis, Socket.IO |
| `joyful-wire` | Shared wire types and Zod schemas | TypeScript, Zod |
| `joyful-agent` | Remote agent control CLI | Commander.js, Socket.IO |

## Commands

### Root
```bash
yarn cli              # Run joyful-cli from source
yarn cli codex        # Run joyful-cli in codex mode
yarn web              # Run joyful-app web dev server
yarn release          # Release all packages
```

### joyful-app
```bash
yarn workspace joyful-app start        # Expo dev server
yarn workspace joyful-app ios          # iOS simulator
yarn workspace joyful-app android      # Android emulator
yarn workspace joyful-app web          # Web browser
yarn workspace joyful-app typecheck    # TypeScript checking
yarn workspace joyful-app test         # Vitest (watch mode)
yarn workspace joyful-app tauri:dev    # macOS Tauri desktop
yarn workspace joyful-app ota          # OTA deploy via EAS Update
```

### joyful-cli
```bash
yarn workspace joyful cli        # Run CLI from source
yarn workspace joyful build      # Build with pkgroll
yarn workspace joyful test       # Vitest
```

### joyful-server
```bash
yarn workspace joyful-server start     # Start server
yarn workspace joyful-server build     # TypeScript type check
yarn workspace joyful-server test      # Vitest
yarn workspace joyful-server migrate   # Run Prisma migrations
yarn workspace joyful-server generate  # Generate Prisma client
yarn workspace joyful-server db        # Start local PostgreSQL in Docker
```

## Architecture

### Communication Flow
All communication is end-to-end encrypted (TweetNaCl box/sign, libsodium on native, privacy-kit on server). Data flows: Mobile/Web App ↔ Server (Socket.IO) ↔ CLI Daemon ↔ Agent SDK. The server stores and relays encrypted blobs only — never sees plaintext content.

### Key Patterns
- **Agent registry (CLI)**: Pluggable agent backends via `AgentRegistry` (src/agent/core/) with `AgentBackend`, `TransportHandler`, and `MessageAdapter` abstractions. Supports Claude, Codex, Gemini, and ACP (@agentclientprotocol/sdk).
- **Dual mode operation (CLI)**: Interactive mode (terminal PTY) and remote mode (mobile control). Press any key to switch back to terminal.
- **Daemon architecture**: Background process manages sessions, WebSocket to server, HTTP control server on localhost for local CLI communication. Auto-updates on version change.
- **Sync engine (App)**: WebSocket-based real-time sync with optimistic concurrency control, invalidation-based refresh, and automatic reconnection.
- **RPC over WebSocket**: Server forwards RPC calls between mobile app and daemon for session spawn/stop/control.
- **Session protocol**: Encrypted chat events with session forking (resume creates new session ID with full history).
- **Versioned encrypted state**: All encrypted fields use `{ version: number, value: string | null }` pattern with optimistic concurrency (`expectedVersion` on updates).

### Package Dependencies
`joyful-wire` is the shared dependency used by all other packages for type-safe Zod schemas. The app, CLI, and server all communicate through wire types.

## Code Style (All Packages)

- **4 spaces** for indentation
- **yarn** (1.22.22), never npm
- **TypeScript strict mode** everywhere
- Path alias `@/*` maps to `./sources/*` (app, server) or `./src/*` (CLI)
- Named exports preferred
- All imports at top of file, use `@/` prefix for absolute imports
- Functional style preferred; avoid classes (except where existing)
- Avoid enums; use maps
- No backward compatibility unless explicitly requested

## Package-Specific Guidelines

Each package has its own `CLAUDE.md` with detailed guidelines. Key highlights:

### joyful-app
- Always use `t(...)` for all user-visible strings; add to all 9 language files
- Never use `Alert` from React Native — use `@/modal` instead
- Use `useJoyfulAction` for async operations (auto error handling)
- Use `ItemList` for most containers, `Item` component for content
- Use Expo Router API, not React Navigation directly
- Wrap pages in `memo`, styles at end of file
- Unistyles `StyleSheet.create` for styling (not for expo-image)
- Always run `yarn typecheck` after changes
- Web is secondary platform; iOS/Android are primary

### joyful-cli
- Strict typing required; no untyped code
- File-based logging only (avoid console output that disturbs Claude sessions)
- No mocking in tests — real API calls
- Test files colocated as `.test.ts`

### joyful-server
- Fastify routes with Zod validation; all operations must be idempotent
- Use `inTx` for database transactions; never run non-transactional things inside transactions
- Never create Prisma migrations manually — only run `yarn generate`
- Use `afterTx` to emit events after transaction commits
- Action files: prefix with entity type then action (e.g., `friendAdd.ts`)
- Use `privacyKit.decodeBase64`/`encodeBase64` instead of Buffer
- Test files use `.spec.ts` suffix

## Local Development Setup

The dev stack runs fully isolated from any other `happy`/`happier` servers on this machine.

### Ports and data directories
| Service | Port | Data |
|---------|------|------|
| happy-server (existing, leave alone) | 3005 | Docker |
| happier-server (existing, leave alone) | 3006 | Docker |
| **joyful-server (standalone dev)** | **3007** | `packages/joyful-server/data/` (PGlite) |
| joyful-app (web) | 8081 | — |
| happy daemon (existing, leave alone) | — | `~/.happy/` |
| **joyful daemon (dev)** | — | **`~/.joyful-dev/`** |

### tmux session: `joyful-dev`
```
joyful-dev:server   ← standalone server (port 3007)
joyful-dev:webapp   ← expo web (port 8081)
joyful-dev:logs     ← tail -f daemon log
```

### Dev stack script (recommended)

The `dev-stack.sh` script handles safe startup, shutdown, and reset of the full dev stack:
```bash
yarn dev:stack:start     # Start server + daemon (with migrate)
yarn dev:stack:stop      # Gracefully stop daemon + server
yarn dev:stack:restart   # Stop then start
yarn dev:stack:status    # Show what's running
yarn dev:stack:nuke      # Full reset: wipe DB, re-bootstrap, restart
yarn dev:stack:seed      # Print current seed in both formats (base64url + base32)
```

### Starting the stack manually (if needed)

**1. Server** — must run `migrate` first, then `serve` (two separate subcommands):
```bash
# In joyful-dev:server window, from packages/joyful-server/
PORT=3007 JOYFUL_MASTER_SECRET=a6821b8bdb38ec3c0f9b14e030054290341dadfe84f0af409e1473677117fae3 DATA_DIR=./data npx tsx sources/standalone.ts migrate
PORT=3007 JOYFUL_MASTER_SECRET=a6821b8bdb38ec3c0f9b14e030054290341dadfe84f0af409e1473677117fae3 DATA_DIR=./data npx tsx sources/standalone.ts serve
```
Or combined: `migrate && serve` in one shell command. Env vars must be passed inline — `tsx --env-file` does not load them reliably in tmux.

**2. Daemon**:
```bash
JOYFUL_SERVER_URL=http://localhost:3007 JOYFUL_HOME_DIR=~/.joyful-dev npx yarn cli daemon start
```
Note: the daemon spawns from the **built binary** (`dist/index.mjs`). Run `yarn workspace joyful build` first if CLI source has changed.

**After changing CLI source** — use the rebuild+restart shortcut (build + force stop + start):
```bash
yarn dev:daemon:restart
```
⚠️ **Do not use `daemon start` alone after a rebuild.** The daemon detects its own version and skips restarting if the version string hasn't changed, leaving the old binary running. Always stop first.

**Tailing the latest daemon log** (new log file is created per PID on each start):
```bash
tail -f ~/.joyful-dev/logs/$(ls -t ~/.joyful-dev/logs/ | grep daemon | head -1)
```

**3. Web app** (in joyful-dev:webapp):
```bash
EXPO_PUBLIC_JOYFUL_SERVER_URL=http://localhost:3007 npx yarn web
```

### Linking the web app to the CLI account

Get the current seed in both formats:
```bash
yarn dev:stack:seed
```

The web app's restore screen expects **base32 format** (5-char groups with dashes, e.g. `65IYU-TQ7R3-LALQ4-...`). The CLI outputs base64url format. Use the seed command above to get the correct format.

Open `http://localhost:8081` → Settings → Restore with Secret Key → paste the **base32** seed.

To create a fresh account (if needed):
```bash
JOYFUL_SERVER_URL=http://localhost:3007 JOYFUL_HOME_DIR=~/.joyful-dev npx yarn cli dev bootstrap --force
```
⚠️ **After re-bootstrapping**, you must stop the daemon and restart it so it registers the machine under the new account. Use `yarn dev:stack:restart` or `yarn dev:stack:nuke` (which does this automatically).

### Running the CLI against the dev stack
```bash
JOYFUL_HOME_DIR=~/.joyful-dev JOYFUL_SERVER_URL=http://localhost:3007 npx yarn cli
```

### Dev stack troubleshooting

#### PGlite (embedded PostgreSQL)
- **Never `kill -9` the server process.** PGlite is an embedded WASM database that corrupts on hard kills. Always use `Ctrl+C`, `SIGTERM`, or `yarn dev:stack:stop`.
- **PGlite is single-connection.** You cannot query it from a separate process while the server is running. Stop the server first if you need direct DB access.
- **If PGlite is corrupted** (errors like `RuntimeError: Aborted()` or `postmaster.pid` lock errors): delete `packages/joyful-server/data/pglite/` and re-bootstrap. Or just run `yarn dev:stack:nuke`.

#### Bootstrap and account identity
- **`bootstrap --force` creates a NEW account every time.** The old account's machine registration persists in the DB. The daemon tries to re-register the same machine ID under the new account, hits a unique constraint, and silently fails (500). The web app then sees no machine.
- **Fix: always use `yarn dev:stack:nuke`** for a full reset — it wipes the DB, re-bootstraps, and restarts the daemon in the correct order.
- **Ordering matters:** after a re-bootstrap, the daemon must be stopped BEFORE the bootstrap and started AFTER, so it registers the machine under the correct account.

#### Seed format for web app restore
- The CLI outputs seeds in **base64url** format (contains `-` and `_` characters).
- The web app's `normalizeSecretKey()` interprets strings with dashes as **base32** formatted keys, not base64url.
- Use `yarn dev:stack:seed` to get the seed in both formats. Use the **base32** format for the web app.

#### Port conflicts
- If port 3007 is stuck (e.g. after a crash), `yarn dev:stack:stop` handles cleanup automatically.
- Manual fix: `lsof -ti :3007 | xargs kill` (SIGTERM first, only use `-9` as last resort).

## Documentation

Internal architecture docs live in `/docs/` covering protocol, API, encryption, backend architecture, deployment, CLI/daemon, session protocol, and permissions. See `docs/README.md` for the index.
