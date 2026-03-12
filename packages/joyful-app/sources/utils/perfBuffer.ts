/**
 * Client-side performance event buffer.
 *
 * Buffers PerfEvent objects in a ring buffer (max 500) and flushes them as a
 * single POST to /dev/perf every 5 seconds, or immediately on demand.
 *
 * All exports are no-ops when DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING
 * is not set, so there is zero overhead in production.
 */

import { getServerUrl } from '@/sync/serverConfig';

const enabled = !!process.env.EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;

const MAX_BUFFER = 500;
const FLUSH_INTERVAL_MS = 5000;

interface PerfEvent {
    ts: number;
    src: 'app';
    op: string;
    dur_ms?: number;
    [key: string]: unknown;
}

let buffer: PerfEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let lastForegroundTs: number | null = null;

export function setForegroundTs(ts: number): void {
    lastForegroundTs = ts;
}

export function getForegroundTs(): number | null {
    return lastForegroundTs;
}

function startFlushTimer() {
    if (flushTimer !== null) {
        return;
    }
    flushTimer = setInterval(() => {
        void flushPerfBuffer();
    }, FLUSH_INTERVAL_MS);
}

export function perfMark(op: string, meta?: Record<string, unknown>): void {
    if (!enabled) {
        return;
    }
    const event: PerfEvent = { ts: Date.now(), src: 'app', op, ...meta };
    buffer.push(event);
    if (buffer.length > MAX_BUFFER) {
        buffer.shift();
    }
    startFlushTimer();
}

export async function flushPerfBuffer(): Promise<void> {
    if (!enabled || buffer.length === 0) {
        return;
    }
    const serverUrl = getServerUrl();
    if (!serverUrl) {
        return;
    }
    const batch = buffer.splice(0, buffer.length);
    try {
        await fetch(`${serverUrl}/dev/perf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batch }),
        });
    } catch {
        // Re-buffer on failure so events aren't lost on transient errors
        buffer = [...batch, ...buffer].slice(-MAX_BUFFER);
    }
}
