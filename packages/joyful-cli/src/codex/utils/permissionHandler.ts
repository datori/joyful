/**
 * Codex Permission Handler
 *
 * Handles tool permission requests and responses for Codex sessions.
 * Extends BasePermissionHandler with Codex-specific configuration.
 */

import { logger } from "@/ui/logger";
import { ApiSessionClient } from "@/api/apiSession";
import {
    BasePermissionHandler,
    PermissionResponse,
    PermissionResult,
    PendingRequest
} from '@/utils/BasePermissionHandler';

// Re-export types for backwards compatibility
export type { PermissionResult, PendingRequest };

type SessionApproval = {
    toolName: string;
    command: string | null;
    cwd: string | null;
};

function normalizeCommand(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (Array.isArray(value)) {
        const joined = value.map((part) => String(part)).join(' ').trim();
        return joined.length > 0 ? joined : null;
    }
    return null;
}

function normalizeCwd(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * Codex-specific permission handler.
 */
export class CodexPermissionHandler extends BasePermissionHandler {
    private sessionApprovals = new Map<string, SessionApproval>();

    constructor(session: ApiSessionClient) {
        super(session);
    }

    protected getLogPrefix(): string {
        return '[Codex]';
    }

    /**
     * Handle a tool permission request
     * @param toolCallId - The unique ID of the tool call
     * @param toolName - The name of the tool being called
     * @param input - The input parameters for the tool
     * @returns Promise resolving to permission result
     */
    async handleToolCall(
        toolCallId: string,
        toolName: string,
        input: unknown
    ): Promise<PermissionResult> {
        const existingApproval = this.findSessionApproval(toolName, input);
        if (existingApproval) {
            logger.debug(`${this.getLogPrefix()} Auto-approving cached session permission for ${toolName} (${toolCallId})`);
            return { decision: 'approved_for_session' };
        }

        return new Promise<PermissionResult>((resolve, reject) => {
            // Store the pending request
            this.pendingRequests.set(toolCallId, {
                resolve,
                reject,
                toolName,
                input
            });

            // Update agent state with pending request
            this.addPendingRequestToState(toolCallId, toolName, input);

            logger.debug(`${this.getLogPrefix()} Permission request sent for tool: ${toolName} (${toolCallId})`);
        });
    }

    clearSessionApprovals(): void {
        this.sessionApprovals.clear();
    }

    protected onPermissionResolved(
        _response: PermissionResponse,
        pending: PendingRequest,
        result: PermissionResult,
    ): void {
        if (result.decision !== 'approved_for_session') {
            return;
        }

        const approval = this.createSessionApproval(pending.toolName, pending.input);
        const key = this.getApprovalKey(approval);
        this.sessionApprovals.set(key, approval);
        logger.debug(`${this.getLogPrefix()} Stored session approval for ${pending.toolName}`);
    }

    private findSessionApproval(toolName: string, input: unknown): SessionApproval | null {
        const approval = this.createSessionApproval(toolName, input);
        const key = this.getApprovalKey(approval);
        return this.sessionApprovals.get(key) ?? null;
    }

    private createSessionApproval(toolName: string, input: unknown): SessionApproval {
        const payload = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
        return {
            toolName,
            command: normalizeCommand(payload.command),
            cwd: normalizeCwd(payload.cwd),
        };
    }

    private getApprovalKey(approval: SessionApproval): string {
        return JSON.stringify([
            approval.toolName,
            approval.command,
            approval.cwd,
        ]);
    }
}
