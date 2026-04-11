/**
 * Codex MCP Client - Simple wrapper for Codex tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '@/ui/logger';
import type { CodexSessionConfig, CodexToolResponse } from './types';
import { z } from 'zod';
import { ElicitRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CodexPermissionHandler } from './utils/permissionHandler';
import { execSync } from 'child_process';
import type { SandboxConfig } from '@/persistence';
import { initializeSandbox, wrapForMcpTransport } from '@/sandbox/manager';

const DEFAULT_TIMEOUT = 14 * 24 * 60 * 60 * 1000; // 14 days, which is the half of the maximum possible timeout (~28 days for int32 value in NodeJS)
const CODEX_LINEAGE_ENV_KEYS = [
    'CODEX_THREAD_ID',
    'CODEX_SESSION_ID',
    'CODEX_CONVERSATION_ID',
] as const;

function summarizeIdentifier(value: string | null): string | null {
    if (!value) return null;
    if (value.length <= 14) return value;
    return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
}

function getIdentifierCandidates(value: unknown): Record<string, any>[] {
    if (!isRecord(value)) {
        return [];
    }

    const candidates = [value];
    for (const key of ['data', 'meta', 'structuredContent']) {
        const nestedValue = value[key];
        if (isRecord(nestedValue)) {
            candidates.push(nestedValue);
        }
    }

    return candidates;
}

function getStringProperty(value: unknown, keys: string[]): string | null {
    for (const candidate of getIdentifierCandidates(value)) {
        for (const key of keys) {
            const prop = candidate[key];
            if (typeof prop === 'string' && prop.length > 0) {
                return prop;
            }
        }
    }

    return null;
}

function sanitizeCodexTransportEnv(env: Record<string, string>): string[] {
    const removedKeys: string[] = [];

    for (const key of CODEX_LINEAGE_ENV_KEYS) {
        if (key in env) {
            delete env[key];
            removedKeys.push(key);
        }
    }

    return removedKeys;
}

/**
 * Get the correct MCP subcommand based on installed codex version
 * Versions >= 0.43.0-alpha.5 use 'mcp-server', older versions use 'mcp'
 * Returns null if codex is not installed or version cannot be determined
 */
function getCodexMcpCommand(): string | null {
    try {
        const version = execSync('codex --version', { encoding: 'utf8' }).trim();
        const match = version.match(/(\d+\.\d+\.\d+(?:-alpha\.\d+)?)/);
        if (!match) {
            logger.warn('[CodexMCP] Could not parse Codex version output, defaulting to mcp-server:', version);
            return 'mcp-server';
        }

        const versionStr = match[1];
        const [major, minor, patch] = versionStr.split(/[-.]/).map(Number);

        // Version >= 0.43.0-alpha.5 has mcp-server
        if (major > 0 || minor > 43) return 'mcp-server';
        if (minor === 43 && patch === 0) {
            // Check for alpha version
            if (versionStr.includes('-alpha.')) {
                const alphaNum = parseInt(versionStr.split('-alpha.')[1]);
                return alphaNum >= 5 ? 'mcp-server' : 'mcp';
            }
            return 'mcp-server'; // 0.43.0 stable has mcp-server
        }
        return 'mcp'; // Older versions use mcp
    } catch (error) {
        logger.debug('[CodexMCP] Codex CLI not found or not executable:', error);
        return null;
    }
}

export class CodexMcpClient {
    private client: Client;
    private transport: StdioClientTransport | null = null;
    private connected: boolean = false;
    private sessionId: string | null = null;
    private conversationId: string | null = null;
    private handler: ((event: any) => void) | null = null;
    private identifierUpdateHandler: ((ids: { sessionId: string | null; conversationId: string | null }) => void) | null = null;
    private permissionHandler: CodexPermissionHandler | null = null;
    private sandboxConfig?: SandboxConfig;
    private sandboxCleanup: (() => Promise<void>) | null = null;
    public sandboxEnabled: boolean = false;

    constructor(sandboxConfig?: SandboxConfig) {
        this.sandboxConfig = sandboxConfig;
        this.client = new Client(
            { name: 'joyful-codex-client', version: '1.0.0' },
            { capabilities: { elicitation: {} } }
        );

        this.client.setNotificationHandler(z.object({
            method: z.literal('codex/event'),
            params: z.object({
                msg: z.any()
            })
        }).passthrough(), (data) => {
            const msg = data.params.msg;
            this.updateIdentifiersFromEvent(msg);
            this.handler?.(msg);
        });
    }

    setHandler(handler: ((event: any) => void) | null): void {
        this.handler = handler;
    }

    setIdentifierUpdateHandler(
        handler: ((ids: { sessionId: string | null; conversationId: string | null }) => void) | null
    ): void {
        this.identifierUpdateHandler = handler;
    }

    hydrateIdentifiers(ids: { sessionId?: string | null; conversationId?: string | null }): void {
        let changed = false;

        if (ids.sessionId !== undefined && ids.sessionId !== this.sessionId) {
            this.sessionId = ids.sessionId;
            changed = true;
        }

        if (ids.conversationId !== undefined && ids.conversationId !== this.conversationId) {
            this.conversationId = ids.conversationId;
            changed = true;
        }

        if (changed) {
            logger.debug('[CodexMCP] Hydrated persisted identifiers', {
                sessionId: summarizeIdentifier(this.sessionId),
                conversationId: summarizeIdentifier(this.conversationId),
            });
            this.publishIdentifierUpdate();
        }
    }

    /**
     * Set the permission handler for tool approval
     */
    setPermissionHandler(handler: CodexPermissionHandler): void {
        this.permissionHandler = handler;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        const mcpCommand = getCodexMcpCommand();

        if (mcpCommand === null) {
            throw new Error(
                'Codex CLI not found or not executable.\n' +
                '\n' +
                'To install codex:\n' +
                '  npm install -g @openai/codex\n' +
                '\n' +
                'Alternatively, use Claude:\n' +
                '  joyful claude'
            );
        }

        logger.debug(`[CodexMCP] Connecting to Codex MCP server using command: codex ${mcpCommand}`);

        let transportCommand = 'codex';
        let transportArgs = [mcpCommand];
        this.sandboxEnabled = false;

        if (this.sandboxConfig?.enabled) {
            if (process.platform === 'win32') {
                logger.warn('[CodexMCP] Sandbox is not supported on Windows; continuing without sandbox.');
            } else {
                try {
                    this.sandboxCleanup = await initializeSandbox(this.sandboxConfig, process.cwd());
                    const wrappedTransport = await wrapForMcpTransport('codex', [mcpCommand]);
                    transportCommand = wrappedTransport.command;
                    transportArgs = wrappedTransport.args;
                    this.sandboxEnabled = true;
                    logger.info(
                        `[CodexMCP] Sandbox enabled: workspace=${this.sandboxConfig.workspaceRoot ?? process.cwd()}, network=${this.sandboxConfig.networkMode}`,
                    );
                } catch (error) {
                    logger.warn('[CodexMCP] Failed to initialize sandbox; continuing without sandbox.', error);
                    this.sandboxCleanup = null;
                    this.sandboxEnabled = false;
                }
            }
        }

        try {
            const transportEnv = Object.keys(process.env).reduce((acc, key) => {
                const value = process.env[key];
                if (typeof value === 'string') acc[key] = value;
                return acc;
            }, {} as Record<string, string>);
            const removedLineageEnvKeys = sanitizeCodexTransportEnv(transportEnv);

            if (removedLineageEnvKeys.length > 0) {
                logger.warn('[CodexMCP] Removed inherited Codex lineage environment variables before launch', {
                    removedKeys: removedLineageEnvKeys,
                });
            }

            // Codex currently logs noisy rollout fallback messages at ERROR level during
            // state-db migration. Keep all other logs intact, only mute this module.
            const rolloutListFilter = 'codex_core::rollout::list=off';
            const existingRustLog = transportEnv.RUST_LOG?.trim();
            if (!existingRustLog) {
                transportEnv.RUST_LOG = rolloutListFilter;
            } else if (!existingRustLog.includes('codex_core::rollout::list=')) {
                transportEnv.RUST_LOG = `${existingRustLog},${rolloutListFilter}`;
            }

            if (this.sandboxEnabled) {
                // Codex uses this flag to disable proxy auto-discovery that can panic under seatbelt-like sandboxes.
                transportEnv.CODEX_SANDBOX = 'seatbelt';
            }

            this.transport = new StdioClientTransport({
                command: transportCommand,
                args: transportArgs,
                env: transportEnv,
            });

            // Register request handlers for Codex permission methods
            this.registerPermissionHandlers();

            await this.client.connect(this.transport);
            this.connected = true;
        } catch (error) {
            if (this.sandboxCleanup) {
                try {
                    await this.sandboxCleanup();
                } catch (cleanupError) {
                    logger.warn('[CodexMCP] Failed to reset sandbox after connection error.', cleanupError);
                } finally {
                    this.sandboxCleanup = null;
                }
            }
            this.sandboxEnabled = false;
            throw error;
        }

        logger.debug('[CodexMCP] Connected to Codex');
    }

    private registerPermissionHandlers(): void {
        // Register handler for exec command approval requests
        this.client.setRequestHandler(
            ElicitRequestSchema,
            async (request) => {
                logger.debug('[CodexMCP] Received elicitation request:', request.params);

                // Load params
                const params = request.params as unknown as {
                    message: string,
                    codex_elicitation: string,
                    codex_mcp_tool_call_id: string,
                    codex_event_id: string,
                    codex_call_id: string,
                    codex_command: string[],
                    codex_cwd: string
                }

                // MCP tool call approvals (no codex_command) are auto-approved —
                // these come from our own joyful MCP server and don't need user oversight.
                if (!params.codex_command) {
                    logger.debug('[CodexMCP] Auto-approving MCP tool call elicitation (no shell command)');
                    return { action: 'accept' as const, content: {} };
                }

                const toolName = 'CodexBash';

                // If no permission handler set, deny by default
                if (!this.permissionHandler) {
                    logger.debug('[CodexMCP] No permission handler set, denying by default');
                    return { action: 'decline' as const };
                }

                try {
                    // Request permission through the handler
                    const result = await this.permissionHandler.handleToolCall(
                        params.codex_call_id,
                        toolName,
                        {
                            command: params.codex_command,
                            cwd: params.codex_cwd
                        }
                    );

                    logger.debug('[CodexMCP] Permission result:', result);
                    return {
                        action: (result.decision === 'approved' || result.decision === 'approved_for_session')
                            ? 'accept' as const
                            : 'decline' as const,
                        content: {}
                    };
                } catch (error) {
                    logger.debug('[CodexMCP] Error handling permission request:', error);
                    return { action: 'decline' as const };
                }
            }
        );

        logger.debug('[CodexMCP] Permission handlers registered');
    }

    async startSession(config: CodexSessionConfig, options?: { signal?: AbortSignal }): Promise<CodexToolResponse> {
        if (!this.connected) await this.connect();

        logger.debug('[CodexMCP] Starting Codex session:', config);

        const response = await this.client.callTool({
            name: 'codex',
            arguments: config as any
        }, undefined, {
            signal: options?.signal,
            timeout: DEFAULT_TIMEOUT,
            // maxTotalTimeout: 10000000000 
        });

        logger.debug('[CodexMCP] startSession response:', response);

        // Extract session / conversation identifiers from response if present
        this.extractIdentifiers(response);
        this.logLineageState('startSession');

        return response as CodexToolResponse;
    }

    async continueSession(prompt: string, options?: { signal?: AbortSignal }): Promise<CodexToolResponse> {
        if (!this.connected) await this.connect();

        if (!this.sessionId) {
            throw new Error('No active session. Call startSession first.');
        }

        const usedSyntheticConversationId = !this.conversationId;
        const conversationId = this.conversationId ?? this.sessionId;
        if (!conversationId) {
            throw new Error('No active conversation. Call startSession first.');
        }

        if (usedSyntheticConversationId) {
            logger.warn('[CodexMCP] Continuing with synthesized conversation lineage derived from session id', {
                sessionId: summarizeIdentifier(this.sessionId),
            });
        }

        const args = { sessionId: this.sessionId, conversationId, prompt };
        logger.debug('[CodexMCP] Continuing Codex session:', args);

        const response = await this.client.callTool({
            name: 'codex-reply',
            arguments: args
        }, undefined, {
            signal: options?.signal,
            timeout: DEFAULT_TIMEOUT
        });

        logger.debug('[CodexMCP] continueSession response:', response);
        this.extractIdentifiers(response);
        this.logLineageState('continueSession');

        return response as CodexToolResponse;
    }


    private updateIdentifiersFromEvent(event: any): void {
        if (!event || typeof event !== 'object') {
            return;
        }

        if (this.updateIdentifiersFromCandidate(event, 'event')) {
            this.publishIdentifierUpdate();
        }
    }

    private extractConversationLineage(value: unknown): {
        conversationId: string | null;
        source: 'conversation_id' | 'thread_id' | null;
    } {
        const conversationId = getStringProperty(value, ['conversationId', 'conversation_id']);
        if (conversationId) {
            return { conversationId, source: 'conversation_id' };
        }

        const threadId = getStringProperty(value, ['threadId', 'thread_id']);
        if (threadId) {
            return { conversationId: threadId, source: 'thread_id' };
        }

        return { conversationId: null, source: null };
    }

    private updateIdentifiersFromCandidate(
        candidate: unknown,
        source: 'event' | 'response' | 'response_content',
    ): boolean {
        let changed = false;

        const sessionId = getStringProperty(candidate, ['sessionId', 'session_id']);
        const conversationLineage = this.extractConversationLineage(candidate);

        if (sessionId && sessionId !== this.sessionId) {
            this.sessionId = sessionId;
            logger.debug(`[CodexMCP] Session ID extracted from ${source}:`, this.sessionId);
            changed = true;

            if (!conversationLineage.conversationId && this.conversationId !== null) {
                this.conversationId = null;
                logger.debug(`[CodexMCP] Cleared stale conversation ID after session change from ${source}`);
                changed = true;
            }
        }

        if (conversationLineage.conversationId && conversationLineage.conversationId !== this.conversationId) {
            this.conversationId = conversationLineage.conversationId;
            const lineageLabel = conversationLineage.source === 'thread_id'
                ? 'Conversation ID extracted from thread identifier'
                : 'Conversation ID extracted';
            logger.debug(`[CodexMCP] ${lineageLabel} from ${source}:`, this.conversationId);
            changed = true;
        }

        return changed;
    }

    private extractIdentifiers(response: any): void {
        let changed = false;
        changed = this.updateIdentifiersFromCandidate(response, 'response') || changed;

        if (Array.isArray(response?.content)) {
            for (const item of response.content) {
                changed = this.updateIdentifiersFromCandidate(item, 'response_content') || changed;
            }
        }

        if (changed) {
            this.publishIdentifierUpdate();
        }
    }

    private logLineageState(operation: 'startSession' | 'continueSession'): void {
        if (!this.sessionId) {
            return;
        }

        if (!this.conversationId) {
            logger.warn('[CodexMCP] Response did not include conversation/thread lineage', {
                operation,
                sessionId: summarizeIdentifier(this.sessionId),
            });
            return;
        }

        logger.debug('[CodexMCP] Response lineage state', {
            operation,
            sessionId: summarizeIdentifier(this.sessionId),
            conversationId: summarizeIdentifier(this.conversationId),
            distinctConversationId: this.conversationId !== this.sessionId,
        });
    }

    getSessionId(): string | null {
        return this.sessionId;
    }

    getConversationId(): string | null {
        return this.conversationId;
    }

    hasActiveSession(): boolean {
        return this.sessionId !== null;
    }

    clearSession(): void {
        // Store the previous session ID before clearing for potential resume
        const previousSessionId = this.sessionId;
        this.sessionId = null;
        this.conversationId = null;
        logger.debug('[CodexMCP] Session cleared, previous sessionId:', previousSessionId);
        this.publishIdentifierUpdate();
    }

    /**
     * Store the current session ID without clearing it, useful for abort handling
     */
    storeSessionForResume(): string | null {
        logger.debug('[CodexMCP] Storing session for potential resume:', this.sessionId);
        return this.sessionId;
    }

    /**
     * Force close the Codex MCP transport and clear all session identifiers.
     * Use this for permanent shutdown (e.g. kill/exit). Prefer `disconnect()` for
     * transient connection resets where you may want to keep the session id.
     */
    async forceCloseSession(): Promise<void> {
        logger.debug('[CodexMCP] Force closing session');
        try {
            await this.disconnect();
        } finally {
            this.clearSession();
        }
        logger.debug('[CodexMCP] Session force-closed');
    }

    async disconnect(): Promise<void> {
        if (!this.connected) return;

        // Capture pid in case we need to force-kill
        const pid = this.transport?.pid ?? null;
        logger.debug(`[CodexMCP] Disconnecting; child pid=${pid ?? 'none'}`);

        try {
            // Ask client to close the transport
            logger.debug('[CodexMCP] client.close begin');
            await this.client.close();
            logger.debug('[CodexMCP] client.close done');
        } catch (e) {
            logger.debug('[CodexMCP] Error closing client, attempting transport close directly', e);
            try { 
                logger.debug('[CodexMCP] transport.close begin');
                await this.transport?.close?.(); 
                logger.debug('[CodexMCP] transport.close done');
            } catch {}
        }

        // As a last resort, if child still exists, send SIGKILL
        if (pid) {
            try {
                process.kill(pid, 0); // check if alive
                logger.debug('[CodexMCP] Child still alive, sending SIGKILL');
                try { process.kill(pid, 'SIGKILL'); } catch {}
            } catch { /* not running */ }
        }

        this.transport = null;
        this.connected = false;
        if (this.sandboxCleanup) {
            try {
                await this.sandboxCleanup();
            } catch (error) {
                logger.warn('[CodexMCP] Failed to reset sandbox during disconnect.', error);
            } finally {
                this.sandboxCleanup = null;
            }
        }
        this.sandboxEnabled = false;
        // Preserve session/conversation identifiers for potential reconnection / recovery flows.
        logger.debug(`[CodexMCP] Disconnected; session ${this.sessionId ?? 'none'} preserved`);
    }

    private publishIdentifierUpdate(): void {
        logger.debug('[CodexMCP] Identifier state updated', {
            sessionId: summarizeIdentifier(this.sessionId),
            conversationId: summarizeIdentifier(this.conversationId),
        });
        this.identifierUpdateHandler?.({
            sessionId: this.sessionId,
            conversationId: this.conversationId,
        });
    }
}
