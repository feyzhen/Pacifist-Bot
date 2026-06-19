/**
 * depositCarry — Dedicated energy transporter.
 * Travels to the target deposit room, collects energy from depositMiner creeps,
 * and returns to home room to deposit into storage.
 *
 * Body ratio: CARRY:1, MOVE:1 (dynamic via getBodyByRatio)
 */
const run = function (creep: any) {
    creep.memory.moving = false;

    // ── Evacuation & danger checks ──────────────────────────────────
    if (creep.evacuate()) return;
    if (creep.fleeHomeIfInDanger() == "timeOut") return;

    // ── State tracking ──────────────────────────────────────────────
    const depositType = creep.memory.depositType || RESOURCE_ENERGY;

    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.full = true;
    }
    if (creep.store.getFreeCapacity() > 0 && creep.store[depositType] === 0) {
        creep.memory.full = false;
    }

    // ── Phase 1: Travel to target room ──────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    // ── Phase 2: Collect energy from miners ─────────────────────────
    if (!creep.memory.full) {
        const miners = creep.room.find(FIND_MY_CREEPS, {
            filter: c => c.memory.role === "depositMiner" && c.store[depositType] > 0
        });

        if (miners.length > 0) {
            const target = creep.pos.findClosestByRange(miners);
            if (creep.pos.isNearTo(target)) {
                creep.withdraw(target, depositType);
            } else {
                creep.moveTo(target);
            }
            return;
        }

        // Fallback: pick up dropped energy
        const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === depositType
        });
        if (dropped.length > 0) {
            const target = dropped[0];
            if (creep.pos.getRangeTo(target) <= 1) {
                creep.pickup(target);
            } else {
                creep.moveTo(target);
            }
            return;
        }

        // No miners found — wait briefly, then suicide
        if (!creep.memory.waitStart) {
            creep.memory.waitStart = Game.time;
        }
        if (Game.time - creep.memory.waitStart > 100) {
            creep.memory.suicide = true;
        }
        return;
    }

    // ── Phase 3: Return home ────────────────────────────────────────
    if (creep.memory.full) {
        if (creep.room.name !== creep.memory.homeRoom) {
            return creep.moveToRoomAvoidEnemyRooms(creep.memory.homeRoom);
        }

        // Priority 1: storage
        let storage: any = Game.getObjectById(creep.memory.storage) || creep.findStorage();
        if (storage && storage.store.getFreeCapacity(depositType) > 0) {
            if (creep.pos.isNearTo(storage)) {
                const result = creep.transfer(storage, depositType);
                if (result === OK && creep.store[depositType] === 0) {
                    creep.memory.full = false;
                    delete creep.memory.waitStart;
                }
            } else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        // Priority 2: terminal
        if (creep.room.terminal && creep.room.terminal.store.getFreeCapacity(depositType) > 0) {
            if (creep.pos.isNearTo(creep.room.terminal)) {
                creep.transfer(creep.room.terminal, depositType);
                creep.memory.full = false;
                delete creep.memory.waitStart;
            } else {
                creep.MoveCostMatrixRoadPrio(creep.room.terminal, 1);
            }
            return;
        }

        // No receiver — wait
        return;
    }

    // ── Phase 4: End-of-life ────────────────────────────────────────
    if (creep.memory.suicide) {
        creep.recycle();
    }
};

const roleDepositCarry = { run };
export default roleDepositCarry;
