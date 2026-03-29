/**
 * Merge Worktree Screen
 *
 * Dispatches a comprehensive merge prompt to the worktree session agent.
 * The agent handles spec checks, conflict resolution, and the actual merge.
 * This screen only needs to know: has the branch been merged yet?
 *
 * States: loading → ready | merged
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Modal } from '@/modal';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';
import { useSession } from '@/sync/storage';
import { parseWorktreePath, checkIsMerged, buildMergePrompt, removeWorktree } from '@/utils/worktree';
import { formatPathRelativeToHome } from '@/utils/sessionUtils';
import { sessionDelete } from '@/sync/ops';

type MergeStep = 'loading' | 'ready' | 'merged';

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

    const [step, setStep] = useState<MergeStep>('loading');
    const [cleaning, setCleaning] = useState(false);

    useEffect(() => {
        if (!machineId || !basePath || !branchName) return;
        checkStatus();
    }, [machineId, basePath, branchName]);

    const checkStatus = useCallback(async () => {
        setStep('loading');
        const merged = await checkIsMerged(machineId, basePath, branchName);
        setStep(merged ? 'merged' : 'ready');
    }, [machineId, basePath, branchName]);

    const handleMergeWithAI = useCallback(() => {
        const prompt = buildMergePrompt(basePath, branchName, worktreePath);
        router.push({ pathname: '/session/[id]', params: { id, autoSendMessage: prompt } });
    }, [basePath, branchName, worktreePath, id, router]);

    const handleCleanup = useCallback(async () => {
        setCleaning(true);
        const result = await removeWorktree(machineId, worktreePath);
        setCleaning(false);
        if (!result.success) {
            Modal.alert(t('common.warning'), t('sessionInfo.worktreeCleanupFailed', { path: worktreePath }));
        }
        router.back();
        router.back();
    }, [machineId, worktreePath, router]);

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
            </View>
        );
    }

    if (step === 'merged') {
        return (
            <ItemList>
                <View style={styles.successHeader}>
                    <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                    <Text style={[styles.heroTitle, { color: theme.colors.text, ...Typography.default('semiBold') }]}>
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
                        icon={cleaning ? undefined : <Ionicons name="trash-outline" size={29} color="#FF3B30" />}
                        loading={cleaning}
                        destructive
                        onPress={handleCleanup}
                    />
                    <Item
                        title={t('common.back')}
                        icon={<Ionicons name="close-outline" size={29} color={theme.colors.textSecondary} />}
                        onPress={() => router.back()}
                    />
                </ItemGroup>
            </ItemList>
        );
    }

    const homeDir = session.metadata?.homeDir;
    const displayBasePath = formatPathRelativeToHome(basePath, homeDir);

    return (
        <ItemList>
            <ItemGroup>
                <Item
                    title={branchName}
                    subtitle={displayBasePath}
                    icon={<Ionicons name="git-branch-outline" size={29} color="#007AFF" />}
                    showChevron={false}
                />
            </ItemGroup>
            <ItemGroup>
                <Item
                    title={t('mergeWorktree.mergeWithAI')}
                    subtitle={t('mergeWorktree.mergeWithAISubtitle')}
                    icon={<Ionicons name="sparkles-outline" size={29} color="#34C759" />}
                    onPress={handleMergeWithAI}
                />
            </ItemGroup>
        </ItemList>
    );
});

const styles = StyleSheet.create(() => ({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
    },
    successHeader: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    heroTitle: {
        fontSize: 22,
        marginTop: 12,
    },
}));
