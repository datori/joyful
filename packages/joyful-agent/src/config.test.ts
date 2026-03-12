import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config';

describe('config', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.JOYFUL_SERVER_URL;
        delete process.env.JOYFUL_HOME_DIR;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('defaults', () => {
        it('uses default server URL', () => {
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://api.cluster-fluster.com');
        });

        it('uses default home directory', () => {
            const config = loadConfig();
            expect(config.homeDir).toBe(join(homedir(), '.joyful'));
        });

        it('derives credential path from home directory', () => {
            const config = loadConfig();
            expect(config.credentialPath).toBe(join(homedir(), '.joyful', 'agent.key'));
        });
    });

    describe('env var overrides', () => {
        it('overrides server URL with JOYFUL_SERVER_URL', () => {
            process.env.JOYFUL_SERVER_URL = 'https://custom-server.example.com';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://custom-server.example.com');
        });

        it('overrides home directory with JOYFUL_HOME_DIR', () => {
            process.env.JOYFUL_HOME_DIR = '/tmp/custom-joyful';
            const config = loadConfig();
            expect(config.homeDir).toBe('/tmp/custom-joyful');
        });

        it('derives credential path from overridden home directory', () => {
            process.env.JOYFUL_HOME_DIR = '/tmp/custom-joyful';
            const config = loadConfig();
            expect(config.credentialPath).toBe('/tmp/custom-joyful/agent.key');
        });

        it('allows both overrides simultaneously', () => {
            process.env.JOYFUL_SERVER_URL = 'https://other.example.com';
            process.env.JOYFUL_HOME_DIR = '/opt/joyful';
            const config = loadConfig();
            expect(config.serverUrl).toBe('https://other.example.com');
            expect(config.homeDir).toBe('/opt/joyful');
            expect(config.credentialPath).toBe('/opt/joyful/agent.key');
        });
    });
});
