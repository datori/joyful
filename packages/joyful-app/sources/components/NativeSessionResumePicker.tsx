/**
 * NativeSessionResumePicker — modal that lets the user pick a machine + path and then
 * browse native Claude Code sessions. Triggered from the split FAB on the sessions list.
 * Handles the full resume flow: pick → browse → spawn → navigate.
 */
import React, { memo, useState, useMemo } from 'react';
import { View, TextInput, Pressable, FlatList, Modal } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { useRouter } from 'expo-router';
import { Text } from '@/components/StyledText';
import { t } from '@/text';
import { useAllMachines } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { machineSpawnNewSession } from '@/sync/ops';
import { sync } from '@/sync/sync';
import { NativeSessionBrowser } from '@/components/NativeSessionBrowser';
import { TrackedNativeSession } from '@/hooks/useNativeSessions';
import { Typography } from '@/constants/Typography';
import { Machine } from '@/sync/storageTypes';

interface NativeSessionResumePickerProps {
    visible: boolean;
    onClose: () => void;
}

function getMachineLabel(machine: Machine): string {
    return machine.metadata?.displayName || machine.metadata?.host || machine.id;
}

export const NativeSessionResumePicker = memo(function NativeSessionResumePicker({
    visible,
    onClose,
}: NativeSessionResumePickerProps) {
    const router = useRouter();
    const allMachines = useAllMachines();
    const onlineMachines = useMemo(() => allMachines.filter(isMachineOnline), [allMachines]);

    const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
    const [directory, setDirectory] = useState('');
    const [browserVisible, setBrowserVisible] = useState(false);
    const [spawning, setSpawning] = useState(false);

    // Auto-select when exactly one online machine
    const effectiveMachineId = selectedMachineId ?? (onlineMachines.length === 1 ? onlineMachines[0].id : null);
    const canBrowse = !!effectiveMachineId && directory.trim().length > 0;

    function handleClose() {
        setSelectedMachineId(null);
        setDirectory('');
        setBrowserVisible(false);
        setSpawning(false);
        onClose();
    }

    async function handleResume(session: TrackedNativeSession) {
        if (!effectiveMachineId) return;
        setSpawning(true);
        try {
            const result = await machineSpawnNewSession({
                machineId: effectiveMachineId,
                directory: directory.trim(),
                approvedNewDirectoryCreation: true,
                resumeNativeSessionId: session.sessionId,
            });
            await sync.refreshSessions();
            if ('sessionId' in result && result.sessionId) {
                handleClose();
                router.push(`/session/${result.sessionId}`);
            }
        } finally {
            setSpawning(false);
        }
    }

    return (
        <>
            <Modal
                visible={visible && !browserVisible}
                transparent
                animationType="fade"
                onRequestClose={handleClose}
            >
                <Pressable style={styles.overlay} onPress={handleClose}>
                    <Pressable style={styles.sheet} onPress={() => { }}>
                        <Text style={styles.title}>{t('nativeSessionResumePicker.title')}</Text>

                        {/* Single machine: show as read-only label */}
                        {onlineMachines.length === 1 && (
                            <View style={[styles.machineItem, styles.machineItemSelected]}>
                                <Text style={[styles.machineItemText, styles.machineItemTextSelected]}>
                                    {getMachineLabel(onlineMachines[0])}
                                </Text>
                            </View>
                        )}

                        {/* Multiple machines: interactive selector */}
                        {onlineMachines.length > 1 && (
                            <FlatList
                                data={onlineMachines}
                                keyExtractor={m => m.id}
                                style={styles.machineList}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[styles.machineItem, effectiveMachineId === item.id && styles.machineItemSelected]}
                                        onPress={() => setSelectedMachineId(item.id)}
                                    >
                                        <Text style={[styles.machineItemText, effectiveMachineId === item.id && styles.machineItemTextSelected]}>
                                            {getMachineLabel(item)}
                                        </Text>
                                    </Pressable>
                                )}
                            />
                        )}

                        <TextInput
                            style={styles.pathInput}
                            placeholder={t('nativeSessionResumePicker.pathPlaceholder')}
                            value={directory}
                            onChangeText={setDirectory}
                            autoCorrect={false}
                            autoCapitalize="none"
                            clearButtonMode="while-editing"
                        />

                        <View style={styles.actions}>
                            <Pressable style={styles.cancelButton} onPress={handleClose}>
                                <Text style={styles.cancelText}>{t('nativeSessionResumePicker.cancel')}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.findButton, !canBrowse && styles.findButtonDisabled]}
                                onPress={canBrowse ? () => setBrowserVisible(true) : undefined}
                                disabled={!canBrowse}
                            >
                                <Text style={[styles.findText, !canBrowse && styles.findTextDisabled]}>
                                    {t('nativeSessionResumePicker.findSessions')}
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <NativeSessionBrowser
                visible={browserVisible}
                machineId={effectiveMachineId}
                directory={directory || null}
                onClose={() => setBrowserVisible(false)}
                onResume={handleResume}
            />
        </>
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
        maxWidth: 480,
        padding: 20,
        gap: 12,
    },
    title: {
        ...Typography.default('semiBold'),
        fontSize: 17,
        color: theme.colors.text,
        marginBottom: 4,
    },
    machineList: {
        maxHeight: 160,
        flexGrow: 0,
    },
    machineItem: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        marginBottom: 4,
        backgroundColor: theme.colors.groupped.background,
    },
    machineItemSelected: {
        borderWidth: 1.5,
        borderColor: theme.colors.textLink,
    },
    machineItemText: {
        ...Typography.default('regular'),
        fontSize: 14,
        color: theme.colors.text,
    },
    machineItemTextSelected: {
        color: theme.colors.textLink,
        ...Typography.default('semiBold'),
    },
    pathInput: {
        backgroundColor: theme.colors.groupped.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.text,
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
    findButton: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
    },
    findButtonDisabled: {
        opacity: 0.4,
    },
    findText: {
        ...Typography.default('semiBold'),
        fontSize: 15,
        color: theme.colors.button.primary.tint,
    },
    findTextDisabled: {
        color: theme.colors.button.primary.tint,
    },
}));
