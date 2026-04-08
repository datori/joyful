import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function prepareCodexAuthHome(token: string, joyfulHomeDir: string): Promise<string> {
    const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 16);
    const codexHomeDir = join(joyfulHomeDir, 'codex', tokenHash);

    await mkdir(codexHomeDir, { recursive: true });
    await writeFile(join(codexHomeDir, 'auth.json'), token, { mode: 0o600 });

    return codexHomeDir;
}
