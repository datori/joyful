import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

interface FABWideProps {
    onPress: () => void;
    onResume?: () => void;
    resumeDisabled?: boolean;
    /** Override bottom inset (defaults to safeArea.bottom + 16) */
    bottomOffset?: number;
}

const stylesheet = StyleSheet.create((theme, runtime) => ({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
    },
    singleButton: {
        borderRadius: 12,
        paddingVertical: 11,
        paddingHorizontal: 20,
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3.84,
        shadowOpacity: theme.colors.shadow.opacity,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow.color,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3.84,
        shadowOpacity: theme.colors.shadow.opacity,
        elevation: 5,
    },
    newButton: {
        flex: 3,
        paddingVertical: 11,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.fab.background,
    },
    newButtonPressed: {
        backgroundColor: theme.colors.fab.backgroundPressed,
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'stretch',
    },
    resumeButton: {
        flex: 2,
        paddingVertical: 11,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.fab.background,
    },
    resumeButtonPressed: {
        backgroundColor: theme.colors.fab.backgroundPressed,
    },
    resumeButtonDisabled: {
        opacity: 0.4,
    },
    buttonDefault: {
        backgroundColor: theme.colors.fab.background,
    },
    buttonPressed: {
        backgroundColor: theme.colors.fab.backgroundPressed,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.fab.icon,
    },
}));

export const FABWide = React.memo(({ onPress, onResume, resumeDisabled, bottomOffset }: FABWideProps) => {
    const styles = stylesheet;
    const safeArea = useSafeAreaInsets();
    const bottom = bottomOffset ?? safeArea.bottom + 16;

    if (!onResume) {
        // Single button mode (legacy / no resume handler provided)
        return (
            <View style={[styles.container, { bottom }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.singleButton,
                        pressed ? styles.buttonPressed : styles.buttonDefault
                    ]}
                    onPress={onPress}
                >
                    <Text style={styles.text}>{t('newSession.title')}</Text>
                </Pressable>
            </View>
        );
    }

    // Split button mode
    return (
        <View style={[styles.container, { bottom }]}>
            <View style={styles.splitContainer}>
                <Pressable
                    style={({ pressed }) => [styles.newButton, pressed && styles.newButtonPressed]}
                    onPress={onPress}
                >
                    <Text style={styles.text}>{t('newSession.title')}</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                    style={({ pressed }) => [
                        styles.resumeButton,
                        pressed && !resumeDisabled && styles.resumeButtonPressed,
                        resumeDisabled && styles.resumeButtonDisabled,
                    ]}
                    onPress={resumeDisabled ? undefined : onResume}
                    disabled={resumeDisabled}
                >
                    <Text style={styles.text}>{t('newSession.resumeNative')}</Text>
                </Pressable>
            </View>
        </View>
    );
});
