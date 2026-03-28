/**
 * Hook that fetches the list of git worktrees for a machine + base path.
 * Used by the WorktreePicker and orphan detection UI.
 */

import { useEffect, useRef, useState } from 'react';
import { listWorktrees, type WorktreeEntry } from '@/utils/worktree';
import { storage } from '@/sync/storage';
import { useShallow } from 'zustand/react/shallow';

export interface WorktreeListState {
    loading: boolean;
    worktrees: WorktreeEntry[];
    error: string | null;
    refresh: () => void;
}

/**
 * Fetches all worktrees for a given machine and base path.
 * Re-fetches whenever machineId or basePath change.
 */
export function useWorktreeList(
    machineId: string | null,
    basePath: string | null
): WorktreeListState {
    const [loading, setLoading] = useState(false);
    const [worktrees, setWorktrees] = useState<WorktreeEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fetchIdRef = useRef(0);

    const fetch = () => {
        if (!machineId || !basePath) {
            setWorktrees([]);
            setError(null);
            return;
        }

        const fetchId = ++fetchIdRef.current;
        setLoading(true);
        setError(null);

        listWorktrees(machineId, basePath).then(result => {
            if (fetchId !== fetchIdRef.current) return; // stale
            setLoading(false);
            if (result.success) {
                setWorktrees(result.worktrees);
            } else {
                setError(result.error ?? 'Failed to list worktrees');
                setWorktrees([]);
            }
        }).catch(err => {
            if (fetchId !== fetchIdRef.current) return;
            setLoading(false);
            setError(err instanceof Error ? err.message : 'Failed to list worktrees');
        });
    };

    useEffect(() => {
        fetch();
    }, [machineId, basePath]); // eslint-disable-line react-hooks/exhaustive-deps

    return { loading, worktrees, error, refresh: fetch };
}

/**
 * Returns worktrees that have no corresponding active session path.
 * Used to detect and surface orphaned worktrees.
 */
export function useOrphanWorktrees(
    machineId: string | null,
    basePath: string | null
): WorktreeListState & { orphans: WorktreeEntry[] } {
    const activePaths = storage(useShallow(state =>
        new Set(
            Object.values(state.sessions)
                .map(s => s.metadata?.path)
                .filter(Boolean) as string[]
        )
    ));
    const listState = useWorktreeList(machineId, basePath);

    const orphans = listState.worktrees.filter(
        wt => !wt.isMain && !activePaths.has(wt.path)
    );

    return { ...listState, orphans };
}
