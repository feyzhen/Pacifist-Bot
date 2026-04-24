// ─────────────────────────────────────────────────────────────────────────────
// rooms.defence.ts  –  Refactored
//
// Changes vs original:
//  1. hasDamagedRamparts() extracted from inside roomDefence() → module level
//  2. Redundant 4-branch tower attack block collapsed to a single if/return
//  3. `Game.time % 17 == 0 || ... == 8`  →  `Game.time % 17 < 9`
//  4. Hard-coded room name "E41N58" replaced by room.memory.rampartSearchRadius
//     (set this to 25 in that room's memory; defaults to 10 everywhere else)
// ─────────────────────────────────────────────────────────────────────────────

// ── Helper: extracted from inside roomDefence (was re-created every tick) ───

function hasDamagedRamparts(roomName: string): boolean {
    const room = Game.rooms[roomName];
    if (!room) { console.log(`hasDamagedRamparts: room ${roomName} not visible.`); return false; }
    const storage = room.storage;
    if (!storage) { return false; }

    const MIN_HITS  = 750_000;
    const MIN_RANGE = 8;
    const MAX_RANGE = 13;

    return room.find(FIND_MY_STRUCTURES, {
        filter: (s: any) =>
            s.structureType === STRUCTURE_RAMPART &&
            s.hits < MIN_HITS &&
            s.pos.getRangeTo(storage.pos) >= MIN_RANGE &&
            s.pos.getRangeTo(storage.pos) <= MAX_RANGE,
    }).length > 0;
}

// ── Helper: shoot one hostile if conditions are met ─────────────────────────
// Extracted the repeated "towerShotsInRow % 800 < 60 && ticksToLive > 50" guard.

function towerShootIfAllowed(
    tower: StructureTower,
    target: Creep,
    shotCounter: number
): void {
    if (shotCounter % 800 < 60 && target.ticksToLive > 50) {
        tower.attack(target);
    }
}

// ── Main defence function ────────────────────────────────────────────────────

function roomDefence(room: Room): void {

    if (!room.memory.defence) {
        room.memory.defence = { towerShotsInRow: 0 };
    }

    // Nuke detection (every 250 ticks is plenty)
    if (Game.time % 250 === 0) {
        const nukes = room.find(FIND_NUKES);
        room.memory.defence.nuke     = nukes.length > 0;
        if (!room.memory.defence.nuke) room.memory.defence.evacuate = false;
    }

    if (room.memory.danger_timer === 0) {
        room.memory.defence.towerShotsInRow = 0;
    }

    // ── Safe-mode trigger ───────────────────────────────────────────────────
    if (
        room.memory.danger &&
        (
            room.memory.danger_timer >= 11_000 ||
            room.memory.danger_timer >= 50 &&
            Game.time % 5 === 0 &&
            hasDamagedRamparts(room.name) &&
            room.find(FIND_MY_SPAWNS).length
        )
    ) {
        const enemies = room.find(FIND_HOSTILE_CREEPS);
        if (enemies.length >= 2) {
            for (const eCreep of enemies) {
                // Skip Invaders and whitelisted players
                if (isAlly(eCreep.owner.username)) continue;
                room.controller.activateSafeMode();
                room.memory.danger_timer = 1;
                break;
            }
        }
    }

    // ── Tower repair when spawn is disrupted ────────────────────────────────
    const spawn = Game.getObjectById<StructureSpawn>(room.memory.Structures.spawn);
    if (
        (Game.cpu.bucket > 300 || Memory.pixelManager?.enabled) &&
        spawn && room.memory.danger && room.memory.danger_timer > 500 &&
        spawn.effects?.length &&
        spawn.effects[0].effect === PWR_DISRUPT_SPAWN &&
        room.storage
    ) {
        const towers = (room.memory.Structures.towers as string[])
            .map(id => Game.getObjectById<StructureTower>(id))
            .filter((t): t is StructureTower => !!t && t.store[RESOURCE_ENERGY] >= 10);

        const candidates = room.find(FIND_MY_STRUCTURES, {
            filter: (s: any) =>
                s.structureType === STRUCTURE_RAMPART &&
                s.pos.getRangeTo(room.storage.pos) >= 8 &&
                s.pos.getRangeTo(room.storage.pos) <= 13,
        }).sort((a: any, b: any) => a.hits - b.hits);

        const rampartToRepair: any = candidates[0];
        if (rampartToRepair) {
            for (const tower of towers) {
                if (
                    rampartToRepair.hits < 2_500_000 ||
                    tower.pos.getRangeTo(rampartToRepair) <= 8 ||
                    tower.store[RESOURCE_ENERGY] >= 800
                ) {
                    tower.repair(rampartToRepair);
                }
            }
        }
    }

    // ── Refresh tower ID cache every 100 ticks ───────────────────────────────
    if (Game.time % 100 === 0) {
        room.memory.Structures.towers = room
            .find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } })
            .map((t: any) => t.id);
    }

    // ── Tower logic ──────────────────────────────────────────────────────────
    if (room.memory.Structures.towers?.length > 0) {

        const canWeShoot = (room.memory.Structures.towers as string[]).filter(id => {
            const t = Game.getObjectById<StructureTower>(id);
            return t && t.store[RESOURCE_ENERGY] > 400;
        }).length;

        for (const towerID of room.memory.Structures.towers as string[]) {
            const tower = Game.getObjectById<StructureTower>(towerID);
            if (!tower) continue;

            const isDanger = room.memory.danger;

            // Heal defenders moving to rampart position
            if (isDanger) {
                const rampartDefenders = room.find(FIND_MY_CREEPS, {
                    filter: (c: Creep) => c.memory.role === "RampartDefender" || c.memory.role === "RRD",
                });
                if (rampartDefenders.length <= 2) {
                    const rampart: any = Game.getObjectById(room.memory.rampartToMan);
                    if (rampart && rampartDefenders[0]) {
                        const def = rampartDefenders[0];
                        const range = def.pos.getRangeTo(rampart);
                        const structs = def.pos.lookFor(LOOK_STRUCTURES);
                        const notOnStructure = structs.length === 0 || (structs.length === 1 && structs[0].structureType === STRUCTURE_ROAD);
                        if ((range === 1 || range === 2) && notOnStructure && range < 6) {
                            tower.heal(def);
                            continue;
                        }
                    }
                }

                const damagedCreeps = _.filter(
                    Game.creeps,
                    (c: Creep) => c.hits + 300 < c.hitsMax && c.room.name === room.name && c.memory.role !== "attacker"
                );
                if (damagedCreeps.length > 0) { tower.heal(damagedCreeps[0]); continue; }
            }

            // Attack hostiles
            if (
                isDanger && tower.store[RESOURCE_ENERGY] > 200 &&
                canWeShoot === room.memory.Structures.towers.length &&
                (Game.cpu.bucket > 250 || Memory.pixelManager?.enabled)
            ) {
                const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
                const rampartDefenders = room.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === "RampartDefender" });
                const rampart: any  = Game.getObjectById(room.memory.rampartToMan);
                const target: any   = Game.getObjectById(room.memory.attack_target);
                const closest       = tower.pos.findClosestByRange(hostileCreeps);

                const shootCondition =
                    (closest && hostileCreeps.length > 1 && rampartDefenders.length >= 1 && room.memory.in_position) ||
                    (closest && hostileCreeps.length === 1) ||
                    (rampartDefenders.length === 0 && closest);

                if (shootCondition && closest) {
                    room.memory.defence.towerShotsInRow += 1;
                    const shots = room.memory.defence.towerShotsInRow;

                    // Prioritise the designated attack_target if it is near a rampart
                    // (≤9 ticks out of every 17 to allow healing ticks — original logic)
                    if (rampart && target && rampart.pos.getRangeTo(target) < 2 && Game.time % 17 < 9) {
                        tower.attack(target);
                        continue;
                    }

                    // All remaining branches had identical bodies — unified here
                    towerShootIfAllowed(tower, closest, shots);
                }
            }

            // Periodic heal for non-danger damaged creeps
            if (Game.time % 12 === 0) {
                const damaged = _.filter(
                    Game.creeps,
                    (c: Creep) => c.hits < c.hitsMax && c.room.name === room.name && !c.memory.suicide && c.memory.role !== "attacker"
                );
                if (damaged.length > 0) { tower.heal(damaged[0]); continue; }

                if (room.controller.level === 8) {
                    const damagedPC = _.filter(
                        Game.powerCreeps,
                        (pc: PowerCreep) => pc.hits < pc.hitsMax && pc.room?.name === room.name
                    );
                    if (damagedPC.length > 0) { tower.heal(damagedPC[0]); continue; }
                }
            }
        }
    }

    // ── Danger detection (every 5 ticks, or every tick while in danger) ──────
    if (Game.time % 5 === 0 || room.memory.danger) {
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const storage: any  = Game.getObjectById(room.memory.Structures.storage);

        if (hostileCreeps.length > 0) {
            room.memory.danger = true;

            // Hostile power creeps get tower-attacked directly
            const hostilePowerCreeps = room.find(FIND_HOSTILE_POWER_CREEPS);
            if (hostilePowerCreeps.length) {
                for (const hpc of hostilePowerCreeps) {
                    if (hpc.pos.lookFor(LOOK_STRUCTURES).length === 0 && room.memory.Structures.towers?.length) {
                        room.roomTowersAttackEnemy(hpc);
                        return;
                    }
                }
            }

            // Rampart range: configurable per room via memory, default 10
            // (replaces the hard-coded "E41N58" → 25 special case)
            const rampartRadius: number = room.memory.rampartSearchRadius ?? 10;
            let myRamparts = room.find(FIND_MY_STRUCTURES, {
                filter: (s: any) => s.structureType === STRUCTURE_RAMPART,
            });
            if (storage) {
                myRamparts = myRamparts.filter((r: any) => r.pos.getRangeTo(storage) <= rampartRadius);
            }

            const myCreeps = room.find(FIND_MY_CREEPS);

            // Low-level room: flee from ranged / melee threats
            if (room.controller.level <= 5) {
                const rangedEnemies = hostileCreeps.filter((c: Creep) => c.getActiveBodyparts(RANGED_ATTACK) > 0);
                const meleeEnemies  = hostileCreeps.filter((c: Creep) => c.getActiveBodyparts(RANGED_ATTACK) === 0 && c.getActiveBodyparts(ATTACK) > 0);

                if (rangedEnemies.length > 0) {
                    for (const creep of myCreeps) {
                        if (["RampartDefender","RRD","ram"].includes(creep.memory.role)) continue;
                        const onRampart = creep.pos.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_RAMPART);
                        const closest   = creep.pos.findClosestByRange(rangedEnemies);
                        const dist      = creep.pos.getRangeTo(closest);
                        if (!creep.room.controller.safeMode && creep.room.controller.level <= 3 && dist <= 5 && !onRampart) {
                            creep.drop(RESOURCE_ENERGY); creep.fleeFromRanged(closest); creep.memory.fleeing = true;
                        } else if (!creep.room.controller.safeMode && dist <= 3 && !onRampart) {
                            creep.fleeFromRanged(closest); creep.memory.fleeing = true;
                        } else {
                            creep.memory.fleeing = false;
                        }
                    }
                } else if (room.controller.safeMode && meleeEnemies.length > 0) {
                    for (const creep of myCreeps) {
                        const closest = creep.pos.findClosestByRange(meleeEnemies);
                        if (
                            creep.pos.getRangeTo(closest) <= 3 &&
                            !PathFinder.search(creep.pos, { pos: closest.pos, range: 1 }, {
                                maxOps: 150, maxRooms: 1,
                                roomCallback: (rn) => pathAroundMyRampartsAndStructuresAndTerrain(rn),
                            }).incomplete
                        ) {
                            creep.drop(RESOURCE_ENERGY); creep.fleeFromMelee(closest); creep.memory.fleeing = true;
                        }
                    }
                }
            }

            // Distress signal
            if (hostileCreeps.length > 1 && myCreeps.length > 1) {
                if (!Memory.DistressSignals) Memory.DistressSignals = {};
                if (!Memory.DistressSignals.reinforce_me) Memory.DistressSignals.reinforce_me = room.name;
            }

            // Find closest rampart to man
            let currentLowestRange = 100;
            let foundCreep = false;

            for (const rampart of myRamparts as any[]) {
                const crepsOnRamp = rampart.pos.lookFor(LOOK_CREEPS);
                if (crepsOnRamp.length > 0 && (crepsOnRamp[0].memory.role === "RampartDefender" || crepsOnRamp[0].memory.role === "RRD")) {
                    room.memory.in_position = true;
                    foundCreep = true;
                    break;
                }
                const myDefenders = myCreeps.filter((c: Creep) => c.memory.role === "RampartDefender" || c.memory.role === "RRD");
                if (myDefenders.length > 0) {
                    const nearest = rampart.pos.findClosestByRange(myDefenders);
                    if (rampart.pos.getRangeTo(nearest) <= 1) continue;
                }
                const closestEnemy = rampart.pos.findClosestByRange(hostileCreeps);
                const rangeToEnemy = rampart.pos.getRangeTo(closestEnemy);
                if (currentLowestRange > rangeToEnemy) {
                    currentLowestRange = rangeToEnemy;
                    const existingRamp: any = Game.getObjectById(room.memory.rampartToMan);
                    if (!existingRamp || existingRamp.pos.findInRange(hostileCreeps, 1).length === 0) {
                        room.memory.rampartToMan = rampart.id;
                    }
                }
            }
            if (!foundCreep) room.memory.in_position = false;

        } else {
            room.memory.danger      = false;
            room.memory.rampartToMan = false;
        }

        room.memory.blown_fuse = hostileCreeps.length > 0;
    }

    if (room.controller.safeMode) {
        room.memory.danger      = false;
        room.memory.blown_fuse  = false;
        room.memory.danger_timer = 0;
    }
}

export default roomDefence;

// ── Path callback used by flee logic ─────────────────────────────────────────

const pathAroundMyRampartsAndStructuresAndTerrain = (roomName: string): boolean | CostMatrix => {
    const room = Game.rooms[roomName];
    if (!room) return false;

    const costs   = new PathFinder.CostMatrix();
    const terrain = new Room.Terrain(roomName);

    for (let y = 0; y <= 49; y++) {
        for (let x = 0; x <= 49; x++) {
            const tile = terrain.get(x, y);
            costs.set(x, y, tile === TERRAIN_MASK_WALL ? 255 : 1);
        }
    }
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD)
            costs.set(s.pos.x, s.pos.y, 255);
    });
    return costs;
};

// ── Ally / whitelist check (imported from whitelist module) ──────────────────
import { isAlly } from "../utils/Whitelist";
