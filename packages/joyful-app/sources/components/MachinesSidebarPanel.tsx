import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useAllMachines } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { formatMemory } from '@/utils/stringUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 0,
        backgroundColor: theme.colors.groupped.background,
    },
    headerTitle: {
        flex: 1,
        ...Typography.default('semiBold'),
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: theme.colors.groupped.sectionTitle,
    },
    machineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        backgroundColor: theme.colors.groupped.background,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        marginRight: 9,
        flexShrink: 0,
    },
    machineName: {
        flex: 1,
        ...Typography.default(),
        fontSize: 13,
        color: theme.colors.text,
    },
    memoryText: {
        ...Typography.default(),
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 6,
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.divider,
        marginLeft: 32,
    },
}));

export const MachinesSidebarPanel = React.memo(() => {
    const { theme } = useUnistyles();
    const machines = useAllMachines();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleMachinePress = useCallback((machineId: string) => {
        router.push(`/machine/${machineId}`);
    }, [router]);

    const handleToggle = useCallback(() => {
        setCollapsed(c => !c);
    }, []);

    if (machines.length === 0) return null;

    return (
        <View style={stylesheet.container}>
            <Pressable style={[stylesheet.header, collapsed && { paddingBottom: 8 }]} onPress={handleToggle}>
                <Text style={stylesheet.headerTitle}>{t('sidebar.machines')}</Text>
                <Ionicons
                    name={collapsed ? 'chevron-forward' : 'chevron-down'}
                    size={13}
                    color={theme.colors.groupped.sectionTitle}
                />
            </Pressable>
            {!collapsed && machines.map((machine, index) => {
                const isOnline = isMachineOnline(machine);
                const name = (machine.metadata as any)?.displayName
                    || (machine.metadata as any)?.host
                    || machine.id;
                const memTotal: number | undefined = machine.daemonState?.memTotal;
                const memFree: number | undefined = machine.daemonState?.memFree;
                const hasMemory = memTotal != null && memFree != null;
                const isLast = index === machines.length - 1;

                return (
                    <React.Fragment key={machine.id}>
                        <Pressable
                            style={stylesheet.machineRow}
                            onPress={() => handleMachinePress(machine.id)}
                        >
                            <View style={[
                                stylesheet.dot,
                                {
                                    backgroundColor: isOnline ? '#34C759' : theme.colors.textSecondary,
                                    opacity: isOnline ? 1 : 0.35,
                                }
                            ]} />
                            <Text style={stylesheet.machineName} numberOfLines={1}>{name}</Text>
                            {hasMemory && (
                                <Text style={stylesheet.memoryText}>
                                    {t('machine.memoryUsage', {
                                        used: formatMemory(memTotal! - memFree!),
                                        total: formatMemory(memTotal!),
                                    })}
                                </Text>
                            )}
                        </Pressable>
                        {!isLast && <View style={stylesheet.rowDivider} />}
                    </React.Fragment>
                );
            })}
        </View>
    );
});
