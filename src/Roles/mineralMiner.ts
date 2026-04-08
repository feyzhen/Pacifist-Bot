/**
 * A little description of this function
 * @param {Creep} creep
 **/
 const run = function (creep) {
    
    creep.memory.moving = false;



    if(!creep.memory.deposit) {
        const found_deposit = creep.room.find(FIND_MINERALS);
        creep.memory.deposit = found_deposit[0];
    }

    const deposit:any = Game.getObjectById(creep.memory.deposit.id);
    if(deposit.mineralAmount == 0) {
        creep.memory.suicide = true;
    }


    if(!creep.memory.mining && creep.store[deposit.mineralType] == 0) {
        creep.memory.mining = true;
    }
    else if(creep.memory.mining && creep.store.getFreeCapacity() == 0) {
        creep.memory.mining = false;
    }

    if(creep.memory.mining) {
        if(creep.pos.isNearTo(deposit)) {
            creep.harvest(deposit);
        }
        else {
            creep.MoveCostMatrixRoadPrio(deposit, 1);
        }
    }
    else {
        const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();

        if(storage && storage.store[deposit.mineralType] < 19500) {
            if(creep.pos.isNearTo(storage)) {
                creep.transfer(storage, deposit.mineralType);
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }


        const terminal = creep.room.terminal;

        if(terminal && terminal.store[deposit.mineralType] < 5000) {
            if(creep.pos.isNearTo(terminal)) {
                creep.transfer(terminal, deposit.mineralType);
            }
            else {
                creep.MoveCostMatrixRoadPrio(terminal, 1);
            }
            return;
        }


        if(storage) {
            if(creep.pos.isNearTo(storage)) {
                creep.transfer(storage, deposit.mineralType);
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }
    }

	if(creep.ticksToLive <= 60 && creep.memory.mining) {
		creep.memory.suicide = true;
	}
	if(creep.memory.suicide == true) {
		creep.recycle();
        return;
	}

}

const roleMineralMiner = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleMineralMiner;
