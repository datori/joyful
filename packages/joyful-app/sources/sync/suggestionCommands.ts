/**
 * Suggestion commands functionality for slash commands
 * Reads commands directly from session metadata storage
 */

import Fuse from 'fuse.js';
import { storage } from './storage';

export interface CommandItem {
    command: string;        // The command without slash (e.g., "compact")
    description?: string;   // Optional description of what the command does
}

interface SearchOptions {
    limit?: number;
    threshold?: number;
}

// Commands to hide from autocomplete — only terminal/PTY-specific and one-time installation tools.
// Everything else (config, diagnostic, auth, review) is intentionally visible.
export const IGNORED_COMMANDS = [
    "exit",              // kills the CLI process
    "vim",               // interactive terminal editor
    "ide",               // IDE integration (terminal-only)
    "terminal-setup",    // configures terminal emulator
    "migrate-installer", // one-time installation migration
    "install-github-app",// one-time GitHub App installation
    "statusline",        // configures terminal statusline display
    "resume",            // joyful provides its own session-resume UI
];

// Default commands always available
const DEFAULT_COMMANDS: CommandItem[] = [
    { command: 'compact', description: 'Compact the conversation history' },
    { command: 'clear', description: 'Clear the conversation' }
];

// Command descriptions for known tools/commands
const COMMAND_DESCRIPTIONS: Record<string, string> = {
    // Default commands
    compact: 'Compact the conversation history',
    
    // Common tool commands
    help: 'Show available commands',
    clear: 'Clear the conversation',
    reset: 'Reset the session',
    export: 'Export conversation',
    debug: 'Show debug information',
    status: 'Show connection status',
    stop: 'Stop current operation',
    abort: 'Abort current operation',
    cancel: 'Cancel current operation',
    
    // Add more descriptions as needed
};

// Get commands from session metadata
function getCommandsFromSession(sessionId: string): CommandItem[] {
    const state = storage.getState();
    const session = state.sessions[sessionId];
    if (!session || !session.metadata) {
        return DEFAULT_COMMANDS;
    }

    const commands: CommandItem[] = [...DEFAULT_COMMANDS];
    
    // Add commands from metadata.slashCommands (filter with ignore list)
    if (session.metadata.slashCommands) {
        for (const cmd of session.metadata.slashCommands) {
            // Skip if in ignore list
            if (IGNORED_COMMANDS.includes(cmd)) continue;
            
            // Check if it's already in default commands
            if (!commands.find(c => c.command === cmd)) {
                commands.push({
                    command: cmd,
                    description: COMMAND_DESCRIPTIONS[cmd]  // Optional description
                });
            }
        }
    }
    
    return commands;
}

// Main export: search commands with fuzzy matching
export async function searchCommands(
    sessionId: string,
    query: string,
    options: SearchOptions = {}
): Promise<CommandItem[]> {
    const { limit = 10, threshold = 0.3 } = options;
    
    // Get commands from session metadata (no caching)
    const commands = getCommandsFromSession(sessionId);
    
    // If query is empty, return all commands
    if (!query || query.trim().length === 0) {
        return commands.slice(0, limit);
    }
    
    // Setup Fuse for fuzzy search
    const fuseOptions = {
        keys: [
            { name: 'command', weight: 0.7 },
            { name: 'description', weight: 0.3 }
        ],
        threshold,
        includeScore: true,
        shouldSort: true,
        minMatchCharLength: 1,
        ignoreLocation: true,
        useExtendedSearch: true
    };
    
    const fuse = new Fuse(commands, fuseOptions);
    const results = fuse.search(query, { limit });
    
    return results.map(result => result.item);
}

// Get all available commands for a session
export function getAllCommands(sessionId: string): CommandItem[] {
    return getCommandsFromSession(sessionId);
}

// Collect recently-seen commands across ALL sessions in storage (naive global cache).
// Deduplicates and applies IGNORED_COMMANDS filter. Always includes DEFAULT_COMMANDS.
export function getRecentCommands(): CommandItem[] {
    const state = storage.getState();
    const commands: CommandItem[] = [...DEFAULT_COMMANDS];
    const seen = new Set(DEFAULT_COMMANDS.map(c => c.command));

    for (const session of Object.values(state.sessions)) {
        if (!session.metadata?.slashCommands) continue;
        for (const cmd of session.metadata.slashCommands) {
            if (IGNORED_COMMANDS.includes(cmd)) continue;
            if (seen.has(cmd)) continue;
            seen.add(cmd);
            commands.push({
                command: cmd,
                description: COMMAND_DESCRIPTIONS[cmd],
            });
        }
    }

    return commands;
}

// Search recent commands with fuzzy matching (no session ID required).
// Used on the new session creation screen before a session exists.
export async function searchRecentCommands(
    query: string,
    options: SearchOptions = {}
): Promise<CommandItem[]> {
    const { limit = 10, threshold = 0.3 } = options;
    const commands = getRecentCommands();

    if (!query || query.trim().length === 0) {
        return commands.slice(0, limit);
    }

    const fuseOptions = {
        keys: [
            { name: 'command', weight: 0.7 },
            { name: 'description', weight: 0.3 }
        ],
        threshold,
        includeScore: true,
        shouldSort: true,
        minMatchCharLength: 1,
        ignoreLocation: true,
        useExtendedSearch: true
    };

    const fuse = new Fuse(commands, fuseOptions);
    const results = fuse.search(query, { limit });
    return results.map(result => result.item);
}