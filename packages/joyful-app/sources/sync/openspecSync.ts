/**
 * OpenSpec status synchronization module
 * Scans the openspec/ directory of a session's working directory and
 * stores the parsed status per-project, following the gitStatusSync pattern.
 */

import { InvalidateSync } from '@/utils/sync';
import { sessionBash } from './ops';
import { OpenSpecArtifact, OpenSpecChange, OpenSpecSpecGroup, OpenSpecStatus } from './storageTypes';
import { storage } from './storage';

// Bash command that lists all openspec files and task completion stats in one round trip
const OPENSPEC_SCAN_COMMAND = `{ find openspec -type f 2>/dev/null | sort; for f in openspec/changes/*/tasks.md openspec/changes/archive/*/tasks.md; do [ -f "$f" ] && printf "TASKS:%s:%s:%s\\n" "$f" "$(grep -c '\\[x\\]' "$f" 2>/dev/null || echo 0)" "$(grep -c '\\[ \\]' "$f" 2>/dev/null || echo 0)"; done; } 2>/dev/null`;

export class OpenSpecSync {
    // Map project keys to sync instances
    private projectSyncMap = new Map<string, InvalidateSync>();
    // Map session IDs to project keys for cleanup
    private sessionToProjectKey = new Map<string, string>();

    /**
     * Get project key string for a session
     */
    private getProjectKeyForSession(sessionId: string): string | null {
        const session = storage.getState().sessions[sessionId];
        if (!session?.metadata?.machineId || !session?.metadata?.path) {
            return null;
        }
        return `${session.metadata.machineId}:${session.metadata.path}`;
    }

    /**
     * Get or create openspec sync for a session (project-based)
     */
    getSync(sessionId: string): InvalidateSync {
        const projectKey = this.getProjectKeyForSession(sessionId);
        if (!projectKey) {
            return new InvalidateSync(async () => {});
        }

        this.sessionToProjectKey.set(sessionId, projectKey);

        let sync = this.projectSyncMap.get(projectKey);
        if (!sync) {
            sync = new InvalidateSync(() => this.fetchOpenSpecStatusForProject(sessionId, projectKey));
            this.projectSyncMap.set(projectKey, sync);
        }
        return sync;
    }

    /**
     * Invalidate openspec status for a session (triggers refresh for the entire project)
     */
    invalidate(sessionId: string): void {
        const projectKey = this.sessionToProjectKey.get(sessionId);
        if (projectKey) {
            const sync = this.projectSyncMap.get(projectKey);
            if (sync) {
                sync.invalidate();
            }
        }
    }

    /**
     * Fetch OpenSpec status for a project using any session in that project
     */
    private async fetchOpenSpecStatusForProject(sessionId: string, projectKey: string): Promise<void> {
        try {
            const session = storage.getState().sessions[sessionId];
            if (!session?.metadata?.path) {
                return;
            }

            const result = await sessionBash(sessionId, {
                command: OPENSPEC_SCAN_COMMAND,
                cwd: session.metadata.path,
                timeout: 10000
            });

            if (!result.success) {
                return;
            }

            const status = parseOpenSpecOutput(result.stdout);
            storage.getState().updateProjectOpenSpecStatus(projectKey, status);

        } catch (error) {
            console.error('Error fetching openspec status for session', sessionId, ':', error);
        }
    }
}

/**
 * Parse the bash output into an OpenSpecStatus object.
 *
 * Lines prefixed with "TASKS:" carry task completion counts:
 *   TASKS:<path>:<completed>:<remaining>
 * All other non-empty lines are file paths.
 */
export function parseOpenSpecOutput(stdout: string): OpenSpecStatus {
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

    // Collect task stats keyed by change path (e.g., "openspec/changes/my-change")
    const taskStatsByChangePath: Record<string, { completed: number; total: number }> = {};
    const filePaths: string[] = [];

    for (const line of lines) {
        if (line.startsWith('TASKS:')) {
            // Format: TASKS:<path>:<completed_count>:<remaining_count>
            const rest = line.slice('TASKS:'.length);
            const colonIdx1 = rest.lastIndexOf(':');
            const colonIdx2 = rest.lastIndexOf(':', colonIdx1 - 1);
            if (colonIdx2 >= 0) {
                const path = rest.slice(0, colonIdx2);          // e.g., "openspec/changes/my-change/tasks.md"
                const completed = parseInt(rest.slice(colonIdx2 + 1, colonIdx1), 10) || 0;
                const remaining = parseInt(rest.slice(colonIdx1 + 1), 10) || 0;
                // Key by the change directory (strip /tasks.md)
                const changePath = path.replace(/\/tasks\.md$/, '');
                taskStatsByChangePath[changePath] = { completed, total: completed + remaining };
            }
        } else {
            filePaths.push(line);
        }
    }

    const hasOpenspec = filePaths.some(p => p.startsWith('openspec/'));

    if (!hasOpenspec) {
        return {
            hasOpenspec: false,
            activeChanges: [],
            archivedChanges: [],
            mainSpecs: [],
            lastUpdatedAt: Date.now()
        };
    }

    // Group file paths by their top-level category
    const activeChangeFiles: Record<string, string[]> = {};   // changeName → [paths]
    const archivedChangeFiles: Record<string, string[]> = {}; // changeName → [paths]
    const mainSpecFiles: Record<string, string[]> = {};       // specName → [paths]

    for (const path of filePaths) {
        // Active change: openspec/changes/<name>/...  (not archive)
        const activeMatch = path.match(/^openspec\/changes\/([^/]+)\/(.+)$/);
        if (activeMatch && activeMatch[1] !== 'archive') {
            const changeName = activeMatch[1];
            if (!activeChangeFiles[changeName]) activeChangeFiles[changeName] = [];
            activeChangeFiles[changeName].push(path);
            continue;
        }

        // Archived change: openspec/changes/archive/<name>/...
        const archivedMatch = path.match(/^openspec\/changes\/archive\/([^/]+)\/(.+)$/);
        if (archivedMatch) {
            const changeName = archivedMatch[1];
            if (!archivedChangeFiles[changeName]) archivedChangeFiles[changeName] = [];
            archivedChangeFiles[changeName].push(path);
            continue;
        }

        // Main spec: openspec/specs/<name>/...
        const specMatch = path.match(/^openspec\/specs\/([^/]+)\/(.+)$/);
        if (specMatch) {
            const specName = specMatch[1];
            if (!mainSpecFiles[specName]) mainSpecFiles[specName] = [];
            mainSpecFiles[specName].push(path);
            continue;
        }
    }

    const activeChanges: OpenSpecChange[] = Object.entries(activeChangeFiles).map(([name, paths]) => {
        const changePath = `openspec/changes/${name}`;
        return buildChange(name, false, paths, changePath, taskStatsByChangePath);
    }).sort((a, b) => a.name.localeCompare(b.name));

    const archivedChanges: OpenSpecChange[] = Object.entries(archivedChangeFiles).map(([name, paths]) => {
        const changePath = `openspec/changes/archive/${name}`;
        return buildChange(name, true, paths, changePath, taskStatsByChangePath);
    }).sort((a, b) => a.name.localeCompare(b.name));

    const mainSpecs: OpenSpecSpecGroup[] = Object.entries(mainSpecFiles).map(([name, paths]) => ({
        name,
        artifacts: paths.map(p => buildArtifact(p, false))
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
        hasOpenspec: true,
        activeChanges,
        archivedChanges,
        mainSpecs,
        lastUpdatedAt: Date.now()
    };
}

function buildChange(
    name: string,
    isArchived: boolean,
    paths: string[],
    changePath: string,
    taskStatsByChangePath: Record<string, { completed: number; total: number }>
): OpenSpecChange {
    // Separate top-level artifacts from delta specs (specs/<specName>/...)
    const topLevelArtifacts: OpenSpecArtifact[] = [];
    const deltaSpecFiles: Record<string, string[]> = {};

    for (const path of paths) {
        const specsSubMatch = path.match(new RegExp(`^${escapeRegex(changePath)}/specs/([^/]+)/(.+)$`));
        if (specsSubMatch) {
            const specName = specsSubMatch[1];
            if (!deltaSpecFiles[specName]) deltaSpecFiles[specName] = [];
            deltaSpecFiles[specName].push(path);
        } else {
            topLevelArtifacts.push(buildArtifact(path, false));
        }
    }

    const deltaSpecs: OpenSpecSpecGroup[] = Object.entries(deltaSpecFiles).map(([specName, specPaths]) => ({
        name: specName,
        artifacts: specPaths.map(p => buildArtifact(p, true))
    })).sort((a, b) => a.name.localeCompare(b.name));

    const taskStats = taskStatsByChangePath[changePath] ?? null;

    return {
        name,
        isArchived,
        artifacts: topLevelArtifacts,
        deltaSpecs,
        taskStats
    };
}

function buildArtifact(path: string, isInSpecsDir: boolean): OpenSpecArtifact {
    const filename = path.split('/').pop() ?? path;
    const type = classifyArtifact(filename, isInSpecsDir);
    return { path, filename, type };
}

function classifyArtifact(filename: string, isInSpecsDir: boolean): OpenSpecArtifact['type'] {
    if (isInSpecsDir) return 'spec';
    if (filename === 'proposal.md') return 'proposal';
    if (filename === 'design.md') return 'design';
    if (filename === 'tasks.md') return 'tasks';
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'config';
    if (filename.endsWith('.md')) return 'other';
    return 'other';
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Global singleton instance
export const openspecSync = new OpenSpecSync();
