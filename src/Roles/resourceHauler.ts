/**
 * 资源搬运工 - 专门用于搬运其他房间storage和terminal中的资源
 * @param {Creep} creep
 **/
 const run = function (creep) {
    creep.memory.moving = false;

    // 如果不在目标房间，移动到目标房间
    if(creep.room.name != creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    const targetStructure = Game.getObjectById(creep.memory.targetBuildingId) as AnyStructure;
    
    // 如果目标建筑不存在或已被摧毁，自杀
    if(!targetStructure) {
        creep.suicide();
        return;
    }

    // 检查目标建筑是否还有资源
    let hasResources = false;
    if(targetStructure.structureType === STRUCTURE_STORAGE) {
        const storage = targetStructure as StructureStorage;
        if(storage.store && Object.keys(storage.store).length > 0) {
            hasResources = true;
        }
    } else if(targetStructure.structureType === STRUCTURE_TERMINAL) {
        const terminal = targetStructure as StructureTerminal;
        if(terminal.store && Object.keys(terminal.store).length > 0) {
            hasResources = true;
        }
    }

    // 如果没有资源了，返回主房间
    if(!hasResources) {
        if(creep.room.name === creep.memory.homeRoom) {
            creep.suicide();
            return;
        }
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.homeRoom);
    }

    // 如果creep为空，去装资源
    if(creep.store.getUsedCapacity() === 0) {
        if(creep.pos.isNearTo(targetStructure)) {
            // 搬运资源
            if(targetStructure.structureType === STRUCTURE_STORAGE) {
                const storage = targetStructure as StructureStorage;
                for(const resourceType in storage.store) {
                    if(storage.store[resourceType] > 0) {
                        const amount = Math.min(storage.store[resourceType], creep.store.getFreeCapacity());
                        creep.withdraw(storage, resourceType as ResourceConstant, amount);
                        break;
                    }
                }
            } else if(targetStructure.structureType === STRUCTURE_TERMINAL) {
                const terminal = targetStructure as StructureTerminal;
                for(const resourceType in terminal.store) {
                    if(terminal.store[resourceType] > 0) {
                        const amount = Math.min(terminal.store[resourceType], creep.store.getFreeCapacity());
                        creep.withdraw(terminal, resourceType as ResourceConstant, amount);
                        break;
                    }
                }
            }
        } else {
            creep.moveTo(targetStructure, {reusePath: 8});
        }
    } 
    // 如果creep有资源，送回主房间的storage
    else {
        const homeRoom = Game.rooms[creep.memory.homeRoom];
        if(!homeRoom) {
            creep.suicide();
            return;
        }

        const homeStorage = Game.getObjectById(homeRoom.memory.Structures.storage) || homeRoom.findStorage();
        if(!homeStorage) {
            creep.suicide();
            return;
        }

        if(creep.room.name === creep.memory.homeRoom) {
            if(creep.pos.isNearTo(homeStorage)) {
                // 存储资源
                for(const resourceType in creep.store) {
                    if(creep.store[resourceType] > 0) {
                        creep.transfer(homeStorage, resourceType as ResourceConstant);
                        break;
                    }
                }
            } else {
                creep.moveTo(homeStorage, {reusePath: 8});
            }
        } else {
            // 返回主房间
            creep.moveToRoomAvoidEnemyRooms(creep.memory.homeRoom);
        }
    }
}

const roleResourceHauler = {
    run,
};

export default roleResourceHauler;
