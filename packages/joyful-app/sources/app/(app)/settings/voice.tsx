import React, { memo } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { useSettingMutable, useIsVoiceConfigured } from '@/sync/storage';
import { useUnistyles } from 'react-native-unistyles';
import { findLanguageByCode, getLanguageDisplayName, LANGUAGES } from '@/constants/Languages';
import { t } from '@/text';
import { StyleSheet } from 'react-native-unistyles';

export default memo(function VoiceSettingsScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');
    const [elevenLabsAgentId, setElevenLabsAgentId] = useSettingMutable('elevenLabsAgentId');
    const isConfigured = useIsVoiceConfigured();

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Voice Configuration */}
            <ItemGroup
                title={t('settingsVoice.configurationTitle')}
                footer={t('settingsVoice.agentIdFooter')}
            >
                {/* Status indicator row */}
                <Item
                    title={isConfigured ? t('settingsVoice.configuredStatus') : t('settingsVoice.notConfiguredStatus')}
                    icon={
                        <Ionicons
                            name={isConfigured ? 'checkmark-circle' : 'alert-circle'}
                            size={29}
                            color={isConfigured ? theme.colors.status.connected : theme.colors.status.error}
                        />
                    }
                />
                {/* Agent ID text input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text,
                            borderColor: theme.colors.textSecondary,
                        }]}
                        placeholder={t('settingsVoice.agentIdPlaceholder')}
                        placeholderTextColor={theme.colors.input?.placeholder ?? theme.colors.textSecondary}
                        value={elevenLabsAgentId ?? ''}
                        onChangeText={(text) => setElevenLabsAgentId(text.trim() || null)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                    />
                </View>
            </ItemGroup>

            {/* Language Settings */}
            <ItemGroup
                title={t('settingsVoice.languageTitle')}
                footer={t('settingsVoice.languageDescription')}
            >
                <Item
                    title={t('settingsVoice.preferredLanguage')}
                    subtitle={t('settingsVoice.preferredLanguageSubtitle')}
                    icon={<Ionicons name="language-outline" size={29} color="#007AFF" />}
                    detail={getLanguageDisplayName(currentLanguage)}
                    onPress={() => router.push('/settings/voice/language')}
                />
            </ItemGroup>
        </ItemList>
    );
});

const styles = StyleSheet.create((theme) => ({
    inputContainer: {
        paddingHorizontal: theme.margins.md,
        paddingVertical: theme.margins.sm,
        backgroundColor: theme.colors.surface,
    },
    input: {
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.margins.sm,
        paddingVertical: theme.margins.sm,
        fontSize: 14,
        borderWidth: 1,
        fontFamily: 'monospace',
    },
}));
