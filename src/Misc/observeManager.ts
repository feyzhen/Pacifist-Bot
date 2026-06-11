// ─────────────────────────────────────────────────────────────────────────────
// observeManager.ts
//
// Provides a global on/off switch for the room observer (scouting adjacent rooms
// for hostile creeps, SK rooms, power banks, deposits, etc.).
//
// Configuration (all in Memory.observeManager):
//   enabled      — master on/off switch (default: true)
//   enemyScout   — enemy room scouting & response (default: true)
//   mineScout    — mineral deposit scouting (default: true)
//   powerScout   — power bank scouting (default: true)
//
// Console commands:
//   global.observeManager.enable() / disable()          — master switch
//   global.observeManager.enableScout('enemy'|'mine'|'power')
//   global.observeManager.disableScout('enemy'|'mine'|'power')
//   global.observeManager.status()
// ─────────────────────────────────────────────────────────────────────────────

type ScoutKey = 'enemy' | 'mine' | 'power';

const DEFAULTS = {
    enabled: true,
    enemyScout: true,
    mineScout: true,
    powerScout: true,
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
    return !Memory.observeManager || (Memory.observeManager as any).enabled !== false;
}

/**
 * Check whether a specific scout sub-feature is enabled.
 */
export function isScoutEnabled(key: ScoutKey): boolean {
    const cfg = getConfig();
    return (cfg as any)[key + 'Scout'] !== false;
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
            `Enabled:      ${cfg.enabled}`,
            `Enemy Scout:  ${cfg.enemyScout}`,
            `Mine Scout:   ${cfg.mineScout}`,
            `Power Scout:  ${cfg.powerScout}`,
        ].join("\n");
    },
    enableScout(scout: ScoutKey): string {
        Memory.observeManager = { ...(Memory.observeManager ?? {}), [scout + 'Scout']: true };
        return `${scout} scout enabled.`;
    },
    disableScout(scout: ScoutKey): string {
        Memory.observeManager = { ...(Memory.observeManager ?? {}), [scout + 'Scout']: false };
        return `${scout} scout disabled.`;
    },
};
