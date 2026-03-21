import * as React from 'react';
import { View, ActivityIndicator, RefreshControl, Platform, Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Octicons, Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/StyledText';
import { ItemList, ItemListStatic } from '@/components/ItemList';
import { Item } from '@/components/Item';
import { FileIcon } from '@/components/FileIcon';
import { Typography } from '@/constants/Typography';
import { useSessionProjectOpenSpecStatus } from '@/sync/storage';
import { openspecSync } from '@/sync/openspecSync';
import { OpenSpecArtifact, OpenSpecChange, OpenSpecSpecGroup } from '@/sync/storageTypes';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';

// ── Section Header ──────────────────────────────────────────────────────────

const SECTION_HEADER_STYLE = {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }) as number,
};

function SectionHeader({
    label,
    color,
    collapsed,
    onPress,
}: {
    label: string;
    color: string;
    collapsed?: boolean;
    onPress?: () => void;
}) {
    const { theme } = useUnistyles();
    return (
        <Pressable
            onPress={onPress}
            style={[SECTION_HEADER_STYLE, {
                backgroundColor: theme.colors.surfaceHigh,
                borderBottomColor: theme.colors.divider,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }]}
        >
            <Text style={{ fontSize: 14, fontWeight: '600', color, ...Typography.default() }}>
                {label}
            </Text>
            {onPress !== undefined && (
                <Ionicons
                    name={collapsed ? 'chevron-forward' : 'chevron-down'}
                    size={14}
                    color={theme.colors.textSecondary}
                />
            )}
        </Pressable>
    );
}

function SubSectionHeader({ label }: { label: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: theme.colors.surface,
        }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, ...Typography.default() }}>
                {label.toUpperCase()}
            </Text>
        </View>
    );
}

function EmptyRow({ text }: { text: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, ...Typography.default() }}>
                {text}
            </Text>
        </View>
    );
}

// ── Task Progress Bar ────────────────────────────────────────────────────────

function TaskProgressBar({
    completed,
    total,
}: {
    completed: number;
    total: number;
}) {
    const { theme } = useUnistyles();
    const ratio = total > 0 ? Math.min(1, completed / total) : 0;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.divider,
                overflow: 'hidden',
            }}>
                <View style={{
                    width: `${Math.round(ratio * 100)}%`,
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor: ratio >= 1 ? theme.colors.success : theme.colors.button.primary.background,
                }} />
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, ...Typography.default() }}>
                {t('openspec.tasksProgress', { completed, total })}
            </Text>
        </View>
    );
}

// ── Artifact Row ─────────────────────────────────────────────────────────────

function ArtifactRow({
    artifact,
    onPress,
    showDivider,
}: {
    artifact: OpenSpecArtifact;
    onPress: () => void;
    showDivider: boolean;
}) {
    return (
        <Item
            title={artifact.filename}
            icon={<FileIcon fileName={artifact.filename} size={32} />}
            onPress={onPress}
            showChevron
            showDivider={showDivider}
        />
    );
}

// ── Change Row ───────────────────────────────────────────────────────────────

function ChangeRow({
    change,
    sessionId,
    defaultExpanded,
    router,
}: {
    change: OpenSpecChange;
    sessionId: string;
    defaultExpanded: boolean;
    router: ReturnType<typeof useRouter>;
}) {
    const { theme } = useUnistyles();
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    const allArtifacts = change.artifacts;
    const hasDeltaSpecs = change.deltaSpecs.length > 0;

    const navigateToFile = React.useCallback((path: string) => {
        router.push(`/session/${sessionId}/file?path=${btoa(path)}`);
    }, [router, sessionId]);

    return (
        <ItemListStatic>
            {/* Change header row */}
            <Pressable
                onPress={() => setExpanded(prev => !prev)}
                style={({ pressed }) => [{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: pressed ? theme.colors.surfaceHigh : 'transparent',
                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }) as number,
                    borderBottomColor: theme.colors.divider,
                }]}
            >
                <Ionicons
                    name={expanded ? 'chevron-down' : 'chevron-forward'}
                    size={12}
                    color={theme.colors.textSecondary}
                />
                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text, ...Typography.default() }}>
                        {change.name}
                    </Text>
                    {change.taskStats ? (
                        <TaskProgressBar
                            completed={change.taskStats.completed}
                            total={change.taskStats.total}
                        />
                    ) : (
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, ...Typography.default() }}>
                            {t('openspec.noTasksFile')}
                        </Text>
                    )}
                </View>
            </Pressable>

            {/* Expanded content: artifacts + delta specs */}
            {expanded && (
                <>
                    {allArtifacts.map((artifact, index) => (
                        <ArtifactRow
                            key={artifact.path}
                            artifact={artifact}
                            onPress={() => navigateToFile(artifact.path)}
                            showDivider={index < allArtifacts.length - 1 || hasDeltaSpecs}
                        />
                    ))}
                    {hasDeltaSpecs && change.deltaSpecs.map((specGroup) => (
                        <SpecGroupSection
                            key={specGroup.name}
                            specGroup={specGroup}
                            sessionId={sessionId}
                            router={router}
                            isSubSection
                        />
                    ))}
                </>
            )}
        </ItemListStatic>
    );
}

// ── Spec Group Section ────────────────────────────────────────────────────────

function SpecGroupSection({
    specGroup,
    sessionId,
    router,
    defaultExpanded = false,
    isSubSection = false,
}: {
    specGroup: OpenSpecSpecGroup;
    sessionId: string;
    router: ReturnType<typeof useRouter>;
    defaultExpanded?: boolean;
    isSubSection?: boolean;
}) {
    const { theme } = useUnistyles();
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    const navigateToFile = React.useCallback((path: string) => {
        router.push(`/session/${sessionId}/file?path=${btoa(path)}`);
    }, [router, sessionId]);

    return (
        <ItemListStatic>
            {/* Spec group header */}
            <Pressable
                onPress={() => setExpanded(prev => !prev)}
                style={({ pressed }) => [{
                    paddingHorizontal: isSubSection ? 32 : 16,
                    paddingVertical: isSubSection ? 8 : 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: pressed
                        ? theme.colors.surfaceHigh
                        : isSubSection
                            ? theme.colors.surface
                            : 'transparent',
                    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }) as number,
                    borderBottomColor: theme.colors.divider,
                }]}
            >
                <Ionicons
                    name={expanded ? 'chevron-down' : 'chevron-forward'}
                    size={12}
                    color={theme.colors.textSecondary}
                />
                <Octicons name="file-directory" size={14} color={theme.colors.textSecondary} />
                <Text style={{
                    fontSize: isSubSection ? 12 : 14,
                    fontWeight: '500',
                    color: isSubSection ? theme.colors.textSecondary : theme.colors.text,
                    ...Typography.default(),
                }}>
                    {isSubSection ? `specs/${specGroup.name}` : specGroup.name}
                </Text>
            </Pressable>

            {expanded && specGroup.artifacts.map((artifact, index) => (
                <ArtifactRow
                    key={artifact.path}
                    artifact={artifact}
                    onPress={() => navigateToFile(artifact.path)}
                    showDivider={index < specGroup.artifacts.length - 1}
                />
            ))}
        </ItemListStatic>
    );
}

// ── Archived Section ──────────────────────────────────────────────────────────

function ArchivedSection({
    changes,
    sessionId,
    router,
}: {
    changes: OpenSpecChange[];
    sessionId: string;
    router: ReturnType<typeof useRouter>;
}) {
    const { theme } = useUnistyles();
    const [sectionExpanded, setSectionExpanded] = React.useState(false);

    return (
        <>
            <SectionHeader
                label={t('openspec.archived', { count: changes.length })}
                color={theme.colors.textSecondary}
                collapsed={!sectionExpanded}
                onPress={() => setSectionExpanded(prev => !prev)}
            />
            {sectionExpanded && changes.map((change) => (
                <ChangeRow
                    key={change.name}
                    change={change}
                    sessionId={sessionId}
                    defaultExpanded={false}
                    router={router}
                />
            ))}
        </>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default React.memo(function OpenSpecScreen() {
    const route = useRoute();
    const router = useRouter();
    const sessionId = (route.params! as any).id as string;
    const { theme } = useUnistyles();

    const openspecStatus = useSessionProjectOpenSpecStatus(sessionId);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    // Track whether main specs section is expanded
    const [mainSpecsExpanded, setMainSpecsExpanded] = React.useState(false);

    const handleRefresh = React.useCallback(async () => {
        setIsRefreshing(true);
        openspecSync.invalidate(sessionId);
        // Wait a moment for the sync to kick off before releasing the refresh control
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        setIsRefreshing(false);
    }, [sessionId]);

    // Loading state: status null means not yet fetched
    if (!openspecStatus) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    // No openspec directory found
    if (!openspecStatus.hasOpenspec) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Octicons name="stack" size={48} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 16, ...Typography.default() }}>
                    {t('openspec.noActiveChanges')}
                </Text>
            </View>
        );
    }

    const { activeChanges, mainSpecs, archivedChanges } = openspecStatus;

    return (
        <ItemList
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.colors.textSecondary}
                />
            }
        >
            {/* ── Active Changes ── */}
            <SectionHeader
                label={t('openspec.activeChanges', { count: activeChanges.length })}
                color={theme.colors.text}
            />
            {activeChanges.length === 0 ? (
                <EmptyRow text={t('openspec.noActiveChanges')} />
            ) : (
                activeChanges.map((change) => (
                    <ChangeRow
                        key={change.name}
                        change={change}
                        sessionId={sessionId}
                        defaultExpanded
                        router={router}
                    />
                ))
            )}

            {/* ── Main Specs ── */}
            <SectionHeader
                label={t('openspec.mainSpecs', { count: mainSpecs.length })}
                color={theme.colors.text}
                collapsed={!mainSpecsExpanded}
                onPress={() => setMainSpecsExpanded(prev => !prev)}
            />
            {mainSpecsExpanded && mainSpecs.map((specGroup) => (
                <SpecGroupSection
                    key={specGroup.name}
                    specGroup={specGroup}
                    sessionId={sessionId}
                    router={router}
                    defaultExpanded={false}
                />
            ))}

            {/* ── Archived Changes ── */}
            {archivedChanges.length > 0 && (
                <ArchivedSection
                    changes={archivedChanges}
                    sessionId={sessionId}
                    router={router}
                />
            )}
        </ItemList>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        width: '100%',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
    },
}));
