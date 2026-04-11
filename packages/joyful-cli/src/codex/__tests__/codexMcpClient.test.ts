import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SandboxConfig } from '@/persistence';
import { CodexMcpClient } from '../codexMcpClient';

const {
    mockExecSync,
    mockInitializeSandbox,
    mockWrapForMcpTransport,
    mockSandboxCleanup,
    mockClientConnect,
    mockClientClose,
    mockClientCallTool,
    mockSetNotificationHandler,
    mockStdioCtor,
} = vi.hoisted(() => ({
    mockExecSync: vi.fn(),
    mockInitializeSandbox: vi.fn(),
    mockWrapForMcpTransport: vi.fn(),
    mockSandboxCleanup: vi.fn(),
    mockClientConnect: vi.fn(),
    mockClientClose: vi.fn(),
    mockClientCallTool: vi.fn(),
    mockSetNotificationHandler: vi.fn(),
    mockStdioCtor: vi.fn(),
}));

vi.mock('child_process', () => ({
    execSync: mockExecSync,
}));

vi.mock('@/sandbox/manager', () => ({
    initializeSandbox: mockInitializeSandbox,
    wrapForMcpTransport: mockWrapForMcpTransport,
}));

vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: class MockClient {
        setNotificationHandler = mockSetNotificationHandler;
        setRequestHandler = vi.fn();
        connect = mockClientConnect;
        close = mockClientClose;
        callTool = mockClientCallTool;
        constructor() {}
    },
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: class MockTransport {
        pid = 12345;
        close = vi.fn();
        constructor(opts: any) {
            mockStdioCtor(opts);
        }
    },
}));

const sandboxConfig: SandboxConfig = {
    enabled: true,
    workspaceRoot: '~/projects',
    sessionIsolation: 'workspace',
    customWritePaths: [],
    denyReadPaths: ['~/.ssh'],
    extraWritePaths: ['/tmp'],
    denyWritePaths: ['.env'],
    networkMode: 'allowed',
    allowedDomains: [],
    deniedDomains: [],
    allowLocalBinding: true,
};

describe('CodexMcpClient sandbox integration', () => {
    const originalRustLog = process.env.RUST_LOG;
    const originalCodexThreadId = process.env.CODEX_THREAD_ID;
    const originalCodexSessionId = process.env.CODEX_SESSION_ID;
    const originalCodexConversationId = process.env.CODEX_CONVERSATION_ID;
    const originalCodexManagedByNpm = process.env.CODEX_MANAGED_BY_NPM;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RUST_LOG = originalRustLog;
        delete process.env.CODEX_THREAD_ID;
        delete process.env.CODEX_SESSION_ID;
        delete process.env.CODEX_CONVERSATION_ID;
        if (originalCodexManagedByNpm === undefined) {
            delete process.env.CODEX_MANAGED_BY_NPM;
        } else {
            process.env.CODEX_MANAGED_BY_NPM = originalCodexManagedByNpm;
        }
        mockExecSync.mockReturnValue('codex-cli 0.43.0');
        mockClientConnect.mockResolvedValue(undefined);
        mockClientClose.mockResolvedValue(undefined);
        mockClientCallTool.mockReset();
        mockInitializeSandbox.mockResolvedValue(mockSandboxCleanup);
        mockWrapForMcpTransport.mockResolvedValue({ command: 'sh', args: ['-c', 'wrapped codex mcp'] });
    });

    afterAll(() => {
        process.env.RUST_LOG = originalRustLog;
        if (originalCodexThreadId === undefined) {
            delete process.env.CODEX_THREAD_ID;
        } else {
            process.env.CODEX_THREAD_ID = originalCodexThreadId;
        }
        if (originalCodexSessionId === undefined) {
            delete process.env.CODEX_SESSION_ID;
        } else {
            process.env.CODEX_SESSION_ID = originalCodexSessionId;
        }
        if (originalCodexConversationId === undefined) {
            delete process.env.CODEX_CONVERSATION_ID;
        } else {
            process.env.CODEX_CONVERSATION_ID = originalCodexConversationId;
        }
        if (originalCodexManagedByNpm === undefined) {
            delete process.env.CODEX_MANAGED_BY_NPM;
        } else {
            process.env.CODEX_MANAGED_BY_NPM = originalCodexManagedByNpm;
        }
    });

    it('wraps MCP transport when sandbox is enabled', async () => {
        const client = new CodexMcpClient(sandboxConfig);

        await client.connect();

        expect(mockInitializeSandbox).toHaveBeenCalledWith(sandboxConfig, process.cwd());
        expect(mockWrapForMcpTransport).toHaveBeenCalledWith('codex', ['mcp-server']);
        expect(mockStdioCtor).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'sh',
                args: ['-c', 'wrapped codex mcp'],
                env: expect.objectContaining({
                    CODEX_SANDBOX: 'seatbelt',
                    RUST_LOG: expect.stringContaining('codex_core::rollout::list=off'),
                }),
            }),
        );
        expect(client.sandboxEnabled).toBe(true);
    });

    it('falls back to non-sandbox transport when sandbox initialization fails', async () => {
        mockInitializeSandbox.mockRejectedValue(new Error('sandbox init failed'));
        const client = new CodexMcpClient(sandboxConfig);

        await client.connect();

        expect(mockWrapForMcpTransport).not.toHaveBeenCalled();
        expect(mockStdioCtor).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'codex',
                args: ['mcp-server'],
                env: expect.objectContaining({
                    RUST_LOG: expect.stringContaining('codex_core::rollout::list=off'),
                }),
            }),
        );
        expect(client.sandboxEnabled).toBe(false);
    });

    it('resets sandbox on disconnect', async () => {
        const client = new CodexMcpClient(sandboxConfig);

        await client.connect();
        await client.disconnect();

        expect(mockSandboxCleanup).toHaveBeenCalledTimes(1);
        expect(client.sandboxEnabled).toBe(false);
    });

    it('appends rollout log filter to existing RUST_LOG', async () => {
        process.env.RUST_LOG = 'info,codex_core=warn';
        const client = new CodexMcpClient(sandboxConfig);

        await client.connect();

        expect(mockStdioCtor).toHaveBeenCalledWith(
            expect.objectContaining({
                env: expect.objectContaining({
                    RUST_LOG: 'info,codex_core=warn,codex_core::rollout::list=off',
                }),
            }),
        );
    });

    it('defaults to mcp-server when version output format changes', async () => {
        mockExecSync.mockReturnValue('Codex 0.43.0');
        const client = new CodexMcpClient();

        await client.connect();

        expect(mockStdioCtor).toHaveBeenCalledWith(
            expect.objectContaining({
                command: 'codex',
                args: ['mcp-server'],
            }),
        );
    });

    it('removes inherited Codex lineage environment variables before launching Codex', async () => {
        process.env.CODEX_THREAD_ID = 'stale-thread';
        process.env.CODEX_SESSION_ID = 'stale-session';
        process.env.CODEX_CONVERSATION_ID = 'stale-conversation';
        process.env.CODEX_MANAGED_BY_NPM = '1';
        const client = new CodexMcpClient();

        await client.connect();

        expect(mockStdioCtor).toHaveBeenCalledWith(
            expect.objectContaining({
                env: expect.objectContaining({
                    CODEX_MANAGED_BY_NPM: '1',
                }),
            }),
        );

        const ctorArgs = mockStdioCtor.mock.calls[0]?.[0];
        expect(ctorArgs?.env?.CODEX_THREAD_ID).toBeUndefined();
        expect(ctorArgs?.env?.CODEX_SESSION_ID).toBeUndefined();
        expect(ctorArgs?.env?.CODEX_CONVERSATION_ID).toBeUndefined();
    });

    it('publishes identifiers extracted from startSession responses', async () => {
        const client = new CodexMcpClient();
        const identifierUpdates: Array<{ sessionId: string | null; conversationId: string | null }> = [];
        client.setIdentifierUpdateHandler((ids) => identifierUpdates.push(ids));

        mockClientCallTool.mockResolvedValue({
            meta: {
                sessionId: 'codex-session-1',
                conversationId: 'codex-convo-1',
            },
            content: [],
        });

        await client.startSession({ prompt: 'hello' });

        expect(identifierUpdates).toContainEqual({
            sessionId: 'codex-session-1',
            conversationId: 'codex-convo-1',
        });
    });

    it('treats thread identifiers from notifications as conversation lineage', () => {
        const client = new CodexMcpClient();
        const identifierUpdates: Array<{ sessionId: string | null; conversationId: string | null }> = [];
        client.setIdentifierUpdateHandler((ids) => identifierUpdates.push(ids));

        const notificationHandler = mockSetNotificationHandler.mock.calls[0]?.[1];
        expect(notificationHandler).toBeTypeOf('function');

        notificationHandler({
            params: {
                msg: {
                    type: 'session_configured',
                    session_id: 'codex-session-2',
                    thread_id: 'codex-thread-2',
                },
            },
        });

        expect(identifierUpdates).toContainEqual({
            sessionId: 'codex-session-2',
            conversationId: 'codex-thread-2',
        });
    });

    it('extracts thread identifiers from structured content when conversation ids are absent', async () => {
        const client = new CodexMcpClient();
        const identifierUpdates: Array<{ sessionId: string | null; conversationId: string | null }> = [];
        client.setIdentifierUpdateHandler((ids) => identifierUpdates.push(ids));

        mockClientCallTool.mockResolvedValue({
            meta: {
                sessionId: 'codex-session-3',
            },
            content: [
                {
                    structuredContent: {
                        threadId: 'codex-thread-3',
                    },
                },
            ],
        });

        await client.startSession({ prompt: 'hello' });

        expect(identifierUpdates).toContainEqual({
            sessionId: 'codex-session-3',
            conversationId: 'codex-thread-3',
        });
    });

    it('clears stale conversation lineage when a new session id arrives before a new thread id', () => {
        const client = new CodexMcpClient();
        const identifierUpdates: Array<{ sessionId: string | null; conversationId: string | null }> = [];
        client.setIdentifierUpdateHandler((ids) => identifierUpdates.push(ids));
        client.hydrateIdentifiers({
            sessionId: 'old-session',
            conversationId: 'old-thread',
        });

        const notificationHandler = mockSetNotificationHandler.mock.calls[0]?.[1];
        expect(notificationHandler).toBeTypeOf('function');

        notificationHandler({
            params: {
                msg: {
                    type: 'session_configured',
                    session_id: 'new-session',
                },
            },
        });

        expect(identifierUpdates).toContainEqual({
            sessionId: 'new-session',
            conversationId: null,
        });
    });

    it('hydrates persisted identifiers and uses them for continueSession', async () => {
        const client = new CodexMcpClient();
        client.hydrateIdentifiers({
            sessionId: 'persisted-session',
            conversationId: 'persisted-conversation',
        });

        mockClientCallTool.mockResolvedValue({ content: [] });

        await client.continueSession('continue here');

        expect(mockClientCallTool).toHaveBeenCalledWith(
            {
                name: 'codex-reply',
                arguments: {
                    sessionId: 'persisted-session',
                    conversationId: 'persisted-conversation',
                    prompt: 'continue here',
                },
            },
            undefined,
            expect.objectContaining({
                timeout: expect.any(Number),
            }),
        );
    });

    it('does not persist a synthetic conversation id when only session id exists', async () => {
        const client = new CodexMcpClient();
        const identifierUpdates: Array<{ sessionId: string | null; conversationId: string | null }> = [];
        client.setIdentifierUpdateHandler((ids) => identifierUpdates.push(ids));
        client.hydrateIdentifiers({
            sessionId: 'persisted-session',
            conversationId: null,
        });

        mockClientCallTool.mockResolvedValue({ content: [] });

        await client.continueSession('continue here');

        expect(mockClientCallTool).toHaveBeenCalledWith(
            {
                name: 'codex-reply',
                arguments: {
                    sessionId: 'persisted-session',
                    conversationId: 'persisted-session',
                    prompt: 'continue here',
                },
            },
            undefined,
            expect.objectContaining({
                timeout: expect.any(Number),
            }),
        );
        expect(identifierUpdates).toEqual([
            {
                sessionId: 'persisted-session',
                conversationId: null,
            },
        ]);
    });
});
