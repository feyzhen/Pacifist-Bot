/**
 * depositMiner — Dedicated deposit harvester.
 * Travels to the target deposit room, harvests the deposit,
 * and transfers energy to nearby depositCarry creeps.
 *
 * Body ratio (set by spawn functions):
 *   RCL8:   WORK:22, CARRY:6, MOVE:22
 *   Other:  WORK:2, CARRY:1, MOVE:2
 */
const run = function (creep: any) {
    creep.memory.moving = false;

    // ── Evacuation & danger checks ──────────────────────────────────
    if (creep.evacuate()) return;
    if (creep.fleeHomeIfInDanger() == "timeOut") return;

    // ── Phase 1: Travel to target room ──────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    // ── Phase 2: Harvest deposit ────────────────────────────────────
    const deposit: any = Game.getObjectById(creep.memory.deposit);
    if (!deposit) {
        creep.memory.suicide = true;
        return;
    }

    // Wait for cooldown to expire
    if (deposit.cooldown > 0) {
        if (creep.pos.getRangeTo(deposit) > 1) {
            creep.moveTo(deposit);
        }
        return;
    }

    // Harvest when adjacent
    if (creep.pos.getRangeTo(deposit) <= 1) {
        creep.harvest(deposit);
        creep.memory.moving = false;
    } else {
        creep.moveTo(deposit);
    }

    // ── Phase 3: Transfer when full ─────────────────────────────────
    if (creep.store.getFreeCapacity() === 0) {
        const depositType = creep.memory.depositType || RESOURCE_ENERGY;

        // Try to transfer to a cached carrier first
        let carrier: any = null;
        if (creep.memory.transferTarget) {
            carrier = Game.getObjectById(creep.memory.transferTarget);
            if (!carrier || carrier.memory.role !== "depositCarry") {
                carrier = null;
                delete creep.memory.transferTarget;
            }
        }

        // Fallback: find any nearby depositCarry
        if (!carrier) {
            const carriers = creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === "depositCarry" && c.store.getUsedCapacity() < c.store.getCapacity()
            });
            if (carriers.length > 0) {
                carrier = creep.pos.findClosestByRange(carriers);
            }
        }

        if (carrier) {
            if (creep.pos.isNearTo(carrier)) {
                const result = creep.transfer(carrier, depositType);
                if (result === OK) {
                    creep.memory.transferTarget = carrier.id;
                }
            } else {
                creep.moveTo(carrier);
            }
            return;
        }

        // No carrier nearby — drop energy or transfer to container
        const dropped = creep.pos.lookFor(LOOK_RESOURCES);
        const energyDrops = dropped.filter(r => r.resourceType === depositType);
        if (energyDrops.length > 0) {
            creep.pickup(energyDrops[0]);
            return;
        }

        // Try container nearby
        const containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         (s as StructureContainer).store.getFreeCapacity(depositType) > 0
        });
        if (containers.length > 0) {
            creep.transfer(containers[0] as StructureContainer, depositType);
            return;
        }

        // Otherwise just wait — carrier may arrive next tick
    }

    // ── Phase 4: End-of-life ────────────────────────────────────────
    if (creep.ticksToLive <= 30) {
        creep.memory.suicide = true;
    }
    if (creep.memory.suicide) {
        creep.recycle();
    }
};

const roleDepositMiner = { run };
export default roleDepositMiner;
