## About this fork

This is a fork of [Happy Coder](https://github.com/slopus/happy), maintained with a focus on orchestrating Claude Code instances. Expect more frequent feature additions and bug fixes relative to upstream.

### Changes from upstream

<!-- changelog-summary: 2026-03-21 (fork base: d343330c) -->

#### Session management
- **Interactive filesystem browser** — navigate the remote machine's directory tree in the new-session path picker, with hidden-dir toggle and breadcrumb navigation
- **Native session browser** — discover and resume existing Claude Code sessions (`~/.claude/projects/` JSONL files) directly from the app
- **Split FAB for session resume** — dedicated "Resume" entry point alongside "New Session"; pick machine, working directory, and native session in one flow
- **Archived sessions** — inactive sessions grouped under a collapsible "Archived (N)" header, collapsed by default

#### Monitoring & quota
- **Claude quota widget** — sidebar panel showing 5h and 7d rolling-window utilization bars with colour-coded fill, reset countdown, and manual refresh; sourced from `anthropic-ratelimit-unified-*` response headers via OAuth Messages API ping
- **Machine memory stats** — daemon reports total/free RAM and its own RSS; shown in a collapsible sidebar panel and machine detail screen
- **Quota polling fixes** — skips API-key-only machines; eliminated a re-entrant loop that caused daemon OOM crashes

#### Claude Code integration
- **Bedrock model support** — `bedrock-claude-opus`, `bedrock-claude-sonnet`, and `bedrock-claude-haiku` in model pickers, for `ANTHROPIC_BASE_URL`-backed Bedrock gateways
- **Model & effort level** — CLI reads `~/.claude/settings.json` and surfaces default model/effort to the app; effort picker in session creation and session view
- **Slash command autocomplete** — typing `/` on the new-session screen surfaces recently-seen commands from past sessions
- **OpenSpec panel** — in-app status panel showing active changes with task progress bars, main specs, and archived changes; toolbar badge shows active-change count
- **Explore & Patch mode buttons** — one-shot prefix toggles for `/opsx:explore` and `/opsx:patch` in the new-session creator; mutually exclusive

#### UI & UX
- **Git history & branch list** — tappable branch pill opens a screen with all local/remote branches (ahead/behind counts) and last 30 commits
- **Plasma avatar style** — new default: three gaussian-blurred blobs in triadic hues with screen blending; CSS fallback for web
- **Condensed density & dark mode** — tightened session rows and settings items; dark surfaces aligned to iOS palette; FAB buttons softened
- **Mobile layout fixes** — code block word wrapping, message wrapping on narrow screens, slash-command overlay anchored above keyboard, PWA safe-area fix
- **Machines panel collapsed by default** — collapse state persisted via MMKV; defaults to collapsed to reduce noise
- **Compact view default, settings chips, Ionicons, J branding** — streamlined defaults and visual refresh

#### Voice
- **Self-hosted ElevenLabs config** — agent ID settable in Settings → Voice; clear prompts when unconfigured; 503 with actionable message when API key is absent

#### Performance
- **Reconnect batching** — single `POST /v3/messages/batch` replaces one fetch per session on reconnect (~92% fewer requests)
- **Streaming seq fix** — batched seq allocation eliminates gaps that forced 35% of messages to the slow REST fallback

#### Infrastructure
- **Socket.IO polling fallback** — `['polling', 'websocket']` transports fix connection failures behind restrictive networks
- **Safe co-existence with Happy daemon** — joyful daemon runs independently alongside existing `happy`/`happier` daemons
- **Full rename** — all identifiers, env vars, and home directories updated from `happy`/`handy` to `joyful`

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

The web app connects to the local server at `http://localhost:3007`:

```bash
# In a separate terminal — starts Expo web on http://localhost:8081
EXPO_PUBLIC_JOYFUL_SERVER_URL=http://localhost:3007 yarn web
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
yarn dev:stack:stop     # Gracefully stop everything
yarn dev:stack:status   # Show what's running
yarn dev:stack:nuke     # Full reset: wipe DB, re-bootstrap, restart
yarn dev:stack:seed     # Print seed in base64url and base32 formats
```

> ⚠️ **PGlite warning:** Never `kill -9` the server — it uses an embedded WASM database that corrupts on hard kills. Always use `yarn dev:stack:stop`.

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
