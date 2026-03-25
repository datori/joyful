/**
 * Automated screenshot generator for the Joyful web app.
 *
 * Usage:
 *   node scripts/screenshots.mjs
 *
 * Requires:
 *   - node_modules installed: yarn install
 *   - Playwright + Chromium: npx playwright install chromium
 *
 * Output: docs/screenshots/{welcome,sessions,chat,settings,mobile}-demo.png
 *
 * Demo data: starts an isolated joyful-server on port 3008 with fixed mock
 * sessions so screenshots are always consistent regardless of dev-stack state.
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nacl = require('tweetnacl');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT  = join(ROOT, 'docs', 'screenshots');
const SERVER_PKG  = join(ROOT, 'packages', 'joyful-server');
const EXPO_PORT   = 8081;
const DEMO_PORT   = 3008;
const BASE_APP    = `http://localhost:${EXPO_PORT}`;
const BASE_DEMO   = `http://localhost:${DEMO_PORT}`;

// ─── Demo server config ───────────────────────────────────────────────────────
// Fixed 32-byte secret — do NOT change or screenshots will use wrong encryption key.
const DEMO_SECRET = Buffer.from('joyful-screenshots-demo-key-v1!!'); // exactly 32 bytes
// Fixed hex master secret for JWT signing — stable across runs.
const DEMO_MASTER_SECRET = 'b7e3f1a928c054d6e4f2831b0e7c4a9d3f1e5b2c8a0d6f4e2b8c1a5d3f0e7b9c';

// ─── Demo server ──────────────────────────────────────────────────────────────

async function isDemoServerRunning() {
    try {
        const res = await fetch(`${BASE_DEMO}/`);
        return res.status < 500;
    } catch {
        return false;
    }
}

function startDemoServer() {
    // Wipe old DB so sessions are always freshly created with current metadata
    const pgliteDir = join(SERVER_PKG, 'data', 'screenshots-demo', 'pglite');
    rmSync(pgliteDir, { recursive: true, force: true });

    // Migrate (synchronous — fast on fresh DB)
    execSync(
        `PORT=${DEMO_PORT} JOYFUL_MASTER_SECRET=${DEMO_MASTER_SECRET} DATA_DIR=./data/screenshots-demo npx tsx sources/standalone.ts migrate`,
        { cwd: SERVER_PKG, stdio: 'ignore' }
    );

    // Start server
    const proc = spawn(
        'npx',
        ['tsx', 'sources/standalone.ts', 'serve'],
        {
            cwd: SERVER_PKG,
            env: {
                ...process.env,
                PORT: String(DEMO_PORT),
                JOYFUL_MASTER_SECRET: DEMO_MASTER_SECRET,
                DATA_DIR: './data/screenshots-demo',
                METRICS_ENABLED: 'false',   // avoid port 9090 conflict with dev server
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    );
    proc.stdout.on('data', () => {});
    proc.stderr.on('data', () => {});
    proc.on('error', (e) => { throw e; });
    return proc;
}

async function waitForDemoServer(maxMs = 30000) {
    console.log('  Waiting for demo server…');
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        if (await isDemoServerRunning()) return;
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Demo server did not respond within ${maxMs / 1000}s`);
}

// ─── Demo auth and data ───────────────────────────────────────────────────────

function encryptMetadata(metadata) {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24 bytes
    const message = new TextEncoder().encode(JSON.stringify(metadata));
    const ciphertext = nacl.secretbox(message, nonce, DEMO_SECRET);
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);
    return Buffer.from(combined).toString('base64');
}

async function authenticateDemo() {
    const keyPair = nacl.sign.keyPair.fromSeed(DEMO_SECRET);
    const challenge = nacl.randomBytes(32);
    const signature = nacl.sign.detached(challenge, keyPair.secretKey);

    const res = await fetch(`${BASE_DEMO}/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicKey:  Buffer.from(keyPair.publicKey).toString('base64'),
            challenge:  Buffer.from(challenge).toString('base64'),
            signature:  Buffer.from(signature).toString('base64'),
        }),
    });

    if (!res.ok) {
        throw new Error(`Demo auth failed: ${await res.text()}`);
    }
    return (await res.json()).token;
}

async function createDemoSessions(token) {
    const now = Date.now();
    const sessions = [
        {
            tag:      'demo-refactor-auth-middleware',
            metadata: { path: '/home/dev/api-server', homeDir: '/home/dev', host: 'Devbox-Pro', os: 'linux',
                        summary: { text: 'Refactor auth middleware to JWT', updatedAt: now } },
        },
        {
            tag:      'demo-fix-android-navigation',
            metadata: { path: '/home/dev/mobile-app', homeDir: '/home/dev', host: 'Devbox-Pro', os: 'linux',
                        summary: { text: 'Fix navigation crash on Android', updatedAt: now } },
        },
        {
            tag:      'demo-write-payment-tests',
            metadata: { path: '/home/dev/payments', homeDir: '/home/dev', host: 'Devbox-Pro', os: 'linux',
                        summary: { text: 'Write tests for payment service', updatedAt: now } },
        },
        {
            tag:      'demo-update-api-docs',
            metadata: { path: '/home/dev/docs-site', homeDir: '/home/dev', host: 'Devbox-Pro', os: 'linux',
                        summary: { text: 'Update OpenAPI documentation', updatedAt: now } },
        },
    ];

    for (const { tag, metadata } of sessions) {
        await fetch(`${BASE_DEMO}/v1/sessions`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ tag, metadata: encryptMetadata(metadata) }),
        });
    }
}

// ─── Expo server ──────────────────────────────────────────────────────────────

function startExpoServer() {
    const proc = spawn(
        'yarn',
        ['workspace', 'joyful-app', 'web:test'],
        {
            cwd: ROOT,
            env: {
                ...process.env,
                EXPO_NO_TELEMETRY: '1',
                CI: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        }
    );
    proc.stdout.on('data', () => {});
    proc.stderr.on('data', () => {});
    proc.on('error', (e) => { throw e; });
    return proc;
}

async function waitForExpoServer(maxMs = 300000) {
    console.log('  Waiting for Metro bundler (first compile may take 1–2 min)…');
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${BASE_APP}/`);
            if (res.status < 500) return;
        } catch {}
        await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error(`Expo dev server did not respond within ${maxMs / 1000}s`);
}

// ─── Polish wrapper ───────────────────────────────────────────────────────────

async function polish(browser, rawPngPath, label) {
    const rawB64 = readFileSync(rawPngPath).toString('base64');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
    min-height: 100vh;
  }
  .frame {
    border-radius: 10px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.08),
      0 8px 32px rgba(0,0,0,0.6),
      0 32px 80px rgba(0,0,0,0.4);
    max-width: 100%;
  }
  img { display: block; max-width: 100%; }
  .label {
    position: fixed;
    bottom: 16px;
    right: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="frame">
    <img src="data:image/png;base64,${rawB64}" />
  </div>
  <span class="label">${label}</span>
</body>
</html>`;

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const box = await page.locator('.frame').boundingBox();
    await page.setViewportSize({
        width:  Math.round(box.x * 2 + box.width  + 96),
        height: Math.round(box.y * 2 + box.height + 96),
    });
    const buf = await page.screenshot({ fullPage: true });
    await page.close();
    return buf;
}

// ─── Capture one page ─────────────────────────────────────────────────────────

async function capture(browser, path, label, demoCredentials, { width = 1400, height = 900 } = {}) {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });

    // Inject auth credentials and demo server URL before React initialises.
    // The server URL is injected via MMKV's web localStorage key so it takes
    // priority over EXPO_PUBLIC_JOYFUL_SERVER_URL regardless of how Expo started.
    await page.addInitScript((creds, serverUrl) => {
        if (creds) {
            localStorage.setItem('auth_credentials', JSON.stringify(creds));
        }
        // MMKV web key format: "{id}\{key}"
        localStorage.setItem('server-config\\custom-server-url', serverUrl);
    }, demoCredentials, BASE_DEMO);

    await page.goto(`${BASE_APP}${path}`, { waitUntil: 'commit', timeout: 60000 });

    // Wait for React root to have children (implicit bundle-compile wait)
    await page.waitForFunction(() => {
        const root = document.getElementById('root');
        return root != null && root.children.length > 0;
    }, { timeout: 60000 });

    // Wait for fonts (15s fallback)
    await page.evaluate(() =>
        Promise.race([
            document.fonts.ready,
            new Promise(r => setTimeout(r, 15000)),
        ])
    );

    // Short settle wait for animations / async state updates
    await page.waitForTimeout(1500);

    const rawPath = join(OUT, `_raw_${label}.png`);
    await page.screenshot({ path: rawPath, fullPage: false, timeout: 30000 });
    await page.close();
    return rawPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // ── 1. Demo server ────────────────────────────────────────────────────────
    let demoServer = null;
    if (await isDemoServerRunning()) {
        console.log('Demo server already running — skipping startup.');
    } else {
        console.log('Starting demo server on port 3008…');
        demoServer = startDemoServer();
    }
    await waitForDemoServer();
    console.log('  ✓ Demo server ready.');

    // ── 2. Authenticate and seed demo data ────────────────────────────────────
    console.log('Seeding demo sessions…');
    const token = await authenticateDemo();
    await createDemoSessions(token);
    console.log('  ✓ Demo data ready.');

    // Build credentials for the app (secret must be base64url)
    const demoSecretB64url = DEMO_SECRET.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    const demoCredentials = { token, secret: demoSecretB64url };

    // ── 3. Expo server ────────────────────────────────────────────────────────
    let alreadyRunning = false;
    try {
        const res = await fetch(`${BASE_APP}/`);
        if (res.status < 500) alreadyRunning = true;
    } catch {}

    let expoServer = null;
    if (alreadyRunning) {
        console.log('Expo dev server already running — skipping startup.');
    } else {
        console.log('Starting Expo web server…');
        expoServer = startExpoServer();
    }

    await waitForExpoServer();
    console.log('  ✓ Expo server ready.');

    // Warm the bundle
    await fetch(`${BASE_APP}/`);

    // ── 4. Screenshots ────────────────────────────────────────────────────────
    const browser = await chromium.launch();
    mkdirSync(OUT, { recursive: true });

    const shots = [
        { route: '/',                  label: 'welcome',  outFile: 'welcome-demo.png',  title: 'Joyful · Welcome',  creds: null           },
        { route: '/',                  label: 'sessions', outFile: 'sessions-demo.png', title: 'Joyful · Sessions', creds: demoCredentials },
        { route: '/dev/messages-demo', label: 'chat',     outFile: 'chat-demo.png',     title: 'Joyful · Chat',     creds: demoCredentials },
        { route: '/settings',          label: 'settings', outFile: 'settings-demo.png', title: 'Joyful · Settings', creds: demoCredentials },
        { route: '/dev/messages-demo', label: 'mobile',   outFile: 'mobile-demo.png',   title: 'Joyful · Mobile',   creds: demoCredentials, width: 390, height: 844 },
    ];

    try {
        for (const { route, label, outFile, title, creds, width, height } of shots) {
            console.log(`Capturing ${label}…`);
            const rawPath = await capture(browser, route, label, creds, { width, height });
            const polished = await polish(browser, rawPath, title);
            writeFileSync(join(OUT, outFile), polished);
            console.log(`  ✓ ${outFile}`);
        }
    } finally {
        await browser.close();
        if (expoServer) expoServer.kill();
        if (demoServer) demoServer.kill();
    }

    console.log('\nScreenshots saved to docs/screenshots/');
    for (const { outFile } of shots) console.log(`  ${outFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
