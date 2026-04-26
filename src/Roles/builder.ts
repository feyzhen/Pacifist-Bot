/**
 * A little description of this function
 * @param {Creep} creep
 **/


 /**
 * 原始 findLocked 函数备份（传统系统）
 * @param creep creep对象
 * @returns 目标ID或null
 */
function findLockedLegacy(creep) {
	const buildingsToBuild = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
	
	if (buildingsToBuild.length === 0) {
		creep.memory.suicide = true;
		return null;
	}

	// 🎯 使用与buildFromLayout相同的优先级顺序
	const buildOrder = [
		STRUCTURE_SPAWN,
		STRUCTURE_EXTENSION,
		STRUCTURE_STORAGE,
		STRUCTURE_TERMINAL,
		STRUCTURE_LINK,
		STRUCTURE_TOWER,
		STRUCTURE_CONTAINER,
		STRUCTURE_ROAD, STRUCTURE_RAMPART,
		STRUCTURE_POWER_SPAWN,
		STRUCTURE_EXTRACTOR,
		STRUCTURE_LAB,
		STRUCTURE_FACTORY,
		STRUCTURE_NUKER
	];

	// 🚀 按优先级查找目标
	for (const structureType of buildOrder) {
		const filteredBuildings = buildingsToBuild.filter(building => 
			building.structureType === structureType
		);
		
		if (filteredBuildings.length > 0) {
			creep.memory.suicide = false;
			creep.say("🎯", true);
			
			// 按进度排序，优先建造进度多的
			filteredBuildings.sort((a, b) => b.progressTotal - a.progressTotal);
			return filteredBuildings[0].id;
		}
	}

	// 📍 兜底：选择最近的建筑
	creep.memory.suicide = false;
	creep.say("🎯", true);
	const closestBuilding = creep.pos.findClosestByRange(buildingsToBuild);
	return closestBuilding.id;
}

/**
 * 混合 findLocked 函数（新布局系统 + 传统系统回退）
 * @param creep creep对象
 * @returns 目标ID或null
 */
function findLocked(creep) {
    // 直接使用传统系统，布局系统由自动建造处理
    const legacyTarget = findLockedLegacy(creep);
    if (legacyTarget) {
        console.log(`[Builder] ${creep.name} 找到目标: ${legacyTarget}`);
    }
    
    return legacyTarget;
}

 const run = function (creep) {
	creep.memory.moving = false;

	if(creep.evacuate()) {
		return;
	}


	if(creep.memory.fleeing) {
		// find hostiles with attack or ranged attack
		const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
		const meleeHostiles = hostiles.filter(c => c.getActiveBodyparts(ATTACK) > 0 );
		const rangedHostiles = hostiles.filter(c => c.getActiveBodyparts(RANGED_ATTACK) > 0 );
		if(rangedHostiles.length) {
				const closestRangedHostile = creep.pos.findClosestByRange(rangedHostiles);
				if(creep.pos.getRangeTo(closestRangedHostile) <= 8) {
						return;
				}
		}
		else if(meleeHostiles.length) {
				const closestMeleeHostile = creep.pos.findClosestByRange(meleeHostiles);
				if(creep.pos.getRangeTo(closestMeleeHostile) <= 6) {
						return;
				}
		}
}
else if(!creep.memory.danger) {
		creep.memory.fleeing = false;
}

	// const start = Game.cpu.getUsed()

	const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();

	if(storage && creep.pos.isNearTo(storage) && creep.getActiveBodyparts(WORK) * 5 >= creep.store[RESOURCE_ENERGY]) {
		creep.withdraw(storage, RESOURCE_ENERGY);
	}

    if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.building = false;
    }
    if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
        creep.memory.building = true;
    }

    if(creep.memory.building) {
        if(creep.memory.locked) {
            const buildTarget = Game.getObjectById(creep.memory.locked);
            if(!buildTarget) {
                creep.memory.locked = false;
            }
        }

        if(!creep.memory.locked) {
            creep.memory.locked = findLocked(creep);
        }



        if(creep.memory.locked) {
            const buildTarget = Game.getObjectById(creep.memory.locked);
            if(buildTarget && creep.build(buildTarget) == ERR_NOT_IN_RANGE) {
				creep.MoveCostMatrixRoadPrio(buildTarget, 3);
            }
        }
    }

    else if(!creep.memory.building && storage) {
		const result = creep.withdrawStorage(storage);
		if(result == 0) {
			if(!creep.memory.locked) {
				creep.memory.locked = findLocked(creep);
			}
			if(creep.memory.locked) {
				const buildTarget = Game.getObjectById(creep.memory.locked);
				creep.MoveCostMatrixRoadPrio(buildTarget, 3);
			}
		}
    }

    else {
        const result = creep.acquireEnergyWithContainersAndOrDroppedEnergy();
		if(result == 0) {
			if(!creep.memory.locked) {
				creep.memory.locked = findLocked(creep);
			}
			if(creep.memory.locked) {
				const buildTarget = Game.getObjectById(creep.memory.locked);
				creep.MoveCostMatrixRoadPrio(buildTarget, 3);
			}
		}
    }
	if(creep.memory.suicide && creep.store[RESOURCE_ENERGY] == 0 && storage && storage.store[RESOURCE_ENERGY] >= 300) {
		creep.memory.suicide = false;
	}
	// if(creep.ticksToLive <= 30 && !creep.memory.building || storage && storage.store[RESOURCE_ENERGY] < 300 && Game.time % 21 == 0 && creep.store[RESOURCE_ENERGY] == 0) {
	// 	creep.memory.suicide = true;
	// }
	if(creep.memory.suicide == true) {
		const myRamparts = creep.room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_RAMPART && (s.hits < 450000 && creep.room.memory.danger || s.hits < 10000)});
		if(myRamparts.length) {
			myRamparts.sort((a,b) => a.hits - b.hits);
			creep.room.roomTowersRepairTarget(myRamparts[0]);
			return;
		}
		creep.recycle();
		return;
	}

 }

const roleBuilder = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleBuilder;
