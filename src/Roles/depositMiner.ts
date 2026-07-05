import {countAliveMinersCarries} from '../Rooms/rooms.observe';
import global from "../utils/Global";

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


    if (creep.memory.suicide) {
        creep.recycle();
        // 关键修复：recycle() 后必须 return
        // 否则继续执行下面的 Phase 1，会被拉回 targetRoom，与 homeRoom 方向冲突
        // 导致 creep 在 deposit 房间和 homeRoom 边界"横跳"
        return;
    }

    // ── 阶段1：前往目标房间 ──────────────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    const deposit: any = Game.getObjectById(creep.memory.deposit) || creep.findDeposit();
    if (!deposit) {
        creep.memory.suicide = true;
        return;
    }
    if (deposit.room.name != creep.memory.targetRoom) {
        delete creep.memory.deposit
    }

    if (!creep.memory.linearDistance) {
        creep.memory.linearDistance = Game.map.getRoomLinearDistance(creep.memory.targetRoom, creep.memory.homeRoom)
    }
    if (!creep.memory.ticksToReGenerate) {
        creep.memory.ticksToReGenerate = creep.body.length * 3 + (creep.memory.linearDistance + 1) * 50
    }
    if (!creep.memory.maxPairs) {
        creep.memory.maxPairs = deposit.pos.getOpenPositionsIgnoreCreepsCheckStructs().length
    }
    if (!creep.memory.SDCarry) {
        creep.memory.SDCarry = false;
    }
    if (!creep.memory.SDMine) {
        creep.memory.SDMine = false;
    }
    // ── 再生逻辑：每隔 15 tick 检查是否需要补充矿工/搬运工 ──────────
    // 关键修复：只在 homeRoom 的 tick % 15 == 0 时由第一个触发的 DM 执行再生，
    // 避免多个 DM 在同一 tick 内并发触发，导致超量生成。
    if ((creep.ticksToLive <= creep.memory.ticksToReGenerate || creep.store.getUsedCapacity() >= creep.store.getCapacity() * 0.5) &&
        Game.time % 15 == 0 &&
        (creep.memory.SDMine == false || creep.memory.SDCarry == false)) {
        // 只允许 homeRoom 中 Game.time % 15 == 0 的第一个 creep 执行再生
        // 用 depositId 作为锁：只有第一个到达的 DM 能触发，其余跳过

        let maxPairs = creep.memory.maxPairs
        let { miners, carries } = countAliveMinersCarries(Game.rooms[creep.memory.homeRoom], creep.memory.targetRoom, creep.memory.deposit);
        let carryNeeded = Math.max(0, Math.floor((maxPairs + 1) / 2) - carries);
        if (deposit.lastCooldown <= 100) {
            if (creep.memory.SDMine == false) {
                if (Memory.depositMining[creep.memory.targetRoom]?.[creep.memory.deposit]?.["lastSpawnDM"] === Game.time) {
                    // 已经有另一个 DM 在这个 tick 触发了再生，跳过
                    return;
                }
                Memory.depositMining[creep.memory.targetRoom][creep.memory.deposit]["lastSpawnDM"] = Game.time;
                while (miners < maxPairs) {
                    if (global.SDMine(creep.memory.homeRoom, creep.memory.targetRoom, creep.memory.deposit) !== "Success!") break;
                    creep.memory.SDMine = true;
                    miners++
                    // ({ miners, carries } = countAliveMinersCarries(Game.rooms[creep.memory.homeRoom], creep.memory.targetRoom, creep.memory.deposit));
                }

            }
            if (creep.memory.SDCarry == false) {
                if (Memory.depositMining[creep.memory.targetRoom]?.[creep.memory.deposit]?.["lastSpawnDC"] === Game.time) {
                    // 已经有另一个 DM 在这个 tick 触发了再生，跳过
                    return;
                }
                Memory.depositMining[creep.memory.targetRoom][creep.memory.deposit]["lastSpawnDC"] = Game.time;
                while (carryNeeded > 0) {
                    if (global.SDCarry(creep.memory.homeRoom, creep.memory.targetRoom) !== "Success!") break;
                    creep.memory.SDCarry = true;
                    // ({ miners, carries } = countAliveMinersCarries(Game.rooms[creep.memory.homeRoom], creep.memory.targetRoom, creep.memory.deposit));
                    // carryNeeded = Math.max(0, Math.floor((maxPairs + 1) / 2) - carries);
                    carryNeeded--;
                }

            }

        } else {
            if (carries == 0) {
                creep.memory.suicide = true;
                return;
            }
        }
    }

    // ── 阶段2：采集沉积物 ─────────────────────────────────────────
    if(!creep.memory.potential) {
        if(creep.memory.boosted) {
            creep.memory.potential = creep.getActiveBodyparts(WORK) * 3;
        }
        else {
            creep.memory.potential = creep.getActiveBodyparts(WORK);
        }
    }

    // 在沉积物旁边时进行采集
    if (creep.pos.isNearTo(deposit)) {
        if (deposit.cooldown == 0 && creep.store.getFreeCapacity() >= creep.memory.potential * 3) {
            creep.harvest(deposit);
        } else {
            // 采集后立即检查：如果身上有能量且附近有 carry，就转移过去
            // 这样 carry 一到房间就能立刻拿到能量，不需要干等（原逻辑必须装满才 transfer）
            const depositType = creep.memory.depositType || deposit.depositType;
            if (creep.store.getUsedCapacity() > 0) {
                const carriers = creep.room.find(FIND_MY_CREEPS, {
                    filter: c => c.memory.role === "depositCarry" && c.memory.targetRoom == creep.memory.targetRoom
                });
                if (carriers.length > 0) {
                    const targets = carriers.filter(c => c.store.getFreeCapacity() > 0 && creep.pos.isNearTo(c))
                    if (targets.length > 0) {
                        creep.transfer(targets[0], depositType);
                        return;
                    }
                }
            } else {
                const droppedDeposits = creep.pos.lookFor(LOOK_RESOURCES).filter(r => r.resourceType === depositType);
                if (droppedDeposits.length > 0) {
                    creep.pickup(droppedDeposits[0]);
                    return;
                }
                const tombstones = creep.pos.lookFor(LOOK_TOMBSTONES).filter(s => s.store.getUsedCapacity(depositType) > 0)
                if (tombstones.length > 0) {
                    creep.withdraw(tombstones[0], depositType)
                    return;
                }
            }
        }
    } else {
        creep.moveTo(deposit);
    }
};

const roleDepositMiner = { run };
export default roleDepositMiner;
