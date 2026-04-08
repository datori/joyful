import { describe, expect, it, vi } from 'vitest';
import { emitReadyIfIdle, isAbortLikeError, isRecoverableCodexSessionError } from '../runCodex.helpers';

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
