import React, { memo, useState, useMemo } from 'react';
import { View, TextInput, Pressable, FlatList, Modal } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/components/StyledText';
import { t } from '@/text';
import { useNativeSessions, TrackedNativeSession } from '@/hooks/useNativeSessions';
import { formatLastSeen } from '@/utils/sessionUtils';
import { Typography } from '@/constants/Typography';

const DEFAULT_VISIBLE_COUNT = 10;

interface NativeSessionBrowserProps {
    visible: boolean;
    machineId: string | null | undefined;
    directory: string | null | undefined;
    onClose: () => void;
    onResume: (session: TrackedNativeSession) => void;
}

function getSessionTitle(session: TrackedNativeSession): string {
    if (session.summary) return session.summary;
    if (session.firstMessage) return session.firstMessage;
    const id = session.sessionId;
    return `${id.slice(0, 8)}…${id.slice(-8)}`;
}

const NativeSessionItem = memo(function NativeSessionItem({
    session,
    selected,
    onSelect,
}: {
    session: TrackedNativeSession;
    selected: boolean;
    onSelect: () => void;
}) {
    const title = getSessionTitle(session);
    const timeLabel = formatLastSeen(session.lastModified);
    const isDisabled = session.isTracked;

    return (
        <Pressable
            style={[styles.item, selected && styles.itemSelected, isDisabled && styles.itemDisabled]}
            onPress={isDisabled ? undefined : onSelect}
            disabled={isDisabled}
        >
            <View style={styles.itemContent}>
                <Text style={[styles.itemTime, isDisabled && styles.textDisabled]} numberOfLines={1}>
                    {timeLabel}
                    {isDisabled ? `  ·  ${t('nativeSessionBrowser.alreadyTracked')}` : ''}
                </Text>
                <Text style={[styles.itemTitle, isDisabled && styles.textDisabled]} numberOfLines={2}>
                    {title}
                </Text>
            </View>
            {selected && <View style={styles.selectedIndicator} />}
        </Pressable>
    );
});

export const NativeSessionBrowser = memo(function NativeSessionBrowser({
    visible,
    machineId,
    directory,
    onClose,
    onResume,
}: NativeSessionBrowserProps) {
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState<TrackedNativeSession | null>(null);
    const { sessions, loading } = useNativeSessions(machineId, directory);

    const filtered = useMemo(() => {
        if (!query.trim()) return sessions;
        const lower = query.toLowerCase();
        return sessions.filter(s =>
            (s.summary?.toLowerCase().includes(lower)) ||
            (s.firstMessage?.toLowerCase().includes(lower))
        );
    }, [sessions, query]);

    const visible_sessions = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE_COUNT);
    const hiddenCount = filtered.length - DEFAULT_VISIBLE_COUNT;

    function handleResume() {
        if (selected) {
            onResume(selected);
            onClose();
        }
    }

    function handleClose() {
        setQuery('');
        setExpanded(false);
        setSelected(null);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable style={styles.sheet} onPress={() => { }}>
                    <Text style={styles.title}>{t('nativeSessionBrowser.title')}</Text>

                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('nativeSessionBrowser.searchPlaceholder')}
                        value={query}
                        onChangeText={text => { setQuery(text); setExpanded(false); setSelected(null); }}
                        autoCorrect={false}
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                    />

                    {loading && (
                        <Text style={styles.emptyText}>…</Text>
                    )}

                    {!loading && filtered.length === 0 && (
                        <Text style={styles.emptyText}>{t('nativeSessionBrowser.noSessions')}</Text>
                    )}

                    {!loading && filtered.length > 0 && (
                        <FlatList
                            data={visible_sessions}
                            keyExtractor={item => item.sessionId}
                            style={styles.list}
                            renderItem={({ item }) => (
                                <NativeSessionItem
                                    session={item}
                                    selected={selected?.sessionId === item.sessionId}
                                    onSelect={() => setSelected(item)}
                                />
                            )}
                        />
                    )}

                    {!loading && hiddenCount > 0 && !expanded && (
                        <Pressable onPress={() => setExpanded(true)} style={styles.expandRow}>
                            <Text style={styles.expandText}>{t('nativeSessionBrowser.showAll', { count: filtered.length })}</Text>
                        </Pressable>
                    )}

                    {!loading && expanded && filtered.length > DEFAULT_VISIBLE_COUNT && (
                        <Pressable onPress={() => setExpanded(false)} style={styles.expandRow}>
                            <Text style={styles.expandText}>{t('nativeSessionBrowser.showLess')}</Text>
                        </Pressable>
                    )}

                    <View style={styles.actions}>
                        <Pressable style={styles.cancelButton} onPress={handleClose}>
                            <Text style={styles.cancelText}>{t('nativeSessionBrowser.cancel')}</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.resumeButton, !selected && styles.resumeButtonDisabled]}
                            onPress={handleResume}
                            disabled={!selected}
                        >
                            <Text style={[styles.resumeText, !selected && styles.resumeTextDisabled]}>
                                {t('nativeSessionBrowser.resumeButton')}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const styles = StyleSheet.create((theme) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    sheet: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        width: '100%',
        maxWidth: 560,
        maxHeight: '80%',
        padding: 20,
        gap: 12,
    },
    title: {
        ...Typography.default('semiBold'),
        fontSize: 17,
        color: theme.colors.text,
        marginBottom: 4,
    },
    searchInput: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
        marginBottom: 4,
    },
    list: {
        flexGrow: 0,
        maxHeight: 380,
    },
    item: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 4,
        backgroundColor: theme.colors.groupped.background,
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemSelected: {
        borderWidth: 1.5,
        borderColor: theme.colors.textLink,
    },
    itemDisabled: {
        opacity: 0.4,
    },
    itemContent: {
        flex: 1,
        gap: 2,
    },
    itemTime: {
        ...Typography.default('regular'),
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    itemTitle: {
        ...Typography.default('regular'),
        fontSize: 14,
        color: theme.colors.text,
    },
    selectedIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.textLink,
        marginLeft: 8,
    },
    textDisabled: {
        color: theme.colors.textSecondary,
    },
    emptyText: {
        ...Typography.default('regular'),
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 16,
    },
    expandRow: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    expandText: {
        ...Typography.default('regular'),
        fontSize: 14,
        color: theme.colors.textLink,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.groupped.background,
        alignItems: 'center',
    },
    cancelText: {
        ...Typography.default('semiBold'),
        fontSize: 15,
        color: theme.colors.text,
    },
    resumeButton: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
    },
    resumeButtonDisabled: {
        opacity: 0.4,
    },
    resumeText: {
        ...Typography.default('semiBold'),
        fontSize: 15,
        color: theme.colors.button.primary.tint,
    },
    resumeTextDisabled: {
        color: theme.colors.button.primary.tint,
    },
}));
