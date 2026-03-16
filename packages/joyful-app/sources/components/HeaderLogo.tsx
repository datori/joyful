import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    letter: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.header.tint,
        lineHeight: 24,
    },
}));

/**
 * Shared header logo component used across all main tabs.
 * Extracted to prevent flickering on tab switches - when each tab
 * had its own HeaderLeft, the component would unmount/remount.
 */
export const HeaderLogo = React.memo(() => {
    return (
        <View style={stylesheet.container}>
            <Text style={stylesheet.letter}>J</Text>
        </View>
    );
});
