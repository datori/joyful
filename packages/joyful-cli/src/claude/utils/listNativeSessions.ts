import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '@/ui/logger';
import { NativeSessionInfo } from '@/api/types';
import { getProjectPath } from './path';

const MAX_LINES = 50;
const MAX_FIRST_MESSAGE_LENGTH = 100;

/**
 * Read the first MAX_LINES lines of a file efficiently.
 */
async function readFirstLines(filePath: string): Promise<string[]> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(0, MAX_LINES);
}

/**
 * Extract text content from a Claude message content field (array or string).
 */
function extractTextContent(content: unknown): string | null {
    if (typeof content === 'string') {
        return content.trim() || null;
    }
    if (Array.isArray(content)) {
        for (const block of content) {
            if (block && typeof block === 'object' && (block as any).type === 'text') {
                const text = (block as any).text;
                if (typeof text === 'string' && text.trim()) {
                    return text.trim();
                }
            }
        }
    }
    return null;
}

/**
 * Parse a single JSONL session file to extract NativeSessionInfo metadata.
 * Reads only the first MAX_LINES lines for performance.
 */
async function parseSessionFile(filePath: string, sessionId: string): Promise<NativeSessionInfo | null> {
    try {
        const fileStat = await stat(filePath);
        const lastModified = fileStat.mtimeMs;

        const lines = await readFirstLines(filePath);

        let summary: string | null = null;
        let firstMessage: string | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let parsed: any;
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                // Skip malformed lines silently
                continue;
            }

            // Extract summary (from compacted sessions)
            if (parsed.type === 'summary' && typeof parsed.summary === 'string' && parsed.summary.trim()) {
                summary = parsed.summary.trim();
            }

            // Extract first user message text (fallback title)
            if (firstMessage === null && parsed.type === 'user' && parsed.message?.role === 'user') {
                const text = extractTextContent(parsed.message?.content);
                if (text) {
                    firstMessage = text.length > MAX_FIRST_MESSAGE_LENGTH
                        ? text.slice(0, MAX_FIRST_MESSAGE_LENGTH) + '…'
                        : text;
                }
            }

            // Stop early if we have both
            if (summary !== null && firstMessage !== null) break;
        }

        return { sessionId, lastModified, summary, firstMessage };
    } catch (e) {
        logger.debug(`[listNativeSessions] Skipping ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}

/**
 * List native Claude Code sessions for a given working directory.
 * Scans ~/.claude/projects/<path-id>/ for .jsonl files and extracts metadata.
 * Returns sessions sorted by lastModified descending (most recent first).
 */
export async function listNativeSessions(directory: string): Promise<NativeSessionInfo[]> {
    const projectDir = getProjectPath(directory);

    let files: string[];
    try {
        const entries = await readdir(projectDir);
        files = entries.filter(e => e.endsWith('.jsonl'));
    } catch {
        // Directory doesn't exist or isn't readable — return empty list
        return [];
    }

    const results = await Promise.all(
        files.map(file => parseSessionFile(join(projectDir, file), file.replace('.jsonl', '')))
    );

    return results
        .filter((r): r is NativeSessionInfo => r !== null)
        .sort((a, b) => b.lastModified - a.lastModified);
}
