type ReadyEventOptions = {
    pending: unknown;
    queueSize: () => number;
    shouldExit: boolean;
    sendReady: () => void;
    notify?: () => void;
};

/**
 * Notify connected clients when Codex finishes processing and the queue is idle.
 * Returns true when a ready event was emitted.
 */
export function emitReadyIfIdle({ pending, queueSize, shouldExit, sendReady, notify }: ReadyEventOptions): boolean {
    if (shouldExit) {
        return false;
    }
    if (pending) {
        return false;
    }
    if (queueSize() > 0) {
        return false;
    }

    sendReady();
    notify?.();
    return true;
}

function getCodexErrorText(error: unknown): string {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object') {
        const candidate = error as {
            message?: unknown;
            details?: unknown;
            code?: unknown;
            data?: { details?: unknown };
        };
        return [
            typeof candidate.message === 'string' ? candidate.message : null,
            typeof candidate.details === 'string' ? candidate.details : null,
            typeof candidate.data?.details === 'string' ? candidate.data.details : null,
            candidate.code != null ? String(candidate.code) : null,
        ].filter((part): part is string => !!part).join(' | ');
    }

    return String(error);
}

export function isAbortLikeError(error: unknown, requestSignal?: AbortSignal): boolean {
    if (requestSignal?.aborted) {
        return true;
    }

    if (error instanceof Error && error.name === 'AbortError') {
        return true;
    }

    const errorText = getCodexErrorText(error).toLowerCase();
    return (
        errorText.includes('abort') ||
        errorText.includes('interrupted') ||
        errorText.includes('cancelled') ||
        errorText.includes('canceled')
    );
}

export function isRecoverableCodexSessionError(error: unknown): boolean {
    const errorText = getCodexErrorText(error).toLowerCase();
    return [
        'no active session',
        'session not found',
        'conversation not found',
        'transport closed',
        'connection closed',
        'socket hang up',
        'broken pipe',
        'econnreset',
        'epipe',
    ].some((fragment) => errorText.includes(fragment));
}
