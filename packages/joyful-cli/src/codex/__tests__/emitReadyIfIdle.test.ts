import { describe, expect, it, vi } from 'vitest';
import {
    emitReadyIfIdle,
    getCodexResumeIdentifiersFromEnv,
    isAbortLikeError,
    isRecoverableCodexSessionError,
    mergeCodexSessionConfigIntoMetadata,
} from '../runCodex.helpers';

describe('emitReadyIfIdle', () => {
    it('emits ready and notification when queue is idle', () => {
        const sendReady = vi.fn();
        const notify = vi.fn();

        const emitted = emitReadyIfIdle({
            pending: null,
            queueSize: () => 0,
            shouldExit: false,
            sendReady,
            notify,
        });

        expect(emitted).toBe(true);
        expect(sendReady).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledTimes(1);
    });

    it('skips when a message is still pending', () => {
        const sendReady = vi.fn();

        const emitted = emitReadyIfIdle({
            pending: {},
            queueSize: () => 0,
            shouldExit: false,
            sendReady,
        });

        expect(emitted).toBe(false);
        expect(sendReady).not.toHaveBeenCalled();
    });

    it('skips when queue still has items', () => {
        const sendReady = vi.fn();

        const emitted = emitReadyIfIdle({
            pending: null,
            queueSize: () => 2,
            shouldExit: false,
            sendReady,
        });

        expect(emitted).toBe(false);
        expect(sendReady).not.toHaveBeenCalled();
    });

    it('skips when shutdown is requested', () => {
        const sendReady = vi.fn();

        const emitted = emitReadyIfIdle({
            pending: null,
            queueSize: () => 0,
            shouldExit: true,
            sendReady,
        });

        expect(emitted).toBe(false);
        expect(sendReady).not.toHaveBeenCalled();
    });
});

describe('isAbortLikeError', () => {
    it('treats an aborted request signal as a user abort even when the thrown error is generic', () => {
        const controller = new AbortController();
        controller.abort();

        expect(isAbortLikeError(new Error('transport closed'), controller.signal)).toBe(true);
    });

    it('detects abort-like error text when the signal is unavailable', () => {
        expect(isAbortLikeError(new Error('Request interrupted by user'))).toBe(true);
        expect(isAbortLikeError('Operation canceled')).toBe(true);
    });

    it('does not treat normal process errors as aborts', () => {
        expect(isAbortLikeError(new Error('Process exited unexpectedly'))).toBe(false);
    });
});

describe('isRecoverableCodexSessionError', () => {
    it('retries when the active Codex session disappeared', () => {
        expect(isRecoverableCodexSessionError(new Error('No active session. Call startSession first.'))).toBe(true);
        expect(isRecoverableCodexSessionError(new Error('transport closed: socket hang up'))).toBe(true);
    });

    it('does not retry on ordinary model or application errors', () => {
        expect(isRecoverableCodexSessionError(new Error('Model not found'))).toBe(false);
        expect(isRecoverableCodexSessionError(new Error('Permission denied'))).toBe(false);
    });
});

describe('getCodexResumeIdentifiersFromEnv', () => {
    it('reads Codex resume identifiers when the daemon seeded them', () => {
        expect(getCodexResumeIdentifiersFromEnv({
            JOYFUL_CODEX_RESUME_SESSION_ID: 'session-123',
            JOYFUL_CODEX_RESUME_CONVERSATION_ID: 'conversation-456',
        })).toEqual({
            sessionId: 'session-123',
            conversationId: 'conversation-456',
        });
    });

    it('normalizes blank env vars to null', () => {
        expect(getCodexResumeIdentifiersFromEnv({
            JOYFUL_CODEX_RESUME_SESSION_ID: '   ',
            JOYFUL_CODEX_RESUME_CONVERSATION_ID: undefined,
        })).toEqual({
            sessionId: null,
            conversationId: null,
        });
    });
});

describe('mergeCodexSessionConfigIntoMetadata', () => {
    it('publishes codex config options and current explicit selections', () => {
        const next = mergeCodexSessionConfigIntoMetadata({
            path: '/tmp/project',
            host: 'machine',
            homeDir: '/home/test',
            joyfulHomeDir: '/home/test/.joyful',
            joyfulLibDir: '/home/test/.joyful/lib',
            joyfulToolsDir: '/home/test/.joyful/tools',
            flavor: 'codex',
        }, {
            permissionMode: 'safe-yolo',
            model: 'gpt-5.4-mini',
            effortLevel: 'high',
        });

        expect(next.operatingModes?.map((option) => option.code)).toEqual(['read-only', 'safe-yolo', 'yolo']);
        expect(next.models?.map((option) => option.code)).toEqual(['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex', 'gpt-5.2-codex']);
        expect(next.thoughtLevels?.map((option) => option.code)).toEqual(['low', 'medium', 'high']);
        expect(next.currentOperatingModeCode).toBe('safe-yolo');
        expect(next.currentModelCode).toBe('gpt-5.4-mini');
        expect(next.currentThoughtLevelCode).toBe('high');
    });

    it('clears stale current selections when Codex falls back to defaults', () => {
        const next = mergeCodexSessionConfigIntoMetadata({
            path: '/tmp/project',
            host: 'machine',
            homeDir: '/home/test',
            joyfulHomeDir: '/home/test/.joyful',
            joyfulLibDir: '/home/test/.joyful/lib',
            joyfulToolsDir: '/home/test/.joyful/tools',
            flavor: 'codex',
            currentOperatingModeCode: 'yolo',
            currentModelCode: 'gpt-5.4',
            currentThoughtLevelCode: 'medium',
        }, {
            permissionMode: 'default',
            model: undefined,
            effortLevel: undefined,
        });

        expect(next.currentOperatingModeCode).toBeUndefined();
        expect(next.currentModelCode).toBeUndefined();
        expect(next.currentThoughtLevelCode).toBeUndefined();
    });
});
