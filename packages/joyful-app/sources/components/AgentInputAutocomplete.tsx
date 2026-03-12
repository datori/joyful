import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { FloatingOverlay } from './FloatingOverlay';

interface AgentInputAutocompleteProps {
    suggestions: React.ReactElement[];
    selectedIndex?: number;
    onSelect: (index: number) => void;
    itemHeight: number;
    /** Optional section header shown above the suggestion list (e.g. "Recent commands") */
    suggestionsLabel?: string;
}

export const AgentInputAutocomplete = React.memo((props: AgentInputAutocompleteProps) => {
    const { suggestions, selectedIndex = -1, onSelect, itemHeight, suggestionsLabel } = props;
    const { theme } = useUnistyles();

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <FloatingOverlay maxHeight={240} keyboardShouldPersistTaps="handled">
            {suggestionsLabel && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500', letterSpacing: 0.3 }}>
                        {suggestionsLabel}
                    </Text>
                </View>
            )}
            {suggestions.map((suggestion, index) => (
                <Pressable
                    key={index}
                    onPress={() => onSelect(index)}
                    style={({ pressed }) => ({
                        height: itemHeight,
                        backgroundColor: pressed
                            ? theme.colors.surfacePressed
                            : selectedIndex === index
                                ? theme.colors.surfaceSelected
                                : 'transparent',
                    })}
                >
                    {suggestion}
                </Pressable>
            ))}
        </FloatingOverlay>
    );
});