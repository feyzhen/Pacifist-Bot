const run = function (creep: Creep) {
    if (creep.evacuate()) return;
    if (creep.memory.suicide) {
        creep.recycle();
        return;
    }

    // 重置移动标志
    creep.memory.moving = false;

    const isFull = creep.store.getFreeCapacity() === 0;

    if (isFull) {
        // 卸货模式：正常优先级，启用 reserveFill（storage/terminal 自动排除）
        const worked = creep.transferStore(false, true);
        if (!worked && creep.ticksToLive < 100) {
            creep.memory.suicide = true;
        }
        return;
    }

    // 扫荡模式：启用 sweepReserve 防止冲突
    const hasWork = creep.Sweep(true);
    if (!hasWork && creep.ticksToLive <= 1400) {
        creep.memory.suicide = true;
    }
};

const roleSweeper = {
    run
    //run: run,
};
export default roleSweeper;
