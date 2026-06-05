
/**
 * A little description of this function
 * @param {Creep} creep
 **/

const run = function (creep) {
    creep.memory.moving = false;
    if(creep.ticksToLive == 1499) {
        creep.room.memory.reserveFill = [];
    }
    if(creep.evacuate()) {
		return;
	}
	if(creep.ticksToLive <= 14 && !creep.memory.full) {
		creep.memory.suicide = true;
	}
	if(creep.memory.suicide == true) {
		creep.recycle();
        return;
	}
    if(!creep.memory.MaxStorage) {
        let carryPartsAmount = 0
        for(const part of creep.body) {
            if(part.type == CARRY) {
                carryPartsAmount += 1;
            }
        }
        creep.memory.MaxStorage = carryPartsAmount * 50;
    }

    const MaxStorage = creep.memory.MaxStorage;

    if(!creep.memory.full && creep.store.getFreeCapacity() == 0) {
        creep.memory.full = true;
    }
    // 检查是否需要从能量源获取能量（只在非满载状态下检查）
    // 这个条件用于告诉filler：当它能量不足时，应该先去获取能量
    // 而不是在传输能量过程中被中断
    if(!creep.memory.full) {
        if(creep.room.controller && (creep.room.controller.level <= 6 && creep.store[RESOURCE_ENERGY] < 50 || creep.room.controller.level == 7 && creep.store[RESOURCE_ENERGY] < 100 || creep.room.controller.level == 8 && creep.store[RESOURCE_ENERGY] < 200)) {
            // 只有当确实需要能量时才标记为未满
            // 如果已经有目标并且正在传输，不要中断
            if(!creep.memory.t) {
                creep.memory.full = false;
            }
        }
    }
    else if(creep.store[RESOURCE_ENERGY] == 0) {
        // 只有当creep确实空了，才清空full标记
        creep.memory.full = false;
        creep.memory.t = false;
    }



    if(!creep.memory.full) {
        let bin;
        let storage;
        if(creep.room.memory.Structures) {
            bin = Game.getObjectById(creep.room.memory.Structures.bin) || creep.room.findBin(storage);
            storage = Game.getObjectById(creep.room.memory.Structures.storage) || creep.room.findStorage();
        }
        if(bin && bin.store[RESOURCE_ENERGY] >= MaxStorage) {
            if(creep.pos.isNearTo(bin)) {
                const result = creep.withdraw(bin, RESOURCE_ENERGY);
                if(result == 0) {
                    creep.memory.full = true;
                }
            }
            else {
                creep.MoveCostMatrixSwampPrio(bin, 1);
            }
        }
        else if(storage && storage.store[RESOURCE_ENERGY] > 0) {
            const result = creep.withdrawStorage(storage);
            if(result == 0) {
                creep.memory.full = true;
            }
        }
        else if(!creep.room.memory.danger) {
            creep.acquireEnergyWithContainersAndOrDroppedEnergy();
        }
    }

    if(creep.memory.full) {
        let storage;
        if(creep.room.memory.Structures) {
            storage = Game.getObjectById(creep.room.memory.Structures.storage) || creep.room.findStorage();
        }


        let target = Game.getObjectById(creep.memory.t) || creep.findFillerTarget();
        if(target) {
            // 检查目标是否有效（存在且有容量）
            if(!target || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                target = creep.findFillerTarget();
            }
            if(target) {
                // 检查目标是否仍然存在于房间中
                if (!target.pos || target.room.name !== creep.room.name) {
                    target = creep.findFillerTarget();
                }
                if(target) {
                    if(creep.pos.isNearTo(target)) {
                        const result = creep.transfer(target, RESOURCE_ENERGY);
                        if(result == 0) {
                            const indexOfTargetId = creep.room.memory.reserveFill.indexOf(target.id);
                            if(indexOfTargetId !== -1) {
                                creep.room.memory.reserveFill = creep.room.memory.reserveFill.splice(indexOfTargetId, 1);
                            }
                        }
                        if(creep.store[RESOURCE_ENERGY] > target.store.getFreeCapacity(RESOURCE_ENERGY)) {
                            const newTarget = creep.findFillerTarget();
                            if(newTarget && creep.pos.getRangeTo(newTarget) > 1) {
                                creep.MoveCostMatrixRoadPrio(newTarget, 1);
                            }
                        }
                        else {
                            creep.memory.full = false;
                            if(storage) {
                                creep.MoveCostMatrixRoadPrio(storage, 1);
                            }
                        }
                    }
                    else {
                        // 优化：每10tick重新评估目标，如果仍然有更好选择则切换
                        if (creep.memory.t && Game.time % 10 === 0) {
                            const betterTarget = creep.findFillerTarget();
                            if (betterTarget && betterTarget.id !== target.id) {
                                const currentRange = creep.pos.getRangeTo(target);
                                const newRange = creep.pos.getRangeTo(betterTarget);
                                if (newRange < currentRange) {
                                    creep.memory.t = betterTarget.id;
                                    target = betterTarget;
                                }
                            }
                        }
                        creep.MoveCostMatrixRoadPrio(target, 1)
                    }
                }
            }
        }

    }
}

const roleControllerLinkFiller = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleControllerLinkFiller;
