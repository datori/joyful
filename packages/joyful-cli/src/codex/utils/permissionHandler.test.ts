import { describe, expect, it, vi } from 'vitest';
import { CodexPermissionHandler } from './permissionHandler';

function createFakeSession() {
    let rpcHandler: ((response: any) => Promise<void>) | null = null;
    let agentState: Record<string, any> = {};

    return {
        session: {
            rpcHandlerManager: {
                registerHandler: vi.fn((_method: string, handler: (response: any) => Promise<void>) => {
                    rpcHandler = handler;
                }),
            },
            updateAgentState: vi.fn((updater: (currentState: Record<string, any>) => Record<string, any>) => {
                agentState = updater(agentState);
            }),
        },
        getRpcHandler: () => rpcHandler,
        getAgentState: () => agentState,
    };
}

describe('CodexPermissionHandler', () => {
    it('auto-approves matching commands after an approved_for_session response', async () => {
        const fake = createFakeSession();
        const handler = new CodexPermissionHandler(fake.session as any);

        const pending = handler.handleToolCall('call-1', 'CodexBash', {
            command: ['ls', '-la'],
            cwd: '/tmp/project',
        });

        const rpcHandler = fake.getRpcHandler();
        expect(rpcHandler).toBeTypeOf('function');
        await rpcHandler?.({
            id: 'call-1',
            approved: true,
            decision: 'approved_for_session',
        });

        await expect(pending).resolves.toEqual({ decision: 'approved_for_session' });

        await expect(handler.handleToolCall('call-2', 'CodexBash', {
            command: ['ls', '-la'],
            cwd: '/tmp/project',
        })).resolves.toEqual({ decision: 'approved_for_session' });
    });

    it('clears cached session approvals when requested', async () => {
        const fake = createFakeSession();
        const handler = new CodexPermissionHandler(fake.session as any);

        const pending = handler.handleToolCall('call-1', 'CodexBash', {
            command: ['pwd'],
            cwd: '/tmp/project',
        });

        await fake.getRpcHandler()?.({
            id: 'call-1',
            approved: true,
            decision: 'approved_for_session',
        });
        await pending;

        handler.clearSessionApprovals();

        const next = handler.handleToolCall('call-2', 'CodexBash', {
            command: ['pwd'],
            cwd: '/tmp/project',
        });

        expect(fake.getAgentState().requests['call-2']).toMatchObject({
            tool: 'CodexBash',
            arguments: {
                command: ['pwd'],
                cwd: '/tmp/project',
            },
        });

        await fake.getRpcHandler()?.({
            id: 'call-2',
            approved: true,
            decision: 'approved',
        });
        await expect(next).resolves.toEqual({ decision: 'approved' });
    });
});
