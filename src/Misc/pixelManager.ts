// ─────────────────────────────────────────────────────────────────────────────
// pixelManager.ts
//
// Automatically generates Pixels when the CPU bucket is full.
// Pixels can be sold on the market for credits.
//
// Configuration (all in Memory.pixelManager):
//   enabled          — master on/off switch (default: true)
//   bucketThreshold  — minimum bucket before generating (default: 9800)
//   sellPixels       — automatically list pixels on market (default: false)
//   sellPrice        — credit price per pixel when auto-selling (default: 8000)
//   sellMinAmount    — only list when stockpile >= this amount (default: 100)
//
// Console commands:
//   global.pixelManager.enable()
//   global.pixelManager.disable()
//   global.pixelManager.status()
//   global.pixelManager.setSellPrice(8500)
//   global.pixelManager.enableSell()
//   global.pixelManager.disableSell()
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
    enabled:         true,
    bucketThreshold: 9800,
    sellPixels:      false,
    sellPrice:       8000,
    sellMinAmount:   100,
} as const;

function getConfig(): typeof DEFAULTS & Record<string, any> {
    if (!Memory.pixelManager) Memory.pixelManager = {};
    return Object.assign({}, DEFAULTS, Memory.pixelManager);
}

function pixelManager(): void {
    const cfg = getConfig();
    if (!cfg.enabled) return;

    // Only check every 10 ticks to save CPU
    if (Game.time % 10 !== 0) return;

    const bucket = Game.cpu.bucket;

    // Generate a pixel when bucket is at/above threshold
    if (bucket >= cfg.bucketThreshold) {
        const result = Game.cpu.generatePixel();
        if (result === OK) {
            const owned = Game.resources[PIXEL] ?? 0;
            console.log(`[PixelManager] Generated pixel. Total pixels: ${owned}`);
        }
    }

    // Auto-sell pixels if enabled
    if (cfg.sellPixels) {
        trySellPixels(cfg);
    }
}

function trySellPixels(cfg: ReturnType<typeof getConfig>): void {
    // Only attempt sell listing once every 500 ticks
    if (Game.time % 500 !== 0) return;

    const ownedPixels = Game.resources[PIXEL] ?? 0;
    if (ownedPixels < cfg.sellMinAmount) return;

    // Check if we already have an active sell order for pixels
    const existingOrder = Object.values(Game.market.orders).find(
        (o) => o.type === ORDER_SELL && o.resourceType === PIXEL && o.active
    );
    if (existingOrder) {
        // Update price if it has drifted
        if (existingOrder.price !== cfg.sellPrice) {
            const r = Game.market.changeOrderPrice(existingOrder.id, cfg.sellPrice);
            if (r === OK) console.log(`[PixelManager] Updated sell order price to ${cfg.sellPrice}`);
        }
        return;
    }

    // Create a new sell order
    const result = Game.market.createOrder({
        type:         ORDER_SELL,
        resourceType: PIXEL,
        price:        cfg.sellPrice,
        totalAmount:  ownedPixels,
    });

    if (result === OK) {
        console.log(`[PixelManager] Created sell order: ${ownedPixels} pixels @ ${cfg.sellPrice} credits each.`);
    } else {
        console.log(`[PixelManager] Failed to create sell order, code: ${result}`);
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
    enableSell(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), sellPixels: true };
        return "Auto-sell enabled.";
    },
    disableSell(): string {
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), sellPixels: false };
        return "Auto-sell disabled.";
    },
    setSellPrice(price: number): string {
        if (price <= 0) return "Price must be > 0.";
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), sellPrice: price };
        return `Sell price set to ${price} credits/pixel.`;
    },
    setBucketThreshold(threshold: number): string {
        if (threshold < 1 || threshold > 10000) return "Threshold must be between 1 and 10000.";
        Memory.pixelManager = { ...(Memory.pixelManager ?? {}), bucketThreshold: threshold };
        return `Bucket threshold set to ${threshold}.`;
    },
    status(): string {
        const cfg = getConfig();
        const owned = Game.resources[PIXEL] ?? 0;
        return [
            `=== PixelManager Status ===`,
            `Enabled:           ${cfg.enabled}`,
            `Bucket threshold:  ${cfg.bucketThreshold}  (current: ${Game.cpu.bucket})`,
            `Owned pixels:      ${owned}`,
            `Auto-sell:         ${cfg.sellPixels}`,
            `Sell price:        ${cfg.sellPrice} credits/pixel`,
            `Sell min amount:   ${cfg.sellMinAmount}`,
        ].join("\n");
    },
};
