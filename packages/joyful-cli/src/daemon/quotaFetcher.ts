/**
 * quotaFetcher.ts
 *
 * Reads Claude Code session JSONL files from ~/.claude/projects/ to compute
 * token usage within the 5-hour and 7-day rolling windows.
 *
 * NOTE: The Anthropic API does not accept OAuth tokens (Claude Pro/Max subscription
 * credentials) for direct API calls. The only available data source for subscription
 * users is the local session files that the Claude Code CLI writes to disk.
 *
 * Utilization is estimated as tokens_used / estimated_tier_max. The tier is read
 * from ~/.claude/.credentials.json (rateLimitTier field). These limits are rough
 * estimates since Anthropic does not publish exact per-tier token budgets.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logger } from '@/ui/logger';

export type QuotaFetchSuccess = {
    type: 'success';
    claudeQuota5hUtil: number;
    claudeQuota5hReset: string;
    claudeQuota7dUtil: number;
    claudeQuota7dReset: string;
    claudeQuotaFetchedAt: number;
};

export type QuotaFetchError = {
    type: 'error';
    reason: 'no-projects-dir' | 'unknown';
};

export type QuotaFetchResult = QuotaFetchSuccess | QuotaFetchError;

const WINDOW_5H_MS = 5 * 3600 * 1000;
const WINDOW_7D_MS = 7 * 24 * 3600 * 1000;

/**
 * Estimated 5h / 7d token budgets by rateLimitTier.
 * Anthropic does not publish these; values are conservative estimates.
 * The bars are for relative guidance, not exact accounting.
 */
const TIER_LIMITS: Record<string, { max5h: number; max7d: number }> = {
    'default_claude_max_5x': { max5h: 5_000_000, max7d: 25_000_000 },
    'default_claude_max':    { max5h: 1_000_000, max7d: 5_000_000 },
    'default_claude_pro':    { max5h: 500_000,   max7d: 2_500_000 },
};
const DEFAULT_LIMITS = { max5h: 1_000_000, max7d: 5_000_000 };

type UsageEntry = {
    timestamp: number;
    inputTokens: number;
    outputTokens: number;
};

async function readTierFromCredentials(): Promise<string> {
    try {
        const path = join(homedir(), '.claude', '.credentials.json');
        const raw = await readFile(path, 'utf8');
        const parsed = JSON.parse(raw) as { claudeAiOauth?: { rateLimitTier?: string } };
        return parsed.claudeAiOauth?.rateLimitTier ?? 'default';
    } catch {
        return 'default';
    }
}

async function parseJSONLFile(filePath: string, cutoffMs: number): Promise<UsageEntry[]> {
    try {
        const content = await readFile(filePath, 'utf8');
        const entries: UsageEntry[] = [];
        for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
                const msg = JSON.parse(line);
                const ts: string | undefined = msg.timestamp;
                if (!ts) continue;
                const timestamp = new Date(ts).getTime();
                if (!isFinite(timestamp) || timestamp < cutoffMs) continue;
                // Usage is on the assistant message wrapper
                const usage = msg.message?.usage ?? msg.usage;
                if (!usage) continue;
                const inputTokens: number = (usage.input_tokens ?? 0);
                const outputTokens: number = (usage.output_tokens ?? 0);
                if (inputTokens + outputTokens > 0) {
                    entries.push({ timestamp, inputTokens, outputTokens });
                }
            } catch {
                // Skip malformed lines
            }
        }
        return entries;
    } catch {
        return [];
    }
}

async function collectUsageEntries(cutoffMs: number): Promise<UsageEntry[]> {
    const projectsDir = join(homedir(), '.claude', 'projects');
    const all: UsageEntry[] = [];

    let projectDirs: string[];
    try {
        projectDirs = await readdir(projectsDir);
    } catch (err) {
        logger.debug('[QUOTA] Cannot read projects dir:', err);
        return all;
    }

    await Promise.all(projectDirs.map(async (projectDir) => {
        const projectPath = join(projectsDir, projectDir);
        let files: string[];
        try {
            files = await readdir(projectPath);
        } catch {
            return;
        }
        await Promise.all(files.filter(f => f.endsWith('.jsonl')).map(async (file) => {
            const filePath = join(projectPath, file);
            try {
                // Quick filter: skip files not modified since the cutoff
                const fileStat = await stat(filePath);
                if (fileStat.mtimeMs < cutoffMs) return;
            } catch {
                return;
            }
            const entries = await parseJSONLFile(filePath, cutoffMs);
            all.push(...entries);
        }));
    }));

    return all;
}

export async function fetchQuota(): Promise<QuotaFetchResult> {
    const now = Date.now();
    const cutoff7d = now - WINDOW_7D_MS;

    logger.debug('[QUOTA] Scanning local session files for usage data');

    const [tier, allEntries] = await Promise.all([
        readTierFromCredentials(),
        collectUsageEntries(cutoff7d),
    ]);

    const limits = TIER_LIMITS[tier] ?? DEFAULT_LIMITS;
    logger.debug(`[QUOTA] Tier: ${tier}, limits: 5h=${limits.max5h}, 7d=${limits.max7d}, entries: ${allEntries.length}`);

    const cutoff5h = now - WINDOW_5H_MS;

    const entries5h = allEntries.filter(e => e.timestamp >= cutoff5h);
    const entries7d = allEntries; // already filtered to 7d

    const tokens5h = entries5h.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0);
    const tokens7d = entries7d.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0);

    // Reset time = oldest entry timestamp + window duration
    // (the rolling window drains as oldest usage ages out)
    const oldest5hTs = entries5h.length > 0 ? Math.min(...entries5h.map(e => e.timestamp)) : now;
    const oldest7dTs = entries7d.length > 0 ? Math.min(...entries7d.map(e => e.timestamp)) : now;

    const reset5h = new Date(oldest5hTs + WINDOW_5H_MS).toISOString();
    const reset7d = new Date(oldest7dTs + WINDOW_7D_MS).toISOString();

    const util5h = Math.min(1, tokens5h / limits.max5h);
    const util7d = Math.min(1, tokens7d / limits.max7d);

    logger.debug(`[QUOTA] 5h: ${tokens5h} tokens (${Math.round(util5h * 100)}%), 7d: ${tokens7d} tokens (${Math.round(util7d * 100)}%)`);

    return {
        type: 'success',
        claudeQuota5hUtil: util5h,
        claudeQuota5hReset: reset5h,
        claudeQuota7dUtil: util7d,
        claudeQuota7dReset: reset7d,
        claudeQuotaFetchedAt: now,
    };
}
