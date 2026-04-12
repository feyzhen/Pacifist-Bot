/**
 * A little description of this function
 * @param {Creep} creep
 **/

// 导入桥接函数
import { findLockedFromLayout } from "../Rooms/rooms.construction2";

 /**
 * 原始 findLocked 函数备份（传统系统）
 * @param creep creep对象
 * @returns 目标ID或null
 */
function findLockedLegacy(creep) {
	const buildingsToBuild = creep.room.find(FIND_MY_CONSTRUCTION_SITES);

	if(buildingsToBuild.length > 0) {
		let buildings;
		if(creep.room.controller.level == 2 ) {
			const spawn = creep.room.find(FIND_MY_SPAWNS);
			buildings = buildingsToBuild.filter(function(building) {return building.structureType == STRUCTURE_LINK || building.structureType == STRUCTURE_STORAGE || building.pos.x == spawn[0].pos.x && building.pos.y == spawn[0].pos.y -2;});
		}
		else {
			buildings = buildingsToBuild.filter(function(building) {return building.structureType == STRUCTURE_LINK || building.structureType == STRUCTURE_STORAGE;});
		}

		if(buildings.length > 0) {
			creep.memory.suicide = false;
			creep.say("🎯", true);
			buildings.sort((a,b) => b.progressTotal - a.progressTotal);
			return buildings[0].id;
		}
	}

	if(buildingsToBuild.length > 0) {
		const buildings = buildingsToBuild.filter(function(building) {return building.structureType == STRUCTURE_EXTENSION;});
		if(buildings.length > 0) {
			creep.memory.suicide = false;
			creep.say("🎯", true);
			buildings.sort((a,b) => b.progressTotal - a.progressTotal);
			return buildings[0].id;
		}
	}

	if(buildingsToBuild.length > 0) {
		const buildings = buildingsToBuild.filter(function(building) {return building.structureType == STRUCTURE_CONTAINER;});
		if(buildings.length > 0) {
			creep.memory.suicide = false;
			creep.say("🎯", true);
			buildings.sort((a,b) => b.progressTotal - a.progressTotal);
			return buildings[0].id;
		}
	}

    if(buildingsToBuild.length > 0) {
		creep.memory.suicide = false;
		creep.say("🎯", true);
		const closestBuildingToBuild = creep.pos.findClosestByRange(buildingsToBuild);
		// buildingsToBuild.sort((a,b) => b.progressTotal - a.progressTotal);
        // return buildingsToBuild[0].id;
		return closestBuildingToBuild.id;
		// if building is link or storage build first.
    }
	creep.memory.suicide = true;
}

/**
 * 混合 findLocked 函数（新布局系统 + 传统系统回退）
 * @param creep creep对象
 * @returns 目标ID或null
 */
function findLocked(creep) {
    // 首先尝试新的布局系统
    try {
        const layoutTarget = findLockedFromLayout(creep);
        if (layoutTarget) {
            console.log(`[Builder] ${creep.name} 使用布局系统找到目标: ${layoutTarget}`);
            return layoutTarget;
        }
        
        console.log(`[Builder] ${creep.name} 布局系统无目标，回退到传统系统`);
    } catch (error) {
        console.log(`[Builder] ${creep.name} 布局系统错误: ${error}，回退到传统系统`);
    }
    
    // 回退到传统系统
    const legacyTarget = findLockedLegacy(creep);
    if (legacyTarget) {
        console.log(`[Builder] ${creep.name} 使用传统系统找到目标: ${legacyTarget}`);
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
