/**
 * Dev utility commands for local development and testing.
 *
 * These commands are intended for developers running joyful locally.
 * They are NOT meant for production use.
 *
 * Subcommands:
 *   bootstrap   Create a fresh local account without needing a logged-in mobile device.
 *               Breaks the chicken-and-egg problem when setting up a local dev stack.
 */

import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { configuration } from '@/configuration';
import { authGetToken } from '@/api/auth';
import { encodeBase64Url } from '@/api/encryption';
import { writeCredentialsLegacy } from '@/persistence';

export async function handleDevCommand(args: string[]): Promise<void> {
    const subcommand = args[0];

    if (!subcommand || subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
        showDevHelp();
        return;
    }

    switch (subcommand) {
        case 'bootstrap':
            await handleDevBootstrap(args.slice(1));
            break;
        default:
            console.error(chalk.red(`Unknown dev subcommand: ${subcommand}`));
            showDevHelp();
            process.exit(1);
    }
}

function showDevHelp(): void {
    console.log(`
${chalk.bold('joyful dev')} - Local development utilities

${chalk.bold('Usage:')}
  joyful dev bootstrap [--force]   Create a fresh local account on the dev server

${chalk.bold('Commands:')}
  bootstrap    Generate a fresh seed, authenticate with the configured server,
               save credentials, and print the seed for pasting into the web app.
               Requires JOYFUL_SERVER_URL to be set (e.g. http://localhost:3007).

${chalk.bold('Options:')}
  --force      Overwrite existing credentials if they already exist

${chalk.gray('Example workflow:')}
${chalk.gray('  1. Start the standalone server: cd packages/joyful-server && PORT=3007 JOYFUL_MASTER_SECRET=... tsx sources/standalone.ts')}
${chalk.gray('  2. Run bootstrap: JOYFUL_SERVER_URL=http://localhost:3007 JOYFUL_HOME_DIR=~/.joyful-dev joyful dev bootstrap')}
${chalk.gray('  3. Start web app: EXPO_PUBLIC_JOYFUL_SERVER_URL=http://localhost:3007 yarn web')}
${chalk.gray('  4. Open web app → Settings → Restore with Secret Key → paste the seed')}
`);
}

/**
 * Bootstrap a fresh local dev account.
 *
 * Logic:
 *  1. Abort if access.key already exists (unless --force)
 *  2. Generate a fresh 32-byte random seed
 *  3. POST /v1/auth (challenge/signature) to create/upsert the account and get a JWT
 *  4. Save credentials in legacy format to access.key
 *  5. Print the base64url seed and next-step instructions
 *
 * The printed seed can be pasted directly into the web app's restore/manual screen
 * (Settings → Restore with Secret Key) to log the web app into the same account.
 */
async function handleDevBootstrap(args: string[]): Promise<void> {
    const force = args.includes('--force') || args.includes('-f');
    const credentialsPath = configuration.privateKeyFile;

    if (existsSync(credentialsPath) && !force) {
        console.error(chalk.yellow('⚠️  Credentials already exist at: ' + credentialsPath));
        console.error(chalk.yellow('   Run with --force to overwrite.'));
        console.error(chalk.gray('   Existing credentials: ' + credentialsPath));
        process.exit(1);
    }

    const serverUrl = configuration.serverUrl;
    if (!serverUrl) {
        console.error(chalk.red('Error: JOYFUL_SERVER_URL is not set.'));
        console.error(chalk.gray('  Set it via: export JOYFUL_SERVER_URL=http://localhost:3007'));
        process.exit(1);
    }

    console.log(chalk.blue('🔑 Bootstrapping fresh local account...'));
    console.log(chalk.gray('  Server: ' + serverUrl));
    console.log(chalk.gray('  Home dir: ' + configuration.joyfulHomeDir));
    console.log('');

    // Generate fresh 32-byte seed
    const seedBuffer = randomBytes(32);
    const seed = new Uint8Array(seedBuffer);

    // Authenticate with the server using challenge/signature flow
    let token: string;
    try {
        token = await authGetToken(seed);
    } catch (error) {
        console.error(chalk.red('✗ Failed to authenticate with the server.'));
        console.error(chalk.gray('  Make sure the server is running at: ' + serverUrl));
        if (error instanceof Error) {
            console.error(chalk.gray('  Error: ' + error.message));
        }
        process.exit(1);
    }

    // Save credentials in legacy format (seed + token)
    await writeCredentialsLegacy({ secret: seed, token });

    const seedBase64Url = encodeBase64Url(seed);

    console.log(chalk.green('✓ Account created and credentials saved!'));
    console.log('');
    console.log(chalk.bold('Secret seed (paste into web app restore screen):'));
    console.log(chalk.cyan(seedBase64Url));
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.gray('  1. Start the web app with the server URL:'));
    console.log(chalk.gray(`     EXPO_PUBLIC_JOYFUL_SERVER_URL=${serverUrl} yarn web`));
    console.log(chalk.gray('  2. Open the web app in your browser'));
    console.log(chalk.gray('  3. Go to Settings → Restore with Secret Key'));
    console.log(chalk.gray('  4. Paste the seed above'));
    console.log(chalk.gray('  5. You are now logged into both CLI and web app!'));
}
