import type { Machine } from '@/sync/storageTypes';

export function isMachineOnline(machine: Machine): boolean {
    // Use the active flag directly, no timeout checks
    return machine.active;
}

const MACHINE_COLOR_PALETTE = ['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#E74C3C'];

/**
 * Returns a stable color for a machine based on its registration order.
 * The first-registered machine returns undefined (no border).
 * Only returns a color when 2+ machines are registered.
 */
export function getMachineColor(machineId: string | undefined, machines: Record<string, Machine>): string | undefined {
    if (!machineId) return undefined;
    if (Object.keys(machines).length < 2) return undefined;

    const sortedIds = Object.values(machines)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(m => m.id);

    const index = sortedIds.indexOf(machineId);
    if (index <= 0) return undefined;

    return MACHINE_COLOR_PALETTE[(index - 1) % MACHINE_COLOR_PALETTE.length];
}