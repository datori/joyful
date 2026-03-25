import React from 'react';
import { View, Pressable, FlatList, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Text } from '@/components/StyledText';
import { usePathname } from 'expo-router';
import { SessionListViewItem } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';
import { getSessionName, useSessionStatus, getSessionAvatarId } from '@/utils/sessionUtils';
import { Avatar } from './Avatar';
import { ActiveSessionsGroup } from './ActiveSessionsGroup';
import { ActiveSessionsGroupCompact } from './ActiveSessionsGroupCompact';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSetting } from '@/sync/storage';
import { useVisibleSessionListViewData } from '@/hooks/useVisibleSessionListViewData';
import { Typography } from '@/constants/Typography';
import { Session } from '@/sync/storageTypes';
import { StatusDot } from './StatusDot';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useIsTablet } from '@/utils/responsive';
import { requestReview } from '@/utils/requestReview';
import { UpdateBanner } from './UpdateBanner';
import { layout } from './layout';
import { useNavigateToSession } from '@/hooks/useNavigateToSession';
import { t } from '@/text';
import { useRouter } from 'expo-router';
import { Item } from './Item';
import { ItemGroup } from './ItemGroup';
import { useJoyfulAction } from '@/hooks/useJoyfulAction';
import { sessionDelete } from '@/sync/ops';
import { JoyfulError } from '@/utils/errors';
import { Modal } from '@/modal';
import { useLocalSettingMutable } from '@/sync/storage';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    headerSection: {
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
    },
    headerText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.1,
        ...Typography.default('semiBold'),
    },
    projectGroup: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 4,
        backgroundColor: theme.colors.groupped.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    projectGroupContent: {
        flex: 1,
        marginLeft: 8,
        justifyContent: 'center',
    },
    projectGroupTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.1,
        ...Typography.default('semiBold'),
    },
    projectGroupSubtitle: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginTop: 1,
        ...Typography.default(),
    },
    sessionItem: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
    },
    sessionItemContainer: {
        marginHorizontal: 16,
        marginBottom: 1,
        overflow: 'hidden',
    },
    sessionItemFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    sessionItemSingle: {
        borderRadius: 12,
    },
    sessionItemContainerFirst: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    sessionItemContainerLast: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        marginBottom: 6,
    },
    sessionItemContainerSingle: {
        borderRadius: 12,
        marginBottom: 6,
    },
    sessionItemSelected: {
        backgroundColor: theme.colors.surfaceSelected,
    },
    statusDotContainer: {
        paddingLeft: 12,
        paddingRight: 4,
    },
    sessionContent: {
        flex: 1,
        justifyContent: 'center',
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    sessionTitle: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        ...Typography.default('semiBold'),
    },
    sessionTitleConnected: {
        color: theme.colors.text,
    },
    sessionTitleDisconnected: {
        color: theme.colors.textSecondary,
    },
    sessionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        ...Typography.default(),
    },
    avatarContainer: {
        position: 'relative',
        width: 48,
        height: 48,
    },
    draftIconContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    draftIconOverlay: {
        color: theme.colors.textSecondary,
    },
    artifactsSection: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: theme.colors.groupped.background,
    },
    swipeAction: {
        width: 112,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.status.error,
    },
    swipeActionText: {
        marginTop: 4,
        fontSize: 12,
        color: '#FFFFFF',
        textAlign: 'center',
        ...Typography.default('semiBold'),
    },
    archivedSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.groupped.background,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
    },
    archivedSectionHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.groupped.sectionTitle,
        letterSpacing: 0.1,
        ...Typography.default('semiBold'),
    },
    archivedSessionWrapper: {
        opacity: 0.55,
    },
    sessionItemArchived: {
        height: 44,
    },
    avatarContainerArchived: {
        width: 40,
        height: 40,
    },
    sessionTitleArchived: {
        fontSize: 13,
    },
}));

export function SessionsList() {
    const styles = stylesheet;
    const safeArea = useSafeAreaInsets();
    const data = useVisibleSessionListViewData();
    const pathname = usePathname();
    const isTablet = useIsTablet();
    const navigateToSession = useNavigateToSession();
    const compactSessionView = useSetting('compactSessionView');
    const router = useRouter();
    const selectable = isTablet;
    const experiments = useSetting('experiments');
    const [collapsedProjectGroups, setCollapsedProjectGroups] = useLocalSettingMutable('collapsedProjectGroups');

    const toggleProjectGroup = React.useCallback((machineId: string, displayPath: string) => {
        const key = `${machineId}|${displayPath}`;
        setCollapsedProjectGroups({ ...collapsedProjectGroups, [key]: !collapsedProjectGroups[key] });
    }, [setCollapsedProjectGroups, collapsedProjectGroups]);

    // Filter out sessions belonging to collapsed project groups
    const visibleData = React.useMemo(() => {
        if (!data) return data;
        const result: SessionListViewItem[] = [];
        let currentGroupCollapsed = false;
        for (const item of data) {
            if (item.type === 'project-group') {
                const key = `${item.machine.id}|${item.displayPath}`;
                currentGroupCollapsed = !!collapsedProjectGroups[key];
                result.push(item);
                continue;
            }
            if (item.type === 'session' && currentGroupCollapsed) continue;
            if (item.type !== 'session') currentGroupCollapsed = false;
            result.push(item);
        }
        return result;
    }, [data, collapsedProjectGroups]);

    const dataWithSelected = selectable ? React.useMemo(() => {
        return visibleData?.map(item => ({
            ...item,
            selected: pathname.startsWith(`/session/${item.type === 'session' ? item.session.id : ''}`)
        }));
    }, [visibleData, pathname]) : visibleData;

    // Request review
    React.useEffect(() => {
        if (data && data.length > 0) {
            requestReview();
        }
    }, [data && data.length > 0]);

    // Early return if no data yet
    if (!data) {
        return (
            <View style={styles.container} />
        );
    }

    const keyExtractor = React.useCallback((item: SessionListViewItem & { selected?: boolean }, index: number) => {
        switch (item.type) {
            case 'header': return `header-${item.title}-${index}`;
            case 'active-sessions': return 'active-sessions';
            case 'project-group': return `project-group-${item.machine.id}-${item.displayPath}-${index}`;
            case 'session': return `session-${item.session.id}`;
            case 'archived-section-header': return 'archived-section-header';
        }
    }, []);

    const renderItem = React.useCallback(({ item, index }: { item: SessionListViewItem & { selected?: boolean }, index: number }) => {
        switch (item.type) {
            case 'header':
                return (
                    <View style={styles.headerSection}>
                        <Text style={styles.headerText}>
                            {item.title}
                        </Text>
                    </View>
                );

            case 'active-sessions':
                // Extract just the session ID from pathname (e.g., /session/abc123/file -> abc123)
                let selectedId: string | undefined;
                if (isTablet && pathname.startsWith('/session/')) {
                    const parts = pathname.split('/');
                    selectedId = parts[2]; // parts[0] is empty, parts[1] is 'session', parts[2] is the ID
                }

                const ActiveComponent = compactSessionView ? ActiveSessionsGroupCompact : ActiveSessionsGroup;
                return (
                    <ActiveComponent
                        sessions={item.sessions}
                        selectedSessionId={selectedId}
                    />
                );

            case 'project-group': {
                const groupKey = `${item.machine.id}|${item.displayPath}`;
                const isCollapsed = !!collapsedProjectGroups[groupKey];
                return (
                    <Pressable style={styles.projectGroup} onPress={() => toggleProjectGroup(item.machine.id, item.displayPath)} hitSlop={8}>
                        <Avatar id={`${item.machine.id}:${item.displayPath}`} size={28} />
                        <View style={styles.projectGroupContent}>
                            <Text style={styles.projectGroupTitle}>
                                {item.displayPath}
                            </Text>
                        </View>
                        <Ionicons
                            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                            size={16}
                            color={styles.projectGroupTitle.color}
                        />
                    </Pressable>
                );
            }

            case 'archived-section-header':
                return (
                    <View style={styles.archivedSectionHeader}>
                        <Text style={styles.archivedSectionHeaderText}>
                            {t('sessionList.archived')} ({item.count})
                        </Text>
                    </View>
                );

            case 'session':
                // Determine card styling based on position within group
                const prevItem = index > 0 && dataWithSelected ? dataWithSelected[index - 1] : null;
                const nextItem = index < (dataWithSelected?.length || 0) - 1 && dataWithSelected ? dataWithSelected[index + 1] : null;

                const isFirst = prevItem?.type === 'header' || prevItem?.type === 'archived-section-header' || prevItem?.type === 'project-group';
                const isLast = nextItem?.type === 'header' || nextItem?.type === 'archived-section-header' || nextItem?.type === 'project-group' || nextItem == null || nextItem?.type === 'active-sessions';
                const isSingle = isFirst && isLast;

                return (
                    <SessionItem
                        session={item.session}
                        selected={item.selected}
                        isFirst={isFirst}
                        isLast={isLast}
                        isSingle={isSingle}
                        isArchived={item.variant === 'archived'}
                        machineColor={item.machineColor}
                    />
                );
        }
    }, [pathname, dataWithSelected, compactSessionView, collapsedProjectGroups, toggleProjectGroup]);


    // Remove this section as we'll use FlatList for all items now


    const HeaderComponent = React.useCallback(() => {
        return (
            <UpdateBanner />
        );
    }, []);

    // Footer removed - all sessions now shown inline

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <FlatList
                    data={dataWithSelected}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{ paddingBottom: safeArea.bottom + 128, maxWidth: layout.maxWidth }}
                    ListHeaderComponent={HeaderComponent}
                />
            </View>
        </View>
    );
}

// Sub-component that handles session message logic
const SessionItem = React.memo(({ session, selected, isFirst, isLast, isSingle, isArchived, machineColor }: {
    session: Session;
    selected?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    isSingle?: boolean;
    isArchived?: boolean;
    machineColor?: string;
}) => {
    const styles = stylesheet;
    const sessionStatus = useSessionStatus(session);
    const sessionName = getSessionName(session);
    const navigateToSession = useNavigateToSession();
    const isTablet = useIsTablet();
    const swipeableRef = React.useRef<Swipeable | null>(null);
    const swipeEnabled = Platform.OS !== 'web';

    const [deletingSession, performDelete] = useJoyfulAction(async () => {
        const result = await sessionDelete(session.id);
        if (!result.success) {
            throw new JoyfulError(result.message || t('sessionInfo.failedToDeleteSession'), false);
        }
    });

    const handleDelete = React.useCallback(() => {
        swipeableRef.current?.close();
        Modal.alert(
            t('sessionInfo.deleteSession'),
            t('sessionInfo.deleteSessionWarning'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('sessionInfo.deleteSession'),
                    style: 'destructive',
                    onPress: performDelete
                }
            ]
        );
    }, [performDelete]);

    const avatarId = React.useMemo(() => {
        return getSessionAvatarId(session);
    }, [session]);

    const itemContent = (
        <Pressable
            style={[
                styles.sessionItem,
                isArchived && styles.sessionItemArchived,
                selected && styles.sessionItemSelected,
                isSingle ? styles.sessionItemSingle :
                    isFirst ? styles.sessionItemFirst :
                        isLast ? styles.sessionItemLast : {}
            ]}
            onPressIn={() => {
                if (isTablet) {
                    navigateToSession(session.id);
                }
            }}
            onPress={() => {
                if (!isTablet) {
                    navigateToSession(session.id);
                }
            }}
        >
            <View style={styles.sessionContent}>
                <Text style={[
                    styles.sessionTitle,
                    sessionStatus.isConnected ? styles.sessionTitleConnected : styles.sessionTitleDisconnected,
                    isArchived ? styles.sessionTitleArchived : undefined,
                ]} numberOfLines={1}>
                    {sessionName}
                </Text>
            </View>
            <View style={styles.statusDotContainer}>
                <StatusDot color={sessionStatus.statusDotColor} isPulsing={sessionStatus.isPulsing} />
            </View>
        </Pressable>
    );

    const containerStyles = [
        styles.sessionItemContainer,
        isSingle ? styles.sessionItemContainerSingle :
            isFirst ? styles.sessionItemContainerFirst :
                isLast ? styles.sessionItemContainerLast : {},
        isArchived ? styles.archivedSessionWrapper : undefined,
        machineColor ? { borderLeftWidth: 3, borderLeftColor: machineColor } : undefined,
    ];

    if (!swipeEnabled) {
        return (
            <View style={containerStyles}>
                {itemContent}
            </View>
        );
    }

    const renderRightActions = () => (
        <Pressable
            style={styles.swipeAction}
            onPress={handleDelete}
            disabled={deletingSession}
        >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.swipeActionText} numberOfLines={2}>
                {t('sessionInfo.deleteSession')}
            </Text>
        </Pressable>
    );

    return (
        <View style={containerStyles}>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                enabled={!deletingSession}
            >
                {itemContent}
            </Swipeable>
        </View>
    );
});
