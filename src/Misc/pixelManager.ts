// ─────────────────────────────────────────────────────────────────────────────
// pixelManager.ts
//
// Automatically generates Pixels when the CPU bucket is full (10000).
// Pixels can be sold on the market for credits via rooms.market.ts.
//
// Configuration (all in Memory.pixelManager):
//   enabled — master on/off switch (default: true)
//   keepAmount — minimum pixels to keep before selling (default: 500)
//   tradingEnabled — enable/disable pixel trading (default: true)
//
// Console commands:
//   global.pixelManager.enable()
//   global.pixelManager.disable()
//   global.pixelManager.enableTrading()
//   global.pixelManager.disableTrading()
//   global.pixelManager.setKeepAmount(amount)
//   global.pixelManager.status()
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
    enabled: true,
    keepAmount: 500,
    tradingEnabled: false,
} as const;

function getConfig(): typeof DEFAULTS & Record<string, any> {
    if (!Memory.pixelManager) Memory.pixelManager = DEFAULTS;
    return Object.assign({}, DEFAULTS, Memory.pixelManager);
}

function pixelManager(): void {
    const cfg = getConfig();
    if (!cfg.enabled) return;

    // Only check every 10 ticks to save CPU
    if (Game.time % 10 !== 0) return;

    const bucket = Game.cpu.bucket;

    // Generate a pixel when bucket is full (10000)
    if (bucket >= 10000) {
        const result = Game.cpu.generatePixel();
        if (result === OK) {
            const owned = Game.resources[PIXEL] ?? 0;
            console.log(`[PixelManager] Generated pixel. Total pixels: ${owned}`);
        }
    }
}

export default pixelManager;

// ── Console commands ─────────────────────────────────────────────────────────

global.pixelManager = {
    enable(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), enabled: true };
        return "PixelManager enabled.";
    },
    disable(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), enabled: false };
        return "PixelManager disabled.";
    },
    status(): string {
        const cfg = getConfig();
        const owned = Game.resources[PIXEL] ?? 0;
        return [
            `=== PixelManager Status ===`,
            `Enabled:           ${cfg.enabled}`,
            `Trading Enabled:   ${cfg.tradingEnabled}`,
            `Keep Amount:       ${cfg.keepAmount}`,
            `Current bucket:    ${Game.cpu.bucket}`,
            `Owned pixels:      ${owned}`,
        ].join("\n");
    },
    enableTrading(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), tradingEnabled: true };
        return "Pixel trading enabled.";
    },
    disableTrading(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), tradingEnabled: false };
        return "Pixel trading disabled.";
    },
    setKeepAmount(amount: number): string {
        if (amount < 0) return "Amount must be >= 0.";
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), keepAmount: amount };
        return `Keep amount set to ${amount} pixels.`;
    },
};
