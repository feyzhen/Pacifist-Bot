/**
 * depositMiner — 专职沉积物采集者。
 * 前往目标沉积物房间，采集沉积物，并将能量转移给附近的 depositCarry 爬行体。
 *
 * 身体配比（由 spawn 函数设定）：
 *   RCL8:   WORK:22, CARRY:6, MOVE:22
 *   其他:  WORK:2, CARRY:1, MOVE:2
 */
const run = function (creep: any) {
    creep.memory.moving = false;

    // ── 撤离与危险检测 ──────────────────────────────────────────
    if (creep.evacuate()) return;
    if (creep.fleeHomeIfInDanger() == "timeOut") return;

    // ── 阶段4：生命末期处理 ───────────────────────────────────────
    if (creep.ticksToLive <= 300) {
        // 快死了：先把手上的能量转移给附近的 carry 或其他 miner，避免浪费
        if (creep.store.getUsedCapacity() > 0) {
            const nearby = creep.room.find(FIND_MY_CREEPS, {
                filter: c =>
                    (c.memory.role === "depositCarry" || c.memory.role === "depositMiner") &&
                    c.store.getFreeCapacity() > 0 &&
                    c.memory.targetRoom == creep.memory.targetRoom &&
                    c.id != creep.id
            });
            const target = nearby.length > 0 ? creep.pos.findClosestByRange(nearby) : null;
            if (target) {
                for (const resource in creep.store) {
                    if (creep.pos.isNearTo(target)) {
                        creep.transfer(target, resource);
                    }
                    // else {
                    //     creep.moveTo(target)
                    // }

                }
                return; // 本 tick 已转移，不再执行后续操作
            }
        } else{
            creep.memory.homeRoom = creep.room.name;
        }
        // 无人接收或无能量：标记当前房间为"家"，让 recycle() 直接在本房间执行回收
        creep.memory.suicide = true;
    }
    if (creep.memory.suicide) {
        creep.recycle();
        return; // ← 关键修复：recycle() 后必须 return
                // 否则继续执行下面的 Phase 1，会被拉回 targetRoom，与 homeRoom 方向冲突
                // 导致 creep 在 deposit 房间和 homeRoom 边界"横跳"
    }

    // ── 阶段1：前往目标房间 ──────────────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    // ── 阶段2：采集沉积物 ─────────────────────────────────────────
    const deposit: any = Game.getObjectById(creep.memory.deposit) || creep.findDeposit();
    if (!deposit) {
        creep.memory.suicide = true;
        return;
    }

    // 等待冷却结束（预留：如需冷却检测可取消下方注释）
    // if (deposit.cooldown > 0) {
    //     if (creep.pos.getRangeTo(deposit) > 1) {
    //         creep.moveTo(deposit);
    //     }
    //     return;
    // }

    // 在沉积物旁边时进行采集
    if (creep.pos.isNearTo(deposit)) {
        creep.harvest(deposit);
        creep.memory.moving = false;

        // 采集后立即检查：如果身上有能量且附近有 carry，就转移过去
        // 这样 carry 一到房间就能立刻拿到能量，不需要干等（原逻辑必须装满才 transfer）
        if (creep.store.getUsedCapacity() > 0) {
            const carriers = creep.room.find(FIND_MY_CREEPS, {
                filter: c =>
                    c.memory.role === "depositCarry" &&
                    c.store.getFreeCapacity() > 0
            });
            if (carriers.length > 0) {
                const target = creep.pos.findClosestByRange(carriers);
                if (creep.pos.isNearTo(target)) {
                    const depositType = creep.memory.depositType || deposit.depositType;
                    creep.transfer(target, depositType);
                    // transfer 占用本 tick，下 tick 继续采集
                    return;
                }
                // else {
                //     // carry 稍远，先移动到它身边（下 tick 再 transfer）
                //     creep.moveTo(target);
                //     return;
                // }
            }
        }
    } else {
        creep.moveTo(deposit);
    }

    // ── 阶段3：能量满载时转移给 carry（兜底逻辑） ──────────────────
    // 注：阶段2 已新增"不满时也主动 transfer"的逻辑
    // 此阶段作为兜底：当 miner 实在没机会在采集间隙转移时（例如附近无 carry），
    // 装满后仍会尝试寻找 carry 进行 transfer
    if (creep.store.getFreeCapacity() === 0) {
        const depositType = creep.memory.depositType || deposit.depositType;

        // 优先尝试转移到缓存的 carry 目标
        let carrier: any = null;
        if (creep.memory.transferTarget) {
            carrier = Game.getObjectById(creep.memory.transferTarget);
            if (!carrier || carrier.memory.role !== "depositCarry") {
                carrier = null;
                delete creep.memory.transferTarget;
            }
        }

        // 回退：查找任意附近的 depositCarry
        if (!carrier) {
            const carriers = creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.role === "depositCarry" && c.store.getFreeCapacity() > 0
            });
            if (carriers.length > 0) {
                carrier = creep.pos.findClosestByRange(carriers);
            }
        }

        if (carrier) {
            if (creep.pos.isNearTo(carrier)) {
                const result = creep.transfer(carrier, depositType);
                if (result === OK) {
                    creep.memory.transferTarget = carrier.id;
                }
            } else {
                creep.moveTo(carrier);
            }
            return;
        }

        // 附近没有 carry —— 先尝试捡起地上的能量
        const dropped = creep.pos.lookFor(LOOK_RESOURCES);
        const energyDrops = dropped.filter(r => r.resourceType === depositType);
        if (energyDrops.length > 0) {
            creep.pickup(energyDrops[0]);
            return;
        }

        // 尝试转移到附近的 container
        const containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: s => s.structureType === STRUCTURE_CONTAINER &&
                         (s as StructureContainer).store.getFreeCapacity(depositType) > 0
        });
        if (containers.length > 0) {
            creep.transfer(containers[0] as StructureContainer, depositType);
            return;
        }

        // 什么都做不了——等待，carry 可能下一 tick 到达
    }


};

const roleDepositMiner = { run };
export default roleDepositMiner;
