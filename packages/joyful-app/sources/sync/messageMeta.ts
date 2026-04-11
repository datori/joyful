import type { Session } from './storageTypes';
import type { PermissionModeKey } from '@/components/PermissionModeSelector';

function isSandboxEnabled(metadata: Session['metadata'] | null | undefined): boolean {
    const sandbox = metadata?.sandbox;
    return !!sandbox && typeof sandbox === 'object' && (sandbox as { enabled?: unknown }).enabled === true;
}

function resolveNonDefaultKey(...candidates: Array<string | null | undefined>): string | null {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.length > 0 && candidate !== 'default') {
            return candidate;
        }
    }

    return null;
}

export function resolveMessageModeMeta(
    session: Pick<Session, 'permissionMode' | 'modelMode' | 'effortLevel' | 'metadata'>,
): { permissionMode: PermissionModeKey; model: string | null; effortLevel: string | null } {
    const sandboxEnabled = isSandboxEnabled(session.metadata);
    const permissionMode = resolveNonDefaultKey(
        session.permissionMode,
        session.metadata?.currentOperatingModeCode,
    );
    const model = resolveNonDefaultKey(
        session.modelMode,
        session.metadata?.currentModelCode,
    );
    const effortLevel = resolveNonDefaultKey(
        session.effortLevel,
        session.metadata?.currentThoughtLevelCode,
    );

    return {
        permissionMode: (permissionMode ?? (sandboxEnabled ? 'bypassPermissions' : 'default')) as PermissionModeKey,
        model,
        effortLevel,
    };
}
