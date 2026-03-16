import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { layout } from '@/components/layout';
import { t } from '@/text';
import { machineBrowseDirectory, BrowseDirectoryEntry } from '@/sync/ops';
import { Typography } from '@/constants/Typography';

function BrowseScreen() {
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ machineId?: string; initialPath?: string }>();

    const machineId = params.machineId ?? '';
    const initialPath = params.initialPath ?? '/';

    // Internal navigation stack — device back button always exits, never backtracks through dirs
    const [pathStack, setPathStack] = useState<string[]>([initialPath]);
    const [entries, setEntries] = useState<BrowseDirectoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHidden, setShowHidden] = useState(false);

    const currentPath = pathStack[pathStack.length - 1];

    const loadDirectory = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await machineBrowseDirectory(machineId, path);
            if (result.success && result.entries) {
                setEntries(result.entries);
            } else {
                setError(result.error ?? t('newSession.browseLoadError'));
                setEntries([]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : t('newSession.browseLoadError'));
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [machineId]);

    useEffect(() => {
        loadDirectory(currentPath);
    }, [currentPath, loadDirectory]);

    // Dirs only, sorted alpha, hidden filter applied
    const visibleEntries = useMemo(() => {
        return entries
            .filter(e => e.type === 'directory')
            .filter(e => showHidden || !e.name.startsWith('.'))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [entries, showHidden]);

    const navigateInto = useCallback((name: string) => {
        if (loading) return;
        const next = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        setPathStack(prev => [...prev, next]);
    }, [currentPath, loading]);

    const navigateToPath = useCallback((path: string) => {
        if (loading) return;
        setPathStack(prev => {
            // If already in stack, truncate to that point
            const idx = prev.indexOf(path);
            if (idx >= 0) return prev.slice(0, idx + 1);
            return [...prev, path];
        });
    }, [loading]);

    const navigateUp = useCallback(() => {
        if (loading) return;
        const parent = currentPath.includes('/')
            ? currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
            : '/';
        navigateToPath(parent);
    }, [currentPath, loading, navigateToPath]);

    const handleConfirm = useCallback(() => {
        const state = navigation.getState();
        const previousRoute = state?.routes?.[state.index - 1];
        if (state && state.index > 0 && previousRoute) {
            navigation.dispatch({
                ...CommonActions.setParams({ selectedPath: currentPath }),
                source: previousRoute.key,
            } as never);
        }
        router.back();
    }, [currentPath, navigation, router]);

    // Breadcrumb: split path into segments, left-truncate if > 4 segments
    const breadcrumbSegments = useMemo(() => {
        const parts = currentPath === '/' ? [''] : currentPath.split('/');
        // Build cumulative paths
        const segments = parts.map((part, i) => ({
            label: i === 0 ? '/' : part,
            path: i === 0 ? '/' : parts.slice(0, i + 1).join('/'),
        }));

        if (segments.length > 4) {
            return [{ label: '…', path: null }, ...segments.slice(-3)];
        }
        return segments;
    }, [currentPath]);

    const isAtRoot = currentPath === '/';

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: t('newSession.browseTitle'),
                    headerBackTitle: t('common.back'),
                    headerRight: () => (
                        <Pressable
                            onPress={() => setShowHidden(v => !v)}
                            style={({ pressed }) => ({
                                marginRight: 16,
                                opacity: pressed ? 0.7 : 1,
                                padding: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                            })}
                        >
                            <Ionicons
                                name={showHidden ? 'eye' : 'eye-off-outline'}
                                size={20}
                                color={showHidden ? theme.colors.header.tint : theme.colors.textSecondary}
                            />
                        </Pressable>
                    ),
                }}
            />
            <View style={styles.container}>
                {/* Breadcrumb */}
                <View style={styles.breadcrumbRow}>
                    {breadcrumbSegments.map((seg, i) => (
                        <React.Fragment key={`${seg.path ?? '…'}-${i}`}>
                            {i > 0 && (
                                <Text style={styles.breadcrumbSep}>/</Text>
                            )}
                            <Pressable
                                onPress={seg.path ? () => navigateToPath(seg.path!) : undefined}
                                disabled={!seg.path || seg.path === currentPath}
                                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                            >
                                <Text
                                    style={[
                                        styles.breadcrumbSegment,
                                        seg.path === currentPath && styles.breadcrumbSegmentActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {seg.label}
                                </Text>
                            </Pressable>
                        </React.Fragment>
                    ))}
                </View>

                {/* Directory list */}
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentWrapper}>
                        <ItemGroup>
                            {!isAtRoot && (
                                <Item
                                    title={t('newSession.parentFolder')}
                                    leftElement={
                                        <Ionicons
                                            name="arrow-up-outline"
                                            size={18}
                                            color={theme.colors.textSecondary}
                                        />
                                    }
                                    onPress={navigateUp}
                                    disabled={loading}
                                    showChevron={false}
                                    showDivider={visibleEntries.length > 0 || loading || !!error}
                                />
                            )}

                            {loading && (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                                </View>
                            )}

                            {!loading && error && (
                                <View style={styles.errorRow}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {!loading && !error && visibleEntries.map((entry, index) => (
                                <Item
                                    key={entry.name}
                                    title={entry.name}
                                    leftElement={
                                        <Ionicons
                                            name={entry.isSymlink ? 'git-branch-outline' : 'folder-outline'}
                                            size={18}
                                            color={theme.colors.textSecondary}
                                        />
                                    }
                                    onPress={() => navigateInto(entry.name)}
                                    showChevron={true}
                                    showDivider={index < visibleEntries.length - 1}
                                />
                            ))}

                            {!loading && !error && visibleEntries.length === 0 && (
                                <View style={styles.emptyRow}>
                                    <Text style={styles.emptyText}>No subdirectories</Text>
                                </View>
                            )}
                        </ItemGroup>
                    </View>
                </ScrollView>

                {/* Sticky confirm button */}
                <View style={styles.confirmContainer}>
                    <Pressable
                        onPress={handleConfirm}
                        style={({ pressed }) => [
                            styles.confirmButton,
                            { opacity: pressed ? 0.8 : 1 },
                        ]}
                    >
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.header.tint} />
                        <Text style={styles.confirmText} numberOfLines={1}>
                            {t('newSession.useDirectory', { path: currentPath })}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </>
    );
}

export default memo(BrowseScreen);

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    breadcrumbRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.colors.groupped.background,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.divider,
        flexWrap: 'nowrap',
        overflow: 'hidden',
    },
    breadcrumbSep: {
        ...Typography.default('regular'),
        color: theme.colors.textSecondary,
        fontSize: 13,
        marginHorizontal: 2,
    },
    breadcrumbSegment: {
        ...Typography.default('regular'),
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    breadcrumbSegmentActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
    },
    contentWrapper: {
        width: '100%',
        maxWidth: layout.maxWidth,
    },
    loadingRow: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    errorRow: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    errorText: {
        ...Typography.default('regular'),
        color: theme.colors.textDestructive,
        fontSize: 15,
    },
    emptyRow: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    emptyText: {
        ...Typography.default('regular'),
        color: theme.colors.textSecondary,
        fontSize: 15,
    },
    confirmContainer: {
        borderTopWidth: 0.5,
        borderTopColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    confirmText: {
        ...Typography.default('semiBold'),
        color: theme.colors.header.tint,
        fontSize: 16,
        flex: 1,
    },
}));
