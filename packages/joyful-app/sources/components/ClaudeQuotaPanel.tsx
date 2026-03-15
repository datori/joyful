import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/text';
import type { ClaudeQuotaData } from '@/hooks/useClaudeQuota';

interface ClaudeQuotaPanelProps {
    quota: ClaudeQuotaData | null;
    onRefresh?: () => void;
}

const FIVE_HOUR_WINDOW_S = 5 * 3600;
const SEVEN_DAY_WINDOW_S = 7 * 86400;
const STALE_THRESHOLD_MS = 5 * 3600 * 1000; // 5 hours

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Format a relative time in hours and minutes: "2h 14m", "47m", "1h"
 */
function formatRelativeTime(totalSeconds: number): string {
    const clampedSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(clampedSeconds / 3600);
    const minutes = Math.floor((clampedSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
}

/**
 * Format an age in hours for the staleness label: "6h", "1h 30m"
 */
function formatAge(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
}

/**
 * Calculate elapsed fraction for a window.
 * elapsed = (windowDuration - (resetTime - now)) / windowDuration, clamped to [0, 1]
 */
function calcElapsed(resetIso: string, windowDurationS: number): number {
    const now = Date.now();
    const resetMs = new Date(resetIso).getTime();
    const remainingS = (resetMs - now) / 1000;
    const elapsed = (windowDurationS - remainingS) / windowDurationS;
    return Math.max(0, Math.min(1, elapsed));
}

/**
 * Return a bar fill colour based on utilization vs elapsed fraction.
 * - Util > 85% → red (destructive)
 * - Util > elapsed + 0.20 → amber (warning)
 * - Otherwise → muted (textSecondary)
 */
function barColor(
    util: number,
    elapsed: number,
    textSecondary: string,
    warningColor: string,
    destructiveColor: string
): string {
    if (util > 0.85) return destructiveColor;
    if (util > elapsed + 0.20) return warningColor;
    return textSecondary;
}

/**
 * Build the reset label for the 5h window: "in 2h 14m"
 */
function build5hResetLabel(resetIso: string): string {
    const remainingS = (new Date(resetIso).getTime() - Date.now()) / 1000;
    return t('quota.inTime', { time: formatRelativeTime(remainingS) });
}

/**
 * Build the reset label for the 7d window: day-of-week short name ("Mon"),
 * or "in Xh" if reset is less than 24 hours away.
 */
function build7dResetLabel(resetIso: string): string {
    const resetDate = new Date(resetIso);
    const remainingS = (resetDate.getTime() - Date.now()) / 1000;
    if (remainingS < 24 * 3600) {
        return t('quota.inTime', { time: formatRelativeTime(remainingS) });
    }
    return DAY_NAMES[resetDate.getDay()];
}

interface QuotaRowProps {
    windowLabel: string;
    util: number;
    elapsed: number;
    resetLabel: string;
    fillColor: string;
}

const QuotaRow = React.memo(({ windowLabel, util, elapsed, resetLabel, fillColor }: QuotaRowProps) => {
    const [barWidth, setBarWidth] = React.useState(0);

    return (
        <View style={stylesheet.row}>
            {/* Bar */}
            <View
                style={stylesheet.barTrack}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
                {/* Fill */}
                <View
                    style={[
                        stylesheet.barFill,
                        { width: `${Math.round(util * 100)}%`, backgroundColor: fillColor },
                    ]}
                />
                {/* Time cursor tick */}
                {barWidth > 0 && (
                    <View
                        style={[
                            stylesheet.timeCursor,
                            { left: elapsed * barWidth - 0.5 },
                        ]}
                    />
                )}
            </View>
            {/* Label */}
            <Text style={stylesheet.label} numberOfLines={1}>
                {`${windowLabel} · ${Math.round(util * 100)}% · ${resetLabel}`}
            </Text>
        </View>
    );
});

export const ClaudeQuotaPanel = React.memo(({ quota, onRefresh }: ClaudeQuotaPanelProps) => {
    const { theme } = useUnistyles();

    if (quota === null) return null;

    const now = Date.now();
    const ageS = (now - quota.claudeQuotaFetchedAt) / 1000;
    const isStale = ageS > 5 * 3600;

    const elapsed5h = calcElapsed(quota.claudeQuota5hReset, FIVE_HOUR_WINDOW_S);
    const elapsed7d = calcElapsed(quota.claudeQuota7dReset, SEVEN_DAY_WINDOW_S);

    const warningColor = theme.colors.box.warning.border;
    const destructiveColor = theme.colors.textDestructive;
    const mutedColor = theme.colors.textSecondary;

    const color5h = barColor(quota.claudeQuota5hUtil, elapsed5h, mutedColor, warningColor, destructiveColor);
    const color7d = barColor(quota.claudeQuota7dUtil, elapsed7d, mutedColor, warningColor, destructiveColor);

    const reset5hLabel = build5hResetLabel(quota.claudeQuota5hReset);
    const reset7dLabel = build7dResetLabel(quota.claudeQuota7dReset);

    return (
        <View style={stylesheet.container}>
            <View style={stylesheet.barsWrapper}>
                <View style={stylesheet.barsColumn}>
                    <QuotaRow
                        windowLabel={t('quota.fiveHour')}
                        util={quota.claudeQuota5hUtil}
                        elapsed={elapsed5h}
                        resetLabel={reset5hLabel}
                        fillColor={color5h}
                    />
                    <QuotaRow
                        windowLabel={t('quota.sevenDay')}
                        util={quota.claudeQuota7dUtil}
                        elapsed={elapsed7d}
                        resetLabel={reset7dLabel}
                        fillColor={color7d}
                    />
                    {isStale && (
                        <Text style={stylesheet.staleLabel}>
                            {t('quota.updatedAgo', { age: formatAge(ageS) })}
                        </Text>
                    )}
                </View>
                {onRefresh && (
                    <Pressable
                        onPress={onRefresh}
                        hitSlop={8}
                        style={stylesheet.refreshButton}
                    >
                        <Ionicons name="refresh-outline" size={13} color={theme.colors.textSecondary} />
                    </Pressable>
                )}
            </View>
        </View>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
        backgroundColor: theme.colors.groupped.background,
    },
    barsWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    barsColumn: {
        flex: 1,
        gap: 4,
    },
    refreshButton: {
        paddingTop: 1,
    },
    row: {
        gap: 3,
    },
    barTrack: {
        height: 3,
        borderRadius: 1.5,
        backgroundColor: theme.colors.divider,
        overflow: 'visible',
        position: 'relative',
    },
    barFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 3,
        borderRadius: 1.5,
    },
    timeCursor: {
        position: 'absolute',
        top: -2,
        width: 1,
        height: 7,
        backgroundColor: theme.colors.text,
        opacity: 0.4,
    },
    label: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    staleLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
}));
