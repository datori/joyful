/**
 * Hook for fetching native Claude Code sessions for a working directory.
 * Decorates results with isTracked based on existing Joyful sessions' claudeSessionId values.
 * Re-fetches on every call (no cache) to stay fresh.
 */
import { useState, useEffect } from 'react';
import { machineListNativeSessions, NativeSessionInfo } from '@/sync/ops';
import { useAllSessions } from '@/sync/storage';

export type TrackedNativeSession = NativeSessionInfo & { isTracked: boolean };

export function useNativeSessions(
    machineId: string | null | undefined,
    directory: string | null | undefined,
): {
    sessions: TrackedNativeSession[];
    loading: boolean;
} {
    const [raw, setRaw] = useState<NativeSessionInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const allSessions = useAllSessions();

    useEffect(() => {
        if (!machineId || !directory) {
            setRaw([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        machineListNativeSessions(machineId, directory).then(results => {
            if (!cancelled) {
                setRaw(results);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [machineId, directory]);

    // Build set of known Joyful-tracked Claude session IDs
    const trackedIds = new Set<string>(
        allSessions
            .map(s => s.metadata?.claudeSessionId)
            .filter((id): id is string => typeof id === 'string')
    );

    const sessions: TrackedNativeSession[] = raw.map(s => ({
        ...s,
        isTracked: trackedIds.has(s.sessionId),
    }));

    return { sessions, loading };
}
