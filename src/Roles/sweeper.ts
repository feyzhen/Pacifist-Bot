const run = function (creep: Creep) {
    if (creep.evacuate()) return;
    if (creep.memory.suicide) {
        creep.recycle();
        return;
    }

    // 重置移动标志
    creep.memory.moving = false;

    if (!creep.memory.full && creep.store.getFreeCapacity() == 0) {
        creep.memory.full = true;
    }
    if (creep.memory.full && creep.store.getUsedCapacity() == 0) {
        creep.memory.full = false;
    }

    if (creep.memory.full) {
        const worked = creep.transferStore(false, true);
        if (!worked && creep.ticksToLive < 100) {
            creep.memory.suicide = true;
        }
        return;
    } else {
        const hasWork = creep.Sweep(true);
        if (!hasWork && creep.ticksToLive <= 1400) {
            creep.memory.suicide = true;
        }
    }
};

const roleSweeper = { run };
export default roleSweeper;
