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

    // Check if position is in the same room as creep's work
    if (pos.roomName !== roomName) {
        return false;
    }

    switch (role) {
        case 'harvester':
        case 'EnergyMiner':
            // Harvesters work near sources
            const sources = creep.room.find(FIND_SOURCES);
            return sources.some(source => source.pos.getRangeTo(pos) <= 1);

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
            return structuresNeedingRepair.some(structure => structure.pos.getRangeTo(pos) <= 1);

        case 'carry':
        case 'EnergyManager':
        case 'filler':
        case 'ControllerLinkFiller':
            // Transport creeps work near storage, containers, or spawn
            const storage = creep.room.storage;
            const terminal = creep.room.terminal;
            const spawns = creep.room.find(FIND_MY_SPAWNS);
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            });

            const workTargets = [storage, terminal, ...spawns, ...containers].filter(Boolean);
            return workTargets.some(target => target.pos.getRangeTo(pos) <= 2);

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
        case 'RemoteDismantler':
            // Dismantlers work near structures to dismantle
            const structures = creep.room.find(FIND_STRUCTURES);
            return structures.some(structure => structure.pos.getRangeTo(pos) <= 1);

        default:
            // For unknown roles, treat all positions as work tiles
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
