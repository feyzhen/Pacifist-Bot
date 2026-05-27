/**
 * A little description of this function
 * @param {Creep} creep
 **/
const run = function (creep) {
    creep.memory.moving = false;

    // 优先使用自动布局的 work_pos（矿物附近通常有 container）
    // CPU 优化：把结果缓存到 memory（看不见/建筑变化时会自动回退）
    // 注意：这里的 work_pos 是全局列表，所以必须过滤到“靠近 mineral 的点”，避免跑去 source/controller 的 work_pos
    let closestWorkPos: RoomPosition | null = null;

    // 先确保 deposit 已经初始化（下面要用 deposit 来过滤 work_pos）

    if (!creep.memory.deposit) {
        const found_deposit = creep.room.find(FIND_MINERALS);
        creep.memory.deposit = found_deposit[0];
    }

    const deposit: any = Game.getObjectById(creep.memory.deposit.id);

    // ===== 从 memory/布局中解析“矿物专用”的 work_pos 与 container，并缓存 =====
    // creep.memory.workPos: {x,y}  (RoomPosition 不能直接存)
    // creep.memory.workContainerId: string
    if (!creep.memory.workPos) {
        creep.memory.workPos = undefined;
        creep.memory.workContainerId = undefined;
    }

    // 1) 先尝试复用缓存的 workPos
    if (
        creep.memory.workPos &&
        typeof creep.memory.workPos.x === "number" &&
        typeof creep.memory.workPos.y === "number"
    ) {
        closestWorkPos = new RoomPosition(creep.memory.workPos.x, creep.memory.workPos.y, creep.room.name);
        // 如果缓存点不在矿物旁边（布局变化/误缓存），作废
        if (!closestWorkPos.isNearTo(deposit)) {
            closestWorkPos = null;
            creep.memory.workPos = undefined;
            creep.memory.workContainerId = undefined;
        }
    }

    // 2) 缓存失效时：从布局 work_pos 里挑出“贴着 mineral 的点”，再找最近
    if (!closestWorkPos) {
        const roomName = creep.room.name;
        const workPosMem = Memory.roomPlanner?.[roomName]?.layout?.work_pos as
            | Array<{ x: number; y: number }>
            | undefined;
        if (workPosMem && workPosMem.length > 0) {
            const nearMineralPositions: RoomPosition[] = [];
            for (const p of workPosMem) {
                const rp = new RoomPosition(p.x, p.y, roomName);
                if (rp.isNearTo(deposit)) nearMineralPositions.push(rp);
            }
            if (nearMineralPositions.length > 0) {
                closestWorkPos = creep.pos.findClosestByPath(nearMineralPositions);
                if (closestWorkPos) {
                    creep.memory.workPos = { x: closestWorkPos.x, y: closestWorkPos.y, roomName };
                }
            }
        }
    }

    // 3) 如果有 workPos：优先缓存对应 containerId（同格或 1 格范围）
    if (closestWorkPos && !creep.memory.workContainerId) {
        const structuresOnPos = closestWorkPos.lookFor(LOOK_STRUCTURES) as Structure[];
        const containerOnPos = structuresOnPos.find(s => s.structureType === STRUCTURE_CONTAINER) as
            | StructureContainer
            | undefined;
        const containerNearPos =
            containerOnPos ||
            ((): StructureContainer | undefined => {
                const found = closestWorkPos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (s: AnyStructure) => s.structureType === STRUCTURE_CONTAINER
                }) as StructureContainer[];
                return found && found.length > 0 ? found[0] : undefined;
            })();
        if (containerNearPos) creep.memory.workContainerId = containerNearPos.id;
    }
    if (deposit.mineralAmount == 0) {
        creep.memory.suicide = true;
    }

    if (!creep.memory.mining && creep.store[deposit.mineralType] == 0) {
        creep.memory.mining = true;
    } else if (creep.memory.mining && (creep.store.getFreeCapacity() == 0 || deposit.mineralAmount == 0)) {
        creep.memory.mining = false;
    }

    if (creep.memory.mining) {
        // 挖矿阶段：优先移动到 work_pos（而不是直接贴矿）
        if (closestWorkPos) {
            if (!creep.pos.isEqualTo(closestWorkPos)) {
                // 这里必须用你项目里的寻路封装；原生 creep.move 只能接 direction
                creep.MoveCostMatrixRoadPrio(closestWorkPos, 0);
                creep.say("go");
                return;
            }

            // 已站在 work_pos：如果够近就 harvest
            if (creep.pos.isNearTo(deposit)) {
                creep.harvest(deposit);
                creep.memory.moving = false;
                creep.memory.path = false;
                return; // ← 关键：不执行任何移动，moving=false让SwapPosition跳过它
            }
            // 站位不对（work_pos 没贴到矿旁边）：退回旧逻辑
        }

        if (creep.pos.isNearTo(deposit)) {
            creep.harvest(deposit);
            creep.memory.moving = false;
            creep.memory.path = false;
            return;
        } else {
            creep.MoveCostMatrixRoadPrio(deposit, 1);
        }
    } else {
        // 存矿阶段：优先把矿存到 work_pos 对应的 container（已缓存 id）
        const workContainer = creep.memory.workContainerId
            ? (Game.getObjectById(creep.memory.workContainerId) as StructureContainer | null)
            : null;

        if (workContainer) {
            // 你的规则4：如果 container 剩余空间 > 背包量，则不传输（直接跳过，走 storage/terminal 回退）
            const mineralAmount = creep.store[deposit.mineralType] || 0;
            const free = workContainer.store.getFreeCapacity(deposit.mineralType);

            if (free >= mineralAmount) {
                if (creep.pos.isNearTo(workContainer)) {
                    creep.transfer(workContainer, deposit.mineralType);
                } else {
                    creep.MoveCostMatrixRoadPrio(workContainer, 1);
                }
                return;
            }
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
