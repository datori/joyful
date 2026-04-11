import { describe, expect, it, vi } from 'vitest';
import {
    emitReadyIfIdle,
    getIdleTranscriptResumeThresholdMs,
    getCodexResumeIdentifiersFromEnv,
    isAbortLikeError,
    isRecoverableCodexSessionError,
    mergeCodexSessionConfigIntoMetadata,
    resolveResumeSelectionForNextTurn,
    shouldStartCodexSessionForTurn,
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

describe('getIdleTranscriptResumeThresholdMs', () => {
    it('disables idle transcript replay by default', () => {
        expect(getIdleTranscriptResumeThresholdMs({})).toBeNull();
    });

    it('returns a positive configured threshold when explicitly enabled', () => {
        expect(getIdleTranscriptResumeThresholdMs({
            JOYFUL_CODEX_IDLE_TRANSCRIPT_RESUME_MS: '600000',
        })).toBe(600000);
    });

    it('treats zero or invalid values as disabled', () => {
        expect(getIdleTranscriptResumeThresholdMs({
            JOYFUL_CODEX_IDLE_TRANSCRIPT_RESUME_MS: '0',
        })).toBeNull();
        expect(getIdleTranscriptResumeThresholdMs({
            JOYFUL_CODEX_IDLE_TRANSCRIPT_RESUME_MS: 'abc',
        })).toBeNull();
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

describe('resolveResumeSelectionForNextTurn', () => {
    it('prefers a queued resume file over abort recovery', () => {
        const result = resolveResumeSelectionForNextTurn({
            queuedResumeFile: '/tmp/queued.jsonl',
            storedSessionIdForResume: 'session-1',
            findResumeFile: vi.fn(() => '/tmp/abort.jsonl'),
        });

        expect(result).toEqual({
            resumeFile: '/tmp/queued.jsonl',
            source: 'queued_resume',
            remainingQueuedResumeFile: null,
            remainingStoredSessionIdForResume: 'session-1',
        });
    });

    it('uses the aborted-session transcript when available', () => {
        const findResumeFile = vi.fn(() => '/tmp/abort.jsonl');

        const result = resolveResumeSelectionForNextTurn({
            queuedResumeFile: null,
            storedSessionIdForResume: 'session-2',
            idleResumeFile: '/tmp/idle.jsonl',
            findResumeFile,
        });

        expect(findResumeFile).toHaveBeenCalledWith('session-2');
        expect(result).toEqual({
            resumeFile: '/tmp/abort.jsonl',
            source: 'aborted_session',
            remainingQueuedResumeFile: null,
            remainingStoredSessionIdForResume: null,
        });
    });

    it('keeps the stored abort session id when the transcript is not visible yet', () => {
        const findResumeFile = vi.fn(() => null);

        const result = resolveResumeSelectionForNextTurn({
            queuedResumeFile: null,
            storedSessionIdForResume: 'session-3',
            idleResumeFile: null,
            findResumeFile,
        });

        expect(findResumeFile).toHaveBeenCalledWith('session-3');
        expect(result).toEqual({
            resumeFile: null,
            source: null,
            remainingQueuedResumeFile: null,
            remainingStoredSessionIdForResume: 'session-3',
        });
    });

    it('falls back to an idle-time transcript refresh when the live session has gone stale', () => {
        const findResumeFile = vi.fn(() => null);

        const result = resolveResumeSelectionForNextTurn({
            queuedResumeFile: null,
            storedSessionIdForResume: null,
            idleResumeFile: '/tmp/idle.jsonl',
            findResumeFile,
        });

        expect(findResumeFile).not.toHaveBeenCalled();
        expect(result).toEqual({
            resumeFile: '/tmp/idle.jsonl',
            source: 'idle_timeout',
            remainingQueuedResumeFile: null,
            remainingStoredSessionIdForResume: null,
        });
    });
});

describe('shouldStartCodexSessionForTurn', () => {
    it('starts a new session when none exists yet', () => {
        expect(shouldStartCodexSessionForTurn({
            wasCreated: false,
            resumeFile: null,
        })).toBe(true);
    });

    it('starts a fresh session when a transcript resume was selected after abort', () => {
        expect(shouldStartCodexSessionForTurn({
            wasCreated: true,
            resumeFile: '/tmp/abort.jsonl',
        })).toBe(true);
    });

    it('continues the live session when no resume file is queued', () => {
        expect(shouldStartCodexSessionForTurn({
            wasCreated: true,
            resumeFile: null,
        })).toBe(false);
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
