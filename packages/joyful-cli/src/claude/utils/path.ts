import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function getProjectPath(workingDirectory: string) {
    // Expand leading ~ before resolving so paths like ~/projects/foo work correctly
    const expanded = workingDirectory.startsWith('~/')
        ? join(homedir(), workingDirectory.slice(2))
        : workingDirectory === '~'
        ? homedir()
        : workingDirectory;
    const projectId = resolve(expanded).replace(/[^a-zA-Z0-9-]/g, '-');
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
    return join(claudeConfigDir, 'projects', projectId);
}