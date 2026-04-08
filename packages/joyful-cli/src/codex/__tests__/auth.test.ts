import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { prepareCodexAuthHome } from '../auth';

describe('prepareCodexAuthHome', () => {
    const tempDirs: string[] = [];

    afterEach(async () => {
        await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
        tempDirs.length = 0;
    });

    it('stores auth in a stable Joyful-managed CODEX_HOME', async () => {
        const joyfulHomeDir = await mkdtemp(join(tmpdir(), 'joyful-codex-auth-'));
        tempDirs.push(joyfulHomeDir);

        const first = await prepareCodexAuthHome('token-123', joyfulHomeDir);
        const second = await prepareCodexAuthHome('token-123', joyfulHomeDir);

        expect(first).toBe(second);
        expect(await readFile(join(first, 'auth.json'), 'utf8')).toBe('token-123');
    });

    it('separates different tokens into different homes', async () => {
        const joyfulHomeDir = await mkdtemp(join(tmpdir(), 'joyful-codex-auth-'));
        tempDirs.push(joyfulHomeDir);

        const first = await prepareCodexAuthHome('token-123', joyfulHomeDir);
        const second = await prepareCodexAuthHome('token-456', joyfulHomeDir);

        expect(first).not.toBe(second);
    });
});
