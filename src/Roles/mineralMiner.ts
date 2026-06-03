/**
 * A little description of this function
 * @param {Creep} creep
 **/
const run = function (creep) {
    creep.memory.moving = false;

    if (!creep.memory.deposit) {
        const found_deposit = creep.room.find(FIND_MINERALS);
        creep.memory.deposit = found_deposit[0];
    }

    const deposit: any = Game.getObjectById(creep.memory.deposit.id);
    if (deposit.mineralAmount == 0) {
        creep.memory.suicide = true;
    }

    if (!creep.memory.mining && creep.store[deposit.mineralType] == 0) {
        creep.memory.mining = true;
    } else if (creep.memory.mining && (creep.store.getFreeCapacity() == 0 || deposit.mineralAmount == 0)) {
        creep.memory.mining = false;
    }

    if (creep.memory.mining) {
        if (creep.pos.isNearTo(deposit)) {
            creep.harvest(deposit);
            creep.memory.moving = false;
            creep.memory.path = false;
            return; // ← 关键：不执行任何移动，moving=false让SwapPosition跳过它
        } else {
            creep.MoveCostMatrixRoadPrio(deposit, 1);
        }
    } else {
        // 优先运输到矿物旁边的 container（距离 1 格，缓存 id 到 memory）
        if (!creep.memory.container) {
            const containers = deposit.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s: StructureContainer) => s.structureType === STRUCTURE_CONTAINER
            });
            if (containers[0]) {
                creep.memory.container = containers[0].id;
            }
        }

        const container = creep.memory.container
            ? (Game.getObjectById(creep.memory.container) as StructureContainer)
            : null;

        // 缓存的 container 已失效（被摧毁），清除缓存
        if (creep.memory.container && !container) {
            delete creep.memory.container;
        }

        if (container && container.store.getFreeCapacity(deposit.mineralType) > 0) {
            if (creep.pos.isNearTo(container)) {
                creep.transfer(container, deposit.mineralType);
            } else {
                creep.MoveCostMatrixRoadPrio(container, 1);
            }
            return;
        }

        const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();

        if (storage && storage.store[deposit.mineralType] < 19500) {
            if (creep.pos.isNearTo(storage)) {
                creep.transfer(storage, deposit.mineralType);
            } else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        const terminal = creep.room.terminal;

        if (terminal && terminal.store[deposit.mineralType] < 5000) {
            if (creep.pos.isNearTo(terminal)) {
                creep.transfer(terminal, deposit.mineralType);
            } else {
                creep.MoveCostMatrixRoadPrio(terminal, 1);
            }
            return;
        }

        if (storage) {
            if (creep.pos.isNearTo(storage)) {
                creep.transfer(storage, deposit.mineralType);
            } else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }
    }

    if (creep.ticksToLive <= 60 && creep.memory.mining) {
        creep.memory.suicide = true;
    }
    if (creep.memory.suicide == true) {
        creep.recycle();
        return;
    }
};

const roleMineralMiner = {
    run
    //run: run,
    //function2,
    //function3
};
export default roleMineralMiner;
