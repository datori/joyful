# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a fork of Happy Coder — a monorepo providing mobile, web, and desktop clients for Claude Code, Codex, and Gemini with end-to-end encryption. Users run `happy` instead of `claude` (or `happy codex`/`happy gemini`) to control AI coding sessions from iOS, Android, web, or desktop.

**Fork policy**: Prefer minimal diffs from upstream where possible. Document intentional divergences.

## Monorepo Structure

| Package | Purpose | Tech |
|---------|---------|------|
| `happy-app` | Cross-platform UI client | React Native 0.81, Expo 54, Expo Router v6, Unistyles, Tauri (macOS) |
| `happy-cli` | CLI wrapper for Claude Code/Codex/Gemini with daemon | Node.js, Ink (React TUI), `@anthropic-ai/claude-code` SDK, Socket.IO |
| `happy-server` | Backend for encrypted sync, auth, sessions | Fastify 5, Prisma, PostgreSQL (or PGlite standalone), Redis, Socket.IO |
| `happy-wire` | Shared wire types and Zod schemas | TypeScript, Zod |
| `happy-agent` | Remote agent control CLI | Commander.js, Socket.IO |

## Commands

### Root
```bash
yarn cli              # Run happy-cli from source
yarn cli codex        # Run happy-cli in codex mode
yarn web              # Run happy-app web dev server
yarn release          # Release all packages
```

### happy-app
```bash
yarn workspace happy-app start        # Expo dev server
yarn workspace happy-app ios          # iOS simulator
yarn workspace happy-app android      # Android emulator
yarn workspace happy-app web          # Web browser
yarn workspace happy-app typecheck    # TypeScript checking
yarn workspace happy-app test         # Vitest (watch mode)
yarn workspace happy-app tauri:dev    # macOS Tauri desktop
yarn workspace happy-app ota          # OTA deploy via EAS Update
```

### happy-cli
```bash
yarn workspace happy-coder cli        # Run CLI from source
yarn workspace happy-coder build      # Build with pkgroll
yarn workspace happy-coder test       # Vitest
```

### happy-server
```bash
yarn workspace happy-server start     # Start server
yarn workspace happy-server build     # TypeScript type check
yarn workspace happy-server test      # Vitest
yarn workspace happy-server migrate   # Run Prisma migrations
yarn workspace happy-server generate  # Generate Prisma client
yarn workspace happy-server db        # Start local PostgreSQL in Docker
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
`happy-wire` is the shared dependency used by all other packages for type-safe Zod schemas. The app, CLI, and server all communicate through wire types.

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

### happy-app
- Always use `t(...)` for all user-visible strings; add to all 9 language files
- Never use `Alert` from React Native — use `@/modal` instead
- Use `useHappyAction` for async operations (auto error handling)
- Use `ItemList` for most containers, `Item` component for content
- Use Expo Router API, not React Navigation directly
- Wrap pages in `memo`, styles at end of file
- Unistyles `StyleSheet.create` for styling (not for expo-image)
- Always run `yarn typecheck` after changes
- Web is secondary platform; iOS/Android are primary

### happy-cli
- Strict typing required; no untyped code
- File-based logging only (avoid console output that disturbs Claude sessions)
- No mocking in tests — real API calls
- Test files colocated as `.test.ts`

### happy-server
- Fastify routes with Zod validation; all operations must be idempotent
- Use `inTx` for database transactions; never run non-transactional things inside transactions
- Never create Prisma migrations manually — only run `yarn generate`
- Use `afterTx` to emit events after transaction commits
- Action files: prefix with entity type then action (e.g., `friendAdd.ts`)
- Use `privacyKit.decodeBase64`/`encodeBase64` instead of Buffer
- Test files use `.spec.ts` suffix

## Documentation

Internal architecture docs live in `/docs/` covering protocol, API, encryption, backend architecture, deployment, CLI/daemon, session protocol, and permissions. See `docs/README.md` for the index.
