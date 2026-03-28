/**
 * Git worktree utility module
 *
 * All worktree lifecycle operations: create, remove, list, merge.
 * All git commands execute remotely via machineBash RPC.
 *
 * NOTE: We pass cwd: '/' to all machineBash calls (the daemon's special bypass
 * value that skips path-restriction validation) and use `git -C <path>` or
 * `cd <path> && cmd` to run in the target directory. This is required because
 * the daemon's machine-level bash handler only permits cwd values within its own
 * startup directory — user project paths are always elsewhere.
 */

import { machineBash } from '@/sync/ops';

// Marker string that identifies a worktree path
export const WORKTREE_PATH_MARKER = '/.dev/worktree/';

// ─── Shell safety ────────────────────────────────────────────────────────────

/**
 * Wrap a value in single quotes with internal single-quote escaping.
 * Prevents shell injection when passing dynamic values to machineBash.
 */
export function shellQuote(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
}

// ─── Path detection ──────────────────────────────────────────────────────────

export function isWorktreePath(path: string): boolean {
    return path.includes(WORKTREE_PATH_MARKER);
}

/** Extract { branchName, basePath } from a worktree path. Returns null if not a worktree path. */
export function parseWorktreePath(path: string): { branchName: string; basePath: string } | null {
    if (!isWorktreePath(path)) return null;
    const idx = path.indexOf(WORKTREE_PATH_MARKER);
    return {
        basePath: path.substring(0, idx),
        branchName: path.substring(idx + WORKTREE_PATH_MARKER.length),
    };
}

// ─── Name generation ─────────────────────────────────────────────────────────

const adjectives = [
    'amber', 'agile', 'azure', 'bold', 'brave', 'bright', 'calm', 'clever',
    'cool', 'cosmic', 'crisp', 'crystal', 'dark', 'eager', 'emerald', 'epic',
    'fierce', 'fresh', 'gentle', 'golden', 'grand', 'hardy', 'happy', 'iron',
    'jade', 'keen', 'light', 'lunar', 'noble', 'nimble', 'prime', 'primal',
    'pure', 'quick', 'quiet', 'ruby', 'sharp', 'silver', 'sleek', 'smooth',
    'solar', 'sonic', 'sturdy', 'swift', 'violet', 'vivid', 'warm', 'wild',
    'wise', 'zesty',
];

const nouns = [
    'aspen', 'aurora', 'basin', 'beacon', 'bear', 'birch', 'bridge', 'canyon',
    'cedar', 'cloud', 'comet', 'crane', 'creek', 'cypress', 'delta', 'desert',
    'dune', 'eagle', 'elm', 'falcon', 'forest', 'fox', 'garden', 'glacier',
    'grove', 'harbor', 'hawk', 'heron', 'island', 'jade', 'lagoon', 'lynx',
    'maple', 'meadow', 'mountain', 'nebula', 'oak', 'ocean', 'pine', 'raven',
    'reef', 'ridge', 'river', 'sequoia', 'star', 'summit', 'tundra', 'valley',
    'volcano', 'willow',
];

function randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function randomHex(length: number): string {
    let hex = '';
    for (let i = 0; i < length; i++) {
        hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
}

export function generateWorktreeName(): string {
    const adjective = randomChoice(adjectives);
    const noun = randomChoice(nouns);
    return `${adjective}-${noun}`;
}

// ─── Gitignore seeding ───────────────────────────────────────────────────────

/**
 * Ensure .dev/worktree/ is in the repo's .gitignore.
 * Best-effort — failure does not block worktree creation.
 */
async function seedGitignore(machineId: string, basePath: string): Promise<void> {
    await machineBash(
        machineId,
        `cd ${shellQuote(basePath)} && grep -qF '.dev/worktree/' .gitignore 2>/dev/null || printf '\\n# Joyful worktrees\\n.dev/worktree/\\n' >> .gitignore`,
        '/'
    );
}

// ─── Create worktree ─────────────────────────────────────────────────────────

export async function createWorktree(
    machineId: string,
    basePath: string
): Promise<{
    success: boolean;
    worktreePath: string;
    branchName: string;
    error?: string;
}> {
    // Check if it's a git repository
    const gitCheck = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} rev-parse --git-dir`,
        '/'
    );

    if (!gitCheck.success) {
        return { success: false, worktreePath: '', branchName: '', error: 'Not a Git repository' };
    }

    // Seed .gitignore best-effort
    seedGitignore(machineId, basePath).catch(() => { /* ignore */ });

    const baseName = generateWorktreeName();

    // Try base name, then -2 through -4, then hex fallback
    const namesToTry = [
        baseName,
        `${baseName}-2`,
        `${baseName}-3`,
        `${baseName}-4`,
        `${baseName}-${randomHex(4)}`,
    ];

    for (const name of namesToTry) {
        const worktreeRelPath = `.dev/worktree/${name}`;
        const result = await machineBash(
            machineId,
            `git -C ${shellQuote(basePath)} worktree add -b ${shellQuote(name)} ${shellQuote(worktreeRelPath)}`,
            '/'
        );

        if (result.success) {
            return {
                success: true,
                worktreePath: `${basePath}${WORKTREE_PATH_MARKER}${name}`,
                branchName: name,
            };
        }

        // Only retry on name collision errors
        if (!result.stderr.includes('already exists') && !result.stderr.includes('already a worktree')) {
            return {
                success: false,
                worktreePath: '',
                branchName: '',
                error: result.stderr || 'Failed to create worktree',
            };
        }
    }

    return {
        success: false,
        worktreePath: '',
        branchName: '',
        error: 'All name attempts collided with existing worktrees',
    };
}

// ─── Remove worktree ─────────────────────────────────────────────────────────

export async function removeWorktree(
    machineId: string,
    worktreePath: string
): Promise<{ success: boolean; error?: string }> {
    if (!isWorktreePath(worktreePath)) {
        return { success: false, error: 'Not a worktree path' };
    }

    const markerIndex = worktreePath.indexOf(WORKTREE_PATH_MARKER);
    const basePath = worktreePath.substring(0, markerIndex);
    const branchName = worktreePath.substring(markerIndex + WORKTREE_PATH_MARKER.length);

    const removeResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} worktree remove ${shellQuote(worktreePath)} --force`,
        '/'
    );

    // Best-effort branch deletion even if worktree removal failed
    await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} branch -D ${shellQuote(branchName)}`,
        '/'
    );

    if (!removeResult.success) {
        return { success: false, error: removeResult.stderr || 'Failed to remove worktree' };
    }
    return { success: true };
}

// ─── List worktrees ──────────────────────────────────────────────────────────

export interface WorktreeEntry {
    path: string;
    branch: string;
    isMain: boolean;
}

export async function listWorktrees(
    machineId: string,
    basePath: string
): Promise<{ success: boolean; worktrees: WorktreeEntry[]; error?: string }> {
    const result = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} worktree list --porcelain`,
        '/'
    );

    if (!result.success) {
        return { success: false, worktrees: [], error: result.stderr || 'Failed to list worktrees' };
    }

    const worktrees: WorktreeEntry[] = [];
    const blocks = result.stdout.trim().split(/\n\n+/);
    let isFirst = true;

    for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.trim().split('\n');
        let path = '';
        let branch = '';

        for (const line of lines) {
            if (line.startsWith('worktree ')) {
                path = line.slice('worktree '.length).trim();
            } else if (line.startsWith('branch ')) {
                const ref = line.slice('branch '.length).trim();
                // refs/heads/branch-name → branch-name
                branch = ref.replace(/^refs\/heads\//, '');
            }
        }

        if (path) {
            worktrees.push({ path, branch, isMain: isFirst });
            isFirst = false;
        }
    }

    return { success: true, worktrees };
}

// ─── Diff stat ───────────────────────────────────────────────────────────────

export interface WorktreeDiffStat {
    diffStat: string;
    commitCount: number;
}

export async function getWorktreeDiffStat(
    machineId: string,
    basePath: string,
    branchName: string
): Promise<{ success: boolean; data?: WorktreeDiffStat; error?: string }> {
    // Get the current branch of the base repo to use as merge target
    const branchResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} rev-parse --abbrev-ref HEAD`,
        '/'
    );
    if (!branchResult.success) {
        return { success: false, error: branchResult.stderr };
    }
    const baseBranch = branchResult.stdout.trim();

    const [diffResult, logResult] = await Promise.all([
        machineBash(
            machineId,
            `git -C ${shellQuote(basePath)} diff --stat ${shellQuote(baseBranch)}...${shellQuote(branchName)}`,
            '/'
        ),
        machineBash(
            machineId,
            `git -C ${shellQuote(basePath)} log ${shellQuote(baseBranch)}..${shellQuote(branchName)} --oneline`,
            '/'
        ),
    ]);

    if (!diffResult.success) {
        return { success: false, error: diffResult.stderr };
    }

    const commitCount = logResult.success
        ? logResult.stdout.trim().split('\n').filter(l => l.trim()).length
        : 0;

    return {
        success: true,
        data: {
            diffStat: diffResult.stdout.trim(),
            commitCount,
        },
    };
}

// ─── Merge worktree ──────────────────────────────────────────────────────────

export interface MergeWorktreeOptions {
    squash: boolean;
    commitMessage: string;
}

export interface MergeWorktreeResult {
    success: boolean;
    conflictFiles?: string[];
    error?: string;
}

export async function mergeWorktree(
    machineId: string,
    basePath: string,
    branchName: string,
    options: MergeWorktreeOptions
): Promise<MergeWorktreeResult> {
    const worktreePath = `${basePath}${WORKTREE_PATH_MARKER}${branchName}`;

    // Check uncommitted changes in both worktree and base (exclude untracked files)
    const [worktreeStatus, baseStatus] = await Promise.all([
        machineBash(machineId, `git -C ${shellQuote(worktreePath)} status --porcelain -uno`, '/'),
        machineBash(machineId, `git -C ${shellQuote(basePath)} status --porcelain -uno`, '/'),
    ]);

    if (worktreeStatus.success && worktreeStatus.stdout.trim()) {
        return { success: false, error: 'worktree_dirty' };
    }
    if (baseStatus.success && baseStatus.stdout.trim()) {
        return { success: false, error: 'base_dirty' };
    }

    // Execute merge
    const mergeCommand = options.squash
        ? `git -C ${shellQuote(basePath)} merge --squash ${shellQuote(branchName)}`
        : `git -C ${shellQuote(basePath)} merge ${shellQuote(branchName)}`;

    const mergeResult = await machineBash(machineId, mergeCommand, '/');

    if (!mergeResult.success) {
        // Detect conflicts
        const statusResult = await machineBash(machineId, `git -C ${shellQuote(basePath)} status --porcelain`, '/');
        const conflictFiles: string[] = [];
        if (statusResult.success) {
            for (const line of statusResult.stdout.split('\n')) {
                const code = line.substring(0, 2);
                if (code.includes('U') || code === 'AA' || code === 'DD') {
                    conflictFiles.push(line.substring(3).trim());
                }
            }
        }

        // Abort the merge. Squash merges don't create MERGE_HEAD and leave unmerged
        // index entries, which causes reset --merge to fail. Use restore --staged --worktree
        // to forcibly reset the index and working tree back to HEAD.
        await machineBash(machineId, `git -C ${shellQuote(basePath)} restore --staged --worktree -- .`, '/');

        return { success: false, conflictFiles, error: 'merge_conflict' };
    }

    // For squash merge, we need to commit
    if (options.squash) {
        const commitResult = await machineBash(
            machineId,
            `git -C ${shellQuote(basePath)} commit -m ${shellQuote(options.commitMessage)}`,
            '/'
        );

        if (!commitResult.success) {
            if (commitResult.stderr.includes('nothing to commit') || commitResult.stdout.includes('nothing to commit')) {
                return { success: true };
            }
            return { success: false, error: commitResult.stderr };
        }
    }

    return { success: true };
}

// ─── Detect unarchived OpenSpec changes ──────────────────────────────────────

export async function detectUnarchivedChanges(
    machineId: string,
    worktreePath: string
): Promise<{ success: boolean; changeNames: string[]; error?: string }> {
    const result = await machineBash(
        machineId,
        `cd ${shellQuote(worktreePath)} && ls -1 openspec/changes/ 2>/dev/null | grep -v '^\\.' || true`,
        '/'
    );

    if (!result.success) {
        return { success: false, changeNames: [], error: result.stderr };
    }

    const names = result.stdout
        .split('\n')
        .map(n => n.trim())
        .filter(n => n && n !== '.archive');

    return { success: true, changeNames: names };
}

// ─── Detect spec divergence ──────────────────────────────────────────────────

export async function detectSpecDivergence(
    machineId: string,
    basePath: string,
    worktreeBranch: string
): Promise<{ success: boolean; hasDivergence: boolean; error?: string }> {
    // Find merge base between worktree branch and main
    const mergeBaseResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} merge-base ${shellQuote(worktreeBranch)} main`,
        '/'
    );

    if (!mergeBaseResult.success) {
        return { success: false, hasDivergence: false, error: mergeBaseResult.stderr };
    }

    const mergeBase = mergeBaseResult.stdout.trim();

    // Check if main has commits touching openspec/specs/ since the merge base
    const logResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} log ${shellQuote(mergeBase)}..main -- openspec/specs/`,
        '/'
    );

    if (!logResult.success) {
        return { success: false, hasDivergence: false, error: logResult.stderr };
    }

    const hasDivergence = logResult.stdout.trim().length > 0;
    return { success: true, hasDivergence };
}

// ─── Agent reconciliation prompts ────────────────────────────────────────────

export function buildConflictResolutionPrompt(conflictFiles: string[], branchName: string): string {
    const fileList = conflictFiles.length > 0 ? conflictFiles.join(', ') : 'the conflicting files';
    return `There are merge conflicts preventing branch "${branchName}" from merging into main.\n\nPlease resolve them:\n1. Run: git merge main\n2. Resolve the conflicts in: ${fileList}\n3. Stage the resolved files and commit the resolution\n\nReply "Ready to merge" when done so I know to return to the merge screen.`;
}

export async function getSpecDiff(machineId: string, basePath: string, branchName: string): Promise<string> {
    const mergeBaseResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} merge-base ${shellQuote(branchName)} main`,
        '/'
    );
    if (!mergeBaseResult.success) return '';

    const mergeBase = mergeBaseResult.stdout.trim();
    const diffResult = await machineBash(
        machineId,
        `git -C ${shellQuote(basePath)} diff ${shellQuote(mergeBase)}..main -- openspec/specs/`,
        '/'
    );
    if (!diffResult.success) return '';

    const MAX_CHARS = 8000;
    const diff = diffResult.stdout;
    if (diff.length > MAX_CHARS) {
        return diff.slice(0, MAX_CHARS) + '\n[truncated — run git diff for full output]';
    }
    return diff;
}

export function buildSpecReconciliationPrompt(specDiff: string, branchName: string): string {
    const diffSection = specDiff.trim()
        ? `Spec changes on main:\n\`\`\`diff\n${specDiff}\n\`\`\``
        : 'The spec files have been updated on main (run `git diff` against main to see the changes).';
    return `The main branch has updated spec files since branch "${branchName}" was created. Please update the implementation to match before merging.\n\n${diffSection}\n\nReview the changes, update the implementation in this branch to match the new requirements, and commit. Reply "Ready to merge" when done.`;
}

// ─── Pull main into worktree branch ─────────────────────────────────────────

export async function pullMainIntoWorktree(
    machineId: string,
    worktreePath: string
): Promise<{ success: boolean; hasConflicts: boolean; error?: string }> {
    const result = await machineBash(
        machineId,
        `git -C ${shellQuote(worktreePath)} merge main`,
        '/'
    );

    if (!result.success) {
        const hasConflicts = result.stdout.includes('CONFLICT') || result.stderr.includes('CONFLICT');
        return { success: false, hasConflicts, error: result.stderr || result.stdout };
    }

    return { success: true, hasConflicts: false };
}
