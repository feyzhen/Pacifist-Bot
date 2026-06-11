// ─────────────────────────────────────────────────────────────────────────────
// observeManager.ts
//
// Provides a global on/off switch for the room observer (scouting adjacent rooms
// for hostile creeps, SK rooms, power banks, deposits, etc.).
//
// Configuration (all in Memory.observeManager):
//   enabled — master on/off switch (default: true)
//
// Console commands:
//   global.observeManager.enable()
//   global.observeManager.disable()
//   global.observeManager.status()
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
    enabled: true,
} as const;

function getConfig(): typeof DEFAULTS & Record<string, any> {
    if (!Memory.observeManager) Memory.observeManager = DEFAULTS;
    return Object.assign({}, DEFAULTS, Memory.observeManager);
}

/**
 * Check whether the observer is currently enabled.
 * Returns true when Memory.observeManager is unset (default) or enabled is true.
 */
export function isObserveEnabled(): boolean {
    return !Memory.observeManager || Memory.observeManager.enabled !== false;
}

// ── Console commands ─────────────────────────────────────────────────────────

global.observeManager = {
    enable(): string {
        Memory.observeManager = { ...(Memory.observeManager ?? {}), enabled: true };
        return "Observe manager enabled.";
    },
    disable(): string {
        Memory.observeManager = { ...(Memory.observeManager ?? {}), enabled: false };
        return "Observe manager disabled.";
    },
    status(): string {
        const cfg = getConfig();
        return [
            `=== Observe Manager Status ===`,
            `Enabled:  ${cfg.enabled}`,
        ].join("\n");
    },
};
