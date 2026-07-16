/**
 * Utility functions for Super Move Optimization module
 */

/**
 * Determine if a position is a work tile for a creep
 * This function helps the movement system prioritize keeping creeps in their work areas
 * @param creep The creep to check
 * @param pos The position to check
 * @returns true if the position is a work tile for the creep
 */
export function isWorkTile(creep: Creep, pos: RoomPosition): boolean {
    // If creep has no memory or role, treat all positions as work tiles
    if (!creep.memory || !creep.memory.role) {
        return true;
    }

    const role = creep.memory.role;
    const roomName = creep.room.name;
    const targetRoom = creep.memory.targetRoom;

    // Check if position is in the same room as creep's work
    if (pos.roomName !== roomName) {
        // For cross-room creeps, also check if pos is in targetRoom
        if (targetRoom && pos.roomName === targetRoom) {
            return isWorkTileInRoom(creep, pos, targetRoom);
        }
        return false;
    }

    // Local check for roles that only work in their home room
    switch (role) {
        case 'harvester':
        case 'EnergyMiner':
            // Harvesters work near sources
            const sources = creep.room.find(FIND_SOURCES);
            return sources.some(source => source.pos.getRangeTo(pos) <= 1);
        case 'mineralMiner':
            // Mineral miners work near minerals
            const minerals = creep.room.find(FIND_MINERALS);
            return minerals.some(mineral => mineral.pos.getRangeTo(pos) <= 1);
        case 'upgrader':
            // Upgraders work near controller
            return creep.room.controller && creep.room.controller.pos.getRangeTo(pos) <= 3;

        case 'builder':
        case 'repair':
        case 'maintainer':
            // Construction and repair creeps work near construction sites or structures that need repair
            const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites.some(site => site.pos.getRangeTo(pos) <= 2)) {
                return true;
            }
            // Check for structures that need repair
            const structuresNeedingRepair = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType !== STRUCTURE_WALL &&
                                  structure.structureType !== STRUCTURE_RAMPART &&
                                  structure.hits < structure.hitsMax
            });
            return structuresNeedingRepair.some(structure => structure.pos.getRangeTo(pos) <= 3);

        case 'carry':
            // Carry creeps work near storage, containers, or spawn
            const storage_carry = creep.room.storage;
            const terminal = creep.room.terminal;
            const spawns_carry = creep.room.find(FIND_MY_SPAWNS);
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            });

            const workTargets = [storage_carry, terminal, ...spawns_carry, ...containers].filter(Boolean);
            return workTargets.some(target => target.pos.getRangeTo(pos) <= 2);

        case 'EnergyManager':
            // EnergyManager has no fixed work tile — it shuttles between many targets (labs, storage, terminal, power spawn, etc.)
            return true;

        case 'filler':
        case 'controllerLinkFiller':
            if (!(creep.memory as Record<string, any>).full) {
                const storage = Game.getObjectById(creep.room.memory.Structures?.storage) || creep.room.findStorage();
                const containers = creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_CONTAINER
                });
                const loadTargets = [storage, ...containers].filter(Boolean) as any;
                if (loadTargets.some(t => t.pos.getRangeTo(pos) <= 1)) {
                    return true;
                }
                const dropped = creep.room.find(FIND_DROPPED_RESOURCES);
                return !!dropped.some(d => d.pos.getRangeTo(pos) <= 1);

            }
            {
                const mem = creep.memory as Record<string, any>;
                const target = mem.t ? Game.getObjectById(mem.t) as any : null;
                if (target) {
                    return target.pos.getRangeTo(pos) <= 1;
                }
                // Full but no target — creep is moving to find a new target, allow movement everywhere
                return true;
            }

        case 'defender':
        case 'attacker':
        case 'RangedAttacker':
        case 'healer':
        case 'scout':
            // Combat creeps don't have specific work tiles - they can move anywhere
            return true;

        case 'claimer':
        case 'reserve':
            // Claim and reserve creeps work near controllers
            return creep.room.controller && creep.room.controller.pos.getRangeTo(pos) <= 1;

        case 'dismantler':
            // Local dismantlers work near structures to dismantle
            const structures = creep.room.find(FIND_STRUCTURES);
            return structures.some(structure => structure.pos.getRangeTo(pos) <= 1);

        default:
            // For roles with targetRoom, delegate to cross-room check
            if (targetRoom && pos.roomName === targetRoom) {
                return isWorkTileInRoom(creep, pos, targetRoom);
            }
            // Unknown role without targetRoom: treat all positions as work tiles
            return true;
    }
}

/**
 * Helper to check work tiles when a creep is in its targetRoom (cross-room creep)
 */
function isWorkTileInRoom(creep: Creep, pos: RoomPosition, targetRoom: string): boolean {
    const role = creep.memory.role;

    switch (role) {
        case 'remoteBuilder':
        case 'remoteRepair':
        case 'SpecialRepair':
            // Remote builders/repairers work near construction sites or damaged structures
            const sites = Game.rooms[targetRoom]?.find(FIND_CONSTRUCTION_SITES);
            if (sites?.some(site => site.pos.getRangeTo(pos) <= 2)) {
                return true;
            }
            const structs = Game.rooms[targetRoom]?.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType !== STRUCTURE_WALL &&
                              s.structureType !== STRUCTURE_RAMPART &&
                              s.hits < s.hitsMax
            });
            return !!structs?.some(s => s.pos.getRangeTo(pos) <= 3);

        case 'remoteDismantler':
        case 'RemoteDismantler':
            // Remote dismantlers work near structures to dismantle
            const rStructs = Game.rooms[targetRoom]?.find(FIND_STRUCTURES);
            return !!rStructs?.some(s => s.pos.getRangeTo(pos) <= 1);

        case 'wallClearer':
            // Wall clearers work near walls or controller
            const walls = Game.rooms[targetRoom]?.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_WALL
            });
            if (walls?.some(w => w.pos.getRangeTo(pos) <= 1)) {
                return true;
            }
            const ctrl = Game.rooms[targetRoom]?.controller;
            return !!ctrl && ctrl.pos.getRangeTo(pos) <= 1;

        // case 'depositCarry':
        case 'depositMiner':
            // Deposit creeps work near the deposit resource
            const deposit = Game.getObjectById(creep.memory.deposit) as Source | Mineral | Deposit | null;
            return deposit && deposit.pos.getRangeTo(pos) <= 1;

        case 'resourceHauler':
            // Resource haulers work near storage/terminal in target room
            const room_haul = Game.rooms[targetRoom];
            if (!room_haul) return false;
            const storage_haul = room_haul.storage;
            const terminal_haul = room_haul.terminal;
            const haulTargets = [storage_haul, terminal_haul].filter(Boolean);
            return haulTargets.some(t => t.pos.getRangeTo(pos) <= 2);

        case 'DrainTower':
            // Drain tower creeps work near controller for ranged mass attack
            const drainCtrl = Game.rooms[targetRoom]?.controller;
            return !!drainCtrl && drainCtrl.pos.getRangeTo(pos) <= 3;

        case 'signifer':
            // Signifer follows ram — no fixed work tile
            return true;

        case 'powerMelee':
        case 'powerHeal':
            // Power creeps are combat-oriented, no fixed work tile
            return true;

        default:
            // Unknown cross-room role: allow in target room
            return true;
    }
}

/**
 * Example isWorkTile function that can be customized based on your bot's needs
 * This is a simpler version that returns true for all creeps not currently working
 */
export function defaultIsWorkTile(creep: Creep, pos: RoomPosition): boolean {
    // Default implementation: if creep is not in a working state, any position is fine
    // You should customize this based on your bot's logic
    return true;
}
