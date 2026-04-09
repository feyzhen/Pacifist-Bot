// ─────────────────────────────────────────────────────────────────────────────
// creepFunctions.ts  –  Refactored
//
// Key changes vs original (3473 lines → ~900 lines):
//
//  1. CostMatrix builders unified:
//     - buildTerrainBase()       shared terrain loop extracted once
//     - applyEnemyAvoidance()    shared enemy-penalty loop extracted once
//     - applyStationaryCreeps()  shared stationary-role cost table
//     - addDefenderBoundary()    shared storage-radius exclusion zone
//       → removes ~1800 lines of copy-paste across 6 roomCallback functions
//
//  2. Boost() lab chain: 8 separate else-if blocks → loop over labKeys[]
//
//  3. recycle() lab unboost lookup: 10 separate if/else-if blocks → loop
//
//  4. findFillerTarget() output-lab loop: 8 individual vars → array loop
//
//  5. SwapPositionWithCreep(): 8 direction branches → data-driven table
//
//  6. fleeFromMelee / fleeFromRanged: identical 50-line setup → shared helper
//
//  7. Hard-coded "E41N58" room name in roomCallbackAvoidInvaders and
//     roomCallbackForRampartDefender replaced by room.memory.defenceRadius
//     (default 11; set to 26 in that room's memory to replicate original behaviour)
//
// ─────────────────────────────────────────────────────────────────────────────

import { isAlly } from "../utils/Whitelist";

// ── Creep interface declaration moved to src/types/global.d.ts ───────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COST-MATRIX HELPERS
// These small functions eliminate ~1800 lines of copy-paste across the 6+
// roomCallback variants that all share the same terrain/structure/creep logic.
// ═══════════════════════════════════════════════════════════════════════════════

type TerrainWeights = { wall: number; swamp: number; plain: number };

/** Fill a CostMatrix with terrain weights. borderBlock=true sets edges to 255. */
function buildTerrainBase(
    costs: CostMatrix,
    roomName: string,
    w: TerrainWeights,
    borderBlock = false
): void {
    const terrain = new Room.Terrain(roomName);
    const start = borderBlock ? 0 : 1;
    const end   = borderBlock ? 49 : 48;
    for (let y = start; y <= end; y++) {
        for (let x = start; x <= end; x++) {
            const t = terrain.get(x, y);
            costs.set(x, y,
                t === TERRAIN_MASK_WALL  ? w.wall  :
                t === TERRAIN_MASK_SWAMP ? w.swamp : w.plain
            );
        }
    }
    if (borderBlock) {
        for (let i = 0; i < 50; i++) {
            costs.set(i, 0, 255); costs.set(i, 49, 255);
            costs.set(0, i, 255); costs.set(49, i, 255);
        }
    }
}

/** Apply road/container/rampart/structure costs. */
function applyStructures(costs: CostMatrix, room: Room, roadCost: number): void {
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_ROAD)      { costs.set(s.pos.x, s.pos.y, roadCost); return; }
        if (s.structureType === STRUCTURE_CONTAINER) { return; }
        if (s.structureType === STRUCTURE_RAMPART && s.my) { return; }
        costs.set(s.pos.x, s.pos.y, 255);
    });
}

/** Block construction sites (except container/road/rampart). */
function applyConstructionSites(costs: CostMatrix, room: Room): void {
    room.find(FIND_MY_CONSTRUCTION_SITES).forEach((site) => {
        if (site.structureType !== STRUCTURE_CONTAINER &&
            site.structureType !== STRUCTURE_ROAD &&
            site.structureType !== STRUCTURE_RAMPART) {
            costs.set(site.pos.x, site.pos.y, 255);
        }
    });
}

/** Shared stationary-creep cost table used by most movement callbacks. */
function applyStationaryCreeps(costs: CostMatrix, room: Room, roleName: string | null = null): void {
    const ROLE_COSTS: Record<string, number> = {
      upgrader: 61, // set below per condition
      EnergyMiner: 21,
      builder: 26,
      buildcontainer: 60,
      // EnergyManager: 50,
      repair: 60,
      Convoy: 41,
      ram: 100,
      signifer: 100,
      PowerMelee: 20,
      PowerHeal: 14,
      SpecialRepair: 10,
      RampartDefender: 255,
      CCK: 60,
      CCKparty: 60,
      reserve: 25
    };

    room.find(FIND_MY_CREEPS, { filter: (c: Creep) => !c.spawning }).forEach((creep: any) => {
        if (creep.memory.role === "upgrader" && creep.memory.upgrading && creep.room.controller && creep.pos.getRangeTo(creep.room.controller) <= 3) {
            costs.set(creep.pos.x, creep.pos.y, 61); return;
        }
        if (creep.memory.role === "EnergyMiner" && roleName !== "EnergyMiner" && creep.memory.source) {
            const src: any = Game.getObjectById(creep.memory.source);
            if (src && creep.pos.isNearTo(src)) { costs.set(creep.pos.x, creep.pos.y, 21); return; }
        }
        if (creep.memory.role === "builder" && creep.memory.building && creep.memory.locked) {
            const locked: any = Game.getObjectById(creep.memory.locked);
            if (locked && creep.pos.getRangeTo(locked) <= 3) { costs.set(creep.pos.x, creep.pos.y, 26); return; }
        }
        if (creep.name.startsWith("SquadCreep")) { costs.set(creep.pos.x, creep.pos.y, 100); return; }
        if (creep.memory.role === "CCK" && creep.room.name === creep.memory.targetRoom) { costs.set(creep.pos.x, creep.pos.y, 60); return; }
        if (creep.memory.role === "CCKparty" && creep.room.name === creep.memory.homeRoom) { costs.set(creep.pos.x, creep.pos.y, 60); return; }
        // if (creep.memory.role === "EnergyManager" && roleName !== "EnergyManager") {
        //     const closestLink: any = Game.getObjectById(creep.memory.closestLink) || creep.findClosestLinkToStorage();
        //     if (closestLink && creep.pos.isNearTo(closestLink)) {
        //         costs.set(creep.pos.x, creep.pos.y, 255); return;
        //     }
        // }
        const cost = ROLE_COSTS[creep.memory.role];
        if (cost !== undefined) costs.set(creep.pos.x, creep.pos.y, cost);
    });
}

/**
 * Apply enemy avoidance penalty around hostile creeps with attack parts.
 * radius: tiles around Invaders/SourceKeepers; playerRadius: tiles around players.
 * penaltyValue: cost set in that radius.
 */
function applyEnemyAvoidance(
    costs: CostMatrix,
    room: Room,
    radius: number,
    playerRadius: number,
    penaltyValue: number
): void {
    room.find(FIND_HOSTILE_CREEPS).forEach((eCreep: Creep) => {
        const hasAttack = eCreep.getActiveBodyparts(ATTACK) > 0 || eCreep.getActiveBodyparts(RANGED_ATTACK) > 0;
        if (!hasAttack) { costs.set(eCreep.pos.x, eCreep.pos.y, 255); return; }
        const isNPC = (eCreep.owner as any).username === "Invader" || (eCreep.owner as any).username === "Source Keeper";
        const r = isNPC ? radius : playerRadius;
        for (let i = -r; i <= r; i++) {
            for (let o = -r; o <= r; o++) {
                const nx = eCreep.pos.x + i, ny = eCreep.pos.y + o;
                if (nx >= 0 && nx <= 49 && ny >= 0 && ny <= 49) costs.set(nx, ny, penaltyValue);
            }
        }
    });
}

/**
 * Add a boundary exclusion zone around storage so defenders stay inside.
 * Uses room.memory.defenceRadius (default 11, was hard-coded as 11 or 26 for "E41N58").
 */
function addDefenderBoundary(costs: CostMatrix, room: Room): void {
    const storage: any = room.storage || Game.getObjectById((room.memory.Structures || {}).storage);
    if (!storage) return;
    const r: number = (room.memory as any).defenceRadius ?? 11;
    for (let i = -(r + 2); i <= (r + 2); i++) {
        for (let o = -(r + 2); o <= (r + 2); o++) {
            const onEdge = Math.abs(i) > r || Math.abs(o) > r;
            if (!onEdge) continue;
            const nx = storage.pos.x + i, ny = storage.pos.y + o;
            if (nx >= 0 && nx <= 49 && ny >= 0 && ny <= 49) costs.set(nx, ny, 255);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST-MATRIX BUILDERS  (6 variants, now each ~15-25 lines instead of 80-120)
// ═══════════════════════════════════════════════════════════════════════════════

const roomCallbackRoadPrio = (roomName: string, role: string | null = null): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 25, plain: 5 }, true);
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => costs.set(c.pos.x, c.pos.y, 255));
    applyStructures(costs, room, 3);
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, role);
    return costs;
};

const roomCallbackRoadPrioFlee = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 25, plain: 5 }, false);
    applyStructures(costs, room, 3);
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, null);
    applyEnemyAvoidance(costs, room, 5, 3, 30);
    for (let i = 0; i < 50; i++) { costs.set(i, 0, 255); costs.set(i, 49, 255); costs.set(0, i, 255); costs.set(49, i, 255); }
    return costs;
};

const roomCallbackSwampPrio = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 2, plain: 1 }, true);
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => costs.set(c.pos.x, c.pos.y, 255));
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_ROAD)      { costs.set(s.pos.x, s.pos.y, 2); return; }
        if (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_RAMPART) return;
        costs.set(s.pos.x, s.pos.y, 255);
    });
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, null);
    return costs;
};

const roomCallbackIgnoreRoads = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 10, plain: 2 }, true);
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => costs.set(c.pos.x, c.pos.y, 255));
    applyStructures(costs, room, 3);
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, null);
    return costs;
};

const roomCallbackSafeToSource = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 15, plain: 3 }, true);
    applyStructures(costs, room, 2);
    applyConstructionSites(costs, room);
    // Wide safety bubble around each enemy (±7 radius, ±4 inner = 25, outer = 24 or 120/125)
    room.find(FIND_HOSTILE_CREEPS).forEach((eCreep: Creep) => {
        for (let i = -7; i <= 7; i++) {
            for (let o = -7; o <= 7; o++) {
                const nx = eCreep.pos.x + i, ny = eCreep.pos.y + o;
                if (nx < 1 || nx > 48 || ny < 1 || ny > 48) continue;
                const inner = Math.abs(i) <= 4 && Math.abs(o) <= 4;
                const cur   = costs.get(nx, ny);
                costs.set(nx, ny, inner ? (cur === 5 ? 125 : 25) : (cur === 5 ? 120 : 24));
            }
        }
    });
    applyStationaryCreeps(costs, room, null);
    return costs;
};

const roomCallbackRoadPrioUpgraderInPosition = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 50, plain: 10 }, true);
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => costs.set(c.pos.x, c.pos.y, 255));
    applyStructures(costs, room, 60);
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, null);
    return costs;
};

// ── AvoidEnemyCreepsMuch variants (used in moveToRoomAvoidEnemyRooms) ─────────
function buildAvoidEnemyMuchBase(
    roomName: string,
    w: TerrainWeights,
    roadCost: number,
    penaltyValue: number
): CostMatrix | false {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, w, false);
    applyEnemyAvoidance(costs, room, 5, 3, penaltyValue);
    applyStructures(costs, room, roadCost);
    applyConstructionSites(costs, room);
    applyStationaryCreeps(costs, room, null);
    return costs;
}

const roomCallbackRoadPrioAvoidEnemyCreepsMuch = (roomName: string) =>
    buildAvoidEnemyMuchBase(roomName, { wall: 255, swamp: 10, plain: 2 }, 1, 30);

const roomCallbackRoadPrioAvoidEnemyCreepsMuchRam = (roomName: string) =>
    buildAvoidEnemyMuchBase(roomName, { wall: 254, swamp: 10, plain: 2 }, 1, 30);

const roomCallbackRoadPrioAvoidEnemyCreepsMuchForCarrierFull = (roomName: string) =>
    buildAvoidEnemyMuchBase(roomName, { wall: 255, swamp: 30, plain: 10 }, 1, 100);

const roomCallbackRoadPrioAvoidEnemyCreepsMuchForCarrierEmpty = (roomName: string) =>
    buildAvoidEnemyMuchBase(roomName, { wall: 255, swamp: 2, plain: 2 }, 3, 100);

// ── Defender-specific callbacks ───────────────────────────────────────────────
function buildDefenderBase(roomName: string, roadCost: number): CostMatrix | false {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, roomName, { wall: 255, swamp: 25, plain: 5 }, false);
    // Ramparts are preferred (cost 4); roads get roadCost
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_ROAD) { if (costs.get(s.pos.x, s.pos.y) !== 255) costs.set(s.pos.x, s.pos.y, roadCost); return; }
        if (s.structureType === STRUCTURE_RAMPART) {
            const others = s.pos.lookFor(LOOK_STRUCTURES).filter((b: any) => b.structureType !== STRUCTURE_RAMPART);
            if (others.length === 0) costs.set(s.pos.x, s.pos.y, 4);
            return;
        }
        if (s.structureType === STRUCTURE_CONTAINER) return;
        costs.set(s.pos.x, s.pos.y, 255);
    });
    applyConstructionSites(costs, room);
    room.find(FIND_MY_CREEPS, { filter: (c: any) => !c.spawning }).forEach((creep: any) => {
        if (creep.memory.role === "RampartDefender" || creep.memory.role === "RRD") costs.set(creep.pos.x, creep.pos.y, 255);
        else if (creep.memory.role === "SpecialRepair") costs.set(creep.pos.x, creep.pos.y, 100);
    });
    addDefenderBoundary(costs, room);
    return costs;
}

const roomCallbackAvoidInvaders = (roomName: string): boolean | CostMatrix => {
    const result = buildDefenderBase(roomName, 5);
    if (!result) return false;
    const room = Game.rooms[roomName];
    // Block tiles near every enemy (±3 hard block)
    room.find(FIND_HOSTILE_CREEPS).forEach((eCreep: Creep) => {
        for (let i = -3; i <= 3; i++) for (let o = -3; o <= 3; o++) {
            const nx = eCreep.pos.x + i, ny = eCreep.pos.y + o;
            if (nx >= 0 && nx <= 49 && ny >= 0 && ny <= 49) result.set(nx, ny, 255);
        }
    });
    // Block SpecialCarry tiles
    room.find(FIND_MY_CREEPS).forEach((c: any) => { if (c.memory.role === "SpecialCarry") result.set(c.pos.x, c.pos.y, 25); });
    return result;
};

const roomCallbackForRampartDefender = (roomName: string): boolean | CostMatrix => {
    return buildDefenderBase(roomName, 3) || false;
};

const roomCallbackForRangedRampartDefender = (roomName: string): boolean | CostMatrix => {
    const result = buildDefenderBase(roomName, 0); // roads passable (not penalised)
    if (!result) return false;
    const room = Game.rooms[roomName];
    // Add penalty near high-RANGED_ATTACK enemies
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
        if (c.getActiveBodyparts(RANGED_ATTACK) > 15) {
            for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
                const nx = c.pos.x + dx, ny = c.pos.y + dy;
                if (nx > 0 && nx < 49 && ny > 0 && ny < 49) {
                    const cur = result.get(nx, ny);
                    if (cur + 25 <= 255) result.set(nx, ny, cur + 25);
                }
            }
        }
    });
    return result;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT PROTOTYPE HELPERS  (shared path-cache + move logic)
// ═══════════════════════════════════════════════════════════════════════════════

function moveWithPath(
    creep: any,
    target: any,
    range: number,
    callbackFn: (rn: string) => boolean | CostMatrix,
    maxRooms = 1
): void {
    if (!target || creep.fatigue !== 0 || creep.pos.getRangeTo(target) <= range) return;

    // Invalidate stale cached path
    if (creep.memory.path?.length > 0) {
        const step = creep.memory.path[0];
        if (Math.abs(creep.pos.x - step.x) > 1 || Math.abs(creep.pos.y - step.y) > 1)
            creep.memory.path = false;
    }

    if (!creep.memory.path?.length || creep.memory.MoveTargetId !== target.id) {
        const result = PathFinder.search(
            creep.pos, { pos: target.pos ?? target, range },
            { maxOps: 1000, maxRooms, roomCallback: (rn) => callbackFn(rn) }
        );
        const pos = result.path[0];
        creep.SwapPositionWithCreep(creep.pos.getDirectionTo(pos));
        creep.memory.path       = result.path;
        creep.memory.MoveTargetId = target.id;
    }

    const next = creep.memory.path[0];
    creep.move(creep.pos.getDirectionTo(next));
    creep.memory.moving = true;
    creep.memory.path.shift();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREEP PROTOTYPES
// ═══════════════════════════════════════════════════════════════════════════════

// ── findFillerTarget ──────────────────────────────────────────────────────────
Creep.prototype.findFillerTarget = function findFillerTarget(): any {
    const reserveFill = this.room.memory.reserveFill;

    // Helper: detect and cache controller link/container
    const refreshControllerLink = (role: string) => {
        if (this.memory.role !== role) return;
        if (this.room.memory.Structures.controllerLink && Game.time % 10000 !== 0) return;
        if (!this.room.controller || this.room.controller.level < 2) return;
        if (this.room.controller.level < 7) {
            let containers = this.room.find(FIND_STRUCTURES, {
                filter: (b: any) => b.structureType === STRUCTURE_CONTAINER &&
                    b.id !== this.room.memory.Structures.bin &&
                    b.id !== this.room.memory.Structures.storage &&
                    b.pos.getRangeTo(this.room.controller) === 3
            });
            if (!containers.length) return;
            let best = this.room.controller.pos.findClosestByRange(containers);
            if (containers.length > 1) {
                const sources = this.room.find(FIND_SOURCES);
                if (best.pos.findInRange(sources, 1).length > 0) {
                    containers = containers.filter((c: any) => c.id !== best.id);
                    best = this.room.controller.pos.findClosestByRange(containers);
                }
            }
            this.room.memory.Structures.controllerLink = best.id;
        } else {
            const links = this.room.find(FIND_MY_STRUCTURES, {
                filter: (b: any) => b.structureType === STRUCTURE_LINK && b.pos.getRangeTo(this.room.controller) <= 3
            });
            if (!links.length) return;
            const cl = this.room.controller.pos.findClosestByRange(links);
            if (cl.pos.getRangeTo(this.room.controller) <= 4) this.room.memory.Structures.controllerLink = cl.id;
        }
    };

    refreshControllerLink("ControllerLinkFiller");

    // Controller link / container fill
    if ((this.memory.role === "ControllerLinkFiller" || this.memory.role === "filler") &&
        this.room.controller && this.room.memory.Structures.controllerLink) {
        const cl: any = Game.getObjectById(this.room.memory.Structures.controllerLink);
        if (cl) {
            const isContainer = cl.structureType === STRUCTURE_CONTAINER;
            const isLink      = cl.structureType === STRUCTURE_LINK;
            const needFill    = isContainer
                ? (this.memory.role === "ControllerLinkFiller" ? cl.store.getFreeCapacity() >= 200 : cl.store.getFreeCapacity() > 1800)
                : (isLink && cl.store[RESOURCE_ENERGY] <= (this.memory.role === "ControllerLinkFiller" ? 600 : 400));
            if (needFill) {
                if (isContainer && this.room.controller.level >= 7) { this.room.memory.Structures.controllerLink = false; }
                else { this.memory.t = cl.id; return cl; }
            }
        } else {
            this.room.memory.Structures.controllerLink = false;
        }
    }

    // Output labs (loop replaces 8 individual variables)
    if (this.room.memory.labs && Object.keys(this.room.memory.labs).length >= 4) {
        const labKeys = ["outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
        for (const key of labKeys) {
            if (!this.room.memory.labs[key]) continue;
            const lab: any = Game.getObjectById(this.room.memory.labs[key]);
            if (lab && (lab.store[RESOURCE_ENERGY] <= 2000 - this.memory.MaxStorage * 2 || lab.store[RESOURCE_ENERGY] < 1200) && !reserveFill.includes(lab.id)) {
                if (!this.room.memory.reserveFill.includes(lab.id)) this.room.memory.reserveFill.push(lab.id);
                this.memory.t = lab.id; return lab;
            }
        }
    }

    // Spawns & extensions
    if (this.room.energyAvailable < this.room.energyCapacityAvailable) {
        const targets = this.room.find(FIND_MY_STRUCTURES, {
            filter: (b: any) => (b.structureType === STRUCTURE_SPAWN || b.structureType === STRUCTURE_EXTENSION) &&
                b.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && !reserveFill.includes(b.id)
        });
        if (targets.length) {
            const t = this.pos.findClosestByRange(targets);
            if (!this.room.memory.reserveFill.includes(t.id)) this.room.memory.reserveFill.push(t.id);
            this.memory.t = t.id; return t;
        }
    }

    // Towers
    const towers = this.room.find(FIND_MY_STRUCTURES, {
        filter: (b: any) => b.structureType === STRUCTURE_TOWER && b.store.getFreeCapacity(RESOURCE_ENERGY) >= 100 && !reserveFill.includes(b.id)
    });
    if (towers.length) {
        const t = this.pos.findClosestByRange(towers);
        if (!this.room.memory.reserveFill.includes(t.id)) this.room.memory.reserveFill.push(t.id);
        this.memory.t = t.id; return t;
    }

    const storage = Game.getObjectById(this.memory.storage) || this.findStorage() || this.room.storage;

    // Factory
    if (this.room.memory.Structures.factory) {
        const factory: any = Game.getObjectById(this.room.memory.Structures.factory);
        if (factory && factory.store[RESOURCE_ENERGY] < 20000 && storage && storage.store[RESOURCE_ENERGY] > 450000 && storage.store[RESOURCE_BATTERY] < 200 && !reserveFill.includes(factory.id)) {
            if (!this.room.memory.reserveFill.includes(factory.id)) this.room.memory.reserveFill.push(factory.id);
            this.memory.t = factory.id; return factory;
        }
    }

    // Extra links
    if (this.room.memory.Structures.extraLinks) {
        for (const linkID of this.room.memory.Structures.extraLinks) {
            const el: any = Game.getObjectById(linkID);
            if (el && el.store[RESOURCE_ENERGY] < 800 && storage && storage.store[RESOURCE_ENERGY] > 100000 && !reserveFill.includes(el.id)) {
                if (!this.room.memory.reserveFill.includes(el.id)) this.room.memory.reserveFill.push(el.id);
                this.memory.t = el.id; return el;
            }
        }
    }

    // PowerSpawn
    if (this.room.memory.Structures.powerSpawn) {
        const ps: any = Game.getObjectById(this.room.memory.Structures.powerSpawn);
        if (ps && ps.store[RESOURCE_ENERGY] < 2500 && storage && storage.store[RESOURCE_ENERGY] > 280000 && !reserveFill.includes(ps.id)) {
            if (!this.room.memory.reserveFill.includes(ps.id)) this.room.memory.reserveFill.push(ps.id);
            this.memory.t = ps.id; return ps;
        }
    }

    refreshControllerLink("filler");
    return false;
};

// ── evacuate ──────────────────────────────────────────────────────────────────
Creep.prototype.evacuate = function evacuate(): any {
    const mem = this.room.memory;
    if (!(mem.defence?.nuke && mem.defence?.evacuate) && !this.memory.nukeHaven) return false;

    if (!this.memory.nukeTimer) {
        const nukes = this.room.find(FIND_NUKES).filter((n: any) => n.timeToLand < 300);
        if (nukes.length) { nukes.sort((a: any, b: any) => a.timeToLand - b.timeToLand); this.memory.nukeTimer = nukes[0].timeToLand + 1; }
    }
    if (!this.memory.homeRoom) this.memory.homeRoom = this.room.name;
    if (this.memory.nukeTimer > 0) this.memory.nukeTimer--;

    if (this.memory.nukeTimer > 0) {
        if (!this.memory.nukeHaven) {
            const adjacent = Object.values(Game.map.describeExits(this.room.name))
                .filter((rn: any) => Game.map.getRoomStatus(rn).status === Game.map.getRoomStatus(this.room.name).status);
            this.memory.nukeHaven = adjacent[Math.floor(Math.random() * adjacent.length)];
        }
        if (this.memory.nukeHaven) this.moveToRoom(this.memory.nukeHaven);
    } else {
        if (this.room.name === this.memory.homeRoom) return false;
        this.moveToRoom(this.memory.homeRoom); return true;
    }
    return true;
};

// ── Boost ─────────────────────────────────────────────────────────────────────
Creep.prototype.Boost = function Boost(): any {
    if (!this.memory.boostlabs?.length) return;

    const labs = this.memory.boostlabs.map((id: string) => Game.getObjectById(id)).filter(Boolean);
    const closestLab: any = this.pos.findClosestByRange(labs);
    if (!closestLab) return;

    if (closestLab.mineralAmount < 30) {
        if (this.ticksToLive < 1100 && this.getActiveBodyparts(CLAIM) === 0)
            this.memory.boostlabs = this.memory.boostlabs.filter((id: string) => id !== closestLab.id);
        this.MoveCostMatrixRoadPrio(closestLab, 3);
        return;
    }

    if (!this.pos.isNearTo(closestLab)) { this.MoveCostMatrixRoadPrio(closestLab, 1); return false; }

    const result = closestLab.boostCreep(this);
    if (result === 0) {
        // Decrement lab use counter — loop replaces 8 if/else-if blocks
        const labKeys = ["outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
        for (let i = 0; i < labKeys.length; i++) {
            const key = labKeys[i] as string;
            const labNum = `lab${i + 1}`;
            if (this.room.memory.labs?.[key] === closestLab.id && this.room.memory.labs?.status?.boost?.[labNum]?.use) {
                this.room.memory.labs.status.boost[labNum].use -= 1;
                if (i === 7 && this.room.memory.labs.status.boost[labNum].use === 0 && this.memory.role === "EnergyMiner")
                    this.room.memory.labs.lab8reserved = false;
                break;
            }
        }
        this.memory.boostlabs = this.memory.boostlabs.filter((id: string) => id !== closestLab.id);
        return true;
    }
    console.log("Boost result:", result);
};

// ── Speak ─────────────────────────────────────────────────────────────────────
Creep.prototype.Speak = function Speak(): void {
    // Chained sayings
    const chain: Record<string, string> = {
        "AB42": "BBB4", "BB14": "BBB4", "BBB4": "33472A",
        "My": "Time", "Time": "Has", "Has": "Come", "Come": "I", "I": "Must", "Must": "Suicide",
        "I Could": "Use A", "Use A": "Cigarette",
    };
    if (chain[this.saying]) { this.say(chain[this.saying], true); return; }
    if (this.saying === "Knock") { this.say("knock", true); return; }
    if (this.saying === "knock") {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.pos.getRangeTo(this) > 0 }));
        closest.say("Who's", true); return;
    }
    if (this.saying === "Who's") { this.say("there?", true); return; }
    if (this.saying === "there?") {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.pos.getRangeTo(this) > 0 }));
        closest.say("Hatch", true); return;
    }
    if (this.saying === "Hatch") {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.pos.getRangeTo(this) > 0 }));
        closest.say("hatch who?", true); return;
    }
    if (this.saying === "hatch who?") {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.pos.getRangeTo(this) > 0 }));
        closest.say("Bless you!", true); return;
    }
    const r = Math.floor(Math.random() * 17004);
    if (r === 0) this.say("AB42", true);
    else if (r === 1) this.say("BB14", true);
    else if (r === 2 && this.memory.suicide) this.say("My", true);
    else if (r === 3 && this.room.find(FIND_MY_CREEPS).length > 1) this.say("Knock", true);
    else if (r === 4 && (this.memory.role === "upgrader" || this.memory.role === "repair")) this.say("I Could", true);
};

// ── findSource / findSpawn / findStorage / findClosestLink ────────────────────
Creep.prototype.findSource = function () {
    let source: any = this.memory.sourceId ? Game.getObjectById(this.memory.sourceId) : null;
    if (!source) {
        let sources = this.room.find(FIND_SOURCES, { filter: (s: any) => s.energy > 0 });
        if (sources.length) {
            sources = sources.filter((s: any) => s.pos.getOpenPositions().length > 0);
            source = this.pos.findClosestByRange(sources);
        }
    }
    if (source) { this.memory.source = source.id; this.memory.sourceId = source.id; return source; }
};

Creep.prototype.findSpawn = function () {
    const spawns = this.room.find(FIND_MY_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_SPAWN });
    if (spawns.length) { this.memory.spawn = spawns[0].id; return spawns[0]; }
};

Creep.prototype.findStorage = function () {
    if (this.room.controller?.level >= 4) {
        const st = this.room.find(FIND_MY_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_STORAGE });
        if (st.length) { this.memory.storage = st[0].id; return st[0]; }
    } else if (this.room.controller?.level > 0) {
        const spawn: any = Game.getObjectById(this.memory.spawn) || this.findSpawn();
        if (spawn && spawn.pos.y >= 2) {
            const pos = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, this.room.name);
            for (const s of pos.lookFor(LOOK_STRUCTURES)) {
                if ((s as any).structureType === STRUCTURE_CONTAINER) { this.memory.storage = (s as any).id; return s; }
            }
        }
    }
};

Creep.prototype.findClosestLink = function () {
    const links = this.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });
    if (links.length) { const l = this.pos.findClosestByRange(links); this.memory.closestLink = l.id; return l; }
};

Creep.prototype.findClosestLinkToStorage = function (): any {
    const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
    if (storage && (storage as any).pos.x >= 2) {
        const pos = new RoomPosition((storage as any).pos.x - 2, (storage as any).pos.y, this.room.name);
        for (const s of pos.lookFor(LOOK_STRUCTURES)) {
            if ((s as any).structureType === STRUCTURE_LINK) { this.memory.closestLink = (s as any).id; return s; }
        }
    }
};

// ── withdrawStorage ───────────────────────────────────────────────────────────
Creep.prototype.withdrawStorage = function withdrawStorage(storage: any): any {
    if (!storage) { this.room.findStorage(); return; }
    const energy = storage.store[RESOURCE_ENERGY];
    const role   = this.memory.role;
    const minEnergy = storage.structureType === STRUCTURE_STORAGE ? 2000 : 300;
    if (energy < minEnergy && role !== "filler") {
        if (Game.time % 50 === 0) console.log(`Not enough energy to withdraw in ${this.room.name}`);
        this.acquireEnergyWithContainersAndOrDroppedEnergy(); return;
    }
    if (this.pos.isNearTo(storage)) return this.withdraw(storage, RESOURCE_ENERGY);
    role ? this.MoveCostMatrixRoadPrio(storage, 1) : this.MoveCostMatrixIgnoreRoads(storage, 1);
};

// ── moveToRoom ────────────────────────────────────────────────────────────────
Creep.prototype.moveToRoom = function moveToRoom(roomName: string, tx = 25, ty = 25, ignoreRoads = false, swampCost = 5, range = 20): void {
    this.moveTo(new RoomPosition(tx, ty, roomName), { range, reusePath: 200, ignoreRoads, swampCost });
};

// ── moveToRoomAvoidEnemyRooms ─────────────────────────────────────────────────
Creep.prototype.moveToRoomAvoidEnemyRooms = function (targetRoom: string): void {
    function isHighwayAdjacent(roomName: string): boolean {
        const m = roomName.match(/^[EW](\d+)[NS](\d+)$/);
        if (!m) return false;
        const ex = parseInt(m[1]) % 10, ey = parseInt(m[2]) % 10;
        return (ex >= 4 && ex <= 6) && (ey >= 4 && ey <= 6);
    }

    // Guard: flee if dangerous
    if (this.memory.role === "Guard" && this.memory.targetRoom !== targetRoom) {
        const strongHostiles = this.room.find(FIND_HOSTILE_CREEPS).filter((c: Creep) =>
            c.getActiveBodyparts(ATTACK) > 25 || c.getActiveBodyparts(RANGED_ATTACK) > 25);
        if (strongHostiles.length && this.pos.getRangeTo(this.pos.findClosestByRange(strongHostiles)) <= 9) {
            this.moveToRoomAvoidEnemyRooms(this.memory.homeRoom); return;
        }
    }

    // Auto-add hostile rooms to avoid list
    if (this.room.name !== this.memory.homeRoom) {
        if (this.room.controller && !this.room.controller.my && this.room.controller.level > 2 &&
            this.room.find(FIND_HOSTILE_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_TOWER }).length > 0 &&
            !Memory.AvoidRooms?.includes(this.room.name)) {
            Memory.AvoidRooms.push(this.room.name);
        } else if (isHighwayAdjacent(this.room.name) && Game.time % 2 === 0) {
            const cores = this.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: (s: any) => s.structureType === STRUCTURE_INVADER_CORE && (s as any).level > 0
            });
            if (cores.length && (cores[0] as any).effects?.[0]?.effect === EFFECT_COLLAPSE_TIMER) {
                if (!Memory.AvoidRoomsTemp) Memory.AvoidRoomsTemp = {};
                const ticks = (cores[0] as any).effects[0].ticksRemaining;
                if (!Memory.AvoidRoomsTemp[this.room.name]) Memory.AvoidRoomsTemp[this.room.name] = ticks;
            }
        }
    }

    // Shift completed route step
    if (this.memory.route?.length > 0 && this.memory.route[0].room === this.room.name) this.memory.route.shift();

    const needReroute = !this.memory.route || this.memory.route === -2 || this.memory.route.length === 0 ||
        (this.memory.route.length === 1 && this.memory.route[0].room === this.room.name) ||
        this.memory.route[this.memory.route.length - 1].room !== targetRoom;

    if (needReroute) {
        this.memory.route = Game.map.findRoute(this.room.name, targetRoom, {
            routeCallback(roomName: string) {
                if (Game.map.getRoomStatus(roomName).status !== "normal") return Infinity;
                if ((Memory.AvoidRooms?.includes(roomName) || Memory.AvoidRoomsTemp?.[roomName]) && roomName !== targetRoom) return 24;
                if (roomName.length >= 4) {
                    const m = roomName.match(/^[EW](\d+)[NS](\d+)$/);
                    if (m) {
                        if (parseInt(m[1]) % 10 === 0 || parseInt(m[2]) % 10 === 0) return 2;
                        const ex = parseInt(m[1]) % 10, ey = parseInt(m[2]) % 10;
                        if (ex >= 4 && ex <= 6 && ey >= 4 && ey <= 6) return 24;
                    }
                }
                return 4;
            }
        });
    }

    if (!this.memory.route || this.memory.route === -2 || !this.memory.route.length) return;

    if (!this.memory.exit || this.memory.exit.roomName !== this.room.name) {
        const routeData = this.memory.route[0];
        const exits = this.room.find(routeData.exit).filter((p: RoomPosition) =>
            !p.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_WALL));
        this.memory.exit = this.pos.findClosestByPath(exits, { ignoreCreeps: true });
    }

    let exit = this.memory.exit;
    if (!exit) exit = this.pos.findClosestByRange(this.memory.route[0].exit);
    if (exit && typeof exit.x === "number" && typeof exit.y === "number") {
        const position = new RoomPosition(exit.x, exit.y, this.room.name);
        this.MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch(position, 0);
    }
};

// ── harvestEnergy ─────────────────────────────────────────────────────────────
Creep.prototype.harvestEnergy = function harvestEnergy(): any {
    if (this.memory.targetRoom && this.memory.targetRoom !== this.room.name)
        return this.moveToRoomAvoidEnemyRooms(this.memory.targetRoom);

    let source: any = Game.getObjectById(this.memory.source);
    if (!source || (!source.pos.getOpenPositions().length && !this.pos.isNearTo(source) && !this.memory.sourceId)) {
        delete this.memory.source; source = this.findSource();
    }
    if (!source) return;

    if (this.pos.isNearTo(source) &&
        (this.memory.checkAmIOnRampart && this.memory.role === "EnergyMiner" ||
         this.memory.role !== "EnergyMiner" || this.memory.targetRoom !== this.memory.homeRoom)) {
        return this.harvest(source);
    }
    this.room.memory.danger ? this.MoveToSourceSafely(source, 1) : this.MoveCostMatrixRoadPrio(source, 1, this.memory.role);
    if (this.memory.danger) {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_HOSTILE_CREEPS));
        if (closest && this.pos.getRangeTo(closest) <= 3) this.room.roomTowersHealMe(this);
    }
};

// ── acquireEnergyWithContainersAndOrDroppedEnergy ─────────────────────────────
Creep.prototype.acquireEnergyWithContainersAndOrDroppedEnergy = function (): any {
    if (!this.room.memory.Structures) this.room.memory.Structures = {};
    const spawn: any = Game.getObjectById(this.memory.spawn);
    let container: any = Game.getObjectById(this.room.memory.Structures.container) || this.room.findContainers(this.store.getFreeCapacity());

    if (container?.store[RESOURCE_ENERGY] <= this.store.getFreeCapacity())
        container = this.room.findContainers(this.store.getFreeCapacity());

    const moveTo = (target: any) => {
        if (this.memory.role === "carry") this.MoveCostMatrixSwampPrio(target, 1);
        else this.MoveCostMatrixRoadPrio(target, 1);
    };

    const droppedFilter = (res: any) =>
        this.pos.getRangeTo(res.pos) < 8 &&
        res.amount > this.store.getFreeCapacity() + this.pos.findPathTo(res.pos).length + 1 &&
        res.resourceType === RESOURCE_ENERGY &&
        (!spawn || !res.pos.isNearTo(spawn));

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, { filter: droppedFilter });
    if (dropped.length) {
        const closest = this.pos.findClosestByRange(dropped);
        if (this.pos.isNearTo(closest)) return this.pickup(closest);
        moveTo(closest); return;
    }

    if (container) {
        if (this.pos.isNearTo(container)) return this.withdraw(container, RESOURCE_ENERGY);
        moveTo(container); return;
    }

    const lastChance = this.room.find(FIND_DROPPED_RESOURCES, { filter: (r: any) => r.resourceType === RESOURCE_ENERGY });
    if (lastChance.length) {
        lastChance.sort((a: any, b: any) => b.amount - a.amount);
        if (this.pos.isNearTo(lastChance[0])) return this.pickup(lastChance[0]);
        moveTo(lastChance[0]);
    }
};

// ── roadCheck / roadlessLocation ──────────────────────────────────────────────
Creep.prototype.roadCheck = function (): boolean {
    return this.pos.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_ROAD);
};

Creep.prototype.roadlessLocation = function (repairTarget: any): RoomPosition | null {
    const nearby = this.pos.getNearbyPositions();
    const candidates = nearby.filter((b: RoomPosition) => {
        if (b.getRangeTo(repairTarget) !== 3) return false;
        return b.lookFor(LOOK_STRUCTURES).length === 0 && b.lookFor(LOOK_CREEPS).length === 0;
    });

    if (candidates.length > 0 && this.room.memory.Structures?.storage) {
        const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
        let best: RoomPosition | null = null, bestRange = 100;
        for (const b of candidates) {
            const r = b.getRangeTo(storage as any);
            if (r < bestRange) { bestRange = r; best = b; }
        }
        return best;
    }
    if (candidates.length > 0) return candidates[0];

    if (!this.room.memory.danger) {
        for (const b of nearby) {
            if (b.getRangeTo(repairTarget) <= 3 && b.lookFor(LOOK_STRUCTURES).length === 0 && b.lookFor(LOOK_CREEPS).length === 0)
                return b;
        }
    }
    return null;
};

// ── fleeHomeIfInDanger ────────────────────────────────────────────────────────
Creep.prototype.fleeHomeIfInDanger = function (): void | string {
    const tr = this.memory.targetRoom, hr = this.memory.homeRoom;
    if (!tr || !hr || tr === hr || !Memory.rooms?.[tr]?.roomData?.has_hostile_creeps) return;

    if (this.room.name === tr) { this.memory.timeOut = 25; this.moveToRoom(hr); return "timeOut"; }
    if (this.memory.timeOut > 0) {
        this.memory.timeOut--;
        // Push off the edge in the right direction
        const { x, y } = this.pos;
        const moves: [boolean, DirectionConstant[]][] = [
            [x === 49, [LEFT, TOP_LEFT, BOTTOM_LEFT, TOP, BOTTOM]],
            [x === 0,  [RIGHT, TOP_RIGHT, BOTTOM_RIGHT, TOP, BOTTOM]],
            [y === 49, [TOP, TOP_LEFT, TOP_RIGHT, LEFT, RIGHT]],
            [y === 0,  [BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, LEFT, RIGHT]],
        ];
        for (const [cond, dirs] of moves) {
            if (!cond) continue;
            for (const d of dirs) { if (this.move(d) === OK) break; }
            break;
        }
        return "timeOut";
    }
};

// ── moveAwayIfNeedTo ──────────────────────────────────────────────────────────
Creep.prototype.moveAwayIfNeedTo = function (): any {
    const { x, y } = this.pos, rn = this.room.name;
    const candidates: [number, number][] = [];
    if (x > 0) { if (y > 0) candidates.push([x-1,y-1]); candidates.push([x-1,y]); if (y < 49) candidates.push([x-1,y+1]); }
    if (y > 0) candidates.push([x,y-1]);
    if (y < 49) candidates.push([x,y+1]);
    if (x < 49) { if (y > 0) candidates.push([x+1,y-1]); candidates.push([x+1,y]); if (y < 49) candidates.push([x+1,y+1]); }

    const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
    let creepNearby = false, emptyBlock: [number,number] | null = null;

    for (const [cx, cy] of candidates) {
        const pos = new RoomPosition(cx, cy, rn);
        if (pos.lookFor(LOOK_TERRAIN)[0] === "wall") continue;
        const creepsHere = pos.lookFor(LOOK_CREEPS);
        const structsHere = pos.lookFor(LOOK_STRUCTURES);
        if (creepsHere.length > 0) {
            const c = creepsHere[0];
            if (c.store.getFreeCapacity() === 0 && !["EnergyManager","upgrader","EnergyMiner","repair","filler"].includes(c.memory.role)) {
                if (!storage || (c.pos.getRangeTo(storage) >= this.pos.getRangeTo(storage))) creepNearby = true;
            }
        }
        const isOpen = creepsHere.length === 0 && (structsHere.length === 0 || (structsHere.length === 1 && structsHere[0].structureType === STRUCTURE_ROAD));
        if (isOpen) { emptyBlock = [cx, cy]; if (creepNearby) break; }
    }

    if (creepNearby && emptyBlock) {
        this.moveTo(new RoomPosition(emptyBlock[0], emptyBlock[1], rn));
        return "i moved";
    }
    return false;
};

// ── Sweep ─────────────────────────────────────────────────────────────────────
Creep.prototype.Sweep = function Sweep(): any {
    if (!this.memory.lockedDropped || Game.getObjectById(this.memory.lockedDropped) == null) {
        const sources = this.room.find(FIND_SOURCES);
        if (!sources.length) return "nothing to sweep";

        let dropped = this.room.find(FIND_DROPPED_RESOURCES);
        if (this.room.controller?.level <= 3)
            dropped = dropped.filter((r: any) => r.pos.getRangeTo(r.pos.findClosestByRange(sources)) > 1);

        const tombs = this.room.find(FIND_TOMBSTONES, { filter: (t: any) => _.keys(t.store).length > 0 });
        if (!dropped.length && !tombs.length) return "nothing to sweep";

        const nearbyDropped = dropped.filter((r: any) => r.pos.getRangeTo(this) < 6);
        const nearbyTombs   = tombs.filter((t: any) => t.pos.getRangeTo(this) < 6);

        if (nearbyDropped.length)   { nearbyDropped.sort((a: any, b: any) => a.amount - b.amount);   this.memory.lockedDropped = nearbyDropped[0].id; }
        else if (nearbyTombs.length){ nearbyTombs.sort((a: any, b: any) => a.amount - b.amount);     this.memory.lockedDropped = nearbyTombs[0].id; }
        else if (dropped.length)    { dropped.sort((a: any, b: any) => a.amount - b.amount);         this.memory.lockedDropped = dropped[0].id; }
        else                        { this.memory.lockedDropped = tombs[tombs.length - 1].id; }
    }

    const target: any = Game.getObjectById(this.memory.lockedDropped);
    if (this.pickup(target) === OK) return "picked up";
    if (this.pickup(target) === ERR_NOT_IN_RANGE) { this.moveTo(target, { reusePath: 25, ignoreRoads: true, swampCost: 1 }); return false; }
    if (this.withdraw(target, RESOURCE_ENERGY) === OK) return "picked up";
    if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { this.MoveCostMatrixSwampPrio(target, 1); }
    return false;
};

// ── recycle ───────────────────────────────────────────────────────────────────
Creep.prototype.recycle = function recycle(): void {
    if (this.memory.homeRoom && this.memory.homeRoom !== this.room.name)
        return this.moveToRoomAvoidEnemyRooms(this.memory.homeRoom);

    // Unboost if boosted and near end of life
    if (this.ticksToLive < 600 && this.room.memory.labs) {
        const boosted = this.body.some((p: BodyPartDefinition) => p.boost);
        if (boosted) {
            const labKeys = ["inputLab1","inputLab2","outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
            let lab: any = null;
            for (const key of labKeys) {
                const l: any = this.room.memory.labs[key] ? Game.getObjectById(this.room.memory.labs[key]) : null;
                if (l && l.cooldown <= 20) { lab = l; break; }
            }
            if (lab) {
                if (!this.room.memory.labs.paused) this.room.memory.labs.paused = [];
                const existing = this.room.memory.labs.paused.find((p: any) => p.id === lab.id);
                if (!existing) this.room.memory.labs.paused.push({ timer: 21, id: lab.id });
                else existing.timer = 50;

                if (this.pos.isNearTo(lab)) {
                    if (lab.unboostCreep(this) === OK) {
                        const entry = this.room.memory.labs.paused.find((p: any) => p.id === lab.id);
                        if (entry) entry.timer = 1;
                    }
                } else {
                    this.room.find(FIND_MY_CREEPS, { filter: (c: any) => c.memory.role === "sweeper" && !c.memory.full })
                        .forEach((sw: any) => sw.MoveCostMatrixIgnoreRoads(lab, 3));
                    this.MoveCostMatrixRoadPrio(lab, 1);
                }
                if (!this.memory.spawnedSweeper && this.room.find(FIND_MY_CREEPS, { filter: (c: any) => c.memory.role === "sweeper" }).length < 1) {
                    const name = "Sweeper-" + Math.floor(Math.random() * Game.time) + "-" + this.room.name;
                    this.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], name, { memory: { role: "sweeper" } });
                    this.memory.spawnedSweeper = true;
                }
                return;
            }
        }
    }

    const SO = this.room.memory.Structures;
    if (!SO) { this.room.memory.Structures = {}; return; }
    const bin: any = SO.bin ? this.room.find(FIND_STRUCTURES, { filter: (s: any) => s.id === SO.bin })[0] : null;

    if (bin) {
        if (this.pos.isEqualTo(bin)) {
            const spawnPos = new RoomPosition(this.pos.x, this.pos.y + 1, this.room.name);
            const spawn: any = spawnPos.lookFor(LOOK_STRUCTURES).find((s: any) => s.structureType === STRUCTURE_SPAWN);
            if (spawn) spawn.recycleCreep(this); else this.suicide();
        } else { this.MoveCostMatrixRoadPrio(bin, 0); }
    } else if (!SO.bin) {
        const storage: any = Game.getObjectById(SO.storage) || this.room.storage;
        if (storage) {
            const binPos = new RoomPosition(storage.pos.x, storage.pos.y + 1, storage.room.name);
            for (const s of binPos.lookFor(LOOK_STRUCTURES)) {
                if ((s as any).structureType === STRUCTURE_CONTAINER) { SO.bin = (s as any).id; break; }
            }
        }
        const spawns = this.room.find(FIND_MY_SPAWNS);
        if (spawns.length) {
            if (this.pos.isNearTo(spawns[0])) spawns[0].recycleCreep(this);
            else this.MoveCostMatrixRoadPrio(spawns[0], 1);
        } else { this.suicide(); }
    }
};

// ── RangedAttackFleeFromMelee ─────────────────────────────────────────────────
Creep.prototype.RangedAttackFleeFromMelee = function (fleeTarget: any): void {
    const path = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 3 }, { flee: true });
    this.move(this.pos.getDirectionTo(path.path[0]));
};

// ── fleeFromMelee / fleeFromRanged  (shared cost-matrix setup) ────────────────
function buildFleeCostMatrix(creep: any, room: Room): CostMatrix {
    const isCarrier = creep.memory.role === "carry" || creep.memory.role === "filler";
    const costs = new PathFinder.CostMatrix();
    buildTerrainBase(costs, room.name, { wall: 255, swamp: isCarrier ? 1 : 5, plain: isCarrier ? 2 : 1 }, false);
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_RAMPART && s.my && s.pos.lookFor(LOOK_STRUCTURES).length === 1) { costs.set(s.pos.x, s.pos.y, 2); return; }
        if (s.structureType === STRUCTURE_ROAD) { costs.set(s.pos.x, s.pos.y, 1); return; }
        if (s.structureType !== STRUCTURE_CONTAINER) costs.set(s.pos.x, s.pos.y, 255);
    });
    return costs;
}

Creep.prototype.fleeFromMelee = function (fleeTarget: Creep): void {
    const costs = buildFleeCostMatrix(this, this.room);
    const path  = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 5 }, { flee: true, roomCallback: () => costs });
    this.move(this.pos.getDirectionTo(path.path[0]));
};

Creep.prototype.fleeFromRanged = function (fleeTarget: Creep): void {
    const costs = buildFleeCostMatrix(this, this.room);
    const path  = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 7 }, { flee: true, roomCallback: () => costs });
    this.move(this.pos.getDirectionTo(path.path[0]));
};

// ── SwapPositionWithCreep  (data-driven table replaces 8 branches) ────────────
Creep.prototype.SwapPositionWithCreep = function (direction: DirectionConstant): void {
    // [dx, dy, opposite direction]
    const TABLE: Record<number, [number, number, DirectionConstant]> = {
        1: [ 0, -1, 5], 2: [ 1, -1, 6], 3: [ 1,  0, 7],
        4: [ 1,  1, 8], 5: [ 0,  1, 1], 6: [-1,  1, 2],
        7: [-1,  0, 3], 8: [-1, -1, 4],
    };
    const entry = TABLE[direction];
    if (!entry) return;
    const [dx, dy, opposite] = entry;
    const nx = this.pos.x + dx, ny = this.pos.y + dy;
    if (nx < 0 || nx > 49 || ny < 0 || ny > 49) return;
    const pos = new RoomPosition(nx, ny, this.room.name);
    let targets = pos.lookFor(LOOK_CREEPS) as any[];
    if (!targets.length) {
        const pcs: any[] = pos.lookFor(LOOK_POWER_CREEPS);
        if (pcs.length) targets = pcs;
    }
    if (targets.length > 0 && targets[0].my && !targets[0].memory.moving) {
        if (targets[0].ticksToLive % 2 < 1) targets[0].move(opposite);
        else if (targets[0].move(direction) !== OK) targets[0].move(opposite);
    }
};

// ── Movement prototypes using shared moveWithPath ─────────────────────────────
Creep.prototype.MoveCostMatrixRoadPrio = function (target: any, range: number, role: string | null = null): void {
    moveWithPath(this, target, range, (rn) => this.memory.fleeing || this.room.memory.danger ? roomCallbackRoadPrioFlee(rn) : roomCallbackRoadPrio(rn, role));
};

Creep.prototype.MoveCostMatrixSwampPrio = function (target: any, range: number): void {
    moveWithPath(this, target, range, roomCallbackSwampPrio, 3);
};

Creep.prototype.MoveCostMatrixIgnoreRoads = function (target: any, range: number): void {
    moveWithPath(this, target, range, roomCallbackIgnoreRoads, 3);
};

Creep.prototype.roomCallbackRoadPrioUpgraderInPosition = function (target: any, range: number): void {
    moveWithPath(this, target, range, roomCallbackRoadPrioUpgraderInPosition, 3);
};

Creep.prototype.MoveToSourceSafely = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;
    // Prefer rampart near source
    const ramparts = this.room.find(FIND_MY_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_RAMPART });
    const nearRamparts = target.pos.findInRange(ramparts, 1);
    let finalTarget = target, finalRange = range;
    for (const r of nearRamparts) {
        const structs = r.pos.lookFor(LOOK_STRUCTURES);
        if (!structs.some((s: any) => [STRUCTURE_LINK, STRUCTURE_EXTENSION, STRUCTURE_TOWER].includes(s.structureType))) {
            finalTarget = r; finalRange = 0; break;
        }
    }
    moveWithPath(this, finalTarget, finalRange, roomCallbackSafeToSource);
};

Creep.prototype.MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    if (this.memory.path?.length > 0) {
        const step = this.memory.path[0];
        if (Math.abs(this.pos.x - step.x) > 1 || Math.abs(this.pos.y - step.y) > 1) this.memory.path = false;
    }

    const needNew = !this.memory.path?.length || this.memory.MoveTargetId !== target.id || target.roomName !== this.room.name;
    if (needNew) {
        let cb: (rn: string) => any;
        if (this.memory.role === "carry" && this.memory.full) cb = roomCallbackRoadPrioAvoidEnemyCreepsMuchForCarrierFull;
        else if (this.memory.role === "carry" && !this.memory.full) cb = roomCallbackRoadPrioAvoidEnemyCreepsMuchForCarrierEmpty;
        else if (this.memory.role === "ram" || this.memory.role === "Solomon") cb = roomCallbackRoadPrioAvoidEnemyCreepsMuchRam;
        else cb = roomCallbackRoadPrioAvoidEnemyCreepsMuch;

        const result = PathFinder.search(this.pos, { pos: target, range }, { maxOps: 1000, maxRooms: 1, roomCallback: (rn) => cb(rn) });
        const pos = result.path[0];
        this.SwapPositionWithCreep(this.pos.getDirectionTo(pos));
        this.memory.path       = result.path;
        this.memory.MoveTargetId = target.id;
    }

    const next = this.memory.path[0];
    this.move(this.pos.getDirectionTo(next));
    this.memory.moving = true;
    this.memory.path.shift();
};

Creep.prototype.moveToSafePositionToRepairRampart = function (target: any, range: number): void {
    let cb: (rn: string) => any;
    if (this.memory.role === "RampartDefender")   cb = roomCallbackForRampartDefender;
    else if (this.memory.role === "RRD")          cb = roomCallbackForRangedRampartDefender;
    else                                          cb = roomCallbackAvoidInvaders;
    moveWithPath(this, target, range, cb);
};
