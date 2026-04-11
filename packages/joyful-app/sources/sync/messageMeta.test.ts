import { describe, expect, it } from 'vitest';
import { resolveMessageModeMeta } from './messageMeta';

describe('resolveMessageModeMeta', () => {
    it('sends explicit permission and model keys', () => {
        const meta = resolveMessageModeMeta({
            permissionMode: 'read-only',
            modelMode: 'gpt-5-high',
            effortLevel: 'high',
            metadata: null,
        } as any);

        expect(meta).toEqual({
            permissionMode: 'read-only',
            model: 'gpt-5-high',
            effortLevel: 'high',
        });
    });

    it('forces bypass permissions in sandbox when mode is default', () => {
        const meta = resolveMessageModeMeta({
            permissionMode: 'default',
            modelMode: null,
            metadata: {
                sandbox: { enabled: true },
            },
        } as any);

        expect(meta).toEqual({
            permissionMode: 'bypassPermissions',
            model: null,
            effortLevel: null,
        });
    });

    it('keeps default permissions when sandbox is disabled', () => {
        const meta = resolveMessageModeMeta({
            permissionMode: null,
            modelMode: 'default',
            metadata: {
                sandbox: null,
            },
        } as any);

        expect(meta).toEqual({
            permissionMode: 'default',
            model: null,
            effortLevel: null,
        });
    });

    it('falls back to metadata when synced session mode fields are missing', () => {
        const meta = resolveMessageModeMeta({
            permissionMode: null,
            modelMode: null,
            effortLevel: null,
            metadata: {
                currentOperatingModeCode: 'safe-yolo',
                currentModelCode: 'gpt-5.4-mini',
                currentThoughtLevelCode: 'medium',
                sandbox: null,
            },
        } as any);

        expect(meta).toEqual({
            permissionMode: 'safe-yolo',
            model: 'gpt-5.4-mini',
            effortLevel: 'medium',
        });
    });

    it('prefers explicit session fields over metadata fallbacks', () => {
        const meta = resolveMessageModeMeta({
            permissionMode: 'yolo',
            modelMode: 'gpt-5.4',
            effortLevel: 'high',
            metadata: {
                currentOperatingModeCode: 'safe-yolo',
                currentModelCode: 'gpt-5.4-mini',
                currentThoughtLevelCode: 'medium',
                sandbox: null,
            },
        } as any);

        expect(meta).toEqual({
            permissionMode: 'yolo',
            model: 'gpt-5.4',
            effortLevel: 'high',
        });
    });
});
