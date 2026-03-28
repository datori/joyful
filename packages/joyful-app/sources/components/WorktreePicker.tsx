/**
 * WorktreePicker — shows existing worktrees plus a "Create new" option.
 * Surfaces orphaned worktrees (no active session) and provides cleanup actions.
 * Used in the new-session wizard when session type is 'worktree'.
 */

import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { Modal } from '@/modal';
import { t } from '@/text';
import type { WorktreeEntry } from '@/utils/worktree';
import { Typography } from '@/constants/Typography';

export type WorktreePickerSelection =
    | { type: 'existing'; worktree: WorktreeEntry }
    | { type: 'new' };

interface WorktreePickerProps {
    worktrees: WorktreeEntry[];
    activePaths: Set<string>;
    loading: boolean;
    error: string | null;
    cleaningPaths?: Set<string>;
    onSelect: (selection: WorktreePickerSelection) => void;
    onCleanupOrphan?: (worktree: WorktreeEntry) => void;
    onCleanupAllOrphans?: (orphans: WorktreeEntry[]) => void;
}

export const WorktreePicker = memo(function WorktreePicker({
    worktrees,
    activePaths,
    loading,
    error,
    cleaningPaths,
    onSelect,
    onCleanupOrphan,
    onCleanupAllOrphans,
}: WorktreePickerProps) {
    const { theme } = useUnistyles();

    // Filter out the main worktree — only show non-main worktrees
    const branchWorktrees = worktrees.filter(wt => !wt.isMain);
    const orphans = branchWorktrees.filter(wt => !activePaths.has(wt.path));
    const hasOrphans = orphans.length > 0;

    const handleCleanupAll = () => {
        if (orphans.length === 0 || !onCleanupAllOrphans) return;
        Modal.alert(
            t('mergeWorktree.orphanTitle'),
            `${t('mergeWorktree.orphanCleanupAll')} (${orphans.length})?`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('mergeWorktree.orphanCleanupAll'),
                    style: 'destructive',
                    onPress: () => onCleanupAllOrphans(orphans),
                },
            ]
        );
    };

    if (loading) {
        return (
            <ItemGroup title={t('newSession.worktree.pickWorktree')}>
                <View style={styles.center}>
                    <ActivityIndicator />
                    <Text style={[styles.loadingText, { color: theme.colors.textSecondary, ...Typography.default() }]}>
                        {t('newSession.worktree.loadingWorktrees')}
                    </Text>
                </View>
            </ItemGroup>
        );
    }

    if (error) {
        return (
            <ItemGroup title={t('newSession.worktree.pickWorktree')}>
                <Item
                    title={t('newSession.worktree.createNew')}
                    icon={<Ionicons name="add-circle-outline" size={29} color={"#007AFF"} />}
                    onPress={() => onSelect({ type: 'new' })}
                />
            </ItemGroup>
        );
    }

    return (
        <>
            <ItemGroup title={t('newSession.worktree.pickWorktree')}>
                {/* Create new option is always first */}
                <Item
                    title={t('newSession.worktree.createNew')}
                    icon={<Ionicons name="add-circle-outline" size={29} color={"#007AFF"} />}
                    onPress={() => onSelect({ type: 'new' })}
                />

                {/* Existing worktrees */}
                {branchWorktrees.map(wt => {
                    const isOrphan = !activePaths.has(wt.path);
                    const isCleaning = cleaningPaths?.has(wt.path) ?? false;
                    return (
                        <Item
                            key={wt.path}
                            title={wt.branch || wt.path}
                            subtitle={wt.path}
                            detail={isOrphan ? t('mergeWorktree.orphanNoSession') : undefined}
                            icon={<Ionicons name="git-branch-outline" size={29} color={isOrphan ? theme.colors.textSecondary : "#007AFF"} />}
                            loading={isCleaning}
                            onPress={isOrphan ? undefined : () => onSelect({ type: 'existing', worktree: wt })}
                            rightElement={isOrphan && onCleanupOrphan ? (
                                <Text
                                    style={{ color: theme.colors.textDestructive, fontSize: 13, ...Typography.default() }}
                                    onPress={() => onCleanupOrphan(wt)}
                                >
                                    {t('mergeWorktree.orphanCleanup')}
                                </Text>
                            ) : undefined}
                        />
                    );
                })}
            </ItemGroup>

            {/* Clean up all orphans action */}
            {hasOrphans && onCleanupAllOrphans && (
                <ItemGroup>
                    <Item
                        title={t('mergeWorktree.orphanCleanupAll')}
                        subtitle={`${orphans.length} orphaned worktree${orphans.length !== 1 ? 's' : ''}`}
                        icon={<Ionicons name="trash-outline" size={29} color={theme.colors.textDestructive} />}
                        onPress={handleCleanupAll}
                        destructive
                    />
                </ItemGroup>
            )}
        </>
    );
});

const styles = StyleSheet.create(() => ({
    center: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    loadingText: {
        fontSize: 15,
    },
}));
