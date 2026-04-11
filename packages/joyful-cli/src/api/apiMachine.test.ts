import { describe, expect, it, vi } from 'vitest';
import { ApiMachineClient } from './apiMachine';

vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn(),
    },
}));

describe('ApiMachineClient spawn-joyful-session handler', () => {
    it('forwards Codex resume identifiers to the daemon spawn callback', async () => {
        const client = new ApiMachineClient('token', {
            id: 'machine-1',
            encryptionKey: new Uint8Array([1, 2, 3]),
            encryptionVariant: 'legacy',
            metadata: {
                host: 'localhost',
                platform: 'linux',
                joyfulCliVersion: '1.0.0',
                homeDir: '/home/test-user',
                joyfulHomeDir: '/home/test-user/.joyful-dev',
                joyfulLibDir: '/home/test-user/.joyful-dev/lib',
            },
            metadataVersion: 1,
            daemonState: null,
            daemonStateVersion: 0,
        });

        const spawnSession = vi.fn().mockResolvedValue({
            type: 'success',
            sessionId: 'joyful-session-1',
        });

        client.setRPCHandlers({
            spawnSession,
            stopSession: vi.fn(() => true),
            requestShutdown: vi.fn(),
        });

        const rpcHandlerManager = (client as any).rpcHandlerManager;
        const handler = rpcHandlerManager.handlers.get('machine-1:spawn-joyful-session');

        await handler({
            directory: '/tmp/project',
            agent: 'codex',
            resumeNativeSessionId: 'claude-session-1',
            resumeCodexSessionId: 'codex-session-1',
            resumeCodexConversationId: 'codex-conversation-1',
        });

        expect(spawnSession).toHaveBeenCalledWith(expect.objectContaining({
            directory: '/tmp/project',
            agent: 'codex',
            resumeNativeSessionId: 'claude-session-1',
            resumeCodexSessionId: 'codex-session-1',
            resumeCodexConversationId: 'codex-conversation-1',
        }));
    });
});
