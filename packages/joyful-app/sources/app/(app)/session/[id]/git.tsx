import * as React from 'react';
import { View, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Octicons } from '@expo/vector-icons';
import { Text } from '@/components/StyledText';
import { ItemList, ItemListStatic } from '@/components/ItemList';
import { Item } from '@/components/Item';
import { Typography } from '@/constants/Typography';
import { sessionBash } from '@/sync/ops';
import { storage } from '@/sync/storage';
import { parseGitLog, GitCommit } from '@/sync/git-parsers/parseGitLog';
import { parseGitBranchVV, GitBranchEntry } from '@/sync/git-parsers/parseBranch';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { layout } from '@/components/layout';
import { t } from '@/text';

interface GitData {
    branches: GitBranchEntry[];
    commits: GitCommit[];
    branchError: boolean;
    commitError: boolean;
    isGitRepo: boolean;
}

const SECTION_HEADER_STYLE = {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: Platform.select({ ios: 0.33, default: 1 }) as number,
};

function SectionHeader({ label, color }: { label: string; color: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={[SECTION_HEADER_STYLE, {
            backgroundColor: theme.colors.surfaceHigh,
            borderBottomColor: theme.colors.divider,
        }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color, ...Typography.default() }}>
                {label}
            </Text>
        </View>
    );
}

function EmptyRow({ text }: { text: string }) {
    const { theme } = useUnistyles();
    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, ...Typography.default() }}>
                {text}
            </Text>
        </View>
    );
}

export default React.memo(function GitScreen() {
    const route = useRoute();
    const sessionId = (route.params! as any).id as string;
    const { theme } = useUnistyles();

    const [gitData, setGitData] = React.useState<GitData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const fetchGitData = React.useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        const session = storage.getState().sessions[sessionId];
        const sessionPath = session?.metadata?.path;

        if (!sessionPath) {
            setGitData({ branches: [], commits: [], branchError: false, commitError: false, isGitRepo: false });
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }

        // Run both commands in parallel, independently
        const [branchResult, logResult] = await Promise.allSettled([
            sessionBash(sessionId, {
                command: 'git branch -vv -a',
                cwd: sessionPath,
                timeout: 5000,
            }),
            sessionBash(sessionId, {
                command: 'git log --format="%H|%h|%s|%an|%ar" -30',
                cwd: sessionPath,
                timeout: 5000,
            }),
        ]);

        const branchSuccess = branchResult.status === 'fulfilled' && branchResult.value.success;
        const logSuccess = logResult.status === 'fulfilled' && logResult.value.success;

        // If both fail, likely not a git repo (non-zero exit from git)
        const isGitRepo = branchSuccess || logSuccess;

        const branches = branchSuccess
            ? parseGitBranchVV((branchResult as PromiseFulfilledResult<any>).value.stdout)
            : [];

        const commits = logSuccess
            ? parseGitLog((logResult as PromiseFulfilledResult<any>).value.stdout)
            : [];

        setGitData({
            branches,
            commits,
            branchError: !branchSuccess && isGitRepo,
            commitError: !logSuccess && isGitRepo,
            isGitRepo,
        });
        setIsLoading(false);
        setIsRefreshing(false);
    }, [sessionId]);

    // Fetch on screen focus
    useFocusEffect(
        React.useCallback(() => {
            fetchGitData(false);
        }, [fetchGitData])
    );

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (!gitData || !gitData.isGitRepo) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Octicons name="git-branch" size={48} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 16, ...Typography.default() }}>
                    {t('gitHistory.notRepo')}
                </Text>
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, ...Typography.default() }}>
                    {t('gitHistory.notRepoDesc')}
                </Text>
            </View>
        );
    }

    const localBranches = gitData.branches.filter(b => !b.isRemote);
    const remoteBranches = gitData.branches.filter(b => b.isRemote);

    return (
        <ItemList
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => fetchGitData(true)}
                    tintColor={theme.colors.textSecondary}
                />
            }
        >
            {/* Branches section */}
            <SectionHeader label={t('gitHistory.branches')} color={theme.colors.text} />

            {gitData.branchError ? (
                <EmptyRow text={t('gitHistory.errorBranches')} />
            ) : localBranches.length === 0 ? (
                <EmptyRow text={t('gitHistory.noBranches')} />
            ) : (
                <ItemListStatic>
                    {localBranches.map((branch, index) => (
                        <Item
                            key={branch.name}
                            title={branch.name}
                            subtitle={buildBranchSubtitle(branch)}
                            icon={
                                <Octicons
                                    name={branch.isCurrent ? 'dot-fill' : 'git-branch'}
                                    size={branch.isCurrent ? 20 : 18}
                                    color={branch.isCurrent ? theme.colors.success : theme.colors.textSecondary}
                                />
                            }
                            showDivider={index < localBranches.length - 1 || remoteBranches.length > 0}
                        />
                    ))}
                </ItemListStatic>
            )}

            {/* Remote branches */}
            {remoteBranches.length > 0 && (
                <>
                    <SectionHeader label={t('gitHistory.remoteBranches')} color={theme.colors.textSecondary} />
                    <ItemListStatic>
                        {remoteBranches.map((branch, index) => (
                            <Item
                                key={branch.name}
                                title={branch.name.replace(/^remotes\//, '')}
                                icon={<Octicons name="git-branch" size={18} color={theme.colors.textSecondary} />}
                                showDivider={index < remoteBranches.length - 1}
                            />
                        ))}
                    </ItemListStatic>
                </>
            )}

            {/* Recent commits section */}
            <SectionHeader label={t('gitHistory.recentCommits')} color={theme.colors.text} />

            {gitData.commitError ? (
                <EmptyRow text={t('gitHistory.errorCommits')} />
            ) : gitData.commits.length === 0 ? (
                <EmptyRow text={t('gitHistory.noCommits')} />
            ) : (
                <ItemListStatic>
                    {gitData.commits.map((commit, index) => (
                        <Item
                            key={commit.fullHash}
                            title={commit.subject.length > 60 ? commit.subject.slice(0, 60) + '…' : commit.subject}
                            subtitle={`${commit.shortHash}  ·  ${commit.author}  ·  ${commit.relativeTime}`}
                            icon={<Octicons name="git-commit" size={18} color={theme.colors.textSecondary} />}
                            showDivider={index < gitData.commits.length - 1}
                        />
                    ))}
                </ItemListStatic>
            )}
        </ItemList>
    );
});

function buildBranchSubtitle(branch: GitBranchEntry): string | undefined {
    const parts: string[] = [];
    if (branch.ahead !== undefined && branch.ahead > 0) parts.push(`↑${branch.ahead}`);
    if (branch.behind !== undefined && branch.behind > 0) parts.push(`↓${branch.behind}`);
    return parts.length > 0 ? parts.join('  ') : undefined;
}

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        width: '100%',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: theme.colors.surface,
    },
}));
