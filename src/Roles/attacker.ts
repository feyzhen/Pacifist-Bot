/**
 * A little description of this function
 * @param {Creep} creep
 **/
const run = function (creep) {
    


    if(creep.memory.targetRoom && creep.memory.targetRoom !== creep.room.name) {
        const enemyCreeps = creep.room.find(FIND_HOSTILE_CREEPS);

        if(enemyCreeps.length > 0) {
            const closestEnemyCreep = creep.pos.findClosestByRange(enemyCreeps);

            if(creep.attack(closestEnemyCreep) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestEnemyCreep);
                return;
            }
            if(creep.attack(closestEnemyCreep) == 0) {
                creep.moveTo(closestEnemyCreep);
                return;
            }
        }
        return creep.moveToRoom(creep.memory.targetRoom);
    }
    else {
        const enemyCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        let Structures;

        const lowHitWalls = creep.room.find(FIND_STRUCTURES, {
            filter: object => object.structureType == STRUCTURE_WALL && object.hits < 10000
        });


        if(creep.room.controller && creep.room.controller.my) {
            Structures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: object => object.structureType != STRUCTURE_CONTROLLER});}
        else {
            Structures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: object => object.structureType != STRUCTURE_CONTROLLER && object.structureType != STRUCTURE_KEEPER_LAIR});
        }

        if(lowHitWalls.length > 0) {
            const closestLowHitWall = creep.pos.findClosestByRange(lowHitWalls);
            if(creep.pos.isNearTo(closestLowHitWall)) {
                creep.attack(closestLowHitWall);
            }
            else{
                creep.moveTo(closestLowHitWall);
            }
            return;
        }


        if(enemyCreeps.length > 0) {
            const closestEnemyCreep = creep.pos.findClosestByRange(enemyCreeps);

            if(creep.attack(closestEnemyCreep) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestEnemyCreep);
                return;
            }
            if(creep.attack(closestEnemyCreep) == 0) {
                creep.moveTo(closestEnemyCreep);
                return;
            }
        }

        if(Structures.length > 0) {
            const closestStructure = creep.pos.findClosestByRange(Structures);
            if(creep.pos.isNearTo(closestStructure)) {
                creep.attack(closestStructure);
            }
            else{
                creep.moveTo(closestStructure);
            }
            return;
        }

        if(enemyCreeps.length > 0) {
        const closestEnemyCreep = creep.pos.findClosestByRange(enemyCreeps);
            if(creep.pos.isNearTo(closestEnemyCreep)) {
                creep.attack(closestEnemyCreep);
            }
            else {
                creep.moveTo(closestEnemyCreep);
            }

            if(creep.attack(closestEnemyCreep) == 0) {
                creep.moveTo(closestEnemyCreep);
                return;
            }
            return;
        }


        else {
            delete creep.memory.targetRoom;
        //     if(Memory.tasks.wipeRooms.destroyStructures.length > 0) {
        //         creep.memory.targetRoom = Memory.tasks.wipeRooms.destroyStructures[0];
        //     }
        //     else {
        //         if(Game.time % 20 == 0) {
        //             let found_room = false;
        //             _.forEach(Game.rooms, function(room) {
        //                 if(room.memory.danger == true) {
        //                     creep.memory.targetRoom = room.name;
        //                     found_room = true;
        //                     return;
        //                 }
        //             });
        //             if(found_room == false) {
        //                 delete creep.memory.targetRoom;
        //             }
        //         }
        //     }
        // }
        }
    }

    // if you are afraid of death, look away.
    if(Game.time % 55 == 0 && !creep.memory.targetRoom) {
        creep.memory.suicide = true;
    }

	if(creep.memory.suicide == true) {
		creep.recycle();
        return;
	}
    // suicide section


}


const roleAttacker = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleAttacker;
