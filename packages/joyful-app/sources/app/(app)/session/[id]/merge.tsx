/**
 * Merge Worktree Screen
 * Orchestrates the full merge-back flow for worktree sessions.
 *
 * Steps:
 *   1. Load diff stat + check OpenSpec issues
 *   2. Show warnings (unarchived changes, spec divergence)
 *   3. Show diff preview + merge type toggle
 *   4. Execute merge
 *   5. Success: offer cleanup | Conflict: show conflicting files
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { CodeView } from '@/components/CodeView';
import { Modal } from '@/modal';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';
import { useSession } from '@/sync/storage';
import {
    parseWorktreePath,
    getWorktreeDiffStat,
    mergeWorktree,
    removeWorktree,
    detectUnarchivedChanges,
    detectSpecDivergence,
    pullMainIntoWorktree,
} from '@/utils/worktree';
import { machineBash } from '@/sync/ops';
import { sessionDelete } from '@/sync/ops';

type MergeStep =
    | 'loading'
    | 'openspec-unarchived'
    | 'openspec-divergence'
    | 'preview'
    | 'merging'
    | 'success'
    | 'conflict';

export default memo(function MergeWorktreeScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const session = useSession(id);
    const router = useRouter();
    const { theme } = useUnistyles();

    const machineId = session?.metadata?.machineId ?? '';
    const worktreePath = session?.metadata?.path ?? '';
    const parsed = parseWorktreePath(worktreePath);
    const basePath = parsed?.basePath ?? '';
    const branchName = parsed?.branchName ?? '';

    // ── State ─────────────────────────────────────────────────────────────────
    const [step, setStep] = useState<MergeStep>('loading');
    const [diffStat, setDiffStat] = useState('');
    const [commitCount, setCommitCount] = useState(0);
    const [fullDiff, setFullDiff] = useState<string | null>(null);
    const [showFullDiff, setShowFullDiff] = useState(false);
    const [useSquash, setUseSquash] = useState(true);
    const [commitMessage, setCommitMessage] = useState(
        t('mergeWorktree.commitMessageDefault', { branchName })
    );
    const [conflictFiles, setConflictFiles] = useState<string[]>([]);
    const [unarchivedChanges, setUnarchivedChanges] = useState<string[]>([]);
    const [hasDivergence, setHasDivergence] = useState(false);
    const [pullingMain, setPullingMain] = useState(false);

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!machineId || !basePath || !branchName) return;
        loadMergeData();
    }, [machineId, basePath, branchName]);

    const loadMergeData = useCallback(async () => {
        setStep('loading');

        // Fetch diff stat, unarchived changes, and spec divergence in parallel
        const [diffResult, unarchivedResult, divergenceResult] = await Promise.all([
            getWorktreeDiffStat(machineId, basePath, branchName),
            detectUnarchivedChanges(machineId, worktreePath),
            detectSpecDivergence(machineId, basePath, branchName),
        ]);

        if (diffResult.success && diffResult.data) {
            setDiffStat(diffResult.data.diffStat);
            setCommitCount(diffResult.data.commitCount);
        }

        const unarchived = unarchivedResult.success ? unarchivedResult.changeNames : [];
        setUnarchivedChanges(unarchived);

        const diverged = divergenceResult.success && divergenceResult.hasDivergence;
        setHasDivergence(diverged);

        // Determine which step to show first
        if (unarchived.length > 0) {
            setStep('openspec-unarchived');
        } else if (diverged) {
            setStep('openspec-divergence');
        } else {
            setStep('preview');
        }
    }, [machineId, basePath, branchName, worktreePath]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleProceedFromUnarchived = useCallback(() => {
        if (hasDivergence) {
            setStep('openspec-divergence');
        } else {
            setStep('preview');
        }
    }, [hasDivergence]);

    const handlePullMain = useCallback(async () => {
        setPullingMain(true);
        const result = await pullMainIntoWorktree(machineId, worktreePath);
        setPullingMain(false);

        if (result.success) {
            Modal.alert(t('mergeWorktree.pullMainSuccess'), t('mergeWorktree.specAfterPullMessage'));
            // Re-check divergence after pull
            const divergenceResult = await detectSpecDivergence(machineId, basePath, branchName);
            if (!divergenceResult.hasDivergence) {
                setStep('preview');
            } else {
                Modal.alert(t('common.warning'), t('mergeWorktree.specAfterPullMessage'));
                setStep('preview');
            }
        } else {
            if (result.hasConflicts) {
                Modal.alert(t('mergeWorktree.conflictTitle'), t('mergeWorktree.conflictMessage'));
            } else {
                Modal.alert(t('common.error'), t('mergeWorktree.pullMainFailed'));
            }
        }
    }, [machineId, worktreePath, basePath, branchName]);

    const handleLoadFullDiff = useCallback(async () => {
        if (fullDiff !== null) {
            setShowFullDiff(true);
            return;
        }
        const result = await machineBash(
            machineId,
            `git diff main...${branchName}`,
            basePath
        );
        setFullDiff(result.success ? result.stdout : t('common.error'));
        setShowFullDiff(true);
    }, [machineId, basePath, branchName, fullDiff]);

    const handleMerge = useCallback(async () => {
        setStep('merging');
        const result = await mergeWorktree(machineId, basePath, branchName, {
            squash: useSquash,
            commitMessage,
        });

        if (result.success) {
            setStep('success');
        } else if (result.error === 'worktree_dirty') {
            setStep('preview');
            Modal.alert(t('mergeWorktree.conflictTitle'), t('mergeWorktree.worktreeDirtyMessage'));
        } else if (result.error === 'base_dirty') {
            setStep('preview');
            Modal.alert(t('mergeWorktree.conflictTitle'), t('mergeWorktree.baseDirtyMessage'));
        } else {
            setConflictFiles(result.conflictFiles ?? []);
            setStep('conflict');
        }
    }, [machineId, basePath, branchName, useSquash, commitMessage]);

    const handleCleanup = useCallback(async () => {
        const result = await removeWorktree(machineId, worktreePath);
        if (!result.success) {
            Modal.alert(t('common.warning'), t('sessionInfo.worktreeCleanupFailed', { path: worktreePath }));
        }
        router.back();
        router.back();
    }, [machineId, worktreePath, router]);

    const handleSkipCleanup = useCallback(() => {
        router.back();
    }, [router]);

    // ── Render helpers ────────────────────────────────────────────────────────

    if (!session || !parsed) {
        return (
            <View style={styles.center}>
                <Text style={{ color: theme.colors.textSecondary, ...Typography.default() }}>
                    {t('common.loading')}
                </Text>
            </View>
        );
    }

    if (step === 'loading') {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary, ...Typography.default() }]}>
                    {t('mergeWorktree.loadingDiff')}
                </Text>
            </View>
        );
    }

    // ── OpenSpec: Unarchived changes warning ──────────────────────────────────
    if (step === 'openspec-unarchived') {
        return (
            <ItemList>
                <ItemGroup title={t('mergeWorktree.openspecUnarchivedTitle')}>
                    <Item
                        title={t('mergeWorktree.openspecUnarchivedMessage')}
                        subtitle={unarchivedChanges.join('\n')}
                        icon={<Ionicons name="warning-outline" size={29} color="#FF9500" />}
                        showChevron={false}
                    />
                    <Item
                        title={t('mergeWorktree.openspecArchiveFirst')}
                        icon={<Ionicons name="archive-outline" size={29} color="#007AFF" />}
                        onPress={() => router.back()}
                    />
                    <Item
                        title={t('mergeWorktree.openspecProceedAnyway')}
                        icon={<Ionicons name="arrow-forward-outline" size={29} color={theme.colors.textSecondary} />}
                        onPress={handleProceedFromUnarchived}
                    />
                </ItemGroup>
            </ItemList>
        );
    }

    // ── OpenSpec: Spec divergence warning ─────────────────────────────────────
    if (step === 'openspec-divergence') {
        return (
            <ItemList>
                <ItemGroup title={t('mergeWorktree.specDivergenceTitle')}>
                    <Item
                        title={t('mergeWorktree.specDivergenceMessage')}
                        icon={<Ionicons name="git-branch-outline" size={29} color="#FF9500" />}
                        showChevron={false}
                    />
                    <Item
                        title={t('mergeWorktree.specPullResync')}
                        subtitle={t('mergeWorktree.specPullResyncDescription')}
                        icon={pullingMain ? undefined : <Ionicons name="cloud-download-outline" size={29} color="#007AFF" />}
                        loading={pullingMain}
                        onPress={handlePullMain}
                    />
                    <Item
                        title={t('mergeWorktree.specMergeAnyway')}
                        icon={<Ionicons name="git-merge-outline" size={29} color={theme.colors.textSecondary} />}
                        onPress={() => setStep('preview')}
                    />
                </ItemGroup>
            </ItemList>
        );
    }

    // ── Merge preview ─────────────────────────────────────────────────────────
    if (step === 'preview') {
        return (
            <ScrollView>
                <View style={{ maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }}>
                    {/* Diff stat */}
                    <ItemGroup title={t('mergeWorktree.preview')}>
                        <Item
                            title={t('mergeWorktree.commits', { count: commitCount })}
                            detail={branchName}
                            icon={<Ionicons name="git-commit-outline" size={29} color="#007AFF" />}
                            showChevron={false}
                        />
                        {diffStat ? (
                            <View style={styles.diffStatContainer}>
                                <Text style={[styles.diffStatText, { color: theme.colors.text, ...Typography.default() }]}>
                                    {diffStat}
                                </Text>
                            </View>
                        ) : (
                            <Item
                                title={t('mergeWorktree.noChanges')}
                                icon={<Ionicons name="checkmark-circle-outline" size={29} color={theme.colors.textSecondary} />}
                                showChevron={false}
                            />
                        )}
                        <Item
                            title={t('mergeWorktree.viewFullDiff')}
                            icon={<Ionicons name="code-outline" size={29} color="#007AFF" />}
                            onPress={handleLoadFullDiff}
                        />
                    </ItemGroup>

                    {/* Full diff view */}
                    {showFullDiff && fullDiff !== null && (
                        <ItemGroup title={t('mergeWorktree.fullDiffTitle')}>
                            <View style={styles.diffContainer}>
                                <CodeView code={fullDiff} language="diff" />
                            </View>
                        </ItemGroup>
                    )}

                    {/* Merge type toggle */}
                    <ItemGroup>
                        <Item
                            title={t('mergeWorktree.squashMerge')}
                            subtitle={t('mergeWorktree.squashDescription')}
                            icon={<Ionicons name="git-merge-outline" size={29} color={useSquash ? "#007AFF" : theme.colors.textSecondary} />}
                            rightElement={useSquash ? <Ionicons name="checkmark-circle" size={20} color={"#007AFF"} /> : null}
                            onPress={() => setUseSquash(true)}
                            showChevron={false}
                        />
                        <Item
                            title={t('mergeWorktree.regularMerge')}
                            subtitle={t('mergeWorktree.regularDescription')}
                            icon={<Ionicons name="git-network-outline" size={29} color={!useSquash ? "#007AFF" : theme.colors.textSecondary} />}
                            rightElement={!useSquash ? <Ionicons name="checkmark-circle" size={20} color={"#007AFF"} /> : null}
                            onPress={() => setUseSquash(false)}
                            showChevron={false}
                        />
                    </ItemGroup>

                    {/* Commit message (squash only) */}
                    {useSquash && (
                        <ItemGroup title={t('mergeWorktree.commitMessageLabel')}>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.divider }]}
                                    value={commitMessage}
                                    onChangeText={setCommitMessage}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </ItemGroup>
                    )}

                    {/* Merge button */}
                    <ItemGroup>
                        <Item
                            title={t('mergeWorktree.mergeButton')}
                            icon={<Ionicons name="git-merge-outline" size={29} color="#34C759" />}
                            onPress={handleMerge}
                        />
                    </ItemGroup>
                </View>
            </ScrollView>
        );
    }

    // ── Merging ───────────────────────────────────────────────────────────────
    if (step === 'merging') {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary, ...Typography.default() }]}>
                    {t('mergeWorktree.merging')}
                </Text>
            </View>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <ItemList>
                <View style={styles.successHeader}>
                    <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                    <Text style={[styles.successTitle, { color: theme.colors.text, ...Typography.default('semiBold') }]}>
                        {t('mergeWorktree.successTitle')}
                    </Text>
                </View>
                <ItemGroup title={t('mergeWorktree.cleanupTitle')}>
                    <Item
                        title={t('mergeWorktree.cleanupMessage')}
                        icon={<Ionicons name="information-circle-outline" size={29} color="#007AFF" />}
                        showChevron={false}
                    />
                    <Item
                        title={t('mergeWorktree.cleanupConfirm')}
                        icon={<Ionicons name="trash-outline" size={29} color="#FF3B30" />}
                        destructive
                        onPress={() => Modal.alert(
                            t('mergeWorktree.cleanupTitle'),
                            t('mergeWorktree.cleanupMessage'),
                            [
                                { text: t('common.cancel'), style: 'cancel', onPress: handleSkipCleanup },
                                { text: t('mergeWorktree.cleanupConfirm'), style: 'destructive', onPress: handleCleanup },
                            ]
                        )}
                    />
                    <Item
                        title={t('common.cancel')}
                        icon={<Ionicons name="close-outline" size={29} color={theme.colors.textSecondary} />}
                        onPress={handleSkipCleanup}
                    />
                </ItemGroup>
            </ItemList>
        );
    }

    // ── Conflict ──────────────────────────────────────────────────────────────
    if (step === 'conflict') {
        return (
            <ItemList>
                <View style={styles.center}>
                    <Ionicons name="warning" size={64} color="#FF3B30" />
                    <Text style={[styles.successTitle, { color: theme.colors.text, ...Typography.default('semiBold') }]}>
                        {t('mergeWorktree.conflictTitle')}
                    </Text>
                </View>
                <ItemGroup>
                    <Item
                        title={t('mergeWorktree.conflictMessage')}
                        icon={<Ionicons name="information-circle-outline" size={29} color="#FF3B30" />}
                        showChevron={false}
                    />
                </ItemGroup>
                {conflictFiles.length > 0 && (
                    <ItemGroup title={t('mergeWorktree.conflictFilesLabel')}>
                        {conflictFiles.map(f => (
                            <Item
                                key={f}
                                title={f}
                                icon={<Ionicons name="document-outline" size={29} color="#FF3B30" />}
                                showChevron={false}
                            />
                        ))}
                    </ItemGroup>
                )}
                <ItemGroup>
                    <Item
                        title={t('common.back')}
                        icon={<Ionicons name="arrow-back-outline" size={29} color="#007AFF" />}
                        onPress={() => setStep('preview')}
                    />
                </ItemGroup>
            </ItemList>
        );
    }

    return null;
});

const styles = StyleSheet.create((theme) => ({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
    },
    loadingText: {
        fontSize: 15,
        marginTop: 8,
    },
    diffStatContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    diffStatText: {
        fontSize: 13,
        fontFamily: 'monospace',
    },
    diffContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    input: {
        fontSize: 15,
        padding: 8,
        borderWidth: 1,
        borderRadius: 8,
        minHeight: 80,
    },
    successHeader: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    successTitle: {
        fontSize: 22,
        marginTop: 12,
    },
}));
