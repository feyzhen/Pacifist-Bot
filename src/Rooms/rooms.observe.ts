import { isObserveEnabled, isScoutEnabled, debugLog } from '../Misc/observeManager';

// DismantleControllerWalls body: 20 MOVE + 25 WORK
const DISMANTLE_BODY = [
  ...Array(25).fill(MOVE),
  ...Array(25).fill(WORK),
];

// ── Module-level helpers for deposit hostile state machine ──────────────

interface DepositMeta {
    type: string;
    pos: { x: number; y: number };
    lastCooldown: number;
    lastObserved: number;
    spawnDelay: number;
    threatChecked: boolean;
    maxPairs: number;
    hostilePhase: string;
    lastHostileSeen: number | null;
    lastDrainSpawned: number | null;
    lastEliminateSpawned: number | null;
    lastAbandoned?: number;
}

/** Classify hostile threat: military parts / total parts, strong if >= 30% */
function classifyThreat(hostileCreeps: Creep[]): { militaryRatio: number; isStrong: boolean } {
    let totalMilitary = 0, totalParts = 0;
    for (const h of hostileCreeps) {
        const body = (h as any).body;
        if (!body) continue;
        let m = 0, p = 0;
        for (const part of body) {
            p += (part as any).num || 1;
            if ((part as any).part === ATTACK || (part as any).part === RANGED_ATTACK || (part as any).part === HEAL) m += (part as any).num || 1;
        }
        totalMilitary += m;
        totalParts += p;
    }
    return { militaryRatio: totalParts > 0 ? totalMilitary / totalParts : 0, isStrong: totalMilitary / totalParts >= 0.3 };
}

/** Count stationed RangedElites for a given targetRoom and wave type.
 * Includes both living creeps and creeps in spawn_list. */
function countStationedElite(targetRoom: string, wave: string): number {
    let count = Object.values(Game.creeps).filter(
        c => (c as any).memory.role === "RangedElite" && (c as any).memory.targetRoom === targetRoom && (c as any).memory.wave === wave
    ).length;
    // Also count creeps in spawn_list (haven't been born yet)
    for (const room of Object.values(Game.rooms) as any[]) {
        if (!room?.memory?.spawn_list) continue;
        for (const entry of room.memory.spawn_list) {
            if (entry && typeof entry === "object" && entry[2] && entry[2].memory) {
                const m = entry[2].memory;
                if (m.role === "RangedElite" && m.targetRoom === targetRoom && m.wave === wave) {
                    count++;
                }
            }
        }
    }
    return count;
}

/** Ensure per-deposit tracking structure exists, initializing hostile fields. Returns the meta object. */
function ensureDepMeta(depositMining: any, roomName: string, depId: string, deposit: any): DepositMeta {
    if (!depositMining[roomName]) depositMining[roomName] = {};
    if (!depositMining[roomName][depId]) {
        depositMining[roomName][depId] = {
            type: deposit.depositType,
            pos: { x: deposit.pos.x, y: deposit.pos.y },
            lastCooldown: deposit.lastCooldown,
            lastObserved: Game.time,
            spawnDelay: Game.time + 1000,
            threatChecked: true,
            maxPairs: deposit.pos.getOpenPositionsIgnoreCreepsCheckStructs().length,
            hostilePhase: "none",
            lastHostileSeen: null,
            lastDrainSpawned: null,
            lastEliminateSpawned: null,
        };
    }
    return depositMining[roomName][depId];
}

/** Count alive miners/carries for a deposit from Game.creeps + spawn_list */
function countAliveMinersCarries(room: any, targetRoom: string, depositId?: string): { miners: number; carries: number } {
    let miners = 0, carries = 0;
    const allSources = [
        ...Object.values(Game.creeps),
        ...(room.memory.spawn_list || []).filter(e => e && typeof e === "object" && e[2] && e[2].memory)
    ];
    for (const src of allSources) {
        const mem = src.memory || (src as any)[2].memory;
        if (mem.role === "depositMiner" && mem.targetRoom === targetRoom) {
            if (depositId && mem.deposit !== depositId) continue;
            miners++;
        }
        if (mem.role === "depositCarry" && mem.targetRoom === targetRoom) {
            carries++;
        }
    }
    return { miners, carries };
}

/** Spawn miners/carries for a deposit based on maxPairs and alive count.
 * Alternates between miner and carry to maintain ~2:1 ratio. */
function spawnMinersCarries(homeRoom: string, targetRoom: string, depId: string, maxPairs: number) {
    const { miners, carries } = countAliveMinersCarries(Game.rooms[homeRoom], targetRoom, depId);
    let minersNeeded = Math.max(0, maxPairs - miners);
    let carryNeeded = Math.max(0, Math.floor((maxPairs + 1) / 2) - carries);
    let spawnMiner = true; // alternate starting with miner

    while (minersNeeded > 0 || carryNeeded > 0) {
        if (spawnMiner) {
            if (minersNeeded > 0) {
                if (global.SDMine(homeRoom, targetRoom, depId) !== "Success!") break;
                minersNeeded--;
            }
        } else {
            if (carryNeeded > 0) {
                if (global.SDCarry(homeRoom, targetRoom) !== "Success!") break;
                carryNeeded--;
            }
        }
        spawnMiner = !spawnMiner;
    }
}

/**
 * Process a single deposit entry through the hostile state machine.
 * @returns true if spawn was attempted (or skipped due to phase), false if deposit was skipped (cooldown/invalid)
 */
function processDeposit(
    deposit: any,
    depId: string,
    depMeta: DepositMeta,
    isHostile: boolean,
    prevLastHostileSeen: number | null,
    homeRoom: string,
    targetRoom: string,
    isStrong: boolean
): boolean {
    if (deposit.lastCooldown > 100) return false;

    // Update tracking
    if (isHostile) depMeta.lastHostileSeen = Game.time;
    depMeta.lastObserved = Game.time;
    depMeta.lastCooldown = deposit.lastCooldown;

    // ── Abandoned cooldown reset ────────────────────────────
    if (depMeta.hostilePhase === "abandoned") {
        if (depMeta.lastAbandoned && (Game.time - depMeta.lastAbandoned > 5000)) {
            depMeta.hostilePhase = "none";
            depMeta.lastHostileSeen = null;
            depMeta.lastDrainSpawned = null;
            depMeta.lastEliminateSpawned = null;
            delete depMeta.lastAbandoned;
            console.log(`[deposit] ${targetRoom}/${depId} abandoned cooldown expired, resetting`);
        } else {
            return false;
        }
    }

    // ── Hostile cleared: check if elite is still needed ─────
    if (!isHostile && (depMeta.hostilePhase === "drain" || depMeta.hostilePhase === "eliminate")) {
        const eliteWave = depMeta.hostilePhase === "drain" ? "drain" : "eliminate";
        if (countStationedElite(targetRoom, eliteWave) === 0) {
            depMeta.hostilePhase = "none";
            depMeta.lastHostileSeen = null;
            depMeta.lastDrainSpawned = null;
            depMeta.lastEliminateSpawned = null;
            console.log(`[deposit] ${targetRoom}/${depId} hostile cleared, elite dead, resuming spawn`);
        } else {
            return false;
        }
    }

    // ── Spawn delay ─────────────────────────────────────────
    if (Game.time < depMeta.spawnDelay) return false;

    // ── State machine transitions ───────────────────────────
    if (isHostile && depMeta.hostilePhase === "drain") {
        if (countStationedElite(targetRoom, "drain") === 0 && depMeta.lastDrainSpawned) {
            const escResult = global.SRE(homeRoom, targetRoom, true);
            if (escResult === "Success!") {
                depMeta.hostilePhase = "eliminate";
                depMeta.lastEliminateSpawned = Game.time;
                console.log(`[deposit] ${targetRoom}/${depId} drain died, escalating to eliminate wave`);
            } else {
                console.log(`[deposit] ${targetRoom}/${depId} eliminate spawn failed: ${escResult}`);
                // Keep drain phase, will retry next tick
            }
        }
    } else if (isHostile && depMeta.hostilePhase === "eliminate") {
        if (countStationedElite(targetRoom, "eliminate") === 0 && depMeta.lastEliminateSpawned) {
            depMeta.hostilePhase = "abandoned";
            depMeta.lastAbandoned = Game.time;
            console.log(`[deposit] ${targetRoom}/${depId} eliminate died, abandoning`);
        }
    }

    // ── Spawn logic based on phase ──────────────────────────
    if (depMeta.hostilePhase === "none") {
        // Transition to drain on 2nd consecutive hostile sighting
        if (isHostile && prevLastHostileSeen !== null) {
            const ticksSince = Game.time - prevLastHostileSeen;
            if (ticksSince >= 64 && ticksSince < 130) {
                depMeta.hostilePhase = "drain";
                depMeta.lastDrainSpawned = Game.time;
                const drainResult = global.SRE(homeRoom, targetRoom, false);
                if (drainResult === "Success!") {
                    console.log(`[deposit] ${targetRoom}/${depId} hostile persistent, spawning drain wave`);
                    // Drain wave spawned successfully — stop spawning deposits.
                    // Caller will handle weak-hostile spawn on subsequent ticks.
                    return true;
                } else {
                    console.log(`[deposit] ${targetRoom}/${depId} drain spawn failed: ${drainResult}`);
                    // Spawn failed — revert to none so we retry next tick
                    depMeta.hostilePhase = "none";
                    depMeta.lastDrainSpawned = null;
                    // Fall through to normal spawn below
                }
            }
        }
        // First hostile sighting (or drain spawn failed) — spawn deposits normally
        spawnMinersCarries(homeRoom, targetRoom, depId, depMeta.maxPairs);
    }
    // drain/eliminate/abandoned phases: no spawn from here.
    // (weak hostile spawn is handled by caller after processDeposit returns)
    return true;
}

function observe(room) {
    const interval = 64;
    const twoTimesInterval = interval*2
    const observer:any = Game.getObjectById(room.memory.Structures.observer) || room.findObserver();
    const observeConfig = isObserveEnabled();
    const enemyScoutEnabled = isScoutEnabled('enemy');
    const mineScoutEnabled = isScoutEnabled('mine');
    const powerScoutEnabled = isScoutEnabled('power');
    if(observeConfig && observer && (Game.time % interval == 0 || Game.time % interval == 1) && (Game.cpu.bucket > 8000 || Memory.pixelManager?.enabled)) {
        if(!room.memory.observe) {
            room.memory.observe = {};
        }

        if(!room.memory.observe.RoomsToSee) {
            const RoomsToSee = [];

            if(room.name.length == 6) {
                const EastOrWest = room.name[0];
                const NorthOrSouth = room.name[3];

                const homeRoomNameX = parseInt(room.name[1] + room.name[2]);
                const homeRoomNameY = parseInt(room.name[4] + room.name[5]);
                for(let i = homeRoomNameX-5; i<=homeRoomNameX+5; i++) {
                    for(let o = homeRoomNameY-5; o<=homeRoomNameY+5; o++) {
                        if(i % 10 !== 0 && o % 10 !== 0) {
                            if(i % 10 >= 4 && i % 10 <= 6 && o % 10 >= 4 && o % 10 <= 6) {
                                // do nothing
                            }
                            else {
                                const firstString = i.toString();
                                const secondString = o.toString();
                                const roomName = EastOrWest + firstString + NorthOrSouth + secondString;
                                if(room.name !== roomName) {
                                    RoomsToSee.push(roomName);
                                }
                            }
                        }
                    }
                }
            }
            else if(room.name.length !== 6) {
                const EastOrWest = room.name[0];
                let NorthOrSouth;
                let homeRoomNameX;
                let homeRoomNameY;
                if(!isNaN(room.name[2])) {
                    NorthOrSouth = room.name[3];
                    homeRoomNameX = parseInt(room.name[1] + room.name[2]);
                    homeRoomNameY = parseInt(room.name[4]);
                }
                else {
                    NorthOrSouth = room.name[2];
                    homeRoomNameX = parseInt(room.name[1]);
                    if(room.name.length == 4) {
                        homeRoomNameY = parseInt(room.name[3]);
                    }
                    else if(room.name.length == 5) {
                        homeRoomNameY = parseInt(room.name[3] + room.name[4]);
                    }
                }
                for(let i = homeRoomNameX-4; i<=homeRoomNameX+4; i++) {
                    let EorW;
                    let x;
                    let switchX = false;
                    if(i < 0) {
                        switchX = true;
                    }

                    if(switchX) {
                        x = Math.abs(i);
                        x -= 1;
                        if(EastOrWest == "E") {
                            EorW = "W"
                        }
                        else {
                            EorW = "E";
                        }
                    }
                    else {
                        x = i;
                        EorW = EastOrWest;
                    }
                    for(let o = homeRoomNameY-4; o<=homeRoomNameY+4; o++) {
                        let NorS;
                        let y;
                        let switchY = false;
                        if(o < 0) {
                            switchY = true;
                        }

                        if(switchY) {
                            y = Math.abs(o);
                            y -= 1;
                            if(NorthOrSouth == "N") {
                                NorS = "S"
                            }
                            else {
                                NorS = "N";
                            }
                        }
                        else {
                            y = o;
                            NorS = NorthOrSouth;
                        }
                        if(x % 10 !== 0 && y % 10 !== 0) {
                            if(x % 10 >= 4 && x % 10 <= 6 && y % 10 >= 4 && y % 10 <= 6) {
                                // do nothing
                            }
                            else {

                                const firstString = x.toString();
                                const secondString = y.toString();
                                const roomName = EorW + firstString + NorS + secondString;
                                if(room.name !== roomName) {
                                    RoomsToSee.push(roomName);
                                }
                            }
                        }
                    }
                }
            }

            room.memory.observe.RoomsToSee = RoomsToSee;
        }

        const RoomsToSee = room.memory.observe.RoomsToSee

        if(RoomsToSee.length > 0 && Game.time % interval == 0) {
            if(!room.memory.observe.lastObserved || room.memory.observe.lastObserved >= RoomsToSee.length) {
                room.memory.observe.lastObserved = 0
            }


            const chosenRoom = RoomsToSee[room.memory.observe.lastObserved]
            observer.observeRoom(chosenRoom);


            debugLog("seeing", chosenRoom)


            room.memory.observe.lastObserved += 1;
            room.memory.observe.lastRoomObserved = chosenRoom;

        }

        if(Game.time % interval == 1) {
            const adj = room.memory.observe.lastRoomObserved;
            if(enemyScoutEnabled && areRoomsNormalToThisRoom(room.name, adj)) {
                if (
                  Game.rooms[adj] &&
                  room.name !== adj &&
                  Game.rooms[adj].controller &&
                  Game.rooms[adj].controller.owner &&
                  !Game.rooms[adj].controller.my &&
                  !(Memory as any).allies?.includes(Game.rooms[adj].controller.owner.username) &&
                  Game.map.getRoomStatus(adj).status == "normal"
                ) {
                  const buildings = Game.rooms[adj].find(FIND_STRUCTURES, {
                    filter: s =>
                      s.structureType !== STRUCTURE_ROAD &&
                      s.structureType !== STRUCTURE_CONTAINER &&
                      s.structureType !== STRUCTURE_CONTROLLER &&
                      s.structureType !== STRUCTURE_INVADER_CORE &&
                      s.pos.x >= 1 &&
                      s.pos.x <= 48 &&
                      s.pos.y >= 1 &&
                      s.pos.y <= 48
                  });
                  let openControllerPositions;

                  if (Game.rooms[adj].controller.level == 0) {
                    openControllerPositions = Game.rooms[adj].controller.pos.getOpenPositionsIgnoreCreepsCheckStructs();

                    // remove this room name from avoidrooms
                    if (!Memory.AvoidRooms) {
                      Memory.AvoidRooms = [];
                    }
                    Memory.AvoidRooms = Memory.AvoidRooms.filter(room => room !== adj);


                    if (
                      openControllerPositions &&
                      openControllerPositions.length > 0 &&
                      buildings.length > 0 &&
                      !Game.rooms[adj].controller.reservation
                    ) {
                      if (Memory.CanClaimRemote >= 1) {
                        let canReachController = true;

                        const nameOfRoomsWithExits = Object.values(Game.map.describeExits(adj));
                        for (const roomName of nameOfRoomsWithExits) {
                          const exitDirection: any = Game.map.findExit(room.name, roomName);
                          const exit: any = Game.rooms[adj].controller.pos.findClosestByRange(exitDirection);
                          if (exit) {
                            if (
                              PathFinder.search(
                                Game.rooms[adj].controller.pos,
                                { pos: exit, range: 0 },
                                {
                                  maxRooms: 1,
                                  maxCost: 600,
                                  swampCost: 1,
                                  roomCallback: function (roomName): any {
                                    const thisRoom = Game.rooms[roomName];
                                    if (!thisRoom) return new PathFinder.CostMatrix();
                                    const costs = new PathFinder.CostMatrix();

                                    thisRoom.find(FIND_STRUCTURES).forEach(function (struct) {
                                      if (struct.structureType === STRUCTURE_ROAD) {
                                        // Favor roads over plain tiles
                                        costs.set(struct.pos.x, struct.pos.y, 1);
                                      } else if (
                                        struct.structureType !== STRUCTURE_CONTAINER &&
                                        (struct.structureType !== STRUCTURE_RAMPART || !struct.my)
                                      ) {
                                        // Can't walk through non-walkable buildings
                                        costs.set(struct.pos.x, struct.pos.y, 255);
                                      }
                                    });

                                    return costs;
                                  }
                                }
                              ).incomplete
                            ) {
                              canReachController = false;
                              break;
                            }
                          } else {
                            canReachController = true;
                          }
                        }

                        if (canReachController) {
                          let found = false;

                          for (const creepName in Game.creeps) {
                            if (creepName.startsWith("WallClearer")) {
                              if (
                                Game.creeps[creepName].memory.role == "WallClearer" &&
                                Game.creeps[creepName].memory.homeRoom == room.name
                              ) {
                                found = true;
                                break;
                              }
                            }
                          }

                          if (!found) {
                            const newName = "WallClearer-" + room.name + "-" + adj;
                            room.memory.spawn_list.push([CLAIM, MOVE], newName, {
                              memory: { role: "WallClearer", homeRoom: room.name, targetRoom: adj }
                            });
                            console.log("Adding wall-clearer to Spawn List: " + newName);
                          }
                        }
                        if (!canReachController) {
                          let found = false;

                          for (const creepName in Game.creeps) {
                            if (creepName.startsWith("DismantleControllerWalls")) {
                              if (
                                Game.creeps[creepName].memory.role == "DismantleControllerWalls" &&
                                Game.creeps[creepName].memory.homeRoom == room.name
                              ) {
                                found = true;
                                break;
                              }
                            }
                          }

                          if (!found) {
                            const newName = "DismantleControllerWalls-" + room.name + "-" + adj;
                            room.memory.spawn_list.push(
                              DISMANTLE_BODY,
                              newName,
                              { memory: { role: "DismantleControllerWalls", homeRoom: room.name, targetRoom: adj } }
                            );
                            console.log("Adding DismantleControllerWalls to Spawn List: " + newName);
                          }
                        }
                      }
                    } else if (openControllerPositions && openControllerPositions.length == 0) {
                      let found = false;

                      for (const creepName in Game.creeps) {
                        if (creepName.startsWith("DismantleControllerWalls")) {
                          if (
                            Game.creeps[creepName].memory.role == "DismantleControllerWalls" &&
                            Game.creeps[creepName].memory.homeRoom == room.name
                          ) {
                            found = true;
                            break;
                          }
                        }
                      }

                      if (!found) {
                        const newName = "DismantleControllerWalls-" + room.name + "-" + adj;
                        room.memory.spawn_list.push(
                          DISMANTLE_BODY,
                          newName,
                          { memory: { role: "DismantleControllerWalls", homeRoom: room.name, targetRoom: adj } }
                        );
                        console.log("Adding DismantleControllerWalls to Spawn List: " + newName);
                      }
                    }
                  } else if (Game.rooms[adj].controller.level == 2 && !Game.rooms[adj].controller.safeMode) {
                    const hostileSpawns = Game.rooms[adj].find(FIND_HOSTILE_SPAWNS);
                    const hostileCreeps = Game.rooms[adj].find(FIND_HOSTILE_CREEPS);
                    if (hostileSpawns.length > 0 && hostileCreeps.length > 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });

                      Memory.commandsToExecute.push({
                        delay: 5000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileCreeps.length && !hostileSpawns.length) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 50,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    }
                  } else if (
                    (Game.rooms[adj].controller.level == 3 || Game.rooms[adj].controller.level == 4) &&
                    !Game.rooms[adj].controller.safeMode
                  ) {
                    const controllerFreePositions = Game.rooms[adj].controller.pos.getOpenPositionsIgnoreCreeps().length;
                    const hostileSpawns = Game.rooms[adj].find(FIND_HOSTILE_SPAWNS);
                    const hostileCreeps = Game.rooms[adj].find(FIND_HOSTILE_CREEPS);
                    const hostileTowers = Game.rooms[adj].find(FIND_HOSTILE_STRUCTURES, {
                      filter: s => s.structureType == STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] > 9
                    });
                    if (hostileSpawns.length > 0 && hostileTowers.length > 0) {
                      // if(controllerFreePositions > 1 && room.storage && room.storage.store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] > 2000 && room.storage.store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] > 3000 && room.storage.store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] > 1000 && room.storage.store[RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE] > 2000) {
                      //     global.spawn_hunting_party(room.name, adj, controllerFreePositions)
                      // }
                      // else {
                      Memory.commandsToExecute.push({
                        delay: 1,
                        bucketNeeded: 7000,
                        formation: "RangedQuad",
                        homeRoom: room.name,
                        Boosted: false,
                        targetRoom: adj
                      });
                      Memory.commandsToExecute.push({
                        delay: 500,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                      // }
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length > 0 && hostileTowers.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length == 0 && hostileTowers.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileCreeps.length && !hostileSpawns.length && !hostileTowers.length) {
                      const armedHostileCreeps = hostileCreeps.filter(
                        c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0
                      );
                      if (armedHostileCreeps.length === 0) {
                        global.SGD(room.name, adj, [
                          MOVE,
                          MOVE,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          MOVE,
                          MOVE,
                          MOVE
                        ]);
                      } else {
                        global.SD(room.name, adj, false);
                      }

                      Memory.commandsToExecute.push({
                        delay: 200,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    }
                  } else if (Game.rooms[adj].controller.level == 5 && !Game.rooms[adj].controller.safeMode) {
                    const hostileSpawns = Game.rooms[adj].find(FIND_HOSTILE_SPAWNS);
                    const hostileCreeps = Game.rooms[adj].find(FIND_HOSTILE_CREEPS);
                    const hostileTowers = Game.rooms[adj].find(FIND_HOSTILE_STRUCTURES, {
                      filter: s => s.structureType == STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] > 9
                    });
                    if (hostileSpawns.length > 0 && hostileTowers.length > 0) {
                      global.SD(room.name, adj, true);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length > 0 && hostileTowers.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (
                      Game.rooms[adj].controller.level == 5 &&
                      hostileCreeps.length &&
                      !hostileSpawns.length &&
                      !hostileTowers.length
                    ) {
                      const armedHostileCreeps = hostileCreeps.filter(
                        c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0
                      );
                      if (armedHostileCreeps.length === 0) {
                        global.SGD(room.name, adj, [
                          MOVE,
                          MOVE,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          ATTACK,
                          MOVE,
                          MOVE,
                          MOVE
                        ]);
                      } else {
                        global.SD(room.name, adj, false);
                      }

                      Memory.commandsToExecute.push({
                        delay: 200,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    }
                  }
                  //   !Game.rooms[adj].find(FIND_HOSTILE_STRUCTURES, {filter: s => s.structureType === STRUCTURE_LAB}).length
                  else if (
                    (Game.rooms[adj].controller.level == 6 || Game.rooms[adj].controller.level == 7 || Game.rooms[adj].controller.level == 8) &&
                    !Game.rooms[adj].controller.safeMode
                  ) {
                    const hostileSpawns = Game.rooms[adj].find(FIND_HOSTILE_SPAWNS);
                    const hostileCreeps = Game.rooms[adj].find(FIND_HOSTILE_CREEPS);
                    const hostileTowers = Game.rooms[adj].find(FIND_HOSTILE_STRUCTURES, {
                      filter: s => s.structureType == STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] > 9
                    });
                    if (hostileSpawns.length > 0 && hostileTowers.length > 0) {
                      if (Game.cpu.bucket >= 8000 || Memory.pixelManager?.enabled) {
                        // At high CPU, randomly choose between all formations
                        const rand = Math.random();
                        if (rand < 0.25) {
                            global.SDB(room.name, adj, true);
                        } else if (rand < 0.5) {
                            global.SQR(room.name, adj, true);
                        } else if (rand < 0.75) {
                            global.SS(room.name, adj, true);
                        } else {
                            global.SQM(room.name, adj, true);
                        }
                      } else if (Game.cpu.bucket >= 5000 || Memory.pixelManager?.enabled) {
                        // At lower CPU, randomly choose between lighter formations
                        if (Math.random() < 0.5) {
                            global.SDB(room.name, adj, true);
                        } else {
                            global.SS(room.name, adj, true);
                        }
                      }
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length > 0 && hostileTowers.length === 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    } else if (hostileSpawns.length > 0 && hostileCreeps.length == 0) {
                      global.SGD(room.name, adj, [
                        MOVE,
                        MOVE,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        ATTACK,
                        MOVE,
                        MOVE,
                        MOVE
                      ]);
                      Memory.commandsToExecute.push({
                        delay: 1000,
                        bucketNeeded: 8000,
                        formation: "CCK",
                        homeRoom: room.name,
                        targetRoom: adj
                      });
                    }
                  }
                }
                else {
                  // filter out adj room name in Memory.AvoidRooms so Memory.AvoidRooms is up to date

                  if(!Memory.AvoidRooms) {
                    Memory.AvoidRooms = [];
                  }

                  Memory.AvoidRooms = Memory.AvoidRooms.filter(room => room !== adj);


                }
            }


        }

    }

    // find power banks / deposits (sub-pipeline)
    if(observeConfig && observer && (Game.time % twoTimesInterval == 2 || Game.time % twoTimesInterval == 3) && (Game.cpu.bucket > 7000 || Memory.pixelManager?.enabled)) {

        if(!room.memory.observe)
            room.memory.observe = {};

        if(!room.memory.observe.listOfRoomsForPower) {

            if(!room.memory.observe.lastRoomObservedForPowerIndex) {
                room.memory.observe.lastRoomObservedForPowerIndex = 0;
            }

            const highWayRoomsToObserve = [];

            if(room.name.length == 6) {
                const EastOrWest = room.name[0];
                const NorthOrSouth = room.name[3];
                const homeRoomNameX = parseInt(room.name[1] + room.name[2]);
                const homeRoomNameY = parseInt(room.name[4] + room.name[5]);
                for(let i = homeRoomNameX-4; i<=homeRoomNameX+4; i++) {
                    for(let o = homeRoomNameY-4; o<=homeRoomNameY+4; o++) {
                        if(i % 10 == 0 || o % 10 == 0) {
                            const firstString = i.toString();
                            const secondString = o.toString();
                            highWayRoomsToObserve.push(EastOrWest + firstString + NorthOrSouth + secondString);
                        }
                    }
                }
                room.memory.observe.listOfRoomsForPower = highWayRoomsToObserve;
            }
            else if(room.name.length !== 6) {
                const EastOrWest = room.name[0];
                let NorthOrSouth;
                let homeRoomNameX;
                let homeRoomNameY;
                if(!isNaN(room.name[2])) {
                    NorthOrSouth = room.name[3];
                    homeRoomNameX = parseInt(room.name[1] + room.name[2]);
                    homeRoomNameY = parseInt(room.name[4]);
                }
                else {
                    NorthOrSouth = room.name[2];
                    homeRoomNameX = parseInt(room.name[1]);
                    if(room.name.length == 4) {
                        homeRoomNameY = parseInt(room.name[3]);
                    }
                    else if(room.name.length == 5) {
                        homeRoomNameY = parseInt(room.name[3] + room.name[4]);
                    }
                }
                for(let i = homeRoomNameX-4; i<=homeRoomNameX+4; i++) {
                    let EorW;
                    let x;
                    let switchX = false;
                    if(i < 0) {
                        switchX = true;
                    }
                    if(switchX) {
                        x = Math.abs(i);
                        x -= 1;
                        if(EastOrWest == "E") {
                            EorW = "W"
                        }
                        else {
                            EorW = "E";
                        }
                    }
                    else {
                        x = i;
                        EorW = EastOrWest;
                    }
                    for(let o = homeRoomNameY-4; o<=homeRoomNameY+4; o++) {
                        let NorS;
                        let y;
                        let switchY = false;
                        if(o < 0) {
                            switchY = true;
                        }

                        if(switchY) {
                            y = Math.abs(o);
                            y -= 1;
                            if(NorthOrSouth == "N") {
                                NorS = "S"
                            }
                            else {
                                NorS = "N";
                            }
                        }
                        else {
                            y = o;
                            NorS = NorthOrSouth;
                        }
                        if(x % 10 == 0 || y % 10 == 0) {

                            const firstString = x.toString();
                            const secondString = y.toString();
                            const roomName = EorW + firstString + NorS + secondString;
                            if(Game.map.getRoomStatus(roomName).status == "normal" && room.name !== roomName) {
                                highWayRoomsToObserve.push(roomName);
                            }
                        }
                    }
                }
                room.memory.observe.listOfRoomsForPower = highWayRoomsToObserve;
            }
        }

        if(room.memory.observe.listOfRoomsForPower) {

            const RoomsToSee = room.memory.observe.listOfRoomsForPower

            if(RoomsToSee.length > 0 && Game.time % twoTimesInterval == 2) {
                if(!room.memory.observe.lastRoomObservedForPowerIndex || room.memory.observe.lastRoomObservedForPowerIndex >= RoomsToSee.length) {
                    room.memory.observe.lastRoomObservedForPowerIndex = 0
                }


                const chosenRoom = RoomsToSee[room.memory.observe.lastRoomObservedForPowerIndex]
                observer.observeRoom(chosenRoom);


                debugLog("seeing FOR POWER", chosenRoom)


                room.memory.observe.lastRoomObservedForPowerIndex += 1;
                room.memory.observe.lastRoomObservedForPower = chosenRoom;

            }

            if(Game.time % twoTimesInterval == 3) {
                const adj = room.memory.observe.lastRoomObservedForPower;

                if(areRoomsNormalToThisRoom(room.name, adj)) {
                    const seenRoom = Game.rooms[adj];

                    const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();

                    if(seenRoom && storage && storage.store[RESOURCE_ENERGY] > 105000) {

                        const walls = seenRoom.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_WALL});
                        if(walls.length == 0) {

                            // let powerBanks = seenRoom.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_POWER_BANK && (s.ticksToDecay > 1700 || s.ticksToDecay > 1000 && s.hits < 700000)});

                            const deposits = seenRoom.find(FIND_DEPOSITS);

                            if(mineScoutEnabled && deposits.length > 0 && (Game.cpu.bucket >= 9750 || Memory.pixelManager?.enabled)) {

                                const hostiles = seenRoom.find(FIND_HOSTILE_CREEPS);

                                if (hostiles.length === 0) {
                                    // ── No hostiles: process deposits normally ──────────
                                    for (let i = 0; i < deposits.length; i++) {
                                        const deposit = deposits[i];
                                        const depId = deposit.id;
                                        const depMeta = ensureDepMeta(Memory.depositMining, adj, depId, deposit);
                                        processDeposit(deposit, depId, depMeta, false, null, room.name, adj, false);
                                    }
                                } else {
                                    // ── Hostiles detected: classify threat + state machine ─
                                    const { isStrong } = classifyThreat(hostiles);

                                    for (let i = 0; i < deposits.length; i++) {
                                        const deposit = deposits[i];
                                        const depId = deposit.id;
                                        const depMeta = ensureDepMeta(Memory.depositMining, adj, depId, deposit);
                                        const prevHostileSeen = depMeta.lastHostileSeen;
                                        processDeposit(deposit, depId, depMeta, true, prevHostileSeen, room.name, adj, isStrong);

                                        // Weak hostile under attack wave: allow spawn alongside elite
                                        if (depMeta.hostilePhase === "drain" || depMeta.hostilePhase === "eliminate") {
                                            if (!isStrong) {
                                                spawnMinersCarries(room.name, adj, depId, depMeta.maxPairs);
                                            }
                                        }
                                    }
                                }

                                // ── Cleanup expired deposits (applies to both safe and hostile branches) ──
                                // Remove entries where lastObserved > 5000 ticks ago (deposit likely gone)
                                // or where the deposit no longer exists in the room
                                if (Memory.depositMining && Memory.depositMining[adj]) {
                                    const currentDepIds = new Set(deposits.map(d => d.id as string));
                                    for (const depId in Memory.depositMining[adj]) {
                                        const meta = Memory.depositMining[adj][depId];
                                        if (meta.lastObserved && Game.time - meta.lastObserved > 50000) {
                                            delete Memory.depositMining[adj][depId];
                                        } else if (!currentDepIds.has(depId)) {
                                            // Deposit was observed before but no longer exists in this room
                                            delete Memory.depositMining[adj][depId];
                                        }
                                    }
                                    // Clean up empty room entries
                                    if (Object.keys(Memory.depositMining[adj]).length === 0) {
                                        delete Memory.depositMining[adj];
                                    }
                                }

                            }

                        }





                    }
                }





            }


        }

    }

}


function areRoomsNormalToThisRoom(homeRoom, targetRoom) {
    const route = Game.map.findRoute(homeRoom, targetRoom)
    if(route && route !== -2 && route.length > 0) {
        for(const partOfRoute of route) {
            if(Game.map.getRoomStatus(partOfRoute.room).status !== "normal") {
                return false;
            }
        }
    }
    else {
        return false;
    }

    return true;
}

export default observe;
