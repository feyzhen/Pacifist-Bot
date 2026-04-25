import { buildFromLayout } from "./rooms.construction2";
function spawning(room: any) {
    if(Game.cpu.bucket < 1000 && !Memory.pixelManager?.enabled) return;
    if (!room.memory.spawn_list) {
        room.memory.spawn_list = [];
    }

    if (!room.memory.lastTimeSpawnUsed || room.memory.lastTimeSpawnUsed == 0) {
        room.memory.lastTimeSpawnUsed = Game.time;
    }

    if (Game.time % 100 == 0 && Game.time - room.memory.lastTimeSpawnUsed > 1200) {
        room.memory.spawn_list = [];
    }

    let spawn: any = Game.getObjectById(room.memory.Structures.spawn);
    if (spawn && spawn.spawning && spawn.spawning.remainingTime == 1 && room.memory.spawn_list.length == 0) {
        room.memory.lastTimeSpawnUsed = Game.time;
    }

    spawn = Game.getObjectById(room.memory.Structures.spawn) || room.findSpawn();

    if (spawn == undefined) {
        delete room.memory.Structures.spawn;
        return;
    }

    if (
        room.controller.level >= 7 &&
        spawn &&
        spawn.effects &&
        spawn.effects.length > 0 &&
        room.danger &&
        room.danger_timer > 30
    ) {
        if (!room.memory.ram_coming) {
            for (const effect of spawn.effects) {
                if (effect.effect === PWR_DISRUPT_SPAWN) {
                    const spawns = room.find(FIND_MY_SPAWNS);
                    let allSpawnsDisrupted = true;
                    for (const spawn of spawns) {
                        allSpawnsDisrupted = false;
                        if (spawn.effects && spawn.effects.length > 0) {
                            for (const effect of spawn.effects) {
                                if (effect.effect === PWR_DISRUPT_SPAWN) {
                                    allSpawnsDisrupted = true;
                                }
                            }
                        }
                        if (!allSpawnsDisrupted) {
                            break;
                        }
                    }
                    if (allSpawnsDisrupted) {
                        const myRooms = _.filter(
                            Game.rooms,
                            r => r.controller && r.controller.my && r.controller.level === 8
                        );
                        // find closest room
                        let closestRoom = myRooms[0];
                        let closestRoomDistance = Game.map.getRoomLinearDistance(room.name, closestRoom.name);
                        for (const myRoom of myRooms) {
                            const distance = Game.map.getRoomLinearDistance(room.name, myRoom.name);
                            if (distance < closestRoomDistance) {
                                closestRoom = myRoom;
                                closestRoomDistance = distance;
                            }
                        }
                        global.SDB(closestRoom.name, room.name, true);
                        room.memory.ram_coming = true;
                        return;
                    }
                }
            }
        }
    } else {
        if (room.memory.ram_coming) {
            delete room.memory.ram_coming;
        }
    }

    if (spawn.spawning) {
        spawn = room.findSpawn();
        if (spawn == undefined) {
            return;
        } else {
            room.memory.lastTimeSpawnUsed = Game.time;
        }
    }

    // const status = spawnFirstInLine(room, spawn);
    const status = spawnFirstInLine_optimized(room, spawn);
    if (status == "spawning") {
        return;
    }

    if (
        (room.memory.spawn_list.length == 0 && Game.time - room.memory.lastTimeSpawnUsed == 2) ||
        (!room.memory.danger &&
            room.memory.spawn_list.length == 0 &&
            (Game.time - room.memory.lastTimeSpawnUsed) % 10 == 0 &&
            room.controller.level >= 6) ||
        (!room.memory.danger &&
            room.memory.spawn_list.length == 0 &&
            (Game.time - room.memory.lastTimeSpawnUsed) % 20 == 0 &&
            room.controller.level <= 5) ||
        (!room.memory.danger &&
            room.memory.spawn_list.length >= 1 &&
            (Game.time - room.memory.lastTimeSpawnUsed) % 500 == 0) ||
        (room.memory.danger &&
            (Game.time - room.memory.lastTimeSpawnUsed) % 7 == 0 &&
            room.memory.spawn_list.length == 0)
    ) {
        // add_creeps_to_spawn_list(room, spawn);
        add_creeps_to_spawn_list_refactored(room, spawn);
    }
}


// Refactored version using new generator classes
function add_creeps_to_spawn_list_refactored(room: Room, spawn: StructureSpawn) {
    // 1. 统计角色（使用缓存）
    const roleCount = SpawnCache.getRoleCount(room);

    // 2. 获取房间状态和配置（使用缓存）
    const roomState = SpawnCache.getRoomState(room);
    const sites = roomState.sites;
    const storage = roomState.storage;
    const resourceData = roomState.resourceData;
    const rampartsInRoom = roomState.rampartsInRoom;
    const spawnMaintainer = roomState.spawnMaintainer;
    const activeRemotes = roomState.activeRemotes;

    // 3. 获取生成规则（使用缓存）
    const spawnrules = SpawnCache.getSpawnRules(room);

    // 5. 提取角色计数
    const EnergyMiners = roleCount.EnergyMiner.total;
    const EnergyMinersInRoom = roleCount.EnergyMiner.inRoom;
    const carriers = roleCount.carry.total;
    const builders = roleCount.builder.inRoom;
    const repairers = roleCount.repair.inRoom;
    const maintainers = roleCount.maintainer.inRoom;
    const EnergyManagers = roleCount.EnergyManager.inRoom;
    const MineralMiners = roleCount.MineralMiner.inRoom;
    const scouts = roleCount.scout.total;
    const claimers = roleCount.claimer.total;
    const attackers = roleCount.attacker.total;
    const RampartDefenders = roleCount.RampartDefender.inRoom;
    const RangedRampartDefenders = roleCount.RRD.inRoom;
    const reservers = roleCount.reserve.total;
    const fillers = roleCount.filler.inRoom;
    const healers = roleCount.healer.total;
    const clearers = roleCount.clearer.total;
    const SpecialRepairers = roleCount.SpecialRepair.inRoom;
    const Signers = roleCount.Sign.total;
    const Priests = roleCount.Priest.total;
    const RampartErectors = roleCount.RampartErector.inRoom;
    const sweepers = roleCount.sweeper.inRoom;
    const SafeModers = roleCount.SafeModer.inRoom;
    const SneakyControllerUpgraders = roleCount.SneakyControllerUpgrader.total;
    const containerbuilders = roleCount.remoteBuilder.total;
    const RangedAttackers = roleCount.RangedAttacker.total;
    const DrainTowers = roleCount.DrainTower.total;
    const RemoteDismantlers = roleCount.RemoteDismantler.total;
    const Dismantlers = roleCount.Dismantler.inRoom;
    const annoyers = roleCount.annoy.total;
    const upgraders = roleCount.upgrader.inRoom;

    // 6. 使用新的生成器类生成角色
    // 能量相关角色
    EnergyRoleGenerator.generateAll(resourceData, room, spawn, storage, activeRemotes, EnergyManagers, upgraders, fillers, EnergyMinersInRoom, sites.length, spawnrules, rampartsInRoom, roomState, repairers);

    // 建造相关角色
    ConstructionRoleGenerator.generateAll(room, builders, repairers, maintainers, EnergyMinersInRoom, carriers, sites, storage, spawnMaintainer, spawnrules, rampartsInRoom, roomState);

    // 军事相关角色
    MilitaryRoleGenerator.generateAll(room, attackers, RampartDefenders, RangedRampartDefenders, storage, roomState);

    // 特殊角色
    SpecialRoleGenerator.generateAll(resourceData, room, MineralMiners, scouts, EnergyMinersInRoom, claimers, reservers, storage, activeRemotes, roomState);

    // 特殊防御角色
    const rampartsInRoomBelowTwelveMil = rampartsInRoom.filter(function(s: any) {return s.hits < 12000000;});
    SpecialDefenseGenerator.generateAll(room, healers, fillers, RampartDefenders, RangedRampartDefenders, SpecialRepairers, repairers, clearers, storage, rampartsInRoomBelowTwelveMil, roomState);

    // 特殊工具角色
    SpecialUtilityGenerator.generateAll(room, Signers, Priests, RampartErectors, sweepers, SafeModers, storage, roomState);

    // 远程防御角色
    RemoteDefenseGenerator.generateAll(room, SneakyControllerUpgraders, containerbuilders, RangedAttackers, DrainTowers, RemoteDismantlers, Dismantlers, annoyers, storage, resourceData, activeRemotes, attackers);


    // 8. 处理核弹威胁逻辑
    if (room.memory.defence.nuke) {
        const nukes = room.find(FIND_NUKES);
        if (nukes.length > 0) {
            nukes.sort((a, b) => a.timeToLand - b.timeToLand);
            if (nukes[0].timeToLand <= 200) {
                room.memory.defence.evacuate = true;
            } else {
                room.memory.defence.evacuate = false;
            }
            if (nukes[0].timeToLand <= 400) {
                return;
            }
        } else if (room.memory.defence.nuke && nukes.length == 0) {
            room.memory.defence.nuke = false;
            buildFromLayout(room);
        } else {
            room.memory.defence.nuke = false;
            room.memory.defence.evacuate = false;
        }
    }

    // 9. 处理无storage时的builder生成
    if (room.controller.level >= 5 && !storage && builders < 5) {
        const name = 'Builder-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
        room.memory.spawn_list.push(getBody([WORK, CARRY, MOVE], room, 50), name, {memory: {role: 'builder'}});
        console.log('Adding Builder to Spawn List: ' + name);
    }

    // 10. 处理ControllerLinkFiller
    if (room.memory.Structures.controllerLink && room.controller.level !== 8 && room.controller.level >= 3) {
        const controllerLink: any = Game.getObjectById(room.memory.Structures.controllerLink);
        if (Game.time % 70 < 12 && controllerLink && controllerLink.store[RESOURCE_ENERGY] <= 100 && storage && (storage as any).store[RESOURCE_ENERGY] > 1000) {
            const name = "ControllerLinkFiller-" + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.unshift(getBody([CARRY, CARRY, CARRY, CARRY, MOVE], room, 20), name, {
                memory: { role: "ControllerLinkFiller" }
            });
            console.log("Adding ControllerLinkFiller to Spawn List: " + name);
        }
    }
}

// Optimized version of spawnFirstInLine
function spawnFirstInLine_optimized(room: Room, spawn: StructureSpawn): string {
    // Emergency energy manager check
    const storage = Game.getObjectById(room.memory.Structures.storage);
    const energyManagers = _.filter(Game.creeps, (creep) => creep.memory.role == 'EnergyManager' && creep.room.name == room.name).length;

    if (room.controller.level >= 4 && storage && energyManagers === 0) {
        const result = handleEmergencyEnergyManager(room, spawn, storage);
        if (result === "spawning") return result;
    }

    // Normal spawn queue processing
    if (room.memory.spawn_list.length >= 1) {
        return processSpawnQueue(room, spawn);
    }

    return "list empty";
}

// Helper function to handle emergency energy manager spawning
function handleEmergencyEnergyManager(room: Room, spawn: StructureSpawn, storage: any): string {
    console.log(`Room ${room.name} energy: ${room.energyAvailable}/${room.energyCapacityAvailable}, checking for emergency spawn`);

    const links = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_LINK});
    const sourceLinks = links.filter(link => {
        const sources = room.find(FIND_SOURCES);
        return sources.some(source => source.pos.getRangeTo(link) < 5);
    });
    const targetLinks = links.filter(link => {
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        return storage && link.pos.getRangeTo(storage as any) < 5;
    });

    if (sourceLinks.length > 0 || targetLinks.length > 0 || room.terminal) {
        if (room.energyAvailable < room.energyCapacityAvailable * 0.5) {
            if (room.memory.spawn_list.length > 0) {
                console.log(`Clearing spawn queue in ${room.name} for emergency EnergyManager`);
                room.memory.spawn_list = [];
            }

            const name = 'EmergencyEnergyManager-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            const body = room.energyAvailable < 200 ? [CARRY, CARRY, MOVE] : [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];

            const spawnAttempt = spawn.spawnCreep(body, name, {memory: {role: 'EnergyManager'} as any});

            if (spawnAttempt === 0) {
                (room.memory as any).data.c_spawned++;
                return "spawning";
            }
        }
    }

    return "not spawning";
}

// Helper function to process spawn queue
function processSpawnQueue(room: Room, spawn: StructureSpawn): string {
    const spawnAttempt = spawn.spawnCreep(room.memory.spawn_list[0] as BodyPartConstant[], room.memory.spawn_list[1] as string, room.memory.spawn_list[2] as any);

    if (spawnAttempt === 0) {
        console.log("spawning", room.memory.spawn_list[1], "creep", room.name);
        room.memory.spawn_list.shift();
        room.memory.spawn_list.shift();
        room.memory.spawn_list.shift();
        (room.memory as any).data.c_spawned++;
        return "spawning";
    }

    console.log("spawning", room.memory.spawn_list[1], "creep error", spawnAttempt, room.name);

    // Handle specific errors
    if (spawnAttempt === ERR_NOT_ENOUGH_ENERGY) {
        handleNotEnoughEnergyError(room, spawn);
    } else if (spawnAttempt === ERR_NAME_EXISTS || spawnAttempt === ERR_BUSY || spawnAttempt === ERR_INVALID_ARGS) {
        room.memory.spawn_list.shift();
        room.memory.spawn_list.shift();
        room.memory.spawn_list.shift();
    }

    return "not spawning";
}

// Helper function to handle ERR_NOT_ENOUGH_ENERGY
function handleNotEnoughEnergyError(room: Room, spawn: StructureSpawn) {
    const storage = Game.getObjectById(room.memory.Structures.storage);

    // Emergency filler spawning
    if (room.controller.level >= 4 && storage && room.energyAvailable >= 100 && room.energyAvailable <= 1000 && room.energyCapacityAvailable > 400 && room.find(FIND_MY_CREEPS, {filter: c => c.memory.role == "filler"}).length == 0) {
        const body = [MOVE, CARRY];
        if (room.controller.level === 7) body.push(CARRY, CARRY);
        if (room.controller.level === 8) body.push(CARRY, CARRY, CARRY);

        const newName = 'emergencyFILLER-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
        spawn.spawnCreep(body, newName, {memory: {role: 'filler'} as any});
        return;
    }

    const segment = room.memory.spawn_list[0] as BodyPartConstant[];
    const creepName = room.memory.spawn_list[1] as string;
    const bodyCost = _.sum(segment, s => BODYPART_COST[s]);

    // Check if should clear from queue or reduce body
    const shouldClear = shouldClearFromQueue(creepName, segment, bodyCost, room);

    if (shouldClear) {
        clearSpawnQueueItem(room, creepName);
    } else {
        reduceBodySize(room);
    }
}

// Helper function to determine if item should be cleared from queue
function shouldClearFromQueue(creepName: string, segment: any[], bodyCost: number, room: Room): boolean {
    const excludedPrefixes = [
        "Carrier", "EnergyMiner", "WallClearer", "SquadCreepA", "SquadCreepB",
        "SquadCreepY", "SquadCreepZ", "Ram", "Signifer", "PowerHeal", "Goblin",
        "SpecialRepair", "SpecialCarry", "RRD", "Solomon", "FreedomFighter",
        "ContinuousControllerKiller", "RoomLocker", "Escort", "PowerMelee"
    ];

    const hasExcludedPrefix = excludedPrefixes.some(prefix => creepName.startsWith(prefix));
    const isDefenderOrWallClearer = creepName.startsWith("Defender") || creepName.startsWith("WallClearer");
    const isTooExpensive = bodyCost > room.energyCapacityAvailable;
    const isLargeBody = segment.length >= 4;

    return (isLargeBody && !hasExcludedPrefix) || isTooExpensive || isDefenderOrWallClearer;
}

// Helper function to clear item from spawn queue
function clearSpawnQueueItem(room: Room, creepName: string) {
    if (creepName.startsWith("SpecialRe") && room.memory.labs && room.memory.labs.status && room.memory.labs.status.boost && room.memory.labs.status.boost.lab1 && room.memory.labs.status.boost.lab1.amount && room.memory.labs.status.boost.lab1.use > 0) {
        room.memory.labs.status.boost.lab1.use = 0;
        room.memory.labs.status.boost.lab1.amount = 0;
    }

    room.memory.spawn_list.shift();
    room.memory.spawn_list.shift();
    room.memory.spawn_list.shift();
    console.log("clearing spawn queue because too high energy cost or is defender/wallclearer");
}

// Helper function to reduce body size
function reduceBodySize(room: Room) {
    const creepName = room.memory.spawn_list[1] as string;
    const segment = room.memory.spawn_list[0] as BodyPartConstant[];
    const lastTimeSpawnUsed = (room.memory as any).lastTimeSpawnUsed;
    const energyAvailable = room.energyAvailable;

    const shouldReduce =
        (lastTimeSpawnUsed > 305 && creepName.startsWith("Carrier") && energyAvailable < segment.length * 50 && segment.length > 3) ||
        (lastTimeSpawnUsed > 305 && creepName.startsWith("EnergyMiner") && energyAvailable < segment.length * 100 && segment.length > 3) ||
        (lastTimeSpawnUsed > 205 && creepName.startsWith("Reserver") && segment.length > 1);

    if (shouldReduce) {
        (room.memory.spawn_list[0] as BodyPartConstant[]).shift();
    }
}

function getBody(segment:string[], room, bodyMaxLength=50) {
    const body = [];
    const segmentCost = _.sum(segment, s => BODYPART_COST[s]);
    const energyAvailable = room.energyAvailable;

    const maxSegments = Math.floor(energyAvailable / segmentCost);
    _.times(maxSegments, function() {if(segment.length + body.length <= bodyMaxLength){_.forEach(segment, s => body.push(s));}});

    return body;
}

function getCarrierBody(sourceId, values, storage, spawn, room) {

    const targetSource:any = Game.getObjectById(sourceId);
    if(targetSource && targetSource.room.name == room.name) {
        if(Game.time % 11 == 0) {
            delete values.pathLength;
        }
    }
    let pathFromHomeToSource;
    const carriersInRoom = _.filter(Game.creeps, (creep) => creep.memory.role == 'carry' && creep.room.name == room.name);

    if(storage != undefined && !values.pathLength) {
        pathFromHomeToSource = storage.pos.findPathTo(targetSource, {ignoreCreeps: true, ignoreRoads: false});
        values.pathLength = pathFromHomeToSource.length - 1;
    }
    else if (spawn != undefined && !values.pathLength) {
        pathFromHomeToSource = spawn.pos.findPathTo(targetSource, {ignoreCreeps: true, ignoreRoads: false});
        values.pathLength = pathFromHomeToSource.length - 1;
    }

    let threeWorkParts = 6;
    const sixWorkParts = 12;


    if(carriersInRoom.length == 0 && !storage) {
        return [CARRY,CARRY,MOVE];
    }


    if(targetSource == null || !values.pathLength) {
        return [];
    }

    if(targetSource.room.name == room.name) {
        const ticksPerRoundTrip = (values.pathLength * 2) + 2;
        let energyProducedPerRoundTrip = sixWorkParts * ticksPerRoundTrip
        const body = [];
        let alternate = 1;
        while (energyProducedPerRoundTrip > 0) {
            body.push(CARRY);
            if((body.length * 50) == room.energyCapacityAvailable && alternate % 2 == 0) {
                while(body.length > 50) {
                    body.pop();
                }
                return body;
            }
            else if((body.length * 50) == room.energyCapacityAvailable && alternate % 2 == 1) {
                body.pop();
                while(body.length > 50) {
                    body.pop();
                }
                return body;
            }

            if(alternate % 2 == 1) {
                body.push(MOVE);
                if((body.length * 50) == room.energyCapacityAvailable) {
                    body.pop();
                    body.pop();
                    while(body.length > 50) {
                        body.pop();
                    }
                    return body;
                }
            }
            energyProducedPerRoundTrip = energyProducedPerRoundTrip - 50;
            alternate = alternate + 1;
        }
        // console.log(body,room.name)

        return body;
    }
    else {
        if(room.controller.level >= 5) {
            threeWorkParts = sixWorkParts;
        }
        const ticksPerRoundTrip = (values.pathLength * 2) + 2;
        let energyProducedPerRoundTrip = threeWorkParts * ticksPerRoundTrip
        const body = [];
        let alternate = 1;
        while (energyProducedPerRoundTrip > 0 && (body.length * 50) <= (room.energyCapacityAvailable-100)) {
            body.push(CARRY);
            if((body.length * 50) == room.energyCapacityAvailable && alternate % 2 == 0) {
                while(body.length > 50) {
                    body.pop();
                }
                return body;
            }
            else if((body.length * 50) == room.energyCapacityAvailable && alternate % 2 == 1) {
                body.pop();
                while(body.length > 50) {
                    body.pop();
                }
                return body;
            }

            if(alternate % 2 == 1) {
                body.push(MOVE);
                if((body.length * 50) == room.energyCapacityAvailable) {
                    body.pop();
                    body.pop();
                    while(body.length > 50) {
                        body.pop();
                    }
                    return body;
                }
            }
            energyProducedPerRoundTrip = energyProducedPerRoundTrip - 50;
            alternate = alternate + 1;
        }
        // console.log(body,room.name)
        while(body.length > 50) {
            body.pop();
        }
        return body;
    }
}

// Role counting utility function
// Cache system to reduce repeated calculations
class SpawnCache {
    private static roleCountCache: Map<string, { data: any, timestamp: number }> = new Map();
    private static spawnRulesCache: Map<string, { data: any, timestamp: number }> = new Map();
    private static roomStateCache: Map<string, { data: any, timestamp: number }> = new Map();
    private static readonly CACHE_TTL = 5; // Cache expires after 5 ticks

    static clearCache(roomName: string) {
        this.roleCountCache.delete(roomName);
        this.spawnRulesCache.delete(roomName);
        this.roomStateCache.delete(roomName);
    }

    static clearAllCache() {
        this.roleCountCache.clear();
        this.spawnRulesCache.clear();
        this.roomStateCache.clear();
    }

    static getRoleCount(room: Room) {
        const cacheKey = room.name;
        const cached = this.roleCountCache.get(cacheKey);

        if (cached && Game.time - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const data = this.countRolesEfficientlyImpl(room);
        this.roleCountCache.set(cacheKey, { data, timestamp: Game.time });
        return data;
    }

    static getSpawnRules(room: Room) {
        const cacheKey = room.name + '_' + room.controller.level;
        const cached = this.spawnRulesCache.get(cacheKey);

        if (cached && Game.time - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const data = this.getSpawnRulesImpl(room);
        this.spawnRulesCache.set(cacheKey, { data, timestamp: Game.time });
        return data;
    }

    static getRoomState(room: Room) {
        const cacheKey = room.name;
        const cached = this.roomStateCache.get(cacheKey);

        if (cached && Game.time - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        const data = this.getRoomStateImpl(room);
        this.roomStateCache.set(cacheKey, { data, timestamp: Game.time });
        return data;
    }

    private static countRolesEfficientlyImpl(room: Room) {
        const roles = [
            'EnergyMiner', 'carry', 'builder', 'upgrader', 'repair', 'filler',
            'maintainer', 'defender', 'RampartDefender', 'RRD', 'Dismantler',
            'scout', 'claimer', 'attacker', 'billtong', 'RangedAttacker',
            'remoteBuilder', 'RampartErector', 'SneakyControllerUpgrader',
            'DrainTower', 'healer', 'RemoteDismantler', 'annoy', 'clearer',
            'ram', 'signifer', 'sweeper', 'goblin', 'Sign', 'Priest',
            'SpecialRepair', 'SpecialCarry', 'SquadCreepA', 'SquadCreepB',
            'SquadCreepY', 'SquadCreepZ', 'SafeModer', 'reserve', 'RemoteRepair',
            'EnergyManager', 'MineralMiner'
        ];

        const count: any = {};
        roles.forEach(role => {
            count[role] = { total: 0, inRoom: 0 };
        });

        Object.values(Game.creeps).forEach(creep => {
            const role = creep.memory.role;
            if (count[role]) {
                count[role].total++;
                if (creep.room.name === room.name) {
                    count[role].inRoom++;
                }
            }
        });

        return count;
    }

    private static getSpawnRulesImpl(room: Room) {
        const rules: any = {};
        for (const rcl in SPAWN_RULES_CONFIG) {
            rules[rcl] = {};
            for (const creepType in SPAWN_RULES_CONFIG[rcl]) {
                const config = SPAWN_RULES_CONFIG[rcl][creepType];
                rules[rcl][creepType] = {
                    amount: config.amount,
                    body: creepType.includes('upgrade') || creepType.includes('build') || creepType.includes('repair') || creepType.includes('maintain')
                        ? getBody(config.bodyPattern, room, 50)
                        : config.bodyPattern
                };
            }
        }
        return rules;
    }

    private static getRoomStateImpl(room: Room) {
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        const resourceData = _.get(room.memory, ['resources']);

        // 批量获取结构信息，减少重复的room.find调用
        const allStructures = room.find(FIND_MY_STRUCTURES);
        const allStructuresAny = room.find(FIND_STRUCTURES);
        const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
        const myCreeps = room.find(FIND_MY_CREEPS);
        const nukes = room.find(FIND_NUKES);
        const droppedResources = room.find(FIND_DROPPED_RESOURCES);
        const tombstones = room.find(FIND_TOMBSTONES);

        let rampartsInRoom: any[] = [];
        let spawnMaintainer = false;
        if (room.controller.level >= 3 && storage) {
            rampartsInRoom = allStructures.filter(s => s.structureType === STRUCTURE_RAMPART);
            for (const rampart of rampartsInRoom) {
                if (rampart.hits <= 10000) {
                    spawnMaintainer = true;
                    break;
                }
            }
            const containersNeedRepair = allStructuresAny.filter(s => s.structureType === STRUCTURE_CONTAINER && s.hits <= s.hitsMax * 0.8);
            if (containersNeedRepair.length > 0) {
                spawnMaintainer = true;
            }
        }

        const roomsToRemote = Object.keys(room.memory.resources || {});
        const activeRemotes = roomsToRemote.filter(remoteRoom =>
            remoteRoom === room.name || room.memory.resources[remoteRoom].active
        );

        return {
            sites,
            storage,
            resourceData,
            rampartsInRoom,
            spawnMaintainer,
            activeRemotes,
            allStructures,
            allStructuresAny,
            hostileCreeps,
            myCreeps,
            nukes,
            droppedResources,
            tombstones
        };
    }
}

// Spawn rules configuration
const SPAWN_RULES_CONFIG = {
    1: {
        upgrade_creep: {
            amount: 6,
            bodyPattern: [WORK, CARRY, CARRY, MOVE]
        },
        build_creep: {
            amount: 6,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, MOVE]
        }
    },
    2: {
        upgrade_creep: {
            amount: 4,
            bodyPattern: [WORK, WORK, CARRY, MOVE]
        },
        build_creep: {
            amount: 4,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        repair_creep: {
            amount: 1,
            bodyPattern: [WORK, CARRY, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, MOVE]
        }
    },
    3: {
        build_creep: {
            amount: 6,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 2,
            bodyPattern: [WORK, WORK, WORK, WORK, CARRY, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, MOVE]
        },
        repair_creep: {
            amount: 1,
            bodyPattern: [WORK, CARRY, MOVE]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY]
        }
    },
    4: {
        build_creep: {
            amount: 3,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 5,
            bodyPattern: [WORK, WORK, WORK, WORK, CARRY, MOVE]
        },
        filler_creep: {
            amount: 2,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]
        },
        repair_creep: {
            amount: 1,
            bodyPattern: [WORK, CARRY, MOVE]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY]
        }
    },
    5: {
        build_creep: {
            amount: 4,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 5,
            bodyPattern: [WORK, WORK, WORK, WORK, CARRY, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]
        },
        repair_creep: {
            amount: 1,
            bodyPattern: [WORK, CARRY, MOVE]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, MOVE, MOVE, CARRY, CARRY]
        }
    },
    6: {
        build_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, CARRY, MOVE]
        },
        filler_creep: {
            amount: 2,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]
        },
        energy_manager_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE]
        },
        repair_creep: {
            amount: 3,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, CARRY, MOVE]
        }
    },
    7: {
        build_creep: {
            amount: 2,
            bodyPattern: [WORK, WORK, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE]
        },
        upgrade_creep_spend: {
            amount: 3,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
        },
        energy_manager_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
        },
        repair_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        }
    },
    8: {
        build_creep: {
            amount: 2,
            bodyPattern: [WORK, WORK, CARRY, CARRY, MOVE]
        },
        upgrade_creep: {
            amount: 1,
            bodyPattern: [WORK, CARRY, CARRY, CARRY, MOVE]
        },
        filler_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        },
        energy_manager_creep: {
            amount: 1,
            bodyPattern: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
        },
        repair_creep: {
            amount: 2,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        },
        maintain_creep: {
            amount: 1,
            bodyPattern: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]
        }
    }
};

// Room condition checker utility functions
class RoomConditions {
    static hasStorageEnergy(room: Room, amount: number): boolean {
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        return storage ? (storage as any).store[RESOURCE_ENERGY] >= amount : false;
    }

    static canSpawnHighCost(room: Room): boolean {
        return room.controller.level >= 7 &&
               this.hasStorageEnergy(room, 50000) &&
               !room.memory.danger;
    }

    static canSpawnMediumCost(room: Room): boolean {
        return room.controller.level >= 5 &&
               this.hasStorageEnergy(room, 15000) &&
               !room.memory.danger;
    }

    static isUnderAttack(room: Room): boolean {
        return room.memory.danger && room.memory.danger_timer > 30;
    }

    static needsEmergencyResponse(room: Room): boolean {
        return room.energyAvailable < room.energyCapacityAvailable * 0.3 &&
               this.isUnderAttack(room);
    }

    static canUpgradeController(room: Room): boolean {
        return !room.memory.danger &&
               (room.controller.ticksToDowngrade < 15000 ||
                this.hasStorageEnergy(room, 10000));
    }

    static hasConstructionSites(room: Room): boolean {
        return room.find(FIND_MY_CONSTRUCTION_SITES).length > 0;
    }

    static hasEnergyForBuilding(room: Room): boolean {
        return this.hasStorageEnergy(room, 15000) || room.energyAvailable >= 1000;
    }

    static canSpawnMilitary(room: Room): boolean {
        return room.controller.level >= 4 &&
               this.hasStorageEnergy(room, 10000) &&
               this.isUnderAttack(room);
    }

    static hasMineralResources(room: Room): boolean {
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        return storage ? (storage as any).store.getUsedCapacity() < 975000 : false;
    }

    static isSafeModeAvailable(room: Room): boolean {
        return room.controller.safeModeAvailable > 1 && !room.memory.danger;
    }
}

// Energy role generator - encapsulates EnergyMiner, Carrier, EnergyManager, Upgrader, Filler generation logic
class EnergyRoleGenerator {
    static generateEnergyMiners(resourceData: any, room: Room, activeRemotes: string[], roomState: any) {
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        const hostileCreeps = roomState.hostileCreeps;

        _.forEach(resourceData, function(data, targetRoomName) {
            if (activeRemotes.includes(targetRoomName)) {
                let index = 0;

                let containerBuilders = [];
                if (room.controller.level <= 5) {
                    containerBuilders = _.filter(Game.creeps, (creep) => creep.memory.role == 'containerBuilder' && creep.memory.targetRoom == room.name);
                }

                _.forEach(data.energy, function(values, sourceId: any) {
                    if (room.controller.level <= 4 && containerBuilders.length) {
                        return;
                    }

                    if (index == 1 && room.controller.progress == 0 && room.controller.level == 1 && (room.memory as any).data.DOB <= 60) {
                        const newName = 'Sweeper-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([CARRY, MOVE], newName, {memory: {role: 'sweeper'}});
                        console.log('Adding Sweeper to Spawn List: ' + newName);
                    }

                    if (Game.time - (values.lastSpawn || 0) > CREEP_LIFE_TIME) {
                        const newName = 'EnergyMiner-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

                        if (targetRoomName == room.name) {
                            let danger = false;
                            if (values.pathLength && room.memory.danger && values.pathLength >= 13) {
                                danger = true;
                                const mySource: any = Game.getObjectById(sourceId);
                                if (mySource) {
                                    if (hostileCreeps.length > 0) {
                                        const closestHostileToSource = mySource.pos.findClosestByRange(hostileCreeps);
                                        if (mySource.pos.getRangeTo(closestHostileToSource) <= 4 && closestHostileToSource.getActiveBodyparts(RANGED_ATTACK) > 0) {
                                            return;
                                        }
                                    }
                                }
                            }

                            if (room.energyCapacityAvailable >= 750) {
                                if (room.controller.level >= 6) {
                                    if (room.memory.labs && room.memory.labs.status && !room.memory.labs.status.boost) {
                                        room.memory.labs.status.boost = {};
                                    }
                                    if (Memory.CPU.reduce && storage && (storage as any).store[RESOURCE_UTRIUM_OXIDE] >= 720 && room.memory.labs && room.memory.labs.outputLab8) {
                                        room.memory.labs.lab8reserved = true;
                                        if (room.memory.labs.status.boost) {
                                            if (room.memory.labs.status.boost.lab8) {
                                                room.memory.labs.status.boost.lab8.amount = room.memory.labs.status.boost.lab8.amount + 360;
                                                room.memory.labs.status.boost.lab8.use += 1;
                                            } else {
                                                room.memory.labs.status.boost.lab8 = {};
                                                room.memory.labs.status.boost.lab8.amount = 360;
                                                room.memory.labs.status.boost.lab8.use = 1;
                                            }
                                        }
                                        let body;
                                        if (danger) {
                                            body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE];
                                        } else {
                                            body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE];
                                        }
                                        room.memory.spawn_list.unshift(body, newName,
                                            {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name, danger: danger, boostlabs: [room.memory.labs.outputLab8]}});
                                    } else {
                                        if (room.memory.labs && room.memory.labs.status && room.memory.labs.status.boost && room.memory.labs.status.boost.lab8) room.memory.labs.status.boost.lab8 = undefined;
                                        let body;
                                        if (danger) {
                                            body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, CARRY, MOVE];
                                        } else if (room.energyAvailable > 3000 && Game.cpu.bucket < 9000 && !Memory.pixelManager?.enabled) {
                                            body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, WORK, WORK, CARRY, MOVE];
                                        } else {
                                            body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, WORK, WORK, CARRY, MOVE];
                                        }
                                        room.memory.spawn_list.unshift(body, newName,
                                            {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name, danger: danger}});
                                    }
                                } else {
                                    room.memory.spawn_list.unshift([MOVE, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE], newName,
                                        {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                }
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time;
                            } else if (room.energyCapacityAvailable >= 550) {
                                if (room.controller.level >= 5) {
                                    room.memory.spawn_list.unshift([WORK, WORK, WORK, WORK, CARRY, MOVE], newName,
                                        {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                } else {
                                    room.memory.spawn_list.unshift([WORK, WORK, WORK, WORK, WORK, MOVE], newName,
                                        {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                }
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time;
                            } else if (room.energyCapacityAvailable > 300) {
                                room.memory.spawn_list.unshift(getBody([WORK, WORK, MOVE], room, 6), newName, {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time + Math.floor(Math.random() * (20 - -20) - 20) + -450;
                                return;
                            } else {
                                let body;
                                if (room.controller.level >= 5) {
                                    body = [WORK, WORK, CARRY, MOVE];
                                } else {
                                    body = [WORK, WORK, MOVE];
                                }
                                room.memory.spawn_list.unshift(body, newName, {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                const sourceObj: any = Game.getObjectById(sourceId);
                                if (sourceObj && sourceObj.pos.getOpenPositions().length > 0) {
                                    values.lastSpawn = Game.time + Math.floor(Math.random() * (20 - -20) - 20) + -450;
                                } else {
                                    values.lastSpawn = Game.time - 20;
                                }
                                return;
                            }
                        } else {
                            if (targetRoomName != room.name && room.memory.danger) {
                                return;
                            }
                            if (!Game.rooms[targetRoomName] || Game.rooms[targetRoomName] == undefined || Game.rooms[targetRoomName].memory.roomData && Game.rooms[targetRoomName].memory.roomData.has_hostile_creeps == true) {
                                room.memory.spawn_list.unshift([WORK, WORK, MOVE], newName,
                                    {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time - 120;
                            } else if (room.controller.level >= 5 && storage && (storage as any).store[RESOURCE_ENERGY] > 25000) {
                                room.memory.spawn_list.unshift([WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE, WORK, WORK, MOVE], newName,
                                    {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time - 20;
                            } else if (room.energyCapacityAvailable >= 500) {
                                room.memory.spawn_list.unshift([WORK, WORK, MOVE, WORK, WORK, MOVE], newName,
                                    {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time - 20;
                            } else {
                                room.memory.spawn_list.unshift([WORK, WORK, MOVE], newName,
                                    {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding Energy Miner to Spawn List: ' + newName);
                                values.lastSpawn = Game.time - 650;
                            }
                        }
                    }

                    if (Game.time - (values.lastSpawn || 0) > CREEP_LIFE_TIME * 3) {
                        const newName = 'EnergyMiner-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.unshift([WORK, WORK, MOVE], newName,
                            {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                        console.log('Adding Energy Miner to Spawn List: ' + newName);
                        values.lastSpawn = Game.time;
                    }

                    if (!values.lastSpawn && Game.time < CREEP_LIFE_TIME) {
                        const newName = 'EnergyMiner-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.unshift([WORK, WORK, MOVE], newName,
                            {memory: {role: 'EnergyMiner', sourceId, targetRoom: targetRoomName, homeRoom: room.name}});
                        console.log('Adding Energy Miner to Spawn List: ' + newName);
                        values.lastSpawn = Game.time;
                    }
                    index++;
                });
            }
        });
    }

    static generateCarriers(resourceData: any, room: Room, spawn: any, storage: any, activeRemotes: string[]) {
        _.forEach(resourceData, function(data, targetRoomName) {
            if (activeRemotes.includes(targetRoomName)) {
                _.forEach(data.energy, function(values, sourceId) {
                    if (!Game.rooms[targetRoomName] || room.name != targetRoomName && room.memory.danger || Game.rooms[targetRoomName] && Game.rooms[targetRoomName].memory.roomData && Game.rooms[targetRoomName].memory.roomData.has_hostile_creeps) {
                        return;
                    }
                    if (Game.time - (values.lastSpawnCarrier || 0) > CREEP_LIFE_TIME) {
                        const newName = 'Carrier-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        const bodyForCarrier = getCarrierBody(sourceId, values, storage, spawn, room);
                        room.memory.spawn_list.push(bodyForCarrier, newName,
                            {memory: {role: 'carry', sourceId, targetRoom: targetRoomName, homeRoom: room.name, pathLength: values.pathLength}});
                        console.log('Adding Carrier to Spawn List: ' + newName);
                        if (Game.rooms[targetRoomName] && Game.rooms[targetRoomName].controller != undefined && Game.rooms[targetRoomName].controller.level >= 6 && targetRoomName == room.name) {
                            values.lastSpawnCarrier = 5000000000;
                        } else if (bodyForCarrier && bodyForCarrier.length > 0) {
                            if (bodyForCarrier.length <= 5) {
                                values.lastSpawnCarrier = Game.time - 750;
                            } else {
                                values.lastSpawnCarrier = Game.time;
                            }
                        }
                    }

                    if (Game.time - (values.lastSpawnCarrier || 0) > CREEP_LIFE_TIME * 2) {
                        const newName = 'Carrier-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([MOVE, CARRY, CARRY], newName,
                            {memory: {role: 'carry', sourceId, targetRoom: targetRoomName, homeRoom: room.name, pathLength: values.pathLength}});
                        console.log('Adding Carrier to Spawn List: ' + newName);
                        values.lastSpawnCarrier = Game.time - 700;
                    }

                    if (!values.lastSpawnCarrier && Game.time < CREEP_LIFE_TIME) {
                        const newName = 'Carrier-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([MOVE, CARRY, CARRY], newName,
                            {memory: {role: 'carry', sourceId, targetRoom: targetRoomName, homeRoom: room.name, pathLength: values.pathLength}});
                        console.log('Adding Carrier to Spawn List: ' + newName);
                        values.lastSpawnCarrier = Game.time - 600;
                    }
                    if (room.controller.level <= 5 && room.memory.Structures && room.memory.Structures.container) {
                        const container: any = Game.getObjectById(room.memory.Structures.container);
                        if (container && container.store.getFreeCapacity() == 0) {
                            values.lastSpawnCarrier -= 200;
                        }
                    }
                });
            }
        });
    }

    static generateEnergyManagers(room: Room, spawn: any, storage: any, energyManagers: number, spawnrules: any, roomState: any) {
        const rcl = room.controller.level;

        if (rcl >= 6 && energyManagers < spawnrules[rcl].energy_manager_creep.amount && storage) {
            const allStructures = roomState.allStructures;
            const links = allStructures.filter(s => s.structureType === STRUCTURE_LINK);
            const sourceLinks = links.filter(link => {
                const sources = room.find(FIND_SOURCES);
                return sources.some(source => source.pos.getRangeTo(link) < 5);
            });
            const targetLinks = links.filter(link => {
                const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
                return storage && link.pos.getRangeTo(storage as any) < 5;
            });

            if (sourceLinks.length > 0 || targetLinks.length > 0 || room.terminal) {
                const name = 'EnergyManager-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

                if (rcl === 8 && room.energyAvailable < room.energyCapacityAvailable * 0.5 && room.energyAvailable <= 300) {
                    room.memory.spawn_list.unshift([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE], name, {memory: {role: 'EnergyManager'}});
                } else {
                    room.memory.spawn_list.unshift(spawnrules[rcl].energy_manager_creep.body, name, {memory: {role: 'EnergyManager'}});
                }
            }
        }
    }

    static generateUpgraders(room: Room, upgraders: number, energyMinersInRoom: number, constructionSitesAmount: number, spawnrules: any, rampartsInRoom: any[]) {
        const rcl = room.controller.level;
        const rule = spawnrules[rcl];
        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();

        if (!rule || !rule.upgrade_creep) return;

        let shouldSpawn = false;
        let useSpendCreep = false;

        switch (rcl) {
            case 1:
                if (energyMinersInRoom < 1) return;
                shouldSpawn = upgraders < rule.upgrade_creep.amount && !room.memory.danger;
                // Storage 满容量时额外生成
                if (!shouldSpawn && storage && (storage as any).store.getFreeCapacity() < 200 && !room.memory.danger) {
                    shouldSpawn = upgraders < rule.upgrade_creep.amount + 6;
                }
                break;
            case 2:
                shouldSpawn = upgraders < rule.upgrade_creep.amount && !room.memory.danger &&
                              (constructionSitesAmount == 0 || room.controller.ticksToDowngrade < 1500);
                // Storage 满容量时额外生成
                if (!shouldSpawn && storage && (storage as any).store.getFreeCapacity() < 200 && !room.memory.danger) {
                    shouldSpawn = upgraders < rule.upgrade_creep.amount + 6;
                }
                break;
            case 3:
                shouldSpawn = upgraders < rule.upgrade_creep.amount && !room.memory.danger &&
                              (constructionSitesAmount == 0 || room.controller.ticksToDowngrade < 1500);
                // Storage 满容量时额外生成
                if (!shouldSpawn && storage && (storage as any).store.getFreeCapacity() < 200 && !room.memory.danger) {
                    shouldSpawn = upgraders < rule.upgrade_creep.amount + 6;
                }
                break;
            case 4:
                shouldSpawn = upgraders < rule.upgrade_creep.amount &&
                              (!storage || (storage as any).store[RESOURCE_ENERGY] > 100000 ||
                               (storage as any).store[RESOURCE_ENERGY] > 20000 && !rampartsInRoom.filter(function(s) {return s.hits < 900000}).length ||
                               upgraders < 1 && room.controller.ticksToDowngrade < 21000) &&
                              !room.memory.danger &&
                              (constructionSitesAmount == 0 || room.controller.ticksToDowngrade < 21000);
                break;
            case 5:
                shouldSpawn = upgraders < rule.upgrade_creep.amount && !room.memory.danger &&
                              storage && (storage as any).store[RESOURCE_ENERGY] > 30000 &&
                              (constructionSitesAmount == 0 || room.controller.ticksToDowngrade < 1500);
                // 紧急降级保护
                if (!shouldSpawn && room.controller.ticksToDowngrade < 6000 && upgraders < rule.upgrade_creep.amount && !room.memory.danger) {
                    shouldSpawn = true;
                }
                break;
            case 6:
                shouldSpawn = upgraders < rule.upgrade_creep.amount + 3 && !room.memory.danger &&
                              storage && (storage as any).store[RESOURCE_ENERGY] > 400000 &&
                              (constructionSitesAmount == 0 || room.controller.ticksToDowngrade < 1500);
                // 紧急降级保护
                if (!shouldSpawn && room.controller.ticksToDowngrade < 80000 && upgraders < rule.upgrade_creep.amount) {
                    shouldSpawn = true;
                }
                break;
            case 7:
                // 大号 upgrader (upgrade_creep_spend)
                if (rule.upgrade_creep_spend) {
                    const isTargetRoom = room.name === Memory.targetRampRoom?.room;
                    const spendAmount = isTargetRoom ? rule.upgrade_creep_spend.amount + 3 : rule.upgrade_creep_spend.amount;
                    if ((upgraders < spendAmount && !isTargetRoom || upgraders < spendAmount && isTargetRoom) &&
                        storage && (storage as any).store[RESOURCE_ENERGY] > 400000 && !room.memory.danger) {
                        shouldSpawn = true;
                        useSpendCreep = true;
                    }
                }
                // 小号 upgrader (upgrade_creep) - 紧急降级保护
                if (!shouldSpawn && rule.upgrade_creep) {
                    shouldSpawn = upgraders < rule.upgrade_creep.amount &&
                                  room.controller.ticksToDowngrade < 110000 &&
                                  storage && (storage as any).store[RESOURCE_ENERGY] > 10000 &&
                                  (!room.memory.danger || room.controller.ticksToDowngrade < 80000);
                }
                break;
            case 8:
                shouldSpawn = upgraders < rule.upgrade_creep.amount &&
                              room.controller.ticksToDowngrade < 125000 &&
                              storage && (storage as any).store[RESOURCE_ENERGY] > 10000 &&
                              (!room.memory.danger || room.controller.ticksToDowngrade < 110000);
                break;
        }

        if (shouldSpawn) {
            const name = 'Upgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            const body = useSpendCreep && rule.upgrade_creep_spend ? rule.upgrade_creep_spend.body : rule.upgrade_creep.body;
            room.memory.spawn_list.push(body, name, {memory: {role: 'upgrader'}});
            console.log('Adding Upgrader to Spawn List: ' + name);
        }
    }

    static generateFillers(room: Room, fillers: number, activeRemotes: string[], storage: any, spawnrules: any, repairers: number) {
        const rcl = room.controller.level;
        const rule = spawnrules[rcl];

        if (!rule || !rule.filler_creep || !storage) return;

        let shouldSpawn = false;

        switch (rcl) {
            case 1:
            case 2:
            case 3:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && activeRemotes.length > 1 ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 2) && storage;
                break;
            case 4:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && (activeRemotes.length > 1 || room.memory.danger && room.energyAvailable < room.energyCapacityAvailable/1.5) ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 2) && storage;
                break;
            case 5:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && activeRemotes.length > 1 ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 2) && storage;
                break;
            case 6:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && activeRemotes.length > 1 ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 2) && storage;
                // 目标房间额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && Memory.targetRampRoom?.room == room.name) {
                    shouldSpawn = true;
                }
                // 能量容量低时额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && room.energyCapacityAvailable < 500) {
                    shouldSpawn = true;
                }
                break;
            case 7:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && activeRemotes.length > 2 ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 3) && storage;
                // 目标房间额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && Memory.targetRampRoom?.room == room.name) {
                    shouldSpawn = true;
                }
                // 能量容量低时额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && room.energyCapacityAvailable < 500) {
                    shouldSpawn = true;
                }
                break;
            case 8:
                shouldSpawn = (fillers < rule.filler_creep.amount ||
                              fillers < rule.filler_creep.amount + 1 && repairers > 1 ||
                              fillers < rule.filler_creep.amount + 2 && repairers > 3 ||
                              fillers < rule.filler_creep.amount + 1 && repairers > 2 ||
                              fillers < rule.filler_creep.amount + 1 && activeRemotes.length > 2 ||
                              fillers < rule.filler_creep.amount + 2 && activeRemotes.length > 3) && storage;
                // 目标房间额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && Memory.targetRampRoom?.room == room.name) {
                    shouldSpawn = true;
                }
                // 能量容量低时额外 filler
                if (!shouldSpawn && fillers < rule.filler_creep.amount + 1 && storage && room.energyCapacityAvailable < 500) {
                    shouldSpawn = true;
                }
                // 能量可用300时的紧急 filler
                if (!shouldSpawn && fillers < 1 && room.energyAvailable === 300 && storage) {
                    shouldSpawn = true;
                }
                break;
        }

        if (shouldSpawn) {
            const name = 'Filler-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.unshift(rule.filler_creep.body, name, {memory: {role: 'filler'}});
            console.log('Adding filler to Spawn List: ' + name);
        }
    }

    static generateAll(resourceData: any, room: Room, spawn: any, storage: any, activeRemotes: string[], energyManagers: number, upgraders: number, fillers: number, energyMinersInRoom: number, constructionSitesAmount: number, spawnrules: any, rampartsInRoom: any[], roomState: any, repairers: number) {
        this.generateEnergyMiners(resourceData, room, activeRemotes, roomState);
        this.generateCarriers(resourceData, room, spawn, storage, activeRemotes);
        this.generateEnergyManagers(room, spawn, storage, energyManagers, spawnrules, roomState);
        this.generateUpgraders(room, upgraders, energyMinersInRoom, constructionSitesAmount, spawnrules, rampartsInRoom);
        this.generateFillers(room, fillers, activeRemotes, storage, spawnrules, repairers);
    }
}

// Construction role generator - encapsulates Builder, Repairer, Maintainer, RampartErector generation logic
class ConstructionRoleGenerator {
    static generateBuilders(room: Room, builders: number, EnergyMinersInRoom: number, sites: any[], storage: any, spawnrules: any, roomState: any) {
        const rcl = room.controller.level;
        const rule = spawnrules[rcl];

        if (!rule || !rule.build_creep) return;

        let shouldSpawn = false;

        switch (rcl) {
            case 1:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 1;
                break;
            case 2:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 1;
                break;
            case 3:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 1;
                break;
            case 4:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 0 &&
                              (!storage || storage && storage.store[RESOURCE_ENERGY] > 15000);
                break;
            case 5:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 0 &&
                              (storage && storage.store[RESOURCE_ENERGY] > 15000 || !storage);
                break;
            case 6:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 && EnergyMinersInRoom > 1 &&
                              (storage && storage.store[RESOURCE_ENERGY] > 120000 || !storage);
                break;
            case 7:
                shouldSpawn = builders < rule.build_creep.amount && !room.memory.danger && room.memory.danger_timer == 0 &&
                              sites.length > 0 && EnergyMinersInRoom > 1 &&
                              (storage && storage.store[RESOURCE_ENERGY] > 100000 || !storage);
                break;
            case 8:
                shouldSpawn = builders < rule.build_creep.amount && sites.length > 0 &&
                              (EnergyMinersInRoom > 1 || room.memory.danger) &&
                              (storage && storage.store[RESOURCE_ENERGY] > 50000 || !storage);
                break;
        }

        if (shouldSpawn) {
            let allowSpawn = true;
            let spawnSmall = false;

            // Handle rampart construction logic for RCL 6-8
            if (rcl >= 6) {
                for (const site of sites) {
                    if (site.structureType == STRUCTURE_RAMPART) {
                        allowSpawn = false;
                        spawnSmall = true;
                    } else {
                        allowSpawn = true;
                        spawnSmall = false;
                        break;
                    }
                }
            }

            const name = 'Builder-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

            if (allowSpawn) {
                room.memory.spawn_list.push(rule.build_creep.body, name, {memory: {role: 'builder'}});
                console.log('Adding Builder to Spawn List: ' + name);
            } else if (!allowSpawn && spawnSmall && builders < 1) {
                room.memory.spawn_list.push([WORK, CARRY, MOVE], name, {memory: {role: 'builder'}});
                console.log('Adding Builder to Spawn List: ' + name);
            }
        }
    }

    static generateRepairers(room: Room, repairers: number, carriers: number, EnergyMinersInRoom: number, storage: any, spawnrules: any, rampartsInRoom: any[], roomState: any) {
        const rcl = room.controller.level;
        const rule = spawnrules[rcl];

        if (!rule || !rule.repair_creep) return;

        let shouldSpawn = false;

        switch (rcl) {
            case 2:
                shouldSpawn = repairers < rule.repair_creep.amount && carriers > 1 && EnergyMinersInRoom > 1 &&
                              !room.memory.danger && room.controller.progress > 4500;
                break;
            case 3:
                shouldSpawn = repairers < rule.repair_creep.amount && carriers > 1 && EnergyMinersInRoom > 1 &&
                              !room.memory.danger;
                break;
            case 4:
                shouldSpawn = !!((repairers < rule.repair_creep.amount + 6 && room.energyAvailable > room.energyCapacityAvailable / 1.3 ||
                              room.memory.danger && repairers < rule.repair_creep.amount + 10) && storage &&
                              ((storage as any).store[RESOURCE_ENERGY] > 50000 && repairers < rule.repair_creep.amount + 1 ||
                              Game.time % 2000 < 400 && (storage as any).store[RESOURCE_ENERGY] > 20000 && repairers < rule.repair_creep.amount ||
                              ((storage as any).store[RESOURCE_ENERGY] > 15000 || room.memory.danger && (storage as any).store[RESOURCE_ENERGY] > 5000) &&
                              (rampartsInRoom.filter(function(s) {return s.hits < 60000}).length || room.memory.danger_timer > 50)));
                break;
            case 5:
                shouldSpawn = !!(repairers < rule.repair_creep.amount + 2 && storage &&
                              ((storage as any).store[RESOURCE_ENERGY] > 50000 && repairers < rule.repair_creep.amount + 1 ||
                              Game.time % 2000 < 400 && (storage as any).store[RESOURCE_ENERGY] > 50000 && repairers < rule.repair_creep.amount ||
                              (storage as any).store[RESOURCE_ENERGY] > 10000 &&
                              (rampartsInRoom.filter(function(s) {return s.hits < 75000}).length || room.memory.danger_timer > 50)));
                break;
            case 6:
                const rampartsInRoomBelow3Mil = rampartsInRoom?.filter(function(s) {return s.hits < 3050000;});
                shouldSpawn = repairers < rule.repair_creep.amount && storage &&
                              ((storage as any).store[RESOURCE_ENERGY] > 150000 && rampartsInRoomBelow3Mil.length > 0 ||
                              Game.time % 3000 < 100 && (storage as any).store[RESOURCE_ENERGY] > 50000 ||
                              room.memory.danger && (storage as any).store[RESOURCE_ENERGY] > 50000);
                break;
            case 7:
                const rampartsInRoomBelow5Mil = rampartsInRoom?.filter(function(s) {return s.hits < 4050000;});
                shouldSpawn = repairers < rule.repair_creep.amount && storage &&
                              ((storage as any).store[RESOURCE_ENERGY] > 500000 ||
                              Game.time % 3000 < 100 && (storage as any).store[RESOURCE_ENERGY] > 50000 ||
                              room.memory.danger && (storage as any).store[RESOURCE_ENERGY] > 50000) &&
                              rampartsInRoomBelow5Mil.length > 0;
                break;
            case 8:
                shouldSpawn = repairers < rule.repair_creep.amount + 2 && storage &&
                              ((storage as any).store[RESOURCE_ENERGY] > 500000 ||
                              Game.time % 3000 < 100 && (storage as any).store[RESOURCE_ENERGY] > 50000 ||
                              room.memory.danger && (storage as any).store[RESOURCE_ENERGY] > 50000);
                break;
        }

        if (shouldSpawn) {
            const name = 'Repair-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push(rule.repair_creep.body, name, {memory: {role: 'repair', homeRoom: room.name}});
            console.log('Adding Repair to Spawn List: ' + name);
        }
    }

    static generateMaintainers(room: Room, maintainers: number, spawnMaintainer: boolean, storage: any, spawnrules: any, roomState: any) {
        const rcl = room.controller.level;
        const rule = spawnrules[rcl];

        if (!rule || !rule.maintain_creep) return;

        // Check for energy source
        let hasEnergySource = false;
        const storageObj = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        if (storageObj) {
            hasEnergySource = true;
        } else {
            const allStructuresAny = roomState.allStructuresAny;
            const containers = allStructuresAny.filter(s => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 200);
            if (containers.length > 0) {
                hasEnergySource = true;
            }
        }

        let shouldSpawn = false;
        let dangerCheck = rcl >= 4 ? !room.memory.danger : !room.memory.danger;

        switch (rcl) {
            case 3:
                shouldSpawn = maintainers < rule.maintain_creep.amount && dangerCheck && hasEnergySource &&
                              (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0 || spawnMaintainer);
                break;
            case 4:
                shouldSpawn = maintainers < rule.maintain_creep.amount && dangerCheck && hasEnergySource &&
                              (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0 || spawnMaintainer);
                break;
            case 5:
                shouldSpawn = maintainers < rule.maintain_creep.amount && hasEnergySource &&
                              (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0 || spawnMaintainer);
                break;
            case 6:
                shouldSpawn = maintainers < rule.maintain_creep.amount && hasEnergySource &&
                              (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0 || spawnMaintainer);
                break;
            case 7:
                shouldSpawn = maintainers < rule.maintain_creep.amount && hasEnergySource &&
                              (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0 || spawnMaintainer);
                break;
        }

        if (shouldSpawn) {
            if (spawnMaintainer) {
                const name = 'Maintainer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                room.memory.spawn_list.push(rule.maintain_creep.body, name, {memory: {role: 'maintainer', homeRoom: room.name}});
                console.log('Adding Maintainer to Spawn List: ' + name);
            } else if (room.memory.keepTheseRoads && room.memory.keepTheseRoads.length > 0) {
                for (const roadID of room.memory.keepTheseRoads) {
                    const road: any = Game.getObjectById(roadID);
                    if (road && road.hits <= 2000) {
                        let canSpawn = true;
                        if (rcl >= 4 && room.memory.danger) {
                            canSpawn = storage && storage.pos.roomName == road.pos.roomName && storage.pos.getRangeTo(road) <= 10;
                        }
                        if (canSpawn) {
                            const name = 'Maintainer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(rule.maintain_creep.body, name, {memory: {role: 'maintainer', homeRoom: room.name}});
                            console.log('Adding Maintainer to Spawn List: ' + name);
                            break;
                        }
                    }
                }
            }
        }
    }

    static generateAll(room: Room, builders: number, repairers: number, maintainers: number, EnergyMinersInRoom: number, carriers: number, sites: any[], storage: any, spawnMaintainer: boolean, spawnrules: any, rampartsInRoom: any[], roomState: any) {
        this.generateBuilders(room, builders, EnergyMinersInRoom, sites, storage, spawnrules, roomState);
        this.generateRepairers(room, repairers, carriers, EnergyMinersInRoom, storage, spawnrules, rampartsInRoom, roomState);
        this.generateMaintainers(room, maintainers, spawnMaintainer, storage, spawnrules, roomState);
    }
}

// Military role generator - encapsulates Defender, Attacker, RangedAttacker, RampartDefender generation logic
class MilitaryRoleGenerator {
    static generateEmergencyAttackers(room: Room, attackers: number, roomState: any) {
        if (room.controller.level < 3 && room.controller.safeMode && attackers < 1) {
            const hostileCreeps = roomState.hostileCreeps;
            if (hostileCreeps.length > 0) {
                const name = 'DirtClearer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                room.memory.spawn_list.unshift([ATTACK, MOVE], name, {memory: {role: 'attacker', targetRoom: room.name, homeRoom: room.name}});
                console.log('Adding DirtClearer to Spawn List: ' + name);
            }
        }
    }

    static generateRampartDefenders(room: Room, RampartDefenders: number, storage: any, roomState: any) {
        const HostileCreeps = roomState.hostileCreeps;

        if (HostileCreeps.length === 0) return;

        let inRangeFourteen = false;
        let addtolist = true;

        for (const hostile of HostileCreeps) {
            const distance = hostile.pos.getRangeTo(room.controller.pos);
            if (distance <= 14) {
                inRangeFourteen = true;
                break;
            }
        }

        if (inRangeFourteen && RampartDefenders < 1) {
            let found = false;
            for (const enemyCreep of HostileCreeps) {
                for (const part of enemyCreep.body) {
                    if (part.type == ATTACK || part.type == WORK) {
                        found = true;
                    }
                }
            }
            if (found == false && RampartDefenders == 1) {
                addtolist = false;
            }
            if (addtolist) {
                const newName = 'RampartDefender-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

                if (room.controller.level >= 7) {
                    let body;
                    if (found == false) {
                        if (room.controller.level === 7) {
                            body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                        } else {
                            body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                        }
                    }
                    if (found == true) {
                        if (room.controller.level === 7) {
                            body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                        } else {
                            body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                        }
                    }

                    // Boost logic
                    if (storage && storage.store[RESOURCE_CATALYZED_UTRIUM_ACID] >= 990 && room.controller.level >= 7 && room.memory.labs && room.memory.labs.outputLab3 && (HostileCreeps.length > 1 || HostileCreeps.length == 1 && room.controller.level == 7 && HostileCreeps[0].getActiveBodyparts(HEAL) >= 16)) {
                        if (room.memory.labs && room.memory.labs.status && !room.memory.labs.status.boost) {
                            room.memory.labs.status.boost = {};
                        }
                        if (room.memory.labs.status.boost) {
                            if (room.memory.labs.status.boost.lab3) {
                                room.memory.labs.status.boost.lab3.amount += HostileCreeps.length > 2 ? 990 : 630;
                                room.memory.labs.status.boost.lab3.use += 1;
                            } else {
                                room.memory.labs.status.boost.lab3 = {};
                                room.memory.labs.status.boost.lab3.amount = HostileCreeps.length > 2 ? 990 : 630;
                                room.memory.labs.status.boost.lab3.use = 1;
                            }
                        }
                        room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab3]}});
                    } else {
                        room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name}});
                    }
                } else {
                    const body = getBody([ATTACK, ATTACK, ATTACK, ATTACK, MOVE], room, 50);
                    room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name}});
                }
                console.log('Adding RampartDefender to Spawn List: ' + newName);
            }
        }
    }

    static generateRangedRampartDefenders(room: Room, RangedRampartDefenders: number, storage: any, roomState: any) {
        const HostileCreeps = roomState.hostileCreeps;

        if (HostileCreeps.length > 4 && storage && storage.store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] >= 45000) {
            const required = room.controller.level == 7 ? 3 : 2;
            if (RangedRampartDefenders < required) {
                const newName = 'RangedRampartDefender-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                const body = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

                if (room.memory.labs && room.memory.labs.status && !room.memory.labs.status.boost) {
                    room.memory.labs.status.boost = {};
                }
                if (room.memory.labs.status.boost) {
                    if (room.memory.labs.status.boost.lab4) {
                        room.memory.labs.status.boost.lab4.amount += 45000;
                        room.memory.labs.status.boost.lab4.use += 1;
                    } else {
                        room.memory.labs.status.boost.lab4 = {};
                        room.memory.labs.status.boost.lab4.amount = 45000;
                        room.memory.labs.status.boost.lab4.use = 1;
                    }
                }

                room.memory.spawn_list.push(body, newName, {memory: {role: 'RRD', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab4]}});
                console.log('Adding RangedRampartDefender to Spawn List: ' + newName);
            }
        }
    }

    static generateAll(room: Room, attackers: number, RampartDefenders: number, RangedRampartDefenders: number, storage: any, roomState: any) {
        this.generateEmergencyAttackers(room, attackers, roomState);
        this.generateRampartDefenders(room, RampartDefenders, storage, roomState);
        this.generateRangedRampartDefenders(room, RangedRampartDefenders, storage, roomState);
    }
}

// Special role generator - encapsulates Scout, Claimer, MineralMiner, Reserver, RemoteRepairer generation logic
// Special defense role generator - handles healer, danger filler, RampartDefender, RangedRampartDefender, Clearer, SpecialRepair, SpecialCarry, NukeRepair
class SpecialDefenseGenerator {
    static generateHealer(room: Room, healers: number, roomState: any) {
        if (healers < 1 && room.memory.Structures.towers.length === 0) {
            const myCreeps = roomState.myCreeps;
            const woundedCreeps = _.filter(myCreeps, (c: any) => c.hits < c.hitsMax);
            if (woundedCreeps.length > 0) {
                const newName = 'Healer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                room.memory.spawn_list.push(getBody([HEAL, MOVE], room, 4), newName, {memory: {role: 'healer'}});
                console.log('Adding Healer to Spawn List: ' + newName);
            }
        }
    }

    static generateDangerFiller(room: Room, fillers: number) {
        if (room.memory.danger && room.memory.danger_timer > 35 && fillers < 2) {
            const name = 'Filler-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.unshift(getBody([CARRY, CARRY, MOVE], room, 12), name, {memory: {role: 'filler'}});
            console.log('Adding filler to Spawn List: ' + name);
        }
    }

    static generateRampartDefenders(room: Room, fillers: number, RampartDefenders: number, RangedRampartDefenders: number, storage: any, roomState: any) {
        if (room.memory.danger == true && room.memory.danger_timer >= 35 && fillers >= 2 && storage && (storage as any).store[RESOURCE_ENERGY] > 10000) {
            let addtolist = true;
            let HostileCreeps = roomState.hostileCreeps;
            HostileCreeps = HostileCreeps.filter(function(c: any) {return c.owner.username !== "Invader" && c.ticksToLive > 350;});
            let inRangeFourteen = false;
            if (HostileCreeps.length > 0) {
                if (storage && storage.pos.getRangeTo(storage.pos.findClosestByRange(HostileCreeps)) <= 14) {
                    if (HostileCreeps.length > 4 && RampartDefenders <= 1 && storage &&
                        (storage as any).store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] >= 300 &&
                        (storage as any).store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] >= 1200 &&
                        (RangedRampartDefenders < 3 && room.controller.level == 7 || RangedRampartDefenders < 2 && room.controller.level == 8)) {
                        if (room.controller.level == 8) {
                            const body = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        MOVE, MOVE, MOVE, MOVE, MOVE,
                                        MOVE, MOVE, MOVE, MOVE, MOVE];
                            const newName = 'RRD-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName, {memory: {role: 'RRD', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab4, room.memory.labs.outputLab2]}});
                            console.log('Adding RangedRampartDefender to Spawn List: ' + newName);
                            this.handleBoostAllocation(room, storage, 'lab2', 300);
                            this.handleBoostAllocation(room, storage, 'lab4', 1200);
                        }
                        else if (room.controller.level == 7) {
                            const body = [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK,
                                        RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE,
                                        MOVE, MOVE, MOVE, MOVE, MOVE,
                                        MOVE, MOVE, MOVE, MOVE, MOVE];
                            const newName = 'RRD-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName, {memory: {role: 'RRD', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab4, room.memory.labs.outputLab2]}});
                            console.log('Adding RangedRampartDefender to Spawn List: ' + newName);
                            this.handleBoostAllocation(room, storage, 'lab2', 240);
                            this.handleBoostAllocation(room, storage, 'lab4', 960);
                        }
                    }
                    inRangeFourteen = true;
                }
            }
            if (inRangeFourteen && RampartDefenders < 1) {
                let found = false;
                for (const enemyCreep of HostileCreeps) {
                    for (const part of enemyCreep.body) {
                        if (part.type == ATTACK || part.type == WORK) {
                            found = true;
                        }
                    }
                }
                if (found == false && RampartDefenders == 1) {
                    addtolist = false;
                }
                if (addtolist) {
                    const newName = 'RampartDefender-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    if (room.controller.level >= 7) {
                        let body;
                        if (found == false) {
                            if (room.controller.level === 7) {
                                body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                            }
                            else {
                                body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                            }
                        }
                        if (found == true) {
                            if (room.controller.level === 7) {
                                body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                            }
                            else {
                                body = [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
                            }
                        }
                        if (storage && (storage as any).store[RESOURCE_CATALYZED_UTRIUM_ACID] >= 990 && room.controller.level >= 7 && room.memory.labs && room.memory.labs.outputLab3 && (HostileCreeps.length > 1 || HostileCreeps.length == 1 && room.controller.level == 7 && HostileCreeps[0].getActiveBodyparts(HEAL) >= 16)) {
                            if (HostileCreeps.length > 2) {
                                this.handleBoostAllocation(room, storage, 'lab3', 990);
                                room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab3]}});
                            }
                            else if (HostileCreeps.length == 1) {
                                this.handleBoostAllocation(room, storage, 'lab3', 630);
                                room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab3]}});
                            }
                        }
                        else {
                            room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name}});
                        }
                    }
                    else {
                        const body = getBody([ATTACK, ATTACK, ATTACK, ATTACK, MOVE], room, 50);
                        room.memory.spawn_list.push(body, newName, {memory: {role: 'RampartDefender', homeRoom: room.name}});
                    }
                    console.log('Adding RampartDefender to Spawn List: ' + newName);
                }
            }
        }
    }

    static generateClearer(room: Room, clearers: number, RampartDefenders: number, roomState: any) {
        if (room.controller.level === 8 && clearers < 1 && room.memory.danger && room.memory.danger_timer > 300 && RampartDefenders === 0) {
            let hostileCreeps = roomState.hostileCreeps;
            hostileCreeps = _.filter(hostileCreeps, (c: any) => c.owner.username !== "Invader");
            if (hostileCreeps.length) {
                const attackCreeps = _.filter(hostileCreeps, (c: any) => c.getActiveBodyparts(ATTACK) > 0);
                const rangedAttackCreeps = _.filter(hostileCreeps, (c: any) => c.getActiveBodyparts(RANGED_ATTACK) > 0);
                if (attackCreeps.length > 0 || rangedAttackCreeps.length > 0) {
                    if (attackCreeps.length) {
                        const newName = 'Clearer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push(
                            [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK],
                            newName,
                            {memory: {role: 'clearer', boostlabs: [room.memory.labs.outputLab2, room.memory.labs.outputLab3, room.memory.labs.outputLab7], boosted: true}}
                        );
                        console.log('Adding Clearer to Spawn List: ' + newName);
                        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
                        if (storage && (storage as any).store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] >= 300 && (storage as any).store[RESOURCE_CATALYZED_UTRIUM_ACID] >= 900 &&
                            (storage as any).store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] >= 300 &&
                            room.memory.labs && room.memory.labs.outputLab2 && room.memory.labs.outputLab3 && room.memory.labs.outputLab7) {
                            this.handleBoostAllocation(room, storage, 'lab3', 900);
                            this.handleBoostAllocation(room, storage, 'lab2', 300);
                            this.handleBoostAllocation(room, storage, 'lab7', 300);
                        }
                    }
                }
                else {
                    const newName = 'Clearer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push(
                        [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, ATTACK],
                        newName,
                        {memory: {role: 'clearer'}}
                    );
                    console.log('Adding Clearer to Spawn List: ' + newName);
                }
            }
        }
    }

    static generateSpecialRepairAndCarry(room: Room, SpecialRepairers: number, storage: any, rampartsInRoomBelowTwelveMil: any[]) {
        if (SpecialRepairers < 4 && storage && (storage as any).store[RESOURCE_ENERGY] > 25000 && room.memory.danger && room.controller.level >= 7 && (room.memory.danger || room.memory.danger_timer > 0)) {
            let rampartsInDangerOfDying = false;
            let rampartsInDangerOfDying4Mil = false;
            if (rampartsInRoomBelowTwelveMil && rampartsInRoomBelowTwelveMil.length > 0 && storage) {
                rampartsInRoomBelowTwelveMil = rampartsInRoomBelowTwelveMil.filter(function(r: any) {return storage.pos.getRangeTo(r) >= 8 && storage.pos.getRangeTo(r) <= 10;});
                const rampartsInRoomBelow6Mil = rampartsInRoomBelowTwelveMil.filter(function(r: any) {return r.hits <= 8050000;});
                const rampartsInRoomBelow4Mil = rampartsInRoomBelow6Mil.filter(function(r: any) {return r.hits <= 7050000;});
                if (rampartsInRoomBelow4Mil.length > 0) {
                    rampartsInDangerOfDying4Mil = true;
                }
                else {
                    if (room.controller.level == 8 && rampartsInRoomBelowTwelveMil.length > 0) {
                        rampartsInDangerOfDying = true;
                    }
                    else if (room.controller.level == 7 && rampartsInRoomBelow6Mil.length > 0) {
                        rampartsInDangerOfDying = true;
                    }
                }
            }
            if (room.memory.danger_timer > 200 && SpecialRepairers < 1 || rampartsInDangerOfDying && SpecialRepairers < 1 || rampartsInDangerOfDying4Mil && SpecialRepairers < 4 && room.energyCapacityAvailable >= 4000) {
                const newName = 'SpecialRepair-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                console.log('Adding SpecialRepair to Spawn List: ' + newName);
                if (room.controller.level >= 7) {
                    if (storage && (storage as any).store[RESOURCE_CATALYZED_LEMERGIUM_ACID] >= 1080 && room.memory.labs && room.memory.labs.outputLab1 && room.memory.danger && room.memory.danger_timer >= 50) {
                        this.handleBoostAllocation(room, storage, 'lab1', 1080);
                        room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], newName, {memory: {role: 'SpecialRepair', boostlabs: [room.memory.labs.outputLab1]}});
                    }
                    else {
                        room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], newName, {memory: {role: 'SpecialRepair'}});
                    }
                    const newName2 = 'SpecialCarry-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push([MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY], newName2, {memory: {role: 'SpecialCarry'}});
                    console.log('Adding SpecialCarry to Spawn List: ' + newName);
                }
                else if (room.controller.level == 6) {
                    if (storage && (storage as any).store[RESOURCE_CATALYZED_LEMERGIUM_ACID] >= 540 && room.memory.labs && room.memory.labs.outputLab1 && room.memory.danger && room.memory.danger_timer >= 50) {
                        this.handleBoostAllocation(room, storage, 'lab1', 540);
                        room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], newName, {memory: {role: 'SpecialRepair', boostlabs: [room.memory.labs.outputLab1]}});
                    }
                    else {
                        room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], newName, {memory: {role: 'SpecialRepair'}});
                    }
                    const newName2 = 'SpecialCarry-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push([MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY], newName2, {memory: {role: 'SpecialCarry'}});
                    console.log('Adding SpecialCarry to Spawn List: ' + newName);
                }
            }
        }
    }

    static generateNukeRepair(room: Room, repairers: number, storage: any) {
        if ((room.memory.NukeRepair && repairers < 4 && !room.memory.danger || room.memory.defence && room.memory.defence.nuke && repairers < 1) && (Game.cpu.bucket > 150 || Memory.pixelManager?.enabled) && storage && (storage as any).store[RESOURCE_ENERGY] > 75000) {
            const name = 'Repair-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            if (room.controller.level >= 7 && room.find(FIND_NUKES).length > 2 && storage && (storage as any).store[RESOURCE_CATALYZED_LEMERGIUM_ACID] >= 1980 && room.memory.labs && room.memory.labs.outputLab1) {
                this.handleBoostAllocation(room, storage, 'lab1', 660);
                room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], name, {memory: {role: 'repair', homeRoom: room.name, boostlabs: [room.memory.labs.outputLab1]}});
            }
            else {
                room.memory.spawn_list.push([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                    CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE], name, {memory: {role: 'repair', homeRoom: room.name}});
            }
            console.log('Adding Repair to Spawn List: ' + name);
        }
    }

    private static handleBoostAllocation(room: Room, storage: any, labName: string, amount: number) {
        if (room.memory.labs && room.memory.labs.status && !room.memory.labs.status.boost) {
            room.memory.labs.status.boost = {};
        }
        if (room.memory.labs.status.boost) {
            if (room.memory.labs.status.boost[labName]) {
                room.memory.labs.status.boost[labName].amount += amount;
                room.memory.labs.status.boost[labName].use += 1;
            }
            else {
                room.memory.labs.status.boost[labName] = {amount: amount, use: 1};
            }
        }
    }

    static generateAll(room: Room, healers: number, fillers: number, RampartDefenders: number, RangedRampartDefenders: number, SpecialRepairers: number, repairers: number, clearers: number, storage: any, rampartsInRoomBelowTwelveMil: any[], roomState: any) {
        this.generateHealer(room, healers, roomState);
        this.generateDangerFiller(room, fillers);
        this.generateRampartDefenders(room, fillers, RampartDefenders, RangedRampartDefenders, storage, roomState);
        this.generateClearer(room, clearers, RampartDefenders, roomState);
        this.generateSpecialRepairAndCarry(room, SpecialRepairers, storage, rampartsInRoomBelowTwelveMil);
        this.generateNukeRepair(room, repairers, storage);
    }
}

// Special utility role generator - handles Signer, Priest, RampartErector, Sweeper, SafeModer
class SpecialUtilityGenerator {
    static generateSigner(room: Room, Signers: number) {
        if (Signers < 1 && room.controller.level >= 5 && !room.memory.danger && room.memory.danger_timer == 0 && room.controller.sign && room.controller.sign.text !== "种田流,请勿攻击。I'm a peace lover.Please don't attack me.Tell me if you need any room I claimed.") {
            const newName = 'Signer' + "-" + room.name;
            room.memory.spawn_list.push([MOVE], newName, {memory: {role: 'Sign', homeRoom: room.name}});
            console.log('Adding Signer to Spawn List: ' + newName);
        }
    }

    static generatePriest(room: Room, Priests: number) {
        if (Priests < 1 && room.controller.level >= 6 && !room.memory.danger && room.memory.danger_timer == 0 && room.memory.data.DOB % 125000 < 400 && (Game.cpu.bucket > 7000 || Memory.pixelManager?.enabled)) {
            const newName = 'Priest' + "-" + room.name;
            room.memory.spawn_list.push([MOVE], newName, {memory: {role: 'Priest', homeRoom: room.name, roomsVisited: []}});
            console.log('Adding Priest to Spawn List: ' + newName);
        }
    }

    static generateRampartErector(room: Room, RampartErectors: number, storage: any) {
        // Check for rampart positions in new roomPlanner system
        // Optimized rampart work check using memory flags (low CPU)
        const hasRampartLayout = Memory.roomPlanner && Memory.roomPlanner[room.name] &&
                                Memory.roomPlanner[room.name].layout &&
                                Memory.roomPlanner[room.name].layout.rampart &&
                                Memory.roomPlanner[room.name].layout.rampart.length > 0;

        // Reset completion flag if ramparts are damaged (low frequency check)
        if (room.memory.rampartsCompleted && Game.time % 100 === 0) {
            const damagedRamparts = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_RAMPART && s.hits < s.hitsMax * 0.8
            });
            if (damagedRamparts.length > 0) {
                room.memory.rampartsCompleted = false;
                console.log(`[Rampart System] Detected ${damagedRamparts.length} damaged ramparts, re-enabling RampartErector`);
            }
        }

        const needsRampart = hasRampartLayout && !room.memory.rampartsCompleted;

        if (RampartErectors < 1 && storage && room.controller.level >= 6 && (storage as any).store[RESOURCE_ENERGY] > 12000 && needsRampart && !room.memory.danger && room.memory.danger_timer == 0) {
            const newName = 'RampartErector-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push([WORK, CARRY, MOVE], newName, {memory: {role: 'RampartErector'}});
            console.log('[New System] Adding RampartErector to Spawn List: ' + newName);
        }
    }

    static generateSweeper(room: Room, sweepers: number, storage: any, roomState: any) {
        const droppedResources = roomState.droppedResources;
        const tombstones = roomState.tombstones;

        // 计算含有能量的墓碑数量
        const energyTombs = tombstones.filter((tombstone: any) => tombstone.store[RESOURCE_ENERGY] > 0).length;

        // 计算含有化合物（非能量、非基础矿物）的墓碑数量
        const compoundTombs = tombstones.filter((tombstone: any) => {
            for (const resourceType in tombstone.store) {
                if (resourceType !== RESOURCE_ENERGY &&
                    resourceType !== RESOURCE_HYDROGEN &&
                    resourceType !== RESOURCE_OXYGEN &&
                    resourceType !== RESOURCE_UTRIUM &&
                    resourceType !== RESOURCE_LEMERGIUM &&
                    resourceType !== RESOURCE_KEANIUM &&
                    resourceType !== RESOURCE_ZYNTHIUM &&
                    resourceType !== RESOURCE_CATALYST &&
                    tombstone.store[resourceType] > 0) {
                    return true;
                }
            }
            return false;
        }).length;

        // 基础清理目标：掉落资源 + 含能量的墓碑
        const basicCleanupTargets = droppedResources.length + energyTombs + 1;

        // 含化合物墓碑的优先级更高，每个化合物墓碑算作3个清理目标
        const weightedCleanupTargets = basicCleanupTargets + (compoundTombs * 2);

        if (room.controller.level >= 4 && storage && !room.memory.danger && room.memory.danger_timer == 0 && sweepers < Math.floor(weightedCleanupTargets / 3)) {
            const newName = 'Sweeper-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push([CARRY, CARRY, CARRY, CARRY, MOVE, MOVE], newName, {memory: {role: 'sweeper'}});
            console.log('Adding Sweeper to Spawn List: ' + newName + ' (Targets: ' + weightedCleanupTargets + ', Compound tombs: ' + compoundTombs + ')');
        }
    }

    static generateSafeModer(room: Room, SafeModers: number, storage: any) {
        if (room.controller.level >= 4 && room.energyAvailable >= 1050 && (!room.memory.danger || room.controller.safeMode && room.controller.safeMode > 0) && room.controller.safeModeAvailable <= 1 && SafeModers < 1 && storage && (storage as any).store[RESOURCE_GHODIUM] >= 1000) {
            const newName = 'SafeModer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push([MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY], newName, {memory: {role: 'SafeModer'}});
            console.log('Adding SafeModer to Spawn List: ' + newName);
        }
    }

    static generateAll(room: Room, Signers: number, Priests: number, RampartErectors: number, sweepers: number, SafeModers: number, storage: any, roomState: any) {
        this.generateSigner(room, Signers);
        this.generatePriest(room, Priests);
        this.generateRampartErector(room, RampartErectors, storage);
        this.generateSweeper(room, sweepers, storage, roomState);
        this.generateSafeModer(room, SafeModers, storage);
    }
}

// Remote defense role generator - handles SneakyControllerUpgrader, ContainerBuilder, RangedAttacker, DrainTower, RemoteDismantler, Dismantler, Annoyer
class RemoteDefenseGenerator {
    static generateSneakyControllerUpgrader(room: Room, SneakyControllerUpgraders: number, storage: any) {
        if (SneakyControllerUpgraders < 1 && room.controller.level >= 5 && !room.memory.danger && storage && (storage as any).store[RESOURCE_ENERGY] > 180000 && (Game.cpu.bucket > 7000 || Memory.pixelManager?.enabled)) {
            for (const roomName of Memory.keepAfloat) {
                if (Game.map.getRoomLinearDistance(room.name, roomName) <= 4 && Game.rooms[roomName] && Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {
                    if (Game.rooms[roomName].controller.level == 2 && Game.rooms[roomName].controller.ticksToDowngrade < 4000 ||
                        Game.rooms[roomName].controller.level == 3 && Game.rooms[roomName].controller.ticksToDowngrade < 10000 ||
                        Game.rooms[roomName].controller.level == 4 && Game.rooms[roomName].controller.ticksToDowngrade < 20000 ||
                        Game.rooms[roomName].controller.level == 5 && Game.rooms[roomName].controller.ticksToDowngrade < 50000 ||
                        Game.rooms[roomName].controller.level == 6 && Game.rooms[roomName].controller.ticksToDowngrade < 80000 ||
                        Game.rooms[roomName].controller.level == 7 && Game.rooms[roomName].controller.ticksToDowngrade < 95000 ||
                        Game.rooms[roomName].controller.level == 8 && Game.rooms[roomName].controller.ticksToDowngrade < 135000) {
                        let hostileCreeps = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
                        hostileCreeps = hostileCreeps.filter(function(c: any) {return c.owner.username !== "Invader" && c.ticksToLive > 250 && (c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0);});
                        if (hostileCreeps.length) {
                            global.SDB(room.name, roomName, true, true);
                        }
                        let body = [];
                        if (hostileCreeps.length) {
                            body = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, MOVE, WORK, CARRY, MOVE];
                        }
                        else {
                            body = [CARRY, MOVE, MOVE, WORK, CARRY, MOVE];
                        }
                        if (hostileCreeps.length) {
                            const newName = 'SneakyControllerUpgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName, {memory: {role: 'SneakyControllerUpgrader', homeRoom: room.name, targetRoom: roomName, locked_away: 0}});
                            console.log('Adding Sneaky Controller Upgrader to Spawn List: ' + newName);
                        }
                        else {
                            const newName1 = 'SneakyControllerUpgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName1, {memory: {role: 'SneakyControllerUpgrader', homeRoom: room.name, targetRoom: roomName, locked_away: 0}});
                            console.log('Adding Sneaky Controller Upgrader to Spawn List: ' + newName1);
                            const newName2 = 'SneakyControllerUpgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName2, {memory: {role: 'SneakyControllerUpgrader', homeRoom: room.name, targetRoom: roomName, locked_away: 0}});
                            console.log('Adding Sneaky Controller Upgrader to Spawn List: ' + newName2);
                            const newName3 = 'SneakyControllerUpgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName3, {memory: {role: 'SneakyControllerUpgrader', homeRoom: room.name, targetRoom: roomName, locked_away: 0}});
                            console.log('Adding Sneaky Controller Upgrader to Spawn List: ' + newName3);
                            const newName4 = 'SneakyControllerUpgrader-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName4, {memory: {role: 'SneakyControllerUpgrader', homeRoom: room.name, targetRoom: roomName, locked_away: 0}});
                            console.log('Adding Sneaky Controller Upgrader to Spawn List: ' + newName4);
                        }
                        break;
                    }
                }
                else if (!Game.rooms[roomName] || Game.rooms[roomName] && Game.rooms[roomName].controller && !Game.rooms[roomName].controller.my) {
                    Memory.keepAfloat = Memory.keepAfloat.filter(function(roomname: string) {return roomname !== roomName;});
                }
            }
        }
    }

    static generateContainerBuilder(room: Room, containerbuilders: number, storage: any) {
        if (!Memory.target_colonise) {
            Memory.target_colonise = {};
        }
        let target_colonise;
        if (Memory.target_colonise) {
            target_colonise = Memory.target_colonise.room;
        }
        if (target_colonise) {
            const distance_to_target_room = Game.map.getRoomLinearDistance(room.name, target_colonise);
            let closestRoom = null;
            let closestDistance = Infinity;
            let maxEnergy = 0;
            const targetRoomName = target_colonise;
            for (const roomName in Game.rooms) {
                const r = Game.rooms[roomName];
                if (r.controller && r.controller.my && r.controller.level >= 3) {
                    const distance = Game.map.getRoomLinearDistance(r.name, targetRoomName);
                    const energyInStorage = r.storage ? r.storage.store[RESOURCE_ENERGY] || 0 : 0;
                    if (distance < closestDistance || (distance === closestDistance && energyInStorage > maxEnergy)) {
                        closestRoom = r;
                        closestDistance = distance;
                        maxEnergy = energyInStorage;
                    }
                }
            }
            if (closestRoom && closestRoom.name == room.name) {
                if (target_colonise && containerbuilders < 2 && !room.memory.danger && room.controller.level >= 3 && storage && (storage as any).store[RESOURCE_ENERGY] > 10000 && Game.cpu.bucket > 7750 && distance_to_target_room <= 7 && Game.rooms[target_colonise] && (Game.rooms[target_colonise].find(FIND_MY_SPAWNS).length == 0 || Game.rooms[target_colonise].controller.level <= 1 || (Game.rooms[target_colonise].controller.level >= 4 && (!Game.rooms[target_colonise].storage && containerbuilders < 1 || Game.rooms[target_colonise].energyCapacityAvailable <= 500)) || (Game.rooms[target_colonise].find(FIND_MY_SPAWNS).length == 0 && containerbuilders < 1)) && Game.rooms[target_colonise].controller.level >= 1 && Game.rooms[target_colonise].controller.my) {
                    const newName = 'ContainerBuilder-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push(getBody([WORK, CARRY, CARRY, CARRY, MOVE], room, 50), newName, {memory: {role: 'remoteBuilder', targetRoom: target_colonise, homeRoom: room.name}});
                    console.log('Adding ContainerBuilder to Spawn List: ' + newName);
                }
            }
        }
    }

    static generateRangedAttacker(room: Room, RangedAttackers: number, storage: any) {
        if (!Memory.target_colonise) {
            Memory.target_colonise = {};
        }
        let target_colonise;
        if (Memory.target_colonise) {
            target_colonise = Memory.target_colonise.room;
        }
        if (target_colonise) {
            const distance_to_target_room = Game.map.getRoomLinearDistance(room.name, target_colonise);
            let closestRoom = null;
            let closestDistance = Infinity;
            let maxEnergy = 0;
            const targetRoomName = target_colonise;
            for (const roomName in Game.rooms) {
                const r = Game.rooms[roomName];
                if (r.controller && r.controller.my && r.controller.level >= 3) {
                    const distance = Game.map.getRoomLinearDistance(r.name, targetRoomName);
                    const energyInStorage = r.storage ? r.storage.store[RESOURCE_ENERGY] || 0 : 0;
                    if (distance < closestDistance || (distance === closestDistance && energyInStorage > maxEnergy)) {
                        closestRoom = r;
                        closestDistance = distance;
                        maxEnergy = energyInStorage;
                    }
                }
            }
            if (closestRoom && closestRoom.name == room.name) {
                if (target_colonise && RangedAttackers < 2 && room.controller.level >= 7 && storage && (storage as any).store[RESOURCE_ENERGY] > 180000 && distance_to_target_room <= 7 && Game.rooms[target_colonise] && (Game.rooms[target_colonise].find(FIND_MY_SPAWNS).length == 0 || Game.rooms[target_colonise].controller.level <= 3) && Game.rooms[target_colonise].controller.level >= 1 && (Game.rooms[target_colonise].controller.my || !Game.rooms[target_colonise].controller.my && !Game.rooms[target_colonise].find(FIND_MY_STRUCTURES, {filter: (s: any) => s.structureType == STRUCTURE_TOWER}).length) && Game.time - Memory.target_colonise.lastSpawnRanger > 1500 && !Game.rooms[target_colonise].controller.safeMode) {
                    if (storage && (storage as any).store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] >= 45000 && Game.rooms[target_colonise].controller.level < 3) {
                        const newName = 'RangedAttacker-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL, HEAL, HEAL, HEAL, HEAL], newName, {memory: {role: 'RangedAttacker', targetRoom: target_colonise, homeRoom: room.name, sticky: true, boostlabs: [room.memory.labs.outputLab4], ignore: true}});
                        console.log('Adding Defending-Ranged-Attacker to Spawn List: ' + newName);
                        Memory.target_colonise.lastSpawnRanger = Game.time - (distance_to_target_room * 100);
                        if (room.memory.labs && room.memory.labs.status && !room.memory.labs.status.boost) {
                            room.memory.labs.status.boost = {};
                        }
                        if (room.memory.labs.status.boost) {
                            if (room.memory.labs.status.boost.lab4) {
                                room.memory.labs.status.boost.lab4.amount += 600;
                                room.memory.labs.status.boost.lab4.use += 1;
                            }
                            else {
                                room.memory.labs.status.boost.lab4 = {amount: 600, use: 1};
                            }
                        }
                    }
                    else {
                        const newName = 'RangedAttacker-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, HEAL, HEAL, HEAL, HEAL, HEAL], newName, {memory: {role: 'RangedAttacker', targetRoom: target_colonise, homeRoom: room.name, sticky: true, ignore: true}});
                        console.log('Adding Defending-Ranged-Attacker to Spawn List: ' + newName);
                        Memory.target_colonise.lastSpawnRanger = Game.time - (distance_to_target_room * 100);
                    }
                }
            }
        }
    }

    static generateDrainTower(room: Room, DrainTowers: number) {
        if (DrainTowers < 0 && room.energyCapacityAvailable > 5200 && Game.map.getRoomLinearDistance(room.name, "E15S37") <= 5) {
            const newName = 'rewotreniard-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL, HEAL], newName, {memory: {role: 'DrainTower', targetRoom: "E15S38", homeRoom: room.name}});
            console.log('Adding Tower Drainer to Spawn List: ' + newName);
        }
    }

    static generateRemoteDismantler(room: Room, RemoteDismantlers: number, storage: any) {
        if (RemoteDismantlers < 0 && room.controller.level >= 4 && storage && (storage as any).store[RESOURCE_ENERGY] > 300000 && Game.map.getRoomLinearDistance(room.name, "E45N58") <= 2) {
            const newName = 'RemoteDismantler-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push([MOVE, MOVE, WORK, WORK], newName, {memory: {role: 'RemoteDismantler', targetRoom: "E45N58", homeRoom: room.name}});
            console.log('Adding RemoteDismantler to Spawn List: ' + newName);
        }
    }

    static generateDismantler(room: Room, Dismantlers: number) {
        if (room.controller.level <= 4 && Dismantlers < 0) {
            const newName = 'Dismantler-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
            room.memory.spawn_list.push(getBody([WORK, WORK, WORK, WORK, MOVE], room), newName, {memory: {role: 'Dismantler'}});
            console.log('Adding Dismantler to Spawn List: ' + newName);
        }
    }

    static generateAnnoyer(room: Room, annoyers: number) {
        const annoyRoom: any = false;
        if (annoyRoom && annoyers < 1 && Game.map.getRoomLinearDistance(room.name, annoyRoom) <= 5 && annoyRoom !== room.name) {
            if (!(Game.rooms[annoyRoom] && Game.rooms[annoyRoom].controller && Game.rooms[annoyRoom].controller.my && Game.rooms[annoyRoom].controller.level >= 3)) {
                const newName = 'Annoy-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                room.memory.spawn_list.push([MOVE, ATTACK, MOVE, ATTACK, ATTACK, MOVE], newName, {memory: {role: 'annoy', targetRoom: annoyRoom}});
                console.log('Adding Annoyer to Spawn List: ' + newName);
            }
        }
    }

    static generateRemoteRoomDefense(room: Room, resourceData: any, activeRemotes: string[], attackers: number, RangedAttackers: number) {
        _.forEach(Game.rooms, function(thisRoom: Room) {
            _.forEach(resourceData, function(data: any, targetRoomName: string) {
                if (thisRoom.name == targetRoomName && !room.memory.danger && activeRemotes.includes(targetRoomName) && room.storage && room.storage.store[RESOURCE_ENERGY] > 10000) {
                    if (thisRoom.memory.roomData && (thisRoom.memory.roomData.has_hostile_structures || thisRoom.memory.roomData.has_hostile_creeps) && !thisRoom.memory.roomData.has_attacker && attackers < 1) {
                        if (thisRoom.memory.roomData.has_hostile_structures && attackers < 1 || thisRoom.memory.roomData.has_hostile_creeps && !thisRoom.memory.roomData.has_attacker && attackers < 1 && thisRoom.memory.roomData.has_only_invader) {
                            let body = [];
                            if (thisRoom.memory.roomData.has_hostile_structures) {
                                thisRoom.memory.roomData.has_hostile_structures = false;
                                thisRoom.memory.roomData.has_attacker = true;
                                if (room.controller.level >= 7) body = [MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK];
                                else if (room.controller.level >= 5) body = [MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK];
                                else if (room.controller.level === 4) body = [MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK];
                                else body = [MOVE, ATTACK, ATTACK, MOVE, ATTACK, ATTACK];
                            }
                            else if (thisRoom.memory.roomData.has_hostile_creeps && thisRoom.memory.roomData.hostile_body_type) {
                                thisRoom.memory.roomData.has_attacker = true;
                                thisRoom.memory.roomData.has_hostile_creeps = false;
                                const data = thisRoom.memory.roomData.hostile_body_type;
                                const bodyPartsCount = data.heal + data.attack + data.ranged_attack;
                                while (body.length < bodyPartsCount) {
                                    body.push(ATTACK, MOVE, ATTACK);
                                }
                                delete thisRoom.memory.roomData.hostile_body_type;
                            }
                            const newName = 'Attacker-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                            room.memory.spawn_list.push(body, newName, {memory: {role: 'attacker', targetRoom: thisRoom.name, homeRoom: room.name}});
                            console.log('Adding Defending-Attacker to Spawn List: ' + newName);
                        }
                        else if (thisRoom.memory.roomData.has_hostile_creeps && !thisRoom.memory.roomData.has_only_invader && thisRoom.memory.roomData.hostile_body_type && !thisRoom.memory.roomData.has_attacker && RangedAttackers < 1) {
                            const data = thisRoom.memory.roomData.hostile_body_type;
                            const healAmount = data.heal * 12;
                            const attackAmount = data.attack * 30;
                            const rangedAttackAmount = data.ranged_attack * 10;
                            const myNeededHeal = Math.floor((attackAmount + rangedAttackAmount) / 12) - 2;
                            const myNeededRangedAttack = Math.floor(healAmount / 10) + 5;
                            let healArray = [];
                            let rangedAttackArray = [];
                            let moveArray = [];
                            if (myNeededHeal > 0) healArray = Array(myNeededHeal).fill(HEAL);
                            if (myNeededRangedAttack > 0) rangedAttackArray = Array(myNeededRangedAttack).fill(RANGED_ATTACK);
                            if (myNeededHeal + myNeededRangedAttack > 0) moveArray = Array(myNeededRangedAttack + myNeededHeal).fill(MOVE);
                            const body: BodyPartConstant[] = [...healArray, ...rangedAttackArray, ...moveArray];
                            console.log(body, room.name);
                            if (body.length <= 50) {
                                const newName = 'RangedAttacker-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                                room.memory.spawn_list.push(body, newName, {memory: {role: 'RangedAttacker', targetRoom: thisRoom.name, homeRoom: room.name}});
                                console.log('Adding Defending-RangedAttacker to Spawn List: ' + newName);
                                thisRoom.memory.roomData.has_hostile_creeps = false;
                                delete thisRoom.memory.roomData.hostile_body_type;
                                thisRoom.memory.roomData.has_attacker = true;
                            }
                        }
                    }
                    if (room.controller.level <= 4 && thisRoom.memory.roomData && thisRoom.memory.roomData.has_safe_creeps && !thisRoom.memory.roomData.has_attacker && thisRoom.controller && !thisRoom.controller.my && thisRoom.controller.level === 0 && attackers < 1 && thisRoom.find(FIND_HOSTILE_CREEPS).length >= 1) {
                        const newName = 'Attacker-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        room.memory.spawn_list.push([MOVE, ATTACK], newName, {memory: {role: 'attacker', targetRoom: thisRoom.name, homeRoom: room.name}});
                        console.log('Adding Annoying-Attacker to Spawn List: ' + newName);
                        thisRoom.memory.roomData.has_safe_creeps = false;
                    }
                }
            });
        });
    }

    static generateAll(room: Room, SneakyControllerUpgraders: number, containerbuilders: number, RangedAttackers: number, DrainTowers: number, RemoteDismantlers: number, Dismantlers: number, annoyers: number, storage: any, resourceData: any, activeRemotes: string[], attackers: number) {
        this.generateSneakyControllerUpgrader(room, SneakyControllerUpgraders, storage);
        this.generateContainerBuilder(room, containerbuilders, storage);
        this.generateRangedAttacker(room, RangedAttackers, storage);
        this.generateDrainTower(room, DrainTowers);
        this.generateRemoteDismantler(room, RemoteDismantlers, storage);
        this.generateDismantler(room, Dismantlers);
        this.generateAnnoyer(room, annoyers);
        this.generateRemoteRoomDefense(room, resourceData, activeRemotes, attackers, RangedAttackers);
    }
}

class SpecialRoleGenerator {
    static generateMineralMiners(room: Room, MineralMiners: number, storage: any, roomState: any) {
        if (MineralMiners < 1 && room.controller.level >= 6 && room.memory.Structures && room.memory.Structures.extractor && Game.getObjectById(room.memory.Structures.extractor) && !room.memory.danger && room.memory.danger_timer == 0 && storage && (storage as any).store[RESOURCE_ENERGY] > 50000 && storage.store.getUsedCapacity() < 975000) {
            const mineral = Game.getObjectById((room.memory as any).mineral) || room.findMineral();
            if (mineral && (mineral as any).mineralAmount > 0 && (storage as any).store[(mineral as any).mineralType] < 100000) {
                const newName = 'MineralMiner-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                room.memory.spawn_list.push(getBody([WORK, WORK, CARRY, CARRY, MOVE], room, 50), newName, {memory: {role: 'MineralMiner'}});
                console.log('Adding MineralMiner to Spawn List: ' + newName);
            }
        }
    }

    static generateScouts(room: Room, scouts: number, EnergyMinersInRoom: number, resourceData: any, activeRemotes: string[], roomState: any) {
        const roomsToRemote = Object.keys(resourceData);
        for (const remoteRoom of roomsToRemote) {
            if (activeRemotes.includes(remoteRoom) && remoteRoom !== room.name) {
                if (scouts < 1 && EnergyMinersInRoom > 1) {
                    const newName = 'Scout-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push([MOVE], newName, {memory: {role: 'scout', homeRoom: room.name, targetRoom: remoteRoom}});
                    console.log('Adding Scout to Spawn List: ' + newName);
                    break;
                }
            }
        }
    }

    static generateClaimers(room: Room, claimers: number, storage: any, roomState: any) {
        if (!Memory.target_colonise) {
            Memory.target_colonise = {};
        }
        let target_colonise;
        if (Memory.target_colonise) {
            target_colonise = Memory.target_colonise.room;
        }
        if (target_colonise) {
            const distance_to_target_room = Game.map.getRoomLinearDistance(room.name, target_colonise);
            // need to check if this room is the closest room level 7 or higher or not

            // Assuming you have access to your game state and rooms
            let closestRoom = null;
            let closestDistance = Infinity;
            let maxEnergy = 0;
            const targetRoomName = target_colonise; // Assuming target_colonise contains the target room name

            // Loop through all your rooms
            for (const roomName in Game.rooms) {
                const r = Game.rooms[roomName];

                // Check if the room has a controller, and the controller is yours, and it is at least level 3
                if (r.controller && r.controller.my && r.controller.level >= 3) {
                    // Calculate the distance between the current room and the target room
                    const distance = Game.map.getRoomLinearDistance(r.name, targetRoomName);

                    // Get the amount of energy in the storage of the current room
                    const energyInStorage = r.storage ? r.storage.store[RESOURCE_ENERGY] || 0 : 0;

                    // Update the closest room if this room is closer to the target room or has more energy
                    if (distance < closestDistance || (distance === closestDistance && energyInStorage > maxEnergy)) {
                        closestRoom = r;
                        closestDistance = distance;
                        maxEnergy = energyInStorage;
                    }
                }
            }

            if (closestRoom && closestRoom.name == room.name) {
                if (target_colonise && Memory.CanClaimRemote >= 1 && claimers < 1 && room.controller.level >= 3 && Game.time % 800 <= 100 && storage && (storage as any).store[RESOURCE_ENERGY] > 10000 && distance_to_target_room <= 7 && ((Game.rooms[target_colonise] && !Game.rooms[target_colonise].controller.my) || Game.rooms[target_colonise] == undefined)) {
                    const newName = 'Claimer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                    room.memory.spawn_list.push([MOVE, CLAIM], newName, {memory: {role: 'claimer', targetRoom: target_colonise, homeRoom: room.name}});
                    console.log('Adding Claimer to Spawn List: ' + newName);
                    Memory.CanClaimRemote -= 1;
                }
            }
        }
    }

    static generateReservers(resourceData: any, room: Room, storage: any, activeRemotes: string[], reservers: number, roomState: any) {
        if (reservers > 0) return;

        _.forEach(resourceData, function(data, targetRoomName) {
            if (activeRemotes.includes(targetRoomName)) {
                _.forEach(data.energy, function(values, sourceId) {
                    const newName = 'Reserver-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

                    if (Memory.CanClaimRemote >= 3 && Game.rooms[targetRoomName] && Game.rooms[targetRoomName].controller && !Game.rooms[targetRoomName].controller.my && (Game.rooms[targetRoomName].controller.reservation && Game.rooms[targetRoomName].controller.reservation.ticksToEnd <= 750 || !Game.rooms[targetRoomName].controller.reservation)) {
                        if (room.memory.danger) return;
                        room.memory.spawn_list.push([CLAIM, MOVE], newName, {memory: {role: 'reserve', targetRoom: targetRoomName, homeRoom: room.name, claim: true}});
                        console.log('Adding Reserver to Spawn List: ' + newName);
                        values.lastSpawnReserver = Game.time;
                        Memory.CanClaimRemote -= 1;
                        return;
                    }

                    if (targetRoomName != room.name && Game.rooms[targetRoomName] != undefined && Game.rooms[targetRoomName].memory.roomData && !Game.rooms[targetRoomName].memory.roomData.has_hostile_creeps && !Game.rooms[targetRoomName].controller.my) {
                        if (Game.rooms[targetRoomName] != undefined && Game.rooms[targetRoomName].controller.reservation && Game.rooms[targetRoomName].controller.reservation.ticksToEnd <= 1000 && Game.time - (values.lastSpawnReserver || 0) > CREEP_LIFE_TIME / 2 || Game.rooms[targetRoomName] != undefined && !Game.rooms[targetRoomName].controller.reservation && Game.time - (values.lastSpawnReserver || 0) > CREEP_LIFE_TIME / 4) {
                            if (room.memory.danger || (storage && storage.store[RESOURCE_ENERGY] < 25000)) return;

                            if (room.controller.level == 5) {
                                room.memory.spawn_list.push([CLAIM, MOVE, CLAIM, MOVE], newName, {memory: {role: 'reserve', targetRoom: targetRoomName, homeRoom: room.name}});
                            } else if (room.controller.level == 6) {
                                room.memory.spawn_list.push([CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE], newName, {memory: {role: 'reserve', targetRoom: targetRoomName, homeRoom: room.name}});
                            } else if (room.controller.level == 7) {
                                room.memory.spawn_list.push([CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE], newName, {memory: {role: 'reserve', targetRoom: targetRoomName, homeRoom: room.name}});
                            } else if (room.controller.level == 8) {
                                room.memory.spawn_list.push([CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE, CLAIM, MOVE], newName, {memory: {role: 'reserve', targetRoom: targetRoomName, homeRoom: room.name}});
                            }
                            console.log('Adding Reserver to Spawn List: ' + newName);
                            values.lastSpawnReserver = Game.time;
                        }
                    }
                });
            }
        });
    }

    static generateRemoteRepairers(resourceData: any, room: Room, activeRemotes: string[], roomState: any) {
        _.forEach(resourceData, function(data, targetRoomName) {
            if (activeRemotes.includes(targetRoomName)) {
                _.forEach(data.energy, function(values, sourceId) {
                    if (Game.time - (values.lastSpawnRemoteRepairer || 0) > CREEP_LIFE_TIME * 1.5) {
                        const newName = 'RemoteRepairer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;
                        if (targetRoomName != room.name && Game.rooms[targetRoomName] && Game.rooms[targetRoomName].memory.roomData && !Game.rooms[targetRoomName].memory.roomData.has_hostile_creeps) {
                            if (room.memory.danger) return;

                            if (room.controller.level >= 6) {
                                room.memory.spawn_list.push(getBody([WORK, CARRY, MOVE], room, 23), newName, {memory: {role: 'RemoteRepair', targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding RemoteRepairer to Spawn List: ' + newName);
                                if (Game.rooms[targetRoomName].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                                    values.lastSpawnRemoteRepairer = Game.time - 100;
                                } else {
                                    values.lastSpawnRemoteRepairer = Game.time + 50;
                                }
                            } else if (room.energyCapacityAvailable >= 600) {
                                room.memory.spawn_list.push([WORK, CARRY, MOVE, WORK, CARRY, MOVE, WORK, CARRY, MOVE], newName, {memory: {role: 'RemoteRepair', targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding RemoteRepairer to Spawn List: ' + newName);
                                if (Game.rooms[targetRoomName].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                                    values.lastSpawnRemoteRepairer = Game.time - 300;
                                } else {
                                    values.lastSpawnRemoteRepairer = Game.time + 200;
                                }
                            } else if (room.energyCapacityAvailable >= 400) {
                                room.memory.spawn_list.push([WORK, CARRY, MOVE, WORK, CARRY, MOVE], newName, {memory: {role: 'RemoteRepair', targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding RemoteRepairer to Spawn List: ' + newName);
                                if (Game.rooms[targetRoomName].find(FIND_MY_CONSTRUCTION_SITES).length > 0) {
                                    values.lastSpawnRemoteRepairer = Game.time - 400;
                                } else {
                                    values.lastSpawnRemoteRepairer = Game.time + 100;
                                }
                            } else {
                                room.memory.spawn_list.push([WORK, CARRY, MOVE], newName, {memory: {role: 'RemoteRepair', targetRoom: targetRoomName, homeRoom: room.name}});
                                console.log('Adding RemoteRepairer to Spawn List: ' + newName);
                                values.lastSpawnRemoteRepairer = Game.time - 600;
                            }
                        }
                    }
                });
            }
        });
    }

    static generateAll(resourceData: any, room: Room, MineralMiners: number, scouts: number, EnergyMinersInRoom: number, claimers: number, reservers: number, storage: any, activeRemotes: string[], roomState: any) {
        this.generateMineralMiners(room, MineralMiners, storage, roomState);
        this.generateScouts(room, scouts, EnergyMinersInRoom, resourceData, activeRemotes, roomState);
        this.generateClaimers(room, claimers, storage, roomState);
        this.generateReservers(resourceData, room, storage, activeRemotes, reservers, roomState);
        this.generateRemoteRepairers(resourceData, room, activeRemotes, roomState);
    }
}

export {getBody};
export default spawning;
