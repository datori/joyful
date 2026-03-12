> **This is a fork of [Happy Coder](https://github.com/slopus/happy) — an active fork with a focus on orchestrating Claude Code instances, including more frequent feature additions and bug fixes than the upstream project.**

## Changes from upstream Happy Coder

<!-- changelog-summary: 2026-03-12 (fork base: d343330c) -->

- **Native session browser** — discover and resume existing Claude Code sessions (JSONL files in `~/.claude/projects/`) directly from the app, without starting a new session
- **Split FAB for session resume** — dedicated "Resume" entry point alongside "New Session" on the sessions list screen; pick machine, working directory, and native session in one flow
- **Claude Code model & effort integration** — CLI reads `~/.claude/settings.json` at startup and surfaces default model and effort level to the app; effort picker added to session creation and session view; actual running model captured from the SDK and kept in sync
- **Safe co-existence with Happy daemon** — joyful daemon now runs independently of any existing `happy`/`happier` daemon on the same machine
- **Renamed throughout** — all `happy`/`handy` identifiers, env vars (`JOYFUL_MASTER_SECRET`), and home directory (`~/.joyful-dev`) updated to `joyful`

<!-- end-changelog-summary -->

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
Step 2: Install CLI on your computer
</h3>

```bash
npm install -g joyful
```

<h3 align="center">
Run From Source (Repo Checkout)
</h3>

```bash
# from repository root
yarn cli --help
yarn cli codex
```

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
