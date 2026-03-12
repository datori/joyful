import { homedir } from 'node:os';
import { join } from 'node:path';

export type Config = {
    serverUrl: string;
    homeDir: string;
    credentialPath: string;
};

export function loadConfig(): Config {
    const serverUrl = process.env.JOYFUL_SERVER_URL;
    if (!serverUrl) {
        console.error('Error: JOYFUL_SERVER_URL is not configured.');
        console.error('Set it via: export JOYFUL_SERVER_URL=https://your-server.example.com');
        process.exit(1);
    }
    const homeDir = process.env.JOYFUL_HOME_DIR ?? join(homedir(), '.joyful');
    const credentialPath = join(homeDir, 'agent.key');
    return { serverUrl: serverUrl.replace(/\/+$/, ''), homeDir, credentialPath };
}
