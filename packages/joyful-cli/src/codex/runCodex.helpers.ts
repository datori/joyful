type ReadyEventOptions = {
    pending: unknown;
    queueSize: () => number;
    shouldExit: boolean;
    sendReady: () => void;
    notify?: () => void;
};

type ResumeSelectionOptions = {
    queuedResumeFile: string | null;
    storedSessionIdForResume: string | null;
    idleResumeFile?: string | null;
    findResumeFile: (sessionId: string) => string | null;
};

type ResumeSelectionResult = {
    resumeFile: string | null;
    source: 'queued_resume' | 'aborted_session' | 'idle_timeout' | null;
    remainingQueuedResumeFile: string | null;
    remainingStoredSessionIdForResume: string | null;
};

type CodexResumeIdentifiers = {
    sessionId: string | null;
    conversationId: string | null;
};

const CODEX_OPERATING_MODE_OPTIONS = [
    { code: 'read-only', value: 'Read Only', description: 'Never ask, read-only access' },
    { code: 'safe-yolo', value: 'Safe YOLO', description: 'Ask before running commands' },
    { code: 'yolo', value: 'YOLO', description: 'Never ask, run everything' },
] as const;

const CODEX_MODEL_OPTIONS = [
    { code: 'gpt-5.4', value: 'GPT 5.4', description: 'Most capable' },
    { code: 'gpt-5.4-mini', value: 'GPT 5.4 Mini', description: 'Fast and efficient' },
    { code: 'gpt-5.3-codex', value: 'GPT 5.3 Codex', description: 'Optimized for code' },
    { code: 'gpt-5.2-codex', value: 'GPT 5.2 Codex', description: 'Fast code generation' },
] as const;

const CODEX_THOUGHT_LEVEL_OPTIONS = [
    { code: 'low', value: 'Low', description: 'Fastest, minimal reasoning' },
    { code: 'medium', value: 'Medium', description: 'Balanced reasoning' },
    { code: 'high', value: 'High', description: 'More thorough reasoning' },
] as const;

const VALID_CODEX_OPERATING_MODES = new Set<string>(CODEX_OPERATING_MODE_OPTIONS.map((option) => option.code));

export function getIdleTranscriptResumeThresholdMs(
    env: Record<string, string | undefined> = process.env,
): number | null {
    const raw = env.JOYFUL_CODEX_IDLE_TRANSCRIPT_RESUME_MS?.trim();
    if (!raw) {
        return null;
    }

    const configured = Number.parseInt(raw, 10);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }

    return null;
}

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

export function getCodexResumeIdentifiersFromEnv(
    env: Record<string, string | undefined> = process.env,
): CodexResumeIdentifiers {
    return {
        sessionId: env.JOYFUL_CODEX_RESUME_SESSION_ID?.trim() || null,
        conversationId: env.JOYFUL_CODEX_RESUME_CONVERSATION_ID?.trim() || null,
    };
}

export function mergeCodexSessionConfigIntoMetadata(
    metadata: import('@/api/types').Metadata,
    state: {
        permissionMode?: import('@/api/types').PermissionMode;
        model?: string;
        effortLevel?: string;
    },
): import('@/api/types').Metadata {
    const next: import('@/api/types').Metadata = {
        ...metadata,
        models: [...CODEX_MODEL_OPTIONS],
        operatingModes: [...CODEX_OPERATING_MODE_OPTIONS],
        thoughtLevels: [...CODEX_THOUGHT_LEVEL_OPTIONS],
    };

    if (state.model) {
        next.currentModelCode = state.model;
    } else {
        delete next.currentModelCode;
    }

    if (state.effortLevel && state.effortLevel !== 'default') {
        next.currentThoughtLevelCode = state.effortLevel;
    } else {
        delete next.currentThoughtLevelCode;
    }

    if (state.permissionMode && VALID_CODEX_OPERATING_MODES.has(state.permissionMode)) {
        next.currentOperatingModeCode = state.permissionMode;
    } else {
        delete next.currentOperatingModeCode;
    }

    return next;
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
