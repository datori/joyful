/**
 * quotaFetcher.ts
 *
 * Fetches Claude Code quota data by making a minimal Messages API call and
 * reading the rate-limit response headers. This gives exact, server-authoritative
 * utilization values for the 5-hour and 7-day rolling windows.
 *
 * Headers used:
 *   anthropic-ratelimit-unified-5h-utilization  (0.0–1.0)
 *   anthropic-ratelimit-unified-5h-reset        (Unix timestamp, seconds)
 *   anthropic-ratelimit-unified-7d-utilization  (0.0–1.0)
 *   anthropic-ratelimit-unified-7d-reset        (Unix timestamp, seconds)
 *
 * The OAuth access token is read from ~/.claude/.credentials.json.
 * The API call itself uses claude-haiku-4-5-20251001 with max_tokens=1 to
 * minimise cost while still triggering the rate-limit header response.
 */

import { readFile } from 'node:fs/promises';
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
    reason: 'no-credentials' | 'api-error' | 'unknown';
};

export type QuotaFetchResult = QuotaFetchSuccess | QuotaFetchError;

async function readAccessToken(): Promise<string | null> {
    try {
        const path = join(homedir(), '.claude', '.credentials.json');
        const raw = await readFile(path, 'utf8');
        const parsed = JSON.parse(raw) as { claudeAiOauth?: { accessToken?: string } };
        return parsed.claudeAiOauth?.accessToken ?? null;
    } catch {
        return null;
    }
}

export async function fetchQuota(): Promise<QuotaFetchResult> {
    const now = Date.now();

    logger.debug('[QUOTA] Reading OAuth access token from credentials');
    const accessToken = await readAccessToken();
    if (!accessToken) {
        logger.debug('[QUOTA] No OAuth access token found in ~/.claude/.credentials.json');
        return { type: 'error', reason: 'no-credentials' };
    }

    logger.debug('[QUOTA] Making minimal Messages API call to obtain rate-limit headers');
    let response: Response;
    try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'oauth-2025-04-20',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hi' }],
            }),
        });
    } catch (err) {
        logger.debug('[QUOTA] Network error during Messages API call:', err);
        return { type: 'error', reason: 'unknown' };
    }

    if (!response.ok) {
        logger.debug(`[QUOTA] Messages API returned HTTP ${response.status}`);
        return { type: 'error', reason: 'api-error' };
    }

    const util5hRaw  = response.headers.get('anthropic-ratelimit-unified-5h-utilization');
    const reset5hRaw = response.headers.get('anthropic-ratelimit-unified-5h-reset');
    const util7dRaw  = response.headers.get('anthropic-ratelimit-unified-7d-utilization');
    const reset7dRaw = response.headers.get('anthropic-ratelimit-unified-7d-reset');

    logger.debug(`[QUOTA] Headers: 5h-util=${util5hRaw} 5h-reset=${reset5hRaw} 7d-util=${util7dRaw} 7d-reset=${reset7dRaw}`);

    const util5h  = util5hRaw  != null ? parseFloat(util5hRaw)  : 0;
    const util7d  = util7dRaw  != null ? parseFloat(util7dRaw)  : 0;

    // reset headers are Unix timestamps in seconds
    const reset5hTs = reset5hRaw != null ? parseFloat(reset5hRaw) : 0;
    const reset7dTs = reset7dRaw != null ? parseFloat(reset7dRaw) : 0;

    const reset5h = reset5hTs > 0
        ? new Date(reset5hTs * 1000).toISOString()
        : new Date(now + 5 * 3600 * 1000).toISOString();
    const reset7d = reset7dTs > 0
        ? new Date(reset7dTs * 1000).toISOString()
        : new Date(now + 7 * 24 * 3600 * 1000).toISOString();

    logger.debug(`[QUOTA] 5h: ${Math.round(util5h * 100)}%, reset=${reset5h}; 7d: ${Math.round(util7d * 100)}%, reset=${reset7d}`);

    return {
        type: 'success',
        claudeQuota5hUtil: util5h,
        claudeQuota5hReset: reset5h,
        claudeQuota7dUtil: util7d,
        claudeQuota7dReset: reset7d,
        claudeQuotaFetchedAt: now,
    };
}
