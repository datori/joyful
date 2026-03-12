import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface PerfEvent {
    ts: number;
    src: 'server' | 'app' | 'cli';
    op: string;
    dur_ms?: number;
    [key: string]: unknown;
}

const enabled = !!process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;

const dataDir = process.env.DATA_DIR ?? './data';
const perfFilePath = join(dataDir, 'perf.ndjson');

let dirCreated = false;

function ensureDir() {
    if (!dirCreated) {
        mkdirSync(dirname(perfFilePath), { recursive: true });
        dirCreated = true;
    }
}

export function perfLog(event: PerfEvent): void {
    if (!enabled) {
        return;
    }
    try {
        ensureDir();
        appendFileSync(perfFilePath, JSON.stringify(event) + '\n');
    } catch {
        // Never throw — perf logging must not affect the hot path
    }
}

export function getPerfFilePath(): string {
    return perfFilePath;
}

export { enabled as perfEnabled };
