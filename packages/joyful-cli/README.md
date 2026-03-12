# Joyful

Code on the go — control AI coding agents from your mobile device.

Free. Open source. Code anywhere.

## Installation

```bash
npm install -g joyful
```

## Run From Source

From a repo checkout:

```bash
# repository root
yarn cli --help

# package directory
yarn cli --help
```

## Usage

### Claude (default)

```bash
joyful
```

This will:
1. Start a Claude Code session
2. Display a QR code to connect from your mobile device
3. Allow real-time session sharing between Claude Code and your mobile app

### Gemini

```bash
joyful gemini
```

Start a Gemini CLI session with remote control capabilities.

**First time setup:**
```bash
# Authenticate with Google
joyful connect gemini
```

## Commands

### Main Commands

- `joyful` – Start Claude Code session (default)
- `joyful gemini` – Start Gemini CLI session
- `joyful codex` – Start Codex mode
- `joyful acp` – Start a generic ACP-compatible agent

### Utility Commands

- `joyful auth` – Manage authentication
- `joyful connect` – Store AI vendor API keys in Joyful cloud
- `joyful sandbox` – Configure sandbox runtime restrictions
- `joyful notify` – Send a push notification to your devices
- `joyful daemon` – Manage background service
- `joyful doctor` – System diagnostics & troubleshooting

### Connect Subcommands

```bash
joyful connect gemini     # Authenticate with Google for Gemini
joyful connect claude     # Authenticate with Anthropic
joyful connect codex      # Authenticate with OpenAI
joyful connect status     # Show connection status for all vendors
```

### Gemini Subcommands

```bash
joyful gemini                      # Start Gemini session
joyful gemini model set <model>    # Set default model
joyful gemini model get            # Show current model
joyful gemini project set <id>     # Set Google Cloud Project ID (for Workspace accounts)
joyful gemini project get          # Show current Google Cloud Project ID
```

**Available models:** `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`

### Generic ACP Commands

```bash
joyful acp gemini                     # Run built-in Gemini ACP command
joyful acp opencode                   # Run built-in OpenCode ACP command
joyful acp opencode --verbose         # Include raw backend/envelope logs
joyful acp -- custom-agent --flag     # Run any ACP-compatible command directly
```

### Sandbox Subcommands

```bash
joyful sandbox configure  # Interactive sandbox setup wizard
joyful sandbox status     # Show current sandbox configuration
joyful sandbox disable    # Disable sandboxing
```

## Options

### Claude Options

- `-m, --model <model>` - Claude model to use (default: sonnet)
- `-p, --permission-mode <mode>` - Permission mode: auto, default, or plan
- `--claude-env KEY=VALUE` - Set environment variable for Claude Code
- `--claude-arg ARG` - Pass additional argument to Claude CLI

### Global Options

- `-h, --help` - Show help
- `-v, --version` - Show version
- `--no-sandbox` - Disable sandbox for the current Claude/Codex run

## Environment Variables

### Joyful Configuration

- `JOYFUL_SERVER_URL` - Custom server URL (default: https://api.cluster-fluster.com)
- `JOYFUL_WEBAPP_URL` - Custom web app URL (default: https://app.happy.engineering)
- `JOYFUL_HOME_DIR` - Custom home directory for Joyful data (default: ~/.joyful)
- `JOYFUL_DISABLE_CAFFEINATE` - Disable macOS sleep prevention (set to `true`, `1`, or `yes`)
- `JOYFUL_EXPERIMENTAL` - Enable experimental features (set to `true`, `1`, or `yes`)

### Gemini Configuration

- `GEMINI_MODEL` - Override default Gemini model
- `GOOGLE_CLOUD_PROJECT` - Google Cloud Project ID (required for Workspace accounts)

## Gemini Authentication

### Personal Google Account

Personal Gmail accounts work out of the box:

```bash
joyful connect gemini
joyful gemini
```

### Google Workspace Account

Google Workspace (organization) accounts require a Google Cloud Project:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gemini API
3. Set the project ID:

```bash
joyful gemini project set your-project-id
```

Or use environment variable:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id joyful gemini
```

**Guide:** https://goo.gle/gemini-cli-auth-docs#workspace-gca

## Contributing

Interested in contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Requirements

- Node.js >= 20.0.0

### For Claude

- Claude CLI installed & logged in (`claude` command available in PATH)

### For Gemini

- Gemini CLI installed (`npm install -g @google/gemini-cli`)
- Google account authenticated via `joyful connect gemini`

## License

MIT
