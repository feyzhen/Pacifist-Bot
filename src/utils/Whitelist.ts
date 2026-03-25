// ─────────────────────────────────────────────────────────────────────────────
// Whitelist.ts
//
// Central ally / whitelist system.
//
// Usage:
//   import { isAlly, ALLIES } from "../utils/Whitelist";
//
//   if (isAlly(creep.owner.username)) { /* skip */ }
//
// To add or remove allies at runtime use the console commands:
//   global.addAlly("PlayerName")
//   global.removeAlly("PlayerName")
//   global.listAllies()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hard-coded ally list.
 * Add trusted player names here — these players' creeps and structures
 * will be ignored by defence, tower attack, and flee logic.
 */
export const ALLIES: ReadonlyArray<string> = [
    // "AllyPlayerName1",
    // "AllyPlayerName2",
];

/**
 * Returns true if `username` is a known ally.
 * Also checks Memory.allies for players added via console at runtime.
 */
export function isAlly(username: string | undefined): boolean {
    if (!username) return false;
    if ((ALLIES as string[]).includes(username)) return true;

    // Runtime-added allies (via global.addAlly console command)
    if (Memory.allies && Array.isArray(Memory.allies) && Memory.allies.includes(username)) return true;

    return false;
}

/**
 * Returns true if the creep belongs to an ally or is an NPC Invader.
 * Useful for tower targeting: skip both Invaders (handled separately) and allies.
 */
export function isFriendlyOrNPC(username: string | undefined): boolean {
    if (!username) return false;
    return username === "Invader" || username === "Source Keeper" || isAlly(username);
}

// ── Runtime console commands ─────────────────────────────────────────────────

global.addAlly = function (name: string): string {
    if (!Memory.allies) Memory.allies = [];
    if (Memory.allies.includes(name)) return `${name} is already an ally.`;
    Memory.allies.push(name);
    return `Added ally: ${name}. Current allies: ${Memory.allies.join(", ")}`;
};

global.removeAlly = function (name: string): string {
    if (!Memory.allies) return "No runtime allies defined.";
    Memory.allies = Memory.allies.filter((n: string) => n !== name);
    return `Removed ally: ${name}. Current allies: ${Memory.allies.join(", ")}`;
};

global.listAllies = function (): string {
    const hardcoded   = ALLIES.length ? ALLIES.join(", ") : "(none)";
    const runtimeList = Memory.allies?.length ? Memory.allies.join(", ") : "(none)";
    return `Hard-coded allies: ${hardcoded}\nRuntime allies: ${runtimeList}`;
};
