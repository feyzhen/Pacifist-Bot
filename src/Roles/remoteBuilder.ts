const run = function (creep):CreepMoveReturnCode | -2 | -5 | -7 | void {

    creep.memory.moving = false;

    if(creep.room.name != creep.memory.targetRoom && !creep.memory.fill) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    if(creep.room.name !== creep.memory.targetRoom && creep.memory.fill) {
        if(creep.store.getFreeCapacity() !== 0) {
            const storage = creep.room.storage;
            if(storage) {
                const result = creep.withdraw(storage, RESOURCE_ENERGY);
                if(result == ERR_NOT_IN_RANGE) {
                    creep.MoveCostMatrixRoadPrio(storage,1);
                }
                else if(result === 0) {
                    creep.memory.fill = false;
                }
            }
            else {
                creep.memory.fill = false;
            }
        }
    }

    if(creep.memory.fleeing) {
        // find hostiles with attack or ranged attack
        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        const meleeHostiles = hostiles.filter(c => c.getActiveBodyparts(ATTACK) > 0 );
        const rangedHostiles = hostiles.filter(c => c.getActiveBodyparts(RANGED_ATTACK) > 0 );
        if(rangedHostiles.length) {
            const closestRangedHostile = creep.pos.findClosestByRange(rangedHostiles);
            if(creep.pos.getRangeTo(closestRangedHostile) <= 5) {
                return;
            }
        }
        else if(meleeHostiles.length) {
            const closestMeleeHostile = creep.pos.findClosestByRange(meleeHostiles);
            if(creep.pos.getRangeTo(closestMeleeHostile) <= 3) {
                return;
            }
        }
    }
    else if(!creep.memory.danger) {
        creep.memory.fleeing = false;
    }

    const targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    const closestTarget = creep.pos.findClosestByRange(targets);
    if(closestTarget && closestTarget.structureType === STRUCTURE_SPAWN && creep.pos.isEqualTo(closestTarget.pos)) {
        creep.move(TOP);creep.move(BOTTOM);creep.move(LEFT);creep.move(RIGHT);
    }
    const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();


    if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.source = false;
        creep.memory.building = false;
    }
    if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
        creep.memory.building = true;
    }
    if(creep.memory.building) {
        // remoteBuilder专注于建造，不升级控制器
        // 只有在RCL 1且接近降级时才升级，防止房间丢失
        if(creep.room.controller && creep.room.controller.level == 1 && creep.room.controller.ticksToDowngrade < 1000) {
            if(creep.pos.getRangeTo(creep.room.controller) <= 3) {
                creep.upgradeController(creep.room.controller);
                console.log(`[RemoteBuilder] ${creep.name} 紧急升级控制器，防止降级`);
            }
        }
        // if(creep.room.controller && (creep.room.controller.level == 1 || creep.room.controller.level == 2 && creep.room.controller.ticksToDowngrade < 9000 || creep.room.controller.level == 3 && creep.room.controller.ticksToDowngrade < 18000 || creep.room.controller.level == 4 && creep.room.controller.ticksToDowngrade < 27000 || creep.room.controller.level == 5 && creep.room.controller.ticksToDowngrade < 36000 || creep.room.controller.level == 6 && creep.room.controller.ticksToDowngrade < 45000 || creep.room.controller.level == 7 && creep.room.controller.ticksToDowngrade < 54000 || creep.room.controller.level == 8 && creep.room.controller.ticksToDowngrade < 63000)) {
        //     if(creep.pos.getRangeTo(creep.room.controller) <= 3) {
        //         creep.upgradeController(creep.room.controller);
        //     }
        //     if(creep.room.controller.level == 1 || creep.room.controller.level == 2 && creep.room.controller.ticksToDowngrade < 6000 || creep.room.controller.level == 3 && creep.room.controller.ticksToDowngrade < 9000 || creep.room.controller.level == 4 && creep.room.controller.ticksToDowngrade < 15000 || creep.room.controller.level == 5 && creep.room.controller.ticksToDowngrade < 16000 || creep.room.controller.level == 6 && creep.room.controller.ticksToDowngrade < 25000 || creep.room.controller.level == 7 && creep.room.controller.ticksToDowngrade < 34000 || creep.room.controller.level == 8 && creep.room.controller.ticksToDowngrade < 43000) {
        //         creep.MoveCostMatrixRoadPrio(creep.room.controller, 3);
        //         return;
        //     }

        // }

        const mySpawns = creep.room.find(FIND_MY_SPAWNS)
        if(Game.time % 25 == 0 && Memory.target_colonise && creep.room.find(FIND_MY_CONSTRUCTION_SITES).length == 0 && mySpawns.length == 0 && creep.room.name === Memory.target_colonise.room) {
            // 优先使用自动布局的spawn位置
            if(Memory.roomPlanner && Memory.roomPlanner[creep.room.name] && 
               Memory.roomPlanner[creep.room.name].layout && 
               Memory.roomPlanner[creep.room.name].layout.spawn && 
               Memory.roomPlanner[creep.room.name].layout.spawn.length > 0) {
                const spawnPos = Memory.roomPlanner[creep.room.name].layout.spawn[0];
                const location = new RoomPosition(spawnPos.x, spawnPos.y, creep.room.name);
                location.createConstructionSite(STRUCTURE_SPAWN);
                console.log(`[AutoLayout] 使用布局中的spawn位置 (${spawnPos.x},${spawnPos.y})`);
            }
            // 回退到手动指定的位置
            else if(Memory.target_colonise.spawn_pos) {
                if(typeof Memory.target_colonise.spawn_pos.x === 'number' && typeof Memory.target_colonise.spawn_pos.y === 'number' &&
                   Memory.target_colonise.spawn_pos.x >= 0 && Memory.target_colonise.spawn_pos.x <= 49 &&
                   Memory.target_colonise.spawn_pos.y >= 0 && Memory.target_colonise.spawn_pos.y <= 49) {
                    const location = new RoomPosition(Memory.target_colonise.spawn_pos.x, Memory.target_colonise.spawn_pos.y, creep.room.name);
                    location.createConstructionSite(STRUCTURE_SPAWN);
                    console.log(`[AutoLayout] 使用手动指定的spawn位置 (${Memory.target_colonise.spawn_pos.x},${Memory.target_colonise.spawn_pos.y})`);
                }
            }
            // 如果都没有，尝试触发布局规划
            else {
                console.log(`[AutoLayout] 没有找到spawn位置，尝试触发布局规划`);
                // 确保房间在enabledRooms中
                if(!Memory.layoutConfig) {
                    Memory.layoutConfig = {
                        forceReplan: false,
                        minControllerLevel: 1,
                        enabledRooms: []
                    };
                }
                if(!Memory.layoutConfig.enabledRooms) {
                    Memory.layoutConfig.enabledRooms = [];
                }
                if(!Memory.layoutConfig.enabledRooms.includes(creep.room.name)) {
                    Memory.layoutConfig.enabledRooms.push(creep.room.name);
                    console.log(`[AutoLayout] 已将房间 ${creep.room.name} 添加到自动建造列表`);
                }
                
                // 设置房间layoutEnabled
                if(!creep.room.memory) {
                    creep.room.memory = {};
                }
                (creep.room.memory as any).layoutEnabled = true;
                
                // 尝试手动触发布局规划
                const plannerWrapper = (global as any).PlannerWrapper;
                if(plannerWrapper) {
                    try {
                        plannerWrapper.runPlan(creep.room.name);
                        plannerWrapper.savePlanToMemory(creep.room.name);
                        console.log(`[AutoLayout] 已为房间 ${creep.room.name} 生成自动布局`);
                    } catch (error) {
                        console.log(`[AutoLayout] 布局规划失败: ${error}`);
                        // 如果布局规划失败，使用默认spawn位置
                        const defaultLocation = new RoomPosition(25, 25, creep.room.name);
                        defaultLocation.createConstructionSite(STRUCTURE_SPAWN);
                        console.log(`[AutoLayout] 使用默认spawn位置 (25,25)`);
                    }
                } else {
                    console.log(`[AutoLayout] PlannerWrapper 未加载，使用默认spawn位置`);
                    const defaultLocation = new RoomPosition(25, 25, creep.room.name);
                    defaultLocation.createConstructionSite(STRUCTURE_SPAWN);
                    console.log(`[AutoLayout] 使用默认spawn位置 (25,25)`);
                }
            }
        }

        if(mySpawns.length == 1) {
            if(mySpawns[0].store.getFreeCapacity() !== 0) {
                if(creep.pos.isNearTo(mySpawns[0])) {
                    creep.transfer(mySpawns[0], RESOURCE_ENERGY);
                }
                else {
                    creep.MoveCostMatrixRoadPrio(mySpawns[0], 1);
                }
            }

            if(!Memory.target_colonise || !Memory.target_colonise.spawn_pos ||
               typeof Memory.target_colonise.spawn_pos.x !== 'number' || typeof Memory.target_colonise.spawn_pos.y !== 'number' ||
               Memory.target_colonise.spawn_pos.x < 0 || Memory.target_colonise.spawn_pos.x > 49 ||
               Memory.target_colonise.spawn_pos.y < 0 || Memory.target_colonise.spawn_pos.y > 49) {
                return;
            }
            const location = new RoomPosition(Memory.target_colonise.spawn_pos.x, Memory.target_colonise.spawn_pos.y, creep.room.name);
            const lookForBuildings = location.lookFor(LOOK_STRUCTURES);
            if(lookForBuildings.length > 0) {
                for(const building of lookForBuildings) {
                    if(building.structureType == STRUCTURE_RAMPART && (building.hits < building.hitsMax - 5000 && building.hits < 1500000)) {
                        creep.repair(building)
                        return;
                    }
                }
            }
            location.createConstructionSite(STRUCTURE_RAMPART);
        }

        // 建筑物类型优先策略
        if(targets.length > 0) {
            let target = null;
            
            // 1. 优先建造spawn
            const spawnTargets = targets.filter(t => t.structureType === STRUCTURE_SPAWN);
            if(spawnTargets.length > 0) {
                target = spawnTargets[0];
                console.log(`[RemoteBuilder] ${creep.name} 优先建造spawn`);
            }
            // 2. 其次建造storage
            else if(!target) {
                const storageTargets = targets.filter(t => t.structureType === STRUCTURE_STORAGE);
                if(storageTargets.length > 0) {
                    target = storageTargets[0];
                    console.log(`[RemoteBuilder] ${creep.name} 优先建造storage`);
                }
            }
            // 3. 再次建造extension
            else if(!target) {
                const extensionTargets = targets.filter(t => t.structureType === STRUCTURE_EXTENSION);
                if(extensionTargets.length > 0) {
                    // 按进度排序，优先建造进度高的
                    extensionTargets.sort((a,b) => b.progressTotal - a.progressTotal);
                    target = extensionTargets[0];
                    console.log(`[RemoteBuilder] ${creep.name} 优先建造extension`);
                }
            }
            // 4. 最后建造container
            else if(!target) {
                const containerTargets = targets.filter(t => t.structureType === STRUCTURE_CONTAINER);
                if(containerTargets.length > 0) {
                    containerTargets.sort((a,b) => b.progressTotal - a.progressTotal);
                    target = containerTargets[0];
                    console.log(`[RemoteBuilder] ${creep.name} 优先建造container`);
                }
            }
            
            // 5. 如果都没有匹配的，建造最近的
            if(!target) {
                target = creep.pos.findClosestByRange(targets);
                console.log(`[RemoteBuilder] ${creep.name} 建造最近的建筑`);
            }
            
            if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.MoveCostMatrixRoadPrio(target, 3);
            }
            return;
        }
        else {
            const buildingsToRepair = creep.room.find(FIND_STRUCTURES, {
                filter: object => object.hits < object.hitsMax && object.structureType != STRUCTURE_WALL
            });

            buildingsToRepair.sort((a,b) => a.hits - b.hits);
            if(buildingsToRepair.length > 0) {
                const closestBuildingToRepair = creep.pos.findClosestByRange(buildingsToRepair);
                if(creep.repair(closestBuildingToRepair) == ERR_NOT_IN_RANGE) {
                    creep.MoveCostMatrixRoadPrio(closestBuildingToRepair, 3);
                }
                return;
            }
        }
    }
    if(!creep.memory.building) {
        if(creep.room.storage) {
            if(creep.room.storage.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity()) {
                if(creep.withdraw(creep.room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.MoveCostMatrixRoadPrio(creep.room.storage, 1);
                }
                return;
            }
        }
        const droppedResources = creep.room.find(FIND_DROPPED_RESOURCES, {filter: r => r.resourceType == RESOURCE_ENERGY && (r.amount >= 300 && creep.pos.getRangeTo(r) <= 20 || r.amount >= 50 && creep.pos.getRangeTo(r) < 3)});
        if(droppedResources.length > 0) {
            droppedResources.sort((a,b) => b.amount - a.amount);
            if(creep.pos.isNearTo(droppedResources[0])) {
                creep.pickup(droppedResources[0]);
            }
            else {
                creep.MoveCostMatrixRoadPrio(droppedResources[0], 1);
            }
            return;
        }
        const tombstones = creep.room.find(FIND_TOMBSTONES, {filter: t => t.store[RESOURCE_ENERGY] > 20});
        if(tombstones.length > 0) {
            tombstones.sort((a,b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            if(creep.pos.isNearTo(tombstones[0])) {
                creep.withdraw(tombstones[0],RESOURCE_ENERGY);
            }
            else {
                creep.MoveCostMatrixRoadPrio(tombstones[0], 1);
            }
            return;
        }
        const ruins = creep.room.find(FIND_RUINS, {filter: r => r.store[RESOURCE_ENERGY] > 0});
        if(ruins.length > 0) {
            const closestRuin = creep.pos.findClosestByRange(ruins);
            if(creep.pos.isNearTo(closestRuin)) {
                creep.withdraw(closestRuin,RESOURCE_ENERGY);
            }
            else {
                creep.MoveCostMatrixRoadPrio(closestRuin, 1);
            }
            return;
        }

        // 采集点分配逻辑 - 避免冲突
        if(!creep.memory.source) {
            const sources = creep.room.find(FIND_SOURCES);
            const availableSources = sources.filter(source => {
                // 检查是否有其他remoteBuilder已经分配了这个source
                const otherBuilders = _.filter(Game.creeps, c => 
                    c.memory.role === 'remoteBuilder' && 
                    c.memory.source === source.id && 
                    c.name !== creep.name
                );
                return otherBuilders.length === 0;
            });
            
            if(availableSources.length > 0) {
                // 选择最近的可用source
                const closestSource = creep.pos.findClosestByRange(availableSources);
                creep.memory.source = closestSource.id;
                console.log(`[RemoteBuilder] ${creep.name} 分配到采集点: ${closestSource.id}`);
            }
        }

        const source:any = Game.getObjectById(creep.memory.source);
        if(source && source.energy == 0) {
            creep.memory.source = false; // 重新分配
        }

        if(storage && storage.store[RESOURCE_ENERGY] != 0) {
            const result = creep.withdrawStorage(storage)
        }
        else if(source) {
            const result = creep.harvest(source);
            if(result == ERR_NOT_IN_RANGE) {
                creep.MoveCostMatrixRoadPrio(source, 1);
            }
            else if(result == -6 || result == -11)  {
                creep.acquireEnergyWithContainersAndOrDroppedEnergy();
            }
        }
        else {
            // 没有分配到source，使用通用采集方法
            const result = creep.harvestEnergy();
            if(result == -6 || result == -11)  {
                creep.acquireEnergyWithContainersAndOrDroppedEnergy();
            }
        }
    }
}

const roleRemoteBuilder = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleRemoteBuilder;
