/**
 * A little description of this function
 * @param {Creep} creep
 **/
const run = function (creep) {
    
    creep.memory.moving = false;

    if(creep.memory.suicide) {
        creep.recycle();
        return;
    }
    if(creep.evacuate()) {
		return;
	}
    if(creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
        creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    if(creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.repairing = false;
    }
    if(!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
        creep.memory.repairing = true;
    }

    const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();


    if(creep.memory.repairing) {
        let buildingsToRepair = [];
        creep.room.memory.keepTheseRoads.forEach(function(roadID) {
            const road:any = Game.getObjectById(roadID);
            if(road && road.hits <= road.hitsMax - 500) {
                buildingsToRepair.push(road);
            }
        });
        
        // Emergency road repair for critical unregistered roads (enhancement)
        if(creep.room.controller.level >= 6) {
            const allRoads = creep.room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_ROAD});
            const criticalRoads = allRoads.filter(road => 
                road.hits <= road.hitsMax * 0.3 && // 30% or less health
                !creep.room.memory.keepTheseRoads.includes(road.id) // Not registered
            );
            
            if(criticalRoads.length > 0) {
                criticalRoads.sort((a,b) => a.hits - b.hits);
                buildingsToRepair.unshift(criticalRoads[0]); // Add to front of repair queue
                creep.say("Emergency Road");
                console.log(`[Emergency Road] Maintainer found critical unregistered road in ${creep.room.name}`);
            }
        }
        let containers;
        if(creep.room.controller.level <= 6) {
            containers = creep.room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_CONTAINER});
        }
        else {
            containers = creep.room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_CONTAINER && s.id == creep.room.memory.Structures.bin});
        }

        if(containers.length > 0) {
            for(const container of containers) {
                if(container.hits <= container.hitsMax - 500) {
                    buildingsToRepair.push(container);
                }
            }
        }

        if(!creep.memory.rampartsToRepair) {
            const rampartsInRoom = creep.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.hits < 500000 && (!creep.room.storage || creep.room.storage.pos.getRangeTo(s) >= 9)});
            const idsOfRamparts = [];
            for(const rampart of rampartsInRoom) {
                idsOfRamparts.push(rampart.id);
            }
            creep.memory.rampartsToRepair = idsOfRamparts;
        }

        const rampartsIDS = creep.memory.rampartsToRepair;
        if(rampartsIDS.length > 0) {
            for(const rampart of rampartsIDS) {
                const rampObj:any = Game.getObjectById(rampart);
                if(rampObj && rampObj.hits <= 50000) {
                    buildingsToRepair.push(rampObj);
                }
            }
        }

        if(creep.room.memory.danger_timer > 0 && storage) {
            buildingsToRepair = buildingsToRepair.filter(function(b) {return storage.pos.getRangeTo(b) <= 10;});
        }

        if(buildingsToRepair.length > 0) {
            const closeByBuildings = creep.pos.findInRange(buildingsToRepair, 3);
            if(closeByBuildings.length > 0) {
                creep.repair(closeByBuildings[closeByBuildings.length - 1])
                if(closeByBuildings[closeByBuildings.length - 1].hits !== closeByBuildings[closeByBuildings.length - 1].hitsMax) {
                    creep.MoveCostMatrixRoadPrio(closeByBuildings[closeByBuildings.length - 1], 1)
                }
                else {
                    creep.MoveCostMatrixRoadPrio(closeByBuildings[0], 0)
                }
            }
            else {
                creep.MoveCostMatrixRoadPrio(creep.pos.findClosestByRange(buildingsToRepair), 3)
            }
        }
        else {
            creep.memory.suicide = true;
        }

    }
  else {
      // 尝试多个能量源
      let energySource = storage;

      // 如果没有 Storage，尝试其他能量源
      if(!energySource) {
          // 尝试从容器获取能量
          const containers = creep.room.find(FIND_STRUCTURES, {
              filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         s.store[RESOURCE_ENERGY] > creep.store.getFreeCapacity()
          });
          if(containers.length > 0) {
              energySource = containers[0];
          }
      }

      if(energySource) {
          if(creep.pos.isNearTo(energySource)) {
              creep.withdraw(energySource, RESOURCE_ENERGY);
          }
          else {
              creep.MoveCostMatrixRoadPrio(energySource, 1);
          }
      }
      else {
          // 如果没有找到能量源，转换为修复者
          creep.say("⚡修复");
          creep.memory.role = "repair";
          creep.memory.suicide = false;
          return;  // 立即退出，让修复者逻辑接管
      }
  }


}

const roleMaintainer = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleMaintainer;
