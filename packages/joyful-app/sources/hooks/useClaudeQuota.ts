/**
 * useClaudeQuota.ts
 *
 * Reads Claude API quota fields from the first machine that has quota data in its
 * daemonState. Triggers a `fetch-quota` RPC to the first online machine when the
 * app comes to the foreground and on a 5-minute interval while foregrounded.
 *
 * Returns null when no quota data is available (panel is hidden).
 */

import * as React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAllMachines } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { apiSocket } from '@/sync/apiSocket';

export type ClaudeQuotaData = {
    claudeQuota5hUtil: number;
    claudeQuota5hReset: string;
    claudeQuota7dUtil: number;
    claudeQuota7dReset: string;
    claudeQuotaFetchedAt: number;
};

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export type UseClaudeQuotaResult = {
    quota: ClaudeQuotaData | null;
    refresh: () => void;
};

export function useClaudeQuota(): UseClaudeQuotaResult {
    const machines = useAllMachines();

    // Find quota data from the first machine that has it
    const quotaData = React.useMemo<ClaudeQuotaData | null>(() => {
        for (const machine of machines) {
            const state = machine.daemonState as any;
            if (
                state != null &&
                typeof state.claudeQuota5hUtil === 'number' &&
                typeof state.claudeQuota5hReset === 'string' &&
                typeof state.claudeQuota7dUtil === 'number' &&
                typeof state.claudeQuota7dReset === 'string' &&
                typeof state.claudeQuotaFetchedAt === 'number'
            ) {
                return {
                    claudeQuota5hUtil: state.claudeQuota5hUtil,
                    claudeQuota5hReset: state.claudeQuota5hReset,
                    claudeQuota7dUtil: state.claudeQuota7dUtil,
                    claudeQuota7dReset: state.claudeQuota7dReset,
                    claudeQuotaFetchedAt: state.claudeQuotaFetchedAt,
                };
            }
        }
        return null;
    }, [machines]);

    // Send fetch-quota RPC to the first online machine; silently skip if none online
    const sendFetchQuota = React.useCallback(async () => {
        const onlineMachine = machines.find(isMachineOnline);
        if (!onlineMachine) return;
        try {
            await apiSocket.machineRPC<{ type: string }, {}>(
                onlineMachine.id,
                'fetch-quota',
                {}
            );
        } catch {
            // Silently ignore RPC errors — quota display keeps last cached values
        }
    }, [machines]);

    // Keep a stable ref so the polling effect doesn't re-run when sendFetchQuota
    // is recreated (which happens every time machines/daemonState changes, which
    // would create a feedback loop: fetch → state update → re-render → fetch again).
    const sendFetchQuotaRef = React.useRef(sendFetchQuota);
    sendFetchQuotaRef.current = sendFetchQuota;

    // Trigger on app foreground, cancel interval on background.
    // Intentionally uses sendFetchQuotaRef (not sendFetchQuota) so this effect
    // runs only once on mount and does not re-run on every state update.
    React.useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startInterval = () => {
            if (interval !== null) return;
            interval = setInterval(() => {
                sendFetchQuotaRef.current();
            }, POLL_INTERVAL_MS);
        };

        const stopInterval = () => {
            if (interval !== null) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                sendFetchQuotaRef.current();
                startInterval();
            } else {
                stopInterval();
            }
        };

        // If app is already active when hook mounts, fetch immediately and start interval
        if (AppState.currentState === 'active') {
            sendFetchQuotaRef.current();
            startInterval();
        }

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
            stopInterval();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { quota: quotaData, refresh: sendFetchQuota };
}
