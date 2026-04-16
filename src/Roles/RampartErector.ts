/**
 * RampartErector - 2.0 version using new roomPlanner system
 * @param {Creep} creep
 **/
 const run = function (creep) {
    creep.memory.moving = false;

    if(creep.memory.suicide) {
        creep.recycle();
        return;
    }

    if(creep.memory.full && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.full = false;
        creep.memory.locked_repair = false;
        creep.memory.locked = false;
    }
    if(!creep.memory.full && creep.store.getFreeCapacity() == 0) {
        creep.memory.full = true;
    }
    if(!creep.memory.full) {
        const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();
        if(creep.pos.isNearTo(storage)) {
            creep.withdraw(storage, RESOURCE_ENERGY);
        }
        else {
            creep.MoveCostMatrixRoadPrio(storage, 1)
        }
    }
    if(creep.memory.full) {
        if(creep.memory.locked_repair) {
            const target:any = Game.getObjectById(creep.memory.locked_repair);
            if(target && target.hits < 500000) {
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.MoveCostMatrixRoadPrio(target, 3)
                }
                return;
            }
            else {
                creep.memory.locked_repair = false;
                creep.memory.locked = false;
            }
        }

        if(!creep.memory.locked) {
            // Initialize rampart positions from new roomPlanner system
            if(!creep.memory.rampartPositions) {
                creep.memory.rampartPositions = getRampartPositionsFromLayout(creep.room);
                console.log(`[RampartErector] ${creep.name} initialized with ${creep.memory.rampartPositions.length} rampart positions`);
            }
            
            if(creep.memory.rampartPositions.length > 0) {
                const nextTarget = creep.memory.rampartPositions.shift();
                if(nextTarget && nextTarget.x >= 0 && nextTarget.x <= 49 && nextTarget.y >= 0 && nextTarget.y <= 49) {
                    const position = new RoomPosition(nextTarget.x, nextTarget.y, creep.room.name);
                    
                    // Check if position is suitable for rampart construction
                    const look = position.look();
                    const hasStructure = look.some(obj => obj.type === LOOK_STRUCTURES && (obj as any).structure.structureType !== STRUCTURE_RAMPART);
                    const hasConstruction = look.some(obj => obj.type === LOOK_CONSTRUCTION_SITES);
                    const terrain = look.find(obj => obj.type === LOOK_TERRAIN);
                    
                    // Only build on plain or swamp, and avoid other structures/constructions
                    if(!hasStructure && !hasConstruction && terrain && ((terrain as any).terrain === 'plain' || (terrain as any).terrain === 'swamp')) {
                        const result = position.createConstructionSite(STRUCTURE_RAMPART);
                        if(result === OK) {
                            creep.memory.locked = position;
                            console.log(`[RampartErector] Created rampart construction site at ${position.x},${position.y}`);
                            return;
                        } else {
                            console.log(`[RampartErector] Failed to create construction site, error: ${result}`);
                        }
                    } else {
                        console.log(`[RampartErector] Position ${nextTarget.x},${nextTarget.y} unsuitable for rampart`);
                    }
                }
                else {
                    console.log(`[RampartErector] Invalid rampart position: ${JSON.stringify(nextTarget)}`);
                }
            }
            else {
                console.log(`[RampartErector] All rampart positions processed, executing suicide`);
                creep.memory.suicide = true;
            }
        }
        
        if(creep.memory.locked) {
            const position = creep.memory.locked;
            if(position && position.x <= 47 && position.y <= 47 && position.x >= 2 && position.y >= 2) {
                const position2 = new RoomPosition(position.x, position.y, position.roomName);
                const lookForConstructionSites = position2.lookFor(LOOK_CONSTRUCTION_SITES);
                if(lookForConstructionSites.length > 0) {
                    const target = lookForConstructionSites[0];
                    if(creep.pos.getRangeTo(target) <= 3) {
                        creep.build(target);
                    }
                    else {
                        creep.MoveCostMatrixRoadPrio(target, 3);
                    }
                }
                else if(lookForConstructionSites.length == 0) {
                    const lookForBuildings = position2.lookFor(LOOK_STRUCTURES);
                    if(lookForBuildings.length > 0) {
                        for(const building of lookForBuildings) {
                            if(building.structureType == STRUCTURE_RAMPART) {
                                creep.memory.locked_repair = building.id;
                                creep.repair(building);
                            }
                        }
                    }
                    else {
                        creep.memory.locked = false;
                    }
                }
                else {
                    creep.memory.locked = false;
                }
            }
            else {
                creep.memory.locked = false;
            }
        }
    }
}

/**
 * Get rampart positions from new roomPlanner system
 */
function getRampartPositionsFromLayout(room: Room): any[] {
    if(Memory.roomPlanner && Memory.roomPlanner[room.name] && Memory.roomPlanner[room.name].layout) {
        const layoutRamparts = Memory.roomPlanner[room.name].layout.rampart;
        if(layoutRamparts && layoutRamparts.length > 0) {
            console.log(`[RampartErector] Using new roomPlanner data, found ${layoutRamparts.length} rampart positions`);
            return [...layoutRamparts]; // Return copy to avoid modifying original data
        }
    }
    
    console.log(`[RampartErector] No rampart positions found in roomPlanner for room ${room.name}`);
    return [];
}

const roleRampartErector = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleRampartErector;
