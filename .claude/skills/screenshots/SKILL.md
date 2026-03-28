---
name: screenshots
description: Generate polished UI screenshots of the Joyful web app using fixed mock data and update the README. Use when the user wants to refresh screenshots, update the README hero images, or capture the current state of the UI.
metadata:
  author: local
  version: "2.0"
---

Generate fresh screenshots of the Joyful web app and update the README.

## Steps

**1. Check prerequisites**

Verify Playwright + Chromium is installed:

```bash
# Install if missing
yarn install
npx playwright install chromium
```

**2. Run the screenshot script**

```bash
node scripts/screenshots.mjs
```

This script:
- Starts an isolated demo joyful-server on port **3008** (`packages/joyful-server/data/screenshots-demo/`), runs DB migrations automatically.
- Authenticates against the demo server with a fixed seed and creates 4 fixed mock sessions (idempotent — safe to run repeatedly).
- Starts the Expo web dev server (`yarn workspace joyful-app web:test`) on port **8081** if not already running.
- Injects demo credentials and the demo server URL into the browser's localStorage before React initialises — no dev-stack required.
- Captures five views, polishes each with a dark framed wrapper, and writes them to `docs/screenshots/`:
  - `welcome-demo.png` — welcome / sign-in screen
  - `sessions-demo.png` — sessions list with 4 demo sessions
  - `chat-demo.png` — messages demo (desktop 1400px)
  - `settings-demo.png` — settings screen
  - `mobile-demo.png` — messages demo at 390px mobile width

**Note:** Screenshots always show the same fixed mock data regardless of dev-stack state. First Metro compile may take 1–2 minutes; subsequent runs are fast.

If the command fails, report the error and stop.

**3. Display the screenshots to the user**

Read and display all five output files so the user can see the results inline:
1. `docs/screenshots/welcome-demo.png`
2. `docs/screenshots/sessions-demo.png`
3. `docs/screenshots/chat-demo.png`
4. `docs/screenshots/settings-demo.png`
5. `docs/screenshots/mobile-demo.png`

**4. Ensure the README has a prominent screenshots section**

Read `README.md` and verify it contains a Screenshots section between the "Why Joyful Coder?" and "Project Components" sections with this layout:

A hero image:
```markdown
![Joyful — Sessions](docs/screenshots/sessions-demo.png)
```

And a 2×2 screenshot grid:
```markdown
| Chat session | Settings |
|---|---|
| ![Chat session](docs/screenshots/chat-demo.png) | ![Settings](docs/screenshots/settings-demo.png) |

| Mobile view | Welcome |
|---|---|
| ![Mobile](docs/screenshots/mobile-demo.png) | ![Welcome](docs/screenshots/welcome-demo.png) |
```

If either block is missing or paths are wrong, update `README.md` to match. Do not change anything else.

**5. Confirm**

Tell the user which files were written and confirm the README is up to date. Keep it brief.
