import { Ionicons, Octicons } from '@expo/vector-icons';
import * as React from 'react';
import { View, Platform, useWindowDimensions, ViewStyle, Text, ActivityIndicator, TouchableWithoutFeedback, Image as RNImage, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { layout } from './layout';
import { MultiTextInput, KeyPressEvent } from './MultiTextInput';
import { Typography } from '@/constants/Typography';
import { PermissionMode, ModelMode } from './PermissionModeSelector';
import { hapticsLight, hapticsError } from './haptics';
import { Shaker, ShakeInstance } from './Shaker';
import { StatusDot } from './StatusDot';
import { useActiveWord } from './autocomplete/useActiveWord';
import { useActiveSuggestions } from './autocomplete/useActiveSuggestions';
import { AgentInputAutocomplete } from './AgentInputAutocomplete';
import { FloatingOverlay } from './FloatingOverlay';
import { TextInputState, MultiTextInputHandle } from './MultiTextInput';
import { applySuggestion } from './autocomplete/applySuggestion';
import { GitStatusBadge, useHasMeaningfulGitStatus } from './GitStatusBadge';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSetting } from '@/sync/storage';
import { hackMode, hackModes } from '@/sync/modeHacks';
import { Theme } from '@/theme';
import { t } from '@/text';
import { Metadata, OpenSpecStatus } from '@/sync/storageTypes';
import { AIBackendProfile, getProfileEnvironmentVariables, validateProfileForAgent } from '@/sync/settings';
import { getBuiltInProfile } from '@/sync/profileUtils';

interface AgentInputProps {
    value: string;
    placeholder: string;
    onChangeText: (text: string) => void;
    sessionId?: string;
    onSend: () => void;
    sendIcon?: React.ReactNode;
    onMicPress?: () => void;
    isMicActive?: boolean;
    permissionMode?: PermissionMode | null;
    availableModes?: PermissionMode[];
    onPermissionModeChange?: (mode: PermissionMode) => void;
    modelMode?: ModelMode | null;
    availableModels?: ModelMode[];
    onModelModeChange?: (mode: ModelMode) => void;
    effortLevel?: ModelMode | null;
    availableEffortLevels?: ModelMode[];
    onEffortLevelChange?: (level: ModelMode) => void;
    metadata?: Metadata | null;
    onAbort?: () => void | Promise<void>;
    showAbortButton?: boolean;
    connectionStatus?: {
        text: string;
        color: string;
        dotColor: string;
        isPulsing?: boolean;
        cliStatus?: {
            claude: boolean | null;
            codex: boolean | null;
            gemini?: boolean | null;
        };
    };
    autocompletePrefixes: string[];
    autocompleteSuggestions: (query: string) => Promise<{ key: string, text: string, component: React.ElementType }[]>;
    /** Optional label shown above the autocomplete suggestion list */
    autocompleteLabel?: string;
    usageData?: {
        inputTokens: number;
        outputTokens: number;
        cacheCreation: number;
        cacheRead: number;
        contextSize: number;
    };
    alwaysShowContextSize?: boolean;
    onFileViewerPress?: () => void;
    agentType?: 'claude' | 'codex' | 'gemini';
    onAgentClick?: () => void;
    machineName?: string | null;
    onMachineClick?: () => void;
    currentPath?: string | null;
    onPathClick?: () => void;
    isSendDisabled?: boolean;
    isSending?: boolean;
    minHeight?: number;
    profileId?: string | null;
    onProfileClick?: () => void;
    exploreModeArmed?: boolean;
    onExplorePress?: () => void;
    patchModeArmed?: boolean;
    onPatchPress?: () => void;
    applyModeArmed?: boolean;
    onApplyPress?: () => void;
    ffModeArmed?: boolean;
    onFfPress?: () => void;
    openspecStatus?: OpenSpecStatus | null;
    onOpenspecPress?: () => void;
}

const MAX_CONTEXT_SIZE = 190000;

const stylesheet = StyleSheet.create((theme, runtime) => ({
    container: {
        alignItems: 'center',
        paddingBottom: 8,
        paddingTop: 8,
    },
    innerContainer: {
        width: '100%',
        position: 'relative',
    },
    unifiedPanel: {
        backgroundColor: theme.colors.input.background,
        borderRadius: Platform.select({ default: 16, android: 20 }),
        overflow: 'hidden',
        paddingVertical: 2,
        paddingBottom: 8,
        paddingHorizontal: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0,
        paddingLeft: 8,
        paddingRight: 8,
        paddingVertical: 4,
        minHeight: 40,
    },

    // Overlay styles
    autocompleteOverlay: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        zIndex: 1000,
    },
    settingsOverlay: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        zIndex: 1000,
    },
    overlayBackdrop: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        zIndex: 999,
    },
    overlaySection: {
        paddingVertical: 5,
    },
    overlaySectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        paddingHorizontal: 16,
        paddingBottom: 2,
        ...Typography.default('semiBold'),
    },
    overlayDivider: {
        height: 1,
        backgroundColor: theme.colors.divider,
        marginHorizontal: 16,
    },
    chipRowContent: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 2,
    },
    chip: {
        borderWidth: 1,
        borderColor: theme.colors.radio.inactive,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        minHeight: 30,
        justifyContent: 'center',
    },
    chipSelected: {
        borderColor: theme.colors.radio.active,
        backgroundColor: theme.colors.radio.active,
    },
    chipPressed: {
        opacity: 0.7,
    },
    chipText: {
        fontSize: 13,
        color: theme.colors.text,
        ...Typography.default(),
    },
    chipTextSelected: {
        color: theme.colors.button.primary.tint,
    },
    chipRowEmpty: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        ...Typography.default(),
    },

    // Selection styles
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'transparent',
    },
    selectionItemPressed: {
        backgroundColor: theme.colors.surfacePressed,
    },
    radioButton: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    radioButtonActive: {
        borderColor: theme.colors.radio.active,
    },
    radioButtonInactive: {
        borderColor: theme.colors.radio.inactive,
    },
    radioButtonDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.radio.dot,
    },
    selectionLabel: {
        fontSize: 14,
        ...Typography.default(),
    },
    selectionLabelActive: {
        color: theme.colors.radio.active,
    },
    selectionLabelInactive: {
        color: theme.colors.text,
    },

    // Status styles
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 11,
        ...Typography.default(),
    },
    permissionModeContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    permissionModeText: {
        fontSize: 11,
        ...Typography.default(),
    },
    contextWarningText: {
        fontSize: 11,
        marginLeft: 8,
        ...Typography.default(),
    },

    // Button styles
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },
    actionButtonsLeft: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Platform.select({ default: 16, android: 20 }),
        paddingHorizontal: 8,
        paddingVertical: 6,
        justifyContent: 'center',
        height: 32,
    },
    actionButtonPressed: {
        opacity: 0.7,
    },
    actionButtonIcon: {
        color: theme.colors.button.secondary.tint,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: 8,
    },
    sendButtonActive: {
        backgroundColor: theme.colors.button.primary.background,
    },
    sendButtonInactive: {
        backgroundColor: theme.colors.button.primary.disabled,
    },
    sendButtonInner: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonInnerPressed: {
        opacity: 0.7,
    },
    sendButtonIcon: {
        color: theme.colors.button.primary.tint,
    },
}));

const getContextWarning = (contextSize: number, alwaysShow: boolean = false, theme: Theme) => {
    const percentageUsed = (contextSize / MAX_CONTEXT_SIZE) * 100;
    const percentageRemaining = Math.max(0, Math.min(100, 100 - percentageUsed));

    if (percentageRemaining <= 5) {
        return { text: t('agentInput.context.remaining', { percent: Math.round(percentageRemaining) }), color: theme.colors.warningCritical };
    } else if (percentageRemaining <= 10) {
        return { text: t('agentInput.context.remaining', { percent: Math.round(percentageRemaining) }), color: theme.colors.warning };
    } else if (alwaysShow) {
        // Show context remaining in neutral color when not near limit
        return { text: t('agentInput.context.remaining', { percent: Math.round(percentageRemaining) }), color: theme.colors.warning };
    }
    return null; // No display needed
};

function cycleNext<T extends { key: string }>(options: T[], currentKey: string): T {
    const idx = options.findIndex((o) => o.key === currentKey);
    return options[((idx >= 0 ? idx : 0) + 1) % options.length];
}

// ── OpenSpec Submenu Button ──────────────────────────────────────────────────
// Single button with a floating popover. On web the menu is portaled to
// document.body (via react-dom createPortal) so it escapes all ancestor
// overflow:hidden constraints. Position is measured via getBoundingClientRect.

// Web-only: grab createPortal at module level (react-dom is always available on Expo Web)
const _webCreatePortal: ((children: React.ReactNode, container: Element) => React.ReactPortal) | null =
    Platform.OS === 'web'
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        ? (require('react-dom') as { createPortal: (children: React.ReactNode, container: Element) => React.ReactPortal }).createPortal
        : null;

function OpenSpecSubmenuButton({
    openspecStatus,
    onOpenspecPress,
    exploreModeArmed,
    onExplorePress,
    patchModeArmed,
    onPatchPress,
    applyModeArmed,
    onApplyPress,
    ffModeArmed,
    onFfPress,
    theme,
}: {
    openspecStatus: OpenSpecStatus;
    onOpenspecPress: () => void;
    exploreModeArmed?: boolean;
    onExplorePress?: () => void;
    patchModeArmed?: boolean;
    onPatchPress?: () => void;
    applyModeArmed?: boolean;
    onApplyPress?: () => void;
    ffModeArmed?: boolean;
    onFfPress?: () => void;
    theme: Theme;
}) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<View>(null);
    const [pos, setPos] = React.useState({ bottom: 0, left: 0 });
    const hasArmedMode = exploreModeArmed || patchModeArmed || applyModeArmed || ffModeArmed;
    const activeCount = openspecStatus.activeChanges.length;

    const close = React.useCallback(() => setOpen(false), []);

    const handlePress = React.useCallback(() => {
        if (open) { close(); return; }
        // Measure button position for the portal
        const el = containerRef.current as unknown as HTMLElement | null;
        if (el && typeof el.getBoundingClientRect === 'function') {
            const rect = el.getBoundingClientRect();
            setPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left });
        }
        setOpen(true);
    }, [open, close]);

    // Close on click outside — checks both the toolbar button and the portal menu
    React.useEffect(() => {
        if (!open || typeof document === 'undefined') return;
        const handler = (e: Event) => {
            const target = e.target as Node;
            const containerEl = containerRef.current as unknown as HTMLElement | null;
            const menuEl = document.getElementById('openspec-submenu');
            const isInside = (containerEl && containerEl.contains(target)) ||
                             (menuEl && menuEl.contains(target));
            if (!isInside) setOpen(false);
        };
        const rafId = requestAnimationFrame(() => {
            document.addEventListener('pointerdown', handler);
        });
        return () => {
            cancelAnimationFrame(rafId);
            document.removeEventListener('pointerdown', handler);
        };
    }, [open]);

    // ── Menu card content ────────────────────────────────────────────────
    const menuCard = open ? (
        <View
            nativeID="openspec-submenu"
            style={{
                backgroundColor: theme.colors.surfaceHigh,
                borderRadius: 12,
                paddingVertical: 4,
                minWidth: 190,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 10,
            }}
        >
            {/* Explore toggle */}
            {onExplorePress && (
                <Pressable
                    onPress={() => { onExplorePress(); close(); }}
                    style={(p) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        gap: 10,
                        backgroundColor: exploreModeArmed ? theme.colors.surface : (p.pressed ? theme.colors.surface : 'transparent'),
                        borderRadius: 12,
                    })}
                >
                    <Ionicons
                        name={'telescope-outline'}
                        size={16}
                        color={exploreModeArmed ? theme.colors.button.primary.background : theme.colors.textSecondary}
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: exploreModeArmed ? theme.colors.button.primary.background : theme.colors.text, ...Typography.default(exploreModeArmed ? 'semiBold' : undefined) }}>
                        {t('openspec.exploreMode')}
                    </Text>
                    {exploreModeArmed && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.button.primary.background} />
                    )}
                </Pressable>
            )}

            {/* Patch toggle */}
            {onPatchPress && (
                <Pressable
                    onPress={() => { onPatchPress(); close(); }}
                    style={(p) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        gap: 10,
                        backgroundColor: patchModeArmed ? theme.colors.surface : (p.pressed ? theme.colors.surface : 'transparent'),
                        borderRadius: 12,
                    })}
                >
                    <Ionicons
                        name={'construct-outline'}
                        size={16}
                        color={patchModeArmed ? theme.colors.button.primary.background : theme.colors.textSecondary}
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: patchModeArmed ? theme.colors.button.primary.background : theme.colors.text, ...Typography.default(patchModeArmed ? 'semiBold' : undefined) }}>
                        {t('openspec.patchMode')}
                    </Text>
                    {patchModeArmed && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.button.primary.background} />
                    )}
                </Pressable>
            )}

            {/* Apply toggle */}
            {onApplyPress && (
                <Pressable
                    onPress={() => { onApplyPress(); close(); }}
                    style={(p) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        gap: 10,
                        backgroundColor: applyModeArmed ? theme.colors.surface : (p.pressed ? theme.colors.surface : 'transparent'),
                        borderRadius: 12,
                    })}
                >
                    <Ionicons
                        name={'hammer-outline'}
                        size={16}
                        color={applyModeArmed ? theme.colors.button.primary.background : theme.colors.textSecondary}
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: applyModeArmed ? theme.colors.button.primary.background : theme.colors.text, ...Typography.default(applyModeArmed ? 'semiBold' : undefined) }}>
                        {t('openspec.applyMode')}
                    </Text>
                    {applyModeArmed && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.button.primary.background} />
                    )}
                </Pressable>
            )}

            {/* FF toggle */}
            {onFfPress && (
                <Pressable
                    onPress={() => { onFfPress(); close(); }}
                    style={(p) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        gap: 10,
                        backgroundColor: ffModeArmed ? theme.colors.surface : (p.pressed ? theme.colors.surface : 'transparent'),
                        borderRadius: 12,
                    })}
                >
                    <Ionicons
                        name={'flash-outline'}
                        size={16}
                        color={ffModeArmed ? theme.colors.button.primary.background : theme.colors.textSecondary}
                    />
                    <Text style={{ flex: 1, fontSize: 14, color: ffModeArmed ? theme.colors.button.primary.background : theme.colors.text, ...Typography.default(ffModeArmed ? 'semiBold' : undefined) }}>
                        {t('openspec.ffMode')}
                    </Text>
                    {ffModeArmed && (
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.button.primary.background} />
                    )}
                </Pressable>
            )}

            {/* Divider */}
            {(onExplorePress || onPatchPress || onApplyPress || onFfPress) && (
                <View style={{
                    height: 1,
                    backgroundColor: theme.colors.divider,
                    marginHorizontal: 14,
                    marginVertical: 2,
                }} />
            )}

            {/* Open Panel */}
            <Pressable
                onPress={() => { close(); onOpenspecPress(); }}
                style={(p) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    gap: 10,
                    backgroundColor: p.pressed ? theme.colors.surface : 'transparent',
                    borderRadius: 12,
                })}
            >
                <Octicons name={'stack'} size={16} color={theme.colors.textSecondary} />
                <Text style={{ flex: 1, fontSize: 14, color: theme.colors.text, ...Typography.default() }}>
                    {t('openspec.openPanel')}
                </Text>
                {activeCount > 0 && (
                    <View style={{
                        backgroundColor: theme.colors.button.primary.background,
                        borderRadius: 8,
                        minWidth: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                    }}>
                        <Text style={{
                            fontSize: 11,
                            color: theme.colors.button.primary.tint,
                            fontWeight: '700',
                            lineHeight: 18,
                        }}>
                            {activeCount}
                        </Text>
                    </View>
                )}
            </Pressable>
        </View>
    ) : null;

    // ── Render portal (web) or inline (native) ───────────────────────────
    let portalMenu: React.ReactNode = null;
    if (menuCard && _webCreatePortal && typeof document !== 'undefined') {
        // Portal: fixed-position at body level — no overflow clipping
        portalMenu = _webCreatePortal(
            <View style={{ position: 'fixed' as any, bottom: pos.bottom, left: pos.left, zIndex: 99999 } as any}>
                {menuCard}
            </View>,
            document.body
        );
    } else if (menuCard) {
        // Native fallback: absolute-positioned inline
        portalMenu = (
            <View style={{ position: 'absolute', bottom: 40, left: 0, zIndex: 1000 }}>
                {menuCard}
            </View>
        );
    }

    return (
        <View ref={containerRef}>
            <Pressable
                onPress={handlePress}
                hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                style={(p) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: Platform.select({ default: 16, android: 20 }),
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    justifyContent: 'center',
                    height: 32,
                    opacity: p.pressed ? 0.7 : 1,
                    backgroundColor: hasArmedMode ? theme.colors.button.primary.background : 'transparent',
                })}
            >
                {hasArmedMode ? (
                    <>
                        <Ionicons
                            name={
                                exploreModeArmed ? 'telescope-outline' :
                                patchModeArmed ? 'construct-outline' :
                                applyModeArmed ? 'hammer-outline' :
                                'flash-outline'
                            }
                            size={15}
                            color={theme.colors.button.primary.tint}
                        />
                        <Text style={{ fontSize: 11, color: theme.colors.button.primary.tint, marginLeft: 5, fontWeight: '600', lineHeight: 16, ...Typography.default('semiBold') }}>
                            {exploreModeArmed ? 'Explore' : patchModeArmed ? 'Patch' : applyModeArmed ? 'Apply' : 'FF'}
                        </Text>
                    </>
                ) : (
                    <View style={{ position: 'relative' }}>
                        <Octicons
                            name={'stack'}
                            size={16}
                            color={theme.colors.button.secondary.tint}
                        />
                        {activeCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: -5,
                                right: -7,
                                backgroundColor: theme.colors.button.primary.background,
                                borderRadius: 6,
                                minWidth: 12,
                                height: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingHorizontal: 2,
                            }}>
                                <Text style={{
                                    fontSize: 8,
                                    color: theme.colors.button.primary.tint,
                                    fontWeight: '700',
                                    lineHeight: 12,
                                }}>
                                    {activeCount}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </Pressable>
            {portalMenu}
        </View>
    );
}

// ── OpenSpec Inline Controls (wide layouts) ──────────────────────────────────
// On desktop/tablet widths (≥640px) the menu items are rendered directly in
// the toolbar row instead of collapsing into a popup. Each mode gets its own
// icon button with the same active-state styling as the submenu items.

function OpenSpecInlineControls({
    openspecStatus,
    onOpenspecPress,
    exploreModeArmed,
    onExplorePress,
    patchModeArmed,
    onPatchPress,
    applyModeArmed,
    onApplyPress,
    ffModeArmed,
    onFfPress,
    theme,
}: {
    openspecStatus: OpenSpecStatus;
    onOpenspecPress: () => void;
    exploreModeArmed?: boolean;
    onExplorePress?: () => void;
    patchModeArmed?: boolean;
    onPatchPress?: () => void;
    applyModeArmed?: boolean;
    onApplyPress?: () => void;
    ffModeArmed?: boolean;
    onFfPress?: () => void;
    theme: Theme;
}) {
    const activeCount = openspecStatus.activeChanges.length;

    const modeButton = (
        iconName: React.ComponentProps<typeof Ionicons>['name'],
        armed: boolean | undefined,
        onPress: (() => void) | undefined
    ) => {
        if (!onPress) return null;
        return (
            <Pressable
                key={iconName}
                onPress={() => { hapticsLight(); onPress(); }}
                hitSlop={{ top: 5, bottom: 10, left: 1, right: 1 }}
                style={(p) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: Platform.select({ default: 16, android: 20 }),
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    justifyContent: 'center',
                    height: 32,
                    opacity: p.pressed ? 0.7 : 1,
                    backgroundColor: armed ? theme.colors.button.primary.background : 'transparent',
                })}
            >
                <Ionicons
                    name={iconName}
                    size={16}
                    color={armed ? theme.colors.button.primary.tint : theme.colors.button.secondary.tint}
                />
            </Pressable>
        );
    };

    return (
        <>
            {modeButton('telescope-outline', exploreModeArmed, onExplorePress)}
            {modeButton('construct-outline', patchModeArmed, onPatchPress)}
            {modeButton('hammer-outline', applyModeArmed, onApplyPress)}
            {modeButton('flash-outline', ffModeArmed, onFfPress)}
            {/* Open Panel button */}
            <Pressable
                onPress={onOpenspecPress}
                hitSlop={{ top: 5, bottom: 10, left: 1, right: 1 }}
                style={(p) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: Platform.select({ default: 16, android: 20 }),
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    justifyContent: 'center',
                    height: 32,
                    opacity: p.pressed ? 0.7 : 1,
                })}
            >
                <View style={{ position: 'relative' }}>
                    <Octicons name={'stack'} size={16} color={theme.colors.button.secondary.tint} />
                    {activeCount > 0 && (
                        <View style={{
                            position: 'absolute',
                            top: -5,
                            right: -7,
                            backgroundColor: theme.colors.button.primary.background,
                            borderRadius: 6,
                            minWidth: 12,
                            height: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 2,
                        }}>
                            <Text style={{
                                fontSize: 8,
                                color: theme.colors.button.primary.tint,
                                fontWeight: '700',
                                lineHeight: 12,
                            }}>
                                {activeCount}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </>
    );
}

export const AgentInput = React.memo(React.forwardRef<MultiTextInputHandle, AgentInputProps>((props, ref) => {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const screenWidth = useWindowDimensions().width;

    const hasText = props.value.trim().length > 0;

    // Check if this is a Codex or Gemini session
    // Use metadata.flavor for existing sessions, agentType prop for new sessions
    const isCodex = props.metadata?.flavor === 'codex' || props.agentType === 'codex';
    const isGemini = props.metadata?.flavor === 'gemini' || props.agentType === 'gemini';
    const isClaude = !isCodex && !isGemini;
    // Inline OpenSpec controls on wide/desktop layouts instead of a popup menu
    const isWide = screenWidth >= 640;
    const displayPermissionMode = React.useMemo(() => (
        props.permissionMode ? hackMode(props.permissionMode) : null
    ), [props.permissionMode]);
    const permissionModeKey = displayPermissionMode?.key ?? 'default';
    const availableModes = React.useMemo(() => (
        hackModes(props.availableModes ?? [])
    ), [props.availableModes]);
    const availableModels = props.availableModels ?? [];
    const availableEffortLevels = props.availableEffortLevels ?? [];
    const displayEffortLevel = props.effortLevel && props.effortLevel.key !== 'default' ? props.effortLevel : null;
    const isSandboxEnabled = React.useMemo(() => {
        const sandbox = props.metadata?.sandbox as unknown;
        if (!sandbox) {
            return false;
        }
        if (typeof sandbox === 'object' && sandbox !== null && 'enabled' in sandbox) {
            return Boolean((sandbox as { enabled?: unknown }).enabled);
        }
        return true;
    }, [props.metadata?.sandbox]);
    const isSandboxedYoloMode = isSandboxEnabled && (
        permissionModeKey === 'bypassPermissions' || permissionModeKey === 'yolo'
    );

    const withSandboxSuffix = React.useCallback((label: string, modeKey?: string) => {
        if (!isSandboxEnabled) {
            return label;
        }
        if (modeKey === 'bypassPermissions' || modeKey === 'yolo') {
            return `${label} (sandboxed)`;
        }
        return label;
    }, [isSandboxEnabled]);

    // Profile data
    const profiles = useSetting('profiles');
    const currentProfile = React.useMemo(() => {
        if (!props.profileId) return null;
        // Check custom profiles first
        const customProfile = profiles.find(p => p.id === props.profileId);
        if (customProfile) return customProfile;
        // Check built-in profiles
        return getBuiltInProfile(props.profileId);
    }, [profiles, props.profileId]);

    // Calculate context warning
    const contextWarning = props.usageData?.contextSize
        ? getContextWarning(props.usageData.contextSize, props.alwaysShowContextSize ?? false, theme)
        : null;

    const agentInputEnterToSend = useSetting('agentInputEnterToSend');


    // Abort button state
    const [isAborting, setIsAborting] = React.useState(false);
    const shakerRef = React.useRef<ShakeInstance>(null);
    const inputRef = React.useRef<MultiTextInputHandle>(null);

    // Forward ref to the MultiTextInput
    React.useImperativeHandle(ref, () => inputRef.current!, []);

    // Autocomplete state - track text and selection together
    const [inputState, setInputState] = React.useState<TextInputState>({
        text: props.value,
        selection: { start: 0, end: 0 }
    });

    // Handle combined text and selection state changes
    const handleInputStateChange = React.useCallback((newState: TextInputState) => {
        // console.log('📝 Input state changed:', JSON.stringify(newState));
        setInputState(newState);
    }, []);

    // Use the tracked selection from inputState
    const activeWord = useActiveWord(inputState.text, inputState.selection, props.autocompletePrefixes);
    // Using default options: clampSelection=true, autoSelectFirst=true, wrapAround=true
    // To customize: useActiveSuggestions(activeWord, props.autocompleteSuggestions, { clampSelection: false, wrapAround: false })
    const [suggestions, selected, moveUp, moveDown] = useActiveSuggestions(activeWord, props.autocompleteSuggestions, { clampSelection: true, wrapAround: true });

    // Debug logging
    // React.useEffect(() => {
    //     console.log('🔍 Autocomplete Debug:', JSON.stringify({
    //         value: props.value,
    //         inputState,
    //         activeWord,
    //         suggestionsCount: suggestions.length,
    //         selected,
    //         prefixes: props.autocompletePrefixes
    //     }, null, 2));
    // }, [props.value, inputState, activeWord, suggestions.length, selected]);

    // Handle suggestion selection
    const handleSuggestionSelect = React.useCallback((index: number) => {
        if (!suggestions[index] || !inputRef.current) return;

        const suggestion = suggestions[index];

        // Apply the suggestion
        const result = applySuggestion(
            inputState.text,
            inputState.selection,
            suggestion.text,
            props.autocompletePrefixes,
            true // add space after
        );

        // Use imperative API to set text and selection
        inputRef.current.setTextAndSelection(result.text, {
            start: result.cursorPosition,
            end: result.cursorPosition
        });

        // console.log('Selected suggestion:', suggestion.text);

        // Small haptic feedback
        hapticsLight();
    }, [suggestions, inputState, props.autocompletePrefixes]);

    // Settings modal state
    const [showSettings, setShowSettings] = React.useState(false);

    // Handle settings button press
    const handleSettingsPress = React.useCallback(() => {
        hapticsLight();
        setShowSettings(prev => !prev);
    }, []);

    // Handle settings selection
    const handleSettingsSelect = React.useCallback((mode: PermissionMode) => {
        hapticsLight();
        props.onPermissionModeChange?.(mode);
        // Don't close the settings overlay - let users see the change and potentially switch again
    }, [props.onPermissionModeChange]);

    // Handle abort button press
    const handleAbortPress = React.useCallback(async () => {
        if (!props.onAbort) return;

        hapticsError();
        setIsAborting(true);
        const startTime = Date.now();

        try {
            await props.onAbort?.();

            // Ensure minimum 300ms loading time
            const elapsed = Date.now() - startTime;
            if (elapsed < 300) {
                await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
            }
        } catch (error) {
            // Shake on error
            shakerRef.current?.shake();
            console.error('Abort RPC call failed:', error);
        } finally {
            setIsAborting(false);
        }
    }, [props.onAbort]);

    // Handle keyboard navigation
    const handleKeyPress = React.useCallback((event: KeyPressEvent): boolean => {
        // Handle autocomplete navigation first
        if (suggestions.length > 0) {
            if (event.key === 'ArrowUp') {
                moveUp();
                return true;
            } else if (event.key === 'ArrowDown') {
                moveDown();
                return true;
            } else if ((event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey))) {
                // Both Enter and Tab select the current suggestion
                // If none selected (selected === -1), select the first one
                const indexToSelect = selected >= 0 ? selected : 0;
                handleSuggestionSelect(indexToSelect);
                return true;
            } else if (event.key === 'Escape') {
                // Clear suggestions by collapsing selection (triggers activeWord to clear)
                if (inputRef.current) {
                    const cursorPos = inputState.selection.start;
                    inputRef.current.setTextAndSelection(inputState.text, {
                        start: cursorPos,
                        end: cursorPos
                    });
                }
                return true;
            }
        }

        // Handle Escape for abort when no suggestions are visible
        if (event.key === 'Escape' && props.showAbortButton && props.onAbort && !isAborting) {
            handleAbortPress();
            return true;
        }

        // Original key handling
        if (Platform.OS === 'web') {
            if (agentInputEnterToSend && event.key === 'Enter' && !event.shiftKey) {
                if (props.value.trim()) {
                    props.onSend();
                    return true; // Key was handled
                }
            }
            // Handle Shift+Tab for permission mode switching
            if (event.key === 'Tab' && event.shiftKey && props.onPermissionModeChange && availableModes.length > 0) {
                const currentIndex = availableModes.findIndex((mode) => mode.key === permissionModeKey);
                const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % availableModes.length;
                props.onPermissionModeChange(availableModes[nextIndex]);
                hapticsLight();
                return true; // Key was handled, prevent default tab behavior
            }

        }
        return false; // Key was not handled
    }, [suggestions, moveUp, moveDown, selected, handleSuggestionSelect, props.showAbortButton, props.onAbort, isAborting, handleAbortPress, agentInputEnterToSend, props.value, props.onSend, props.onPermissionModeChange, availableModes, permissionModeKey]);




    return (
        <View style={[
            styles.container,
            { paddingHorizontal: screenWidth > 700 ? 16 : 8 }
        ]}>
            <View style={[
                styles.innerContainer,
                { maxWidth: layout.maxWidth }
            ]}>
                {/* Connection status, context warning, and permission mode */}
                {(props.connectionStatus || contextWarning || displayPermissionMode || props.modelMode || displayEffortLevel) && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingBottom: 4,
                        minHeight: 20, // Fixed minimum height to prevent jumping
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11 }}>
                            {props.connectionStatus && (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <StatusDot
                                            color={props.connectionStatus.dotColor}
                                            isPulsing={props.connectionStatus.isPulsing}
                                            size={6}
                                        />
                                        <Text style={{
                                            fontSize: 11,
                                            color: props.connectionStatus.color,
                                            ...Typography.default()
                                        }}>
                                            {props.connectionStatus.text}
                                        </Text>
                                    </View>
                                    {/* CLI Status - only shown when provided (wizard only) */}
                                    {props.connectionStatus.cliStatus && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: props.connectionStatus.cliStatus.claude
                                                        ? theme.colors.success
                                                        : theme.colors.textDestructive,
                                                    ...Typography.default()
                                                }}>
                                                    {props.connectionStatus.cliStatus.claude ? '✓' : '✗'}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: props.connectionStatus.cliStatus.claude
                                                        ? theme.colors.success
                                                        : theme.colors.textDestructive,
                                                    ...Typography.default()
                                                }}>
                                                    claude
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: props.connectionStatus.cliStatus.codex
                                                        ? theme.colors.success
                                                        : theme.colors.textDestructive,
                                                    ...Typography.default()
                                                }}>
                                                    {props.connectionStatus.cliStatus.codex ? '✓' : '✗'}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: props.connectionStatus.cliStatus.codex
                                                        ? theme.colors.success
                                                        : theme.colors.textDestructive,
                                                    ...Typography.default()
                                                }}>
                                                    codex
                                                </Text>
                                            </View>
                                            {props.connectionStatus.cliStatus.gemini !== undefined && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Text style={{
                                                        fontSize: 11,
                                                        color: props.connectionStatus.cliStatus.gemini
                                                            ? theme.colors.success
                                                            : theme.colors.textDestructive,
                                                        ...Typography.default()
                                                    }}>
                                                        {props.connectionStatus.cliStatus.gemini ? '✓' : '✗'}
                                                    </Text>
                                                    <Text style={{
                                                        fontSize: 11,
                                                        color: props.connectionStatus.cliStatus.gemini
                                                            ? theme.colors.success
                                                            : theme.colors.textDestructive,
                                                        ...Typography.default()
                                                    }}>
                                                        gemini
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                            {contextWarning && (
                                <Text style={{
                                    fontSize: 11,
                                    color: contextWarning.color,
                                    marginLeft: props.connectionStatus ? 8 : 0,
                                    ...Typography.default()
                                }}>
                                    {props.connectionStatus ? '• ' : ''}{contextWarning.text}
                                </Text>
                            )}
                        </View>
                        {!isClaude && (
                        <View style={{
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            minWidth: 150, // Fixed minimum width to prevent layout shift
                        }}>
                            {displayPermissionMode && (
                                <Text style={{
                                    fontSize: 11,
                                    color: permissionModeKey === 'yolo' || permissionModeKey === 'bypassPermissions' || isSandboxedYoloMode
                                        ? theme.colors.success
                                        : theme.colors.warningCritical,
                                    ...Typography.default()
                                }}>
                                    {withSandboxSuffix(displayPermissionMode.name, permissionModeKey)}
                                </Text>
                            )}
                            {props.modelMode && (
                                <Text style={{
                                    fontSize: 11,
                                    color: theme.colors.textSecondary,
                                    ...Typography.default()
                                }}>
                                    {props.modelMode.name}
                                </Text>
                            )}
                            {displayEffortLevel && (
                                <Text style={{
                                    fontSize: 11,
                                    color: theme.colors.textSecondary,
                                    ...Typography.default()
                                }}>
                                    {t('agentInput.effort.badge', { level: displayEffortLevel.name })}
                                </Text>
                            )}
                        </View>
                        )}
                    </View>
                )}

                {/* Box 1: Context Information (Machine + Path) - Only show if either exists */}
                {(props.machineName !== undefined || props.currentPath) && (
                    <View style={{
                        backgroundColor: theme.colors.surfacePressed,
                        borderRadius: 12,
                        padding: 8,
                        marginBottom: 8,
                        gap: 4,
                    }}>
                        {/* Machine chip */}
                        {props.machineName !== undefined && props.onMachineClick && (
                            <Pressable
                                onPress={() => {
                                    hapticsLight();
                                    props.onMachineClick?.();
                                }}
                                hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                style={(p) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderRadius: Platform.select({ default: 16, android: 20 }),
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    height: 32,
                                    opacity: p.pressed ? 0.7 : 1,
                                    gap: 6,
                                })}
                            >
                                <Ionicons
                                    name="desktop-outline"
                                    size={14}
                                    color={theme.colors.textSecondary}
                                />
                                <Text style={{
                                    fontSize: 13,
                                    color: theme.colors.text,
                                    fontWeight: '600',
                                    ...Typography.default('semiBold'),
                                }}>
                                    {props.machineName === null ? t('agentInput.noMachinesAvailable') : props.machineName}
                                </Text>
                            </Pressable>
                        )}

                        {/* Path chip */}
                        {props.currentPath && props.onPathClick && (
                            <Pressable
                                onPress={() => {
                                    hapticsLight();
                                    props.onPathClick?.();
                                }}
                                hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                style={(p) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderRadius: Platform.select({ default: 16, android: 20 }),
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    height: 32,
                                    opacity: p.pressed ? 0.7 : 1,
                                    gap: 6,
                                })}
                            >
                                <Ionicons
                                    name="folder-outline"
                                    size={14}
                                    color={theme.colors.textSecondary}
                                />
                                <Text style={{
                                    fontSize: 13,
                                    color: theme.colors.text,
                                    fontWeight: '600',
                                    ...Typography.default('semiBold'),
                                }}>
                                    {props.currentPath}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* Box 2: Action Area (Input + Send) */}
                <View>
                    {/* Autocomplete suggestions overlay — anchored to input box */}
                    {suggestions.length > 0 && (
                        <View style={[
                            styles.autocompleteOverlay,
                            { paddingHorizontal: screenWidth > 700 ? 0 : 8 }
                        ]}>
                            <AgentInputAutocomplete
                                suggestions={suggestions.map(s => {
                                    const Component = s.component;
                                    return <Component key={s.key} />;
                                })}
                                selectedIndex={selected}
                                onSelect={handleSuggestionSelect}
                                itemHeight={48}
                                suggestionsLabel={props.autocompleteLabel}
                            />
                        </View>
                    )}

                    {/* Settings overlay — anchored to input box (Codex/Gemini only; Claude uses inline toggles) */}
                    {showSettings && !isClaude && (
                        <>
                            <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
                                <View style={styles.overlayBackdrop} />
                            </TouchableWithoutFeedback>
                            <View style={[
                                styles.settingsOverlay,
                                { paddingHorizontal: screenWidth > 700 ? 0 : 8 }
                            ]}>
                                <FloatingOverlay maxHeight={220} keyboardShouldPersistTaps="always">
                                    {/* Permission Mode Section */}
                                    <View style={styles.overlaySection}>
                                        <Text style={styles.overlaySectionTitle}>
                                            {isCodex ? t('agentInput.codexPermissionMode.title') : isGemini ? t('agentInput.geminiPermissionMode.title') : t('agentInput.permissionMode.title')}
                                        </Text>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.chipRowContent}
                                        >
                                            {availableModes.map((mode) => {
                                                const isSelected = permissionModeKey === mode.key;
                                                return (
                                                    <Pressable
                                                        key={mode.key}
                                                        onPress={() => handleSettingsSelect(mode)}
                                                        style={({ pressed }) => [
                                                            styles.chip,
                                                            isSelected && styles.chipSelected,
                                                            pressed && styles.chipPressed,
                                                        ]}
                                                    >
                                                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                            {withSandboxSuffix(mode.name, mode.key)}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    {/* Divider */}
                                    <View style={styles.overlayDivider} />

                                    {/* Model Section */}
                                    <View style={styles.overlaySection}>
                                        <Text style={styles.overlaySectionTitle}>
                                            {t('agentInput.model.title')}
                                        </Text>
                                        {availableModels.length > 0 ? (
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.chipRowContent}
                                            >
                                                {availableModels.map((model) => {
                                                    const isSelected = props.modelMode?.key === model.key;
                                                    return (
                                                        <Pressable
                                                            key={model.key}
                                                            onPress={() => {
                                                                hapticsLight();
                                                                props.onModelModeChange?.(model);
                                                            }}
                                                            style={({ pressed }) => [
                                                                styles.chip,
                                                                isSelected && styles.chipSelected,
                                                                pressed && styles.chipPressed,
                                                            ]}
                                                        >
                                                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                                {model.name}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </ScrollView>
                                        ) : (
                                            <Text style={styles.chipRowEmpty}>
                                                {t('agentInput.model.configureInCli')}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Effort Level Section */}
                                    {availableEffortLevels.length > 0 && (
                                        <>
                                            <View style={styles.overlayDivider} />
                                            <View style={styles.overlaySection}>
                                                <Text style={styles.overlaySectionTitle}>
                                                    {t('agentInput.effort.title')}
                                                </Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.chipRowContent}
                                                >
                                                    {availableEffortLevels.map((level) => {
                                                        const isSelected = (props.effortLevel?.key ?? 'default') === level.key;
                                                        return (
                                                            <Pressable
                                                                key={level.key}
                                                                onPress={() => {
                                                                    hapticsLight();
                                                                    props.onEffortLevelChange?.(level);
                                                                }}
                                                                style={({ pressed }) => [
                                                                    styles.chip,
                                                                    isSelected && styles.chipSelected,
                                                                    pressed && styles.chipPressed,
                                                                ]}
                                                            >
                                                                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                                    {level.name}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </ScrollView>
                                            </View>
                                        </>
                                    )}
                                </FloatingOverlay>
                            </View>
                        </>
                    )}
                    <View style={styles.unifiedPanel}>
                    {/* Input field */}
                    <View style={[styles.inputContainer, props.minHeight ? { minHeight: props.minHeight } : undefined]}>
                        <MultiTextInput
                            ref={inputRef}
                            value={props.value}
                            paddingTop={Platform.OS === 'web' ? 10 : 8}
                            paddingBottom={Platform.OS === 'web' ? 10 : 8}
                            onChangeText={props.onChangeText}
                            placeholder={props.placeholder}
                            onKeyPress={handleKeyPress}
                            onStateChange={handleInputStateChange}
                            maxHeight={120}
                        />
                    </View>

                    {/* Action buttons below input */}
                    <View style={styles.actionButtonsContainer}>
                        <View style={{ flexDirection: 'column', flex: 1, gap: 2 }}>
                            {/* Row 1: Settings, Profile (FIRST), Agent, Abort, Git Status */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={styles.actionButtonsLeft}>

                                {/* OpenSpec controls section */}
                                {/* With openspec context (existing session): inline on wide, submenu on narrow */}
                                {props.openspecStatus?.hasOpenspec && props.onOpenspecPress && (
                                    isWide ? (
                                        <OpenSpecInlineControls
                                            openspecStatus={props.openspecStatus}
                                            onOpenspecPress={props.onOpenspecPress}
                                            exploreModeArmed={props.exploreModeArmed}
                                            onExplorePress={props.onExplorePress}
                                            patchModeArmed={props.patchModeArmed}
                                            onPatchPress={props.onPatchPress}
                                            applyModeArmed={props.applyModeArmed}
                                            onApplyPress={props.onApplyPress}
                                            ffModeArmed={props.ffModeArmed}
                                            onFfPress={props.onFfPress}
                                            theme={theme}
                                        />
                                    ) : (
                                        <OpenSpecSubmenuButton
                                            openspecStatus={props.openspecStatus}
                                            onOpenspecPress={props.onOpenspecPress}
                                            exploreModeArmed={props.exploreModeArmed}
                                            onExplorePress={props.onExplorePress}
                                            patchModeArmed={props.patchModeArmed}
                                            onPatchPress={props.onPatchPress}
                                            applyModeArmed={props.applyModeArmed}
                                            onApplyPress={props.onApplyPress}
                                            ffModeArmed={props.ffModeArmed}
                                            onFfPress={props.onFfPress}
                                            theme={theme}
                                        />
                                    )
                                )}

                                {/* Standalone explore/patch buttons — only when no openspec context (new session creator) */}
                                {!props.onOpenspecPress && props.onExplorePress && (
                                    <Pressable
                                        onPress={props.onExplorePress}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        style={(p) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: Platform.select({ default: 16, android: 20 }),
                                            paddingHorizontal: 8,
                                            paddingVertical: 6,
                                            justifyContent: 'center',
                                            height: 32,
                                            opacity: p.pressed ? 0.7 : 1,
                                            backgroundColor: props.exploreModeArmed ? theme.colors.button.primary.background : 'transparent',
                                        })}
                                    >
                                        <Ionicons
                                            name={'telescope-outline'}
                                            size={16}
                                            color={props.exploreModeArmed ? theme.colors.button.primary.tint : theme.colors.button.secondary.tint}
                                        />
                                    </Pressable>
                                )}
                                {!props.onOpenspecPress && props.onPatchPress && (
                                    <Pressable
                                        onPress={props.onPatchPress}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        style={(p) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: Platform.select({ default: 16, android: 20 }),
                                            paddingHorizontal: 8,
                                            paddingVertical: 6,
                                            justifyContent: 'center',
                                            height: 32,
                                            opacity: p.pressed ? 0.7 : 1,
                                            backgroundColor: props.patchModeArmed ? theme.colors.button.primary.background : 'transparent',
                                        })}
                                    >
                                        <Ionicons
                                            name={'construct-outline'}
                                            size={16}
                                            color={props.patchModeArmed ? theme.colors.button.primary.tint : theme.colors.button.secondary.tint}
                                        />
                                    </Pressable>
                                )}

                                {/* Vertical divider between OpenSpec section and model controls */}
                                {((props.openspecStatus?.hasOpenspec && props.onOpenspecPress) ||
                                  (!props.onOpenspecPress && (props.onExplorePress || props.onPatchPress))) &&
                                  ((props.onPermissionModeChange && !isClaude) || (isClaude && !!props.onModelModeChange)) && (
                                    <View style={{
                                        width: 1,
                                        height: 18,
                                        backgroundColor: theme.colors.divider,
                                        alignSelf: 'center',
                                        marginHorizontal: 1,
                                    }} />
                                )}

                                {/* Settings button — Codex/Gemini only */}
                                {props.onPermissionModeChange && !isClaude && (
                                    <Pressable
                                        onPress={handleSettingsPress}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        style={(p) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: Platform.select({ default: 16, android: 20 }),
                                            paddingHorizontal: 8,
                                            paddingVertical: 6,
                                            justifyContent: 'center',
                                            height: 32,
                                            opacity: p.pressed ? 0.7 : 1,
                                        })}
                                    >
                                        <Octicons
                                            name={'gear'}
                                            size={16}
                                            color={theme.colors.button.secondary.tint}
                                        />
                                    </Pressable>
                                )}

                                {/* Model toggles — Claude only: [Snt|Ops] [Std|1M] */}
                                {isClaude && props.onModelModeChange && (() => {
                                    const modelKey = props.modelMode?.key ?? 'claude-sonnet-4-6';
                                    const tier = modelKey.startsWith('claude-opus') ? 'opus' : 'sonnet';
                                    const ctx = modelKey.endsWith('[1m]') ? '1m' : 'std';
                                    const tierColors = {
                                        sonnet: theme.colors.button.primary.background,
                                        opus: theme.colors.box.warning.border,
                                    } as const;
                                    const ctxColors = {
                                        std: theme.colors.button.primary.background,
                                        '1m': theme.colors.success,
                                    } as const;
                                    return (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                            {/* Tier toggle */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                                {(['sonnet', 'opus'] as const).map((t) => (
                                                    <Pressable
                                                        key={t}
                                                        onPress={() => {
                                                            hapticsLight();
                                                            const newKey = `claude-${t}-4-6${ctx === '1m' ? '[1m]' : ''}`;
                                                            const mode = props.availableModels?.find((m) => m.key === newKey);
                                                            if (mode) props.onModelModeChange?.(mode);
                                                        }}
                                                        hitSlop={{ top: 5, bottom: 10, left: 2, right: 2 }}
                                                        style={(p) => ({
                                                            paddingHorizontal: 5,
                                                            paddingVertical: 3,
                                                            borderRadius: 7,
                                                            height: 26,
                                                            justifyContent: 'center',
                                                            opacity: p.pressed ? 0.7 : 1,
                                                            backgroundColor: tier === t ? tierColors[t] : 'transparent',
                                                        })}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            color: tier === t
                                                                ? theme.colors.button.primary.tint
                                                                : theme.colors.button.secondary.tint,
                                                            ...Typography.default('semiBold'),
                                                        }}>
                                                            {t === 'sonnet' ? 'Snt' : 'Ops'}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                            {/* Context toggle */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                                {(['std', '1m'] as const).map((c) => (
                                                    <Pressable
                                                        key={c}
                                                        onPress={() => {
                                                            hapticsLight();
                                                            const newKey = `claude-${tier}-4-6${c === '1m' ? '[1m]' : ''}`;
                                                            const mode = props.availableModels?.find((m) => m.key === newKey);
                                                            if (mode) props.onModelModeChange?.(mode);
                                                        }}
                                                        hitSlop={{ top: 5, bottom: 10, left: 2, right: 2 }}
                                                        style={(p) => ({
                                                            paddingHorizontal: 5,
                                                            paddingVertical: 3,
                                                            borderRadius: 7,
                                                            height: 26,
                                                            justifyContent: 'center',
                                                            opacity: p.pressed ? 0.7 : 1,
                                                            backgroundColor: ctx === c ? ctxColors[c] : 'transparent',
                                                        })}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            color: ctx === c
                                                                ? theme.colors.button.primary.tint
                                                                : theme.colors.button.secondary.tint,
                                                            ...Typography.default('semiBold'),
                                                        }}>
                                                            {c === 'std' ? 'Std' : '1M'}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })()}

                                {/* Profile selector button - FIRST */}
                                {props.profileId && props.onProfileClick && (
                                    <Pressable
                                        onPress={() => {
                                            hapticsLight();
                                            props.onProfileClick?.();
                                        }}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        style={(p) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: Platform.select({ default: 16, android: 20 }),
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            justifyContent: 'center',
                                            height: 32,
                                            opacity: p.pressed ? 0.7 : 1,
                                            gap: 6,
                                        })}
                                    >
                                        <Ionicons
                                            name="person-outline"
                                            size={14}
                                            color={theme.colors.button.secondary.tint}
                                        />
                                        <Text style={{
                                            fontSize: 13,
                                            color: theme.colors.button.secondary.tint,
                                            fontWeight: '600',
                                            ...Typography.default('semiBold'),
                                        }}>
                                            {currentProfile?.name || 'Select Profile'}
                                        </Text>
                                    </Pressable>
                                )}

                                {/* Agent selector button — Codex/Gemini only (Claude is always claude) */}
                                {props.agentType && props.agentType !== 'claude' && props.onAgentClick && (
                                    <Pressable
                                        onPress={() => {
                                            hapticsLight();
                                            props.onAgentClick?.();
                                        }}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        style={(p) => ({
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            borderRadius: Platform.select({ default: 16, android: 20 }),
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            justifyContent: 'center',
                                            height: 32,
                                            opacity: p.pressed ? 0.7 : 1,
                                            gap: 6,
                                        })}
                                    >
                                        <Octicons
                                            name="cpu"
                                            size={14}
                                            color={theme.colors.button.secondary.tint}
                                        />
                                        <Text style={{
                                            fontSize: 13,
                                            color: theme.colors.button.secondary.tint,
                                            fontWeight: '600',
                                            ...Typography.default('semiBold'),
                                        }}>
                                            {props.agentType === 'codex' ? t('agentInput.agent.codex') : t('agentInput.agent.gemini')}
                                        </Text>
                                    </Pressable>
                                )}

                                {/* Abort button */}
                                {props.onAbort && (
                                    <Shaker ref={shakerRef}>
                                        <Pressable
                                            style={(p) => ({
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                borderRadius: Platform.select({ default: 16, android: 20 }),
                                                paddingHorizontal: 8,
                                                paddingVertical: 6,
                                                justifyContent: 'center',
                                                height: 32,
                                                opacity: p.pressed ? 0.7 : 1,
                                            })}
                                            hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                            onPress={handleAbortPress}
                                            disabled={isAborting}
                                        >
                                            {isAborting ? (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={theme.colors.button.secondary.tint}
                                                />
                                            ) : (
                                                <Octicons
                                                    name={"stop"}
                                                    size={16}
                                                    color={theme.colors.button.secondary.tint}
                                                />
                                            )}
                                        </Pressable>
                                    </Shaker>
                                )}

                                {/* Git Status Badge */}
                                <GitStatusButton sessionId={props.sessionId} onPress={props.onFileViewerPress} />
                                </View>

                                {/* Effort + Permission tap-to-cycle selectors — Claude only, right side */}
                                {isClaude && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                                        {availableEffortLevels.length > 0 && props.onEffortLevelChange && (() => {
                                            const effortChevrons: Record<string, number> = { default: 0, low: 1, medium: 2, high: 3, max: 4 };
                                            const chevronCount = effortChevrons[props.effortLevel?.key ?? 'default'] ?? 0;
                                            return (
                                                <Pressable
                                                    onPress={() => {
                                                        hapticsLight();
                                                        const next = cycleNext(availableEffortLevels, props.effortLevel?.key ?? 'default');
                                                        props.onEffortLevelChange?.(next);
                                                    }}
                                                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                                    style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    {chevronCount === 0 ? (
                                                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, ...Typography.default() }}>—</Text>
                                                    ) : (
                                                        Array.from({ length: chevronCount }).map((_, i) => (
                                                            <Ionicons key={i} name="chevron-up" size={10} color={theme.colors.textSecondary} style={{ marginBottom: -8 }} />
                                                        ))
                                                    )}
                                                </Pressable>
                                            );
                                        })()}
                                        {availableModes.length > 0 && props.onPermissionModeChange && displayPermissionMode && (
                                            <Pressable
                                                onPress={() => {
                                                    hapticsLight();
                                                    const next = cycleNext(availableModes, permissionModeKey);
                                                    props.onPermissionModeChange?.(next);
                                                }}
                                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                            >
                                                <Text style={{
                                                    fontSize: 11,
                                                    color: permissionModeKey === 'yolo' || permissionModeKey === 'bypassPermissions' || isSandboxedYoloMode
                                                        ? theme.colors.success
                                                        : theme.colors.textSecondary,
                                                    ...Typography.default(),
                                                }}>
                                                    {withSandboxSuffix(displayPermissionMode.name, permissionModeKey)}
                                                </Text>
                                            </Pressable>
                                        )}
                                    </View>
                                )}

                                {/* Send/Voice button - aligned with first row */}
                                <View
                                    style={[
                                        styles.sendButton,
                                        (hasText || props.isSending || (props.onMicPress && !props.isMicActive))
                                            ? styles.sendButtonActive
                                            : styles.sendButtonInactive
                                    ]}
                                >
                                    <Pressable
                                        style={(p) => ({
                                            width: '100%',
                                            height: '100%',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: p.pressed ? 0.7 : 1,
                                        })}
                                        hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
                                        onPress={() => {
                                            hapticsLight();
                                            if (hasText) {
                                                props.onSend();
                                            } else {
                                                props.onMicPress?.();
                                            }
                                        }}
                                        disabled={props.isSendDisabled || props.isSending || (!hasText && !props.onMicPress)}
                                    >
                                        {props.isSending ? (
                                            <ActivityIndicator
                                                size="small"
                                                color={theme.colors.button.primary.tint}
                                            />
                                        ) : hasText ? (
                                            <Octicons
                                                name="arrow-up"
                                                size={16}
                                                color={theme.colors.button.primary.tint}
                                                style={[
                                                    styles.sendButtonIcon,
                                                    { marginTop: Platform.OS === 'web' ? 2 : 0 }
                                                ]}
                                            />
                                        ) : props.onMicPress && !props.isMicActive ? (
                                            <Image
                                                source={require('@/assets/images/icon-voice-white.png')}
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                }}
                                                tintColor={theme.colors.button.primary.tint}
                                            />
                                        ) : (
                                            <Octicons
                                                name="arrow-up"
                                                size={16}
                                                color={theme.colors.button.primary.tint}
                                                style={[
                                                    styles.sendButtonIcon,
                                                    { marginTop: Platform.OS === 'web' ? 2 : 0 }
                                                ]}
                                            />
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
                </View>
            </View>
        </View>
    );
}));

// Git Status Button Component
function GitStatusButton({ sessionId, onPress }: { sessionId?: string, onPress?: () => void }) {
    const hasMeaningfulGitStatus = useHasMeaningfulGitStatus(sessionId || '');
    const styles = stylesheet;
    const { theme } = useUnistyles();

    if (!sessionId || !onPress) {
        return null;
    }

    return (
        <Pressable
            style={(p) => ({
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: Platform.select({ default: 16, android: 20 }),
                paddingHorizontal: 8,
                paddingVertical: 6,
                height: 32,
                opacity: p.pressed ? 0.7 : 1,
                flex: 1,
                overflow: 'hidden',
            })}
            hitSlop={{ top: 5, bottom: 10, left: 0, right: 0 }}
            onPress={() => {
                hapticsLight();
                onPress?.();
            }}
        >
            {hasMeaningfulGitStatus ? (
                <GitStatusBadge sessionId={sessionId} />
            ) : (
                <Octicons
                    name="git-branch"
                    size={16}
                    color={theme.colors.button.secondary.tint}
                />
            )}
        </Pressable>
    );
}
