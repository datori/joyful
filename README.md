## About this fork

This is a fork of [Happy Coder](https://github.com/slopus/happy), maintained with a focus on orchestrating Claude Code instances. Expect more frequent feature additions and bug fixes relative to upstream.

### Changes from upstream

<!-- changelog-summary: 2026-04-11 (fork base: d343330c) -->

<details>
<summary><strong>🌿 Worktrees</strong> — isolated branch sessions with AI-assisted merge</summary>

| Feature | What it does |
|---------|--------------|
| Git worktree sessions | New session type that creates an isolated git worktree branch; agent works there while other sessions continue on main |
| Worktree session grouping | Worktree sessions appear under their base repo group in the session list, not as separate isolated groups |
| Branch name as title | Worktree sessions show the branch name (e.g. `bold-aurora`) as subtitle; slightly smaller title keeps them visually distinct |
| Merge button in header | Git-merge icon in the chat header navigates directly to the merge screen for any worktree session |
| Agent-delegated merge | "Merge with AI" dispatches a single prompt; agent handles spec checks, conflict resolution, conventional commit message, and squash merge |
| Return-to-merge banner | Blue pill in session view when navigated from the merge screen; tap to return once the agent signals completion |

</details>

<details>
<summary><strong>🤖 Claude Code</strong> — OpenSpec toolbar, model controls, and session defaults</summary>

| Feature | What it does |
|---------|--------------|
| OpenSpec inline toolbar | Mode buttons (Explore, Patch, Apply, FF) shown inline on wide layouts (≥640px) with a vertical divider before model controls; submenu preserved on narrow screens |
| Emoji from content | Chat title emoji reflects actual subject matter, not the OpenSpec command prefix used to trigger it |
| OpenSpec submenu | Explore, Patch, Open Panel in one toolbar menu; active mode shown as icon + label |
| Yolo permission default | New sessions default to `bypassPermissions`/`yolo`; green/red indicator |
| Inline model & effort toggles | `[Snt\|Ops]` and `[Std\|1M]` pickers replace gear icon; effort shown as chevrons |
| Bedrock model support | `bedrock-claude-*` variants in model pickers for Bedrock gateways |
| Model & effort from settings | CLI reads `~/.claude/settings.json` and surfaces defaults to the app |
| Slash command autocomplete | Typing `/` surfaces recently-seen commands from past sessions |
| OpenSpec panel | In-app panel with active changes, task progress bars, and toolbar badge |
| Explore & Patch mode | One-shot prefix toggles for `/opsx:explore` and `/opsx:patch` |

</details>

<details>
<summary><strong>🧠 Codex</strong> — continuity, recovery, and cross-device state</summary>

| Feature | What it does |
|---------|--------------|
| Continuity across reconnects | Joyful now persists Codex provider lineage across reconnects so active chats are less likely to restart from scratch |
| Archived Codex resume | Archived Codex sessions can fork forward into a new Joyful session using stored provider identifiers |
| Cross-device mode sync | Codex model, effort, and permission choices stay aligned between UI metadata and outgoing messages, reducing accidental restarts when switching devices |
| Recovery & transcript replay | Joyful can recover from stale or interrupted Codex sessions and fall back to transcript replay when provider continuity is no longer safe |
| Session diagnostics | Session info now shows Codex session/conversation IDs and continuity notes to make reset behavior visible instead of opaque |
| Codex session browser | `yarn codex:sessions` lists, inspects, resumes, and forks Codex sessions that do not show up in the default picker |

</details>

<details>
<summary><strong>📋 Sessions</strong> — resume, browse, archive, and persist state</summary>

| Feature | What it does |
|---------|--------------|
| Model & effort persistence | Selected model/effort saved per session, survives restarts |
| Interactive filesystem browser | Navigate remote directory tree in path picker, with hidden-dir toggle |
| Native session browser | Discover and resume existing Claude sessions from `~/.claude/projects/` |
| Split FAB for session resume | Dedicated Resume entry alongside New Session; pick machine, dir, and session |
| Archived sessions | Inactive sessions in a collapsible "Archived (N)" header, collapsed by default |

</details>

<details>
<summary><strong>🎨 UI & UX</strong> — session list, density, avatars, and layout</summary>

| Feature | What it does |
|---------|--------------|
| Experiments always enabled | Experimental features now stay on by default; the old toggle has been removed |
| Serialized live session updates | Session and message updates are applied in order, reducing missing or out-of-order chat state during reconnects |
| Project group session list | Sessions grouped by project with collapsible headers; state persisted per device |
| Stable session order | Active sessions within a project group stay in creation-date order rather than jumping on each activity update |
| Stable group ordering | Group order persisted; reorder modal (≡) to move groups up/down |
| + button per group | Tap + on a group header to open new-session screen pre-filled for that project |
| Archive in chat header | Archive icon in the chat header to archive active session in place |
| Compact session rows | No per-row avatar/path; reduced heights; single avatar in group header |
| Emoji session titles | Claude prefixes auto-generated session titles with a relevant emoji |
| Status dot on right | Status indicator moved to row right; text label removed |
| Git history & branches | Tappable branch pill shows all branches (ahead/behind) and last 30 commits |
| Plasma avatar style | Gaussian-blurred triadic blobs with screen blending; CSS fallback for web |
| Plasma avatar web fix | `clip-path: circle()` on the web plasma container ensures blurred blobs are always clipped to a circle; `filter:blur()` children bypassed `overflow:hidden` in browsers |
| Condensed density & dark mode | Tighter rows/items; dark surfaces aligned to iOS palette |
| Mobile layout fixes | Code block wrapping, keyboard-anchored overlays, PWA safe-area |
| Machines panel collapsed | Collapse state persisted; defaults to collapsed |

</details>

<details>
<summary><strong>📊 Monitoring</strong> — quota, memory, and polling</summary>

| Feature | What it does |
|---------|--------------|
| Claude quota widget | 5h/7d rolling-window utilization bars, reset countdown, manual refresh |
| Machine memory stats | Daemon reports total/free RAM + RSS; shown in collapsible sidebar panel |
| Quota polling fixes | Skips API-key-only machines; fixed re-entrant loop causing daemon OOM |

</details>

<details>
<summary><strong>🎙️ Voice</strong> — self-hosted ElevenLabs</summary>

| Feature | What it does |
|---------|--------------|
| Self-hosted ElevenLabs | Agent ID configurable in Settings → Voice; clear errors when unconfigured |

</details>

<details>
<summary><strong>⚡ Performance & Infrastructure</strong> — reconnect, streaming, and daemon co-existence</summary>

| Feature | What it does |
|---------|--------------|
| Local agent binary discovery | The daemon is better at finding locally-built Claude/Codex binaries in from-source setups |
| Reconnect batching | Single batch request on reconnect instead of one per session (~92% fewer) |
| Streaming seq fix | Batched seq allocation eliminates gaps that caused slow REST fallback |
| Socket.IO polling fallback | `['polling', 'websocket']` fixes connections behind restrictive networks |
| Happy daemon co-existence | Runs independently alongside existing `happy`/`happier` daemons |
| Full rename | All identifiers, env vars, home dirs updated from `happy`/`handy` to `joyful` |

</details>

<!-- end-changelog-summary -->

---

<div align="center"><img src="/.github/logotype-dark.png" width="400" title="Joyful Coder" alt="Joyful Coder"/></div>

<h1 align="center">
  Mobile and Web Client for Claude Code & Codex
</h1>

<h4 align="center">
Use Claude Code or Codex from anywhere with end-to-end encryption.
</h4>

<div align="center">
  
[📱 **iOS App**](https://apps.apple.com/us/app/joyful-claude-code-client/id6748571505) • [🤖 **Android App**](https://play.google.com/store/apps/details?id=com.ex3ndr.joyful) • [🌐 **Web App**](https://app.joyful.engineering) • [🎥 **See a Demo**](https://youtu.be/GCS0OG9QMSE) • [📚 **Documentation**](https://joyful.engineering/docs/) • [💬 **Discord**](https://discord.gg/fX9WBAhyfD)

</div>

<img width="5178" height="2364" alt="github" src="/.github/header.png" />


<h3 align="center">
Step 1: Download App
</h3>

<div align="center">
<a href="https://apps.apple.com/us/app/joyful-claude-code-client/id6748571505"><img width="135" height="39" alt="appstore" src="https://github.com/user-attachments/assets/45e31a11-cf6b-40a2-a083-6dc8d1f01291" /></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://play.google.com/store/apps/details?id=com.ex3ndr.joyful"><img width="135" height="39" alt="googleplay" src="https://github.com/user-attachments/assets/acbba639-858f-4c74-85c7-92a4096efbf5" /></a>
</div>

<h3 align="center">
Step 2: Run from Source
</h3>

> **Note:** This is a fork — the CLI has not been published to npm. You need to run everything from this repository.

**Prerequisites:** Node.js 20+, Yarn 1.22.22, and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed.

```bash
# 1. Clone and install dependencies
git clone https://github.com/datori/joyful.git
cd joyful
yarn install

# 2. Build the CLI
yarn workspace joyful build

# 3. Start the local server + daemon (handles migrations automatically)
yarn dev:stack:start

# 4. Get your seed to link the web app
yarn dev:stack:seed
```

`yarn dev:stack:start` only starts the local server and Joyful daemon. The Expo web UI is a separate process and should be started in its own terminal:

```bash
# In a separate terminal — starts Expo web on http://localhost:8081
yarn dev:stack:web
```

Open `http://localhost:8081` → Settings → Restore with Secret Key → paste the **base32** seed printed by `yarn dev:stack:seed`.

**Running the CLI:**

```bash
# Run against the local dev stack
JOYFUL_HOME_DIR=~/.joyful-dev JOYFUL_SERVER_URL=http://localhost:3007 yarn cli

# Or use the built binary directly
JOYFUL_HOME_DIR=~/.joyful-dev JOYFUL_SERVER_URL=http://localhost:3007 ./packages/joyful-cli/bin/joyful.mjs
```

**Dev stack commands:**

```bash
yarn dev:stack:start    # Start server + daemon
yarn dev:stack:web      # Start Expo web UI on localhost:8081
yarn dev:stack:stop     # Gracefully stop everything
yarn dev:stack:status   # Show what's running
yarn dev:stack:nuke     # Full reset: wipe DB, re-bootstrap, restart
yarn dev:stack:seed     # Print seed in base64url and base32 formats
```

> ⚠️ **PGlite warning:** Never `kill -9` the server — it uses an embedded WASM database that corrupts on hard kills. Always use `yarn dev:stack:stop`.

> ℹ️ **Expo web note:** if Expo claims port `8081` is already in use but `http://localhost:8081` is not responding, the previous web process likely exited without cleaning up Expo's local state. Start the UI again with `yarn dev:stack:web`; if the problem persists, stop the stale Expo process and rerun the same command.

<h3 align="center">
Release (Maintainers)
</h3>

```bash
# from repository root
yarn release
```

<h3 align="center">
Step 3: Start using `joyful` instead of `claude` or `codex`
</h3>

```bash

# Instead of: claude
# Use: joyful

joyful

# Instead of: codex
# Use: joyful codex

joyful codex

```

<div align="center"><img src="/.github/mascot.png" width="200" title="Joyful Coder" alt="Joyful Coder"/></div>

## How does it work?

On your computer, run `joyful` instead of `claude` or `joyful codex` instead of `codex` to start your AI through our wrapper. When you want to control your coding agent from your phone, it restarts the session in remote mode. To switch back to your computer, just press any key on your keyboard.

## 🔥 Why Joyful Coder?

- 📱 **Mobile access to Claude Code and Codex** - Check what your AI is building while away from your desk
- 🔔 **Push notifications** - Get alerted when Claude Code and Codex needs permission or encounters errors  
- ⚡ **Switch devices instantly** - Take control from phone or desktop with one keypress
- 🔐 **End-to-end encrypted** - Your code never leaves your devices unencrypted
- 🛠️ **Open source** - Audit the code yourself. No telemetry, no tracking

## Screenshots

![Joyful — Sessions](docs/screenshots/sessions-demo.png)

| Chat session | Settings |
|---|---|
| ![Chat session](docs/screenshots/chat-demo.png) | ![Settings](docs/screenshots/settings-demo.png) |

| Mobile view | Welcome |
|---|---|
| ![Mobile](docs/screenshots/mobile-demo.png) | ![Welcome](docs/screenshots/welcome-demo.png) |

## 📦 Project Components

- **[Joyful App](https://github.com/slopus/joyful/tree/main/packages/joyful-app)** - Web UI + mobile client (Expo)
- **[Joyful CLI](https://github.com/slopus/joyful/tree/main/packages/joyful-cli)** - Command-line interface for Claude Code and Codex
- **[Joyful Agent](https://github.com/slopus/joyful/tree/main/packages/joyful-agent)** - Remote agent control CLI (create, send, monitor sessions)
- **[Joyful Server](https://github.com/slopus/joyful/tree/main/packages/joyful-server)** - Backend server for encrypted sync

## 🏠 Who We Are

We're engineers scattered across Bay Area coffee shops and hacker houses, constantly checking how our AI coding agents are progressing on our pet projects during lunch breaks. Joyful Coder was born from the frustration of not being able to peek at our AI coding tools building our side hustles while we're away from our keyboards. We believe the best tools come from scratching your own itch and sharing with the community.

## 📚 Documentation & Contributing

- **[Documentation Website](https://joyful.engineering/docs/)** - Learn how to use Joyful Coder effectively
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup including iOS, Android, and macOS desktop variant builds
- **[Edit docs at github.com/slopus/slopus.github.io](https://github.com/slopus/slopus.github.io)** - Help improve our documentation and guides

## License

MIT License - see [LICENSE](LICENSE) for details.
