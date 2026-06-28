import { countAliveMinersCarries } from "../Rooms/rooms.observe";
import global from "../utils/Global";

/**
 * depositCarry — 专职能量运输者。
 * 前往目标沉积物房间，从 depositMiner 处收集能量，
 * 返回 home 房间存入 storage。
 *
 * 身体配比：CARRY:1, MOVE:1（通过 getBodyByRatio 动态构建）
 */
const run = function (creep: any) {
    creep.memory.moving = false;

    // ── 撤离与危险检测 ──────────────────────────────────────────
    if (creep.evacuate()) return;
    if (creep.fleeHomeIfInDanger() == "timeOut") return;

    // ── 状态跟踪 ────────────────────────────────────────────────
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.full = true;
    }
    if (creep.store.getUsedCapacity() === 0) {
        creep.memory.full = false;
    }

    // ── 阶段4：生命末期处理 ───────────────────────────────────────
    if (creep.ticksToLive <= 300) {
        // 快死了：如果身上有能量，先尝试存回 storage（即使快死了也要尽量带能量回家）
        // 如果不在 home 房间，recycle() 会尝试带能量回家
        if (creep.store.getUsedCapacity() == 0) {
            // 在异地：标记 homeRoom 为当前房间，让 recycle() 直接在此回收
            // （recycle 的 homeRoom 判断会跳过跨房间逻辑，直接在 bin/spawn 处回收）
            creep.memory.homeRoom = creep.room.name;
        }
        creep.memory.suicide = true;
    }
    if (creep.memory.suicide) {
        creep.recycle();
        return; // ← 关键修复：recycle() 后必须 return
                // 否则继续执行下面的 Phase 1，会被拉回 targetRoom，形成"横跳"
    }

    // ── 阶段1：前往目标房间 ──────────────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    // 首次到达 deposit 房间时，识别沉积物类型
    // if (!creep.memory.depositType) {
    //     const deposit = creep.findDeposit();
    //     if (deposit) {
    //         creep.memory.depositType = deposit.depositType;
    //     }
    // }
    const deposit: any = Game.getObjectById(creep.memory.deposit) || creep.findDeposit();
    const depositType = creep.memory.depositType || deposit.depositType;

    // ── 阶段2：从 miner 处收集能量 ────────────────────────────────
    if (!creep.memory.full) {
        const dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === depositType
        });
        if (dropped.length > 0) {
            const target = dropped[0];
            if (creep.pos.isNearTo(target)) {
                creep.pickup(target);
            } else {
                creep.moveTo(target);
            }
            return;
        }

        const miners = creep.room.find(FIND_MY_CREEPS, {
            filter: c => c.memory.role === "depositMiner" && c.memory.targetRoom == creep.memory.targetRoom
        });

        if (miners.length > 0) {
            const targets = miners.filter(c => c.store.getUsedCapacity(depositType) > 0);
            let target = targets[0]
            if (targets.length > 0) {
                target = creep.pos.findClosestByRange(targets);
            }
            if (!creep.pos.isNearTo(target)) {
                creep.moveTo(target);
            }
            return;
        } else {
            if (deposit.lastCooldown <= 100) {
                const { miners, carries } = countAliveMinersCarries(Game.rooms[creep.memory.homeRoom], creep.memory.targetRoom, creep.memory.deposit);
                let maxPairs = deposit.pos.getOpenPositionsIgnoreCreepsCheckStructs().length;
                let minersNeeded = Math.max(0, maxPairs - miners);
                if (minersNeeded > 0) {
                    global.SDMine(creep.memory.homeRoom, creep.memory.targetRoom)
                    if (creep.ticksToLive <= (Game.map.getRoomLinearDistance(creep.memory.targetRoom, creep.memory.homeRoom) + 1) * 50) {
                        creep.memory.suicide = true
                        return;
                    }
                }
            } else {
                creep.memory.suicide = true
            }
        }
        return;
    } else {
        if (creep.room.name !== creep.memory.homeRoom) {
            return creep.moveToRoomAvoidEnemyRooms(creep.memory.homeRoom);
        }

        // 优先存入 storage
        let storage: any = Game.getObjectById(creep.memory.storage) || creep.findStorage();
        if (storage && storage.store.getFreeCapacity(depositType) > 0) {
            if (creep.pos.isNearTo(storage)) {
                const result = creep.transfer(storage, depositType);
                if (result === OK && creep.store[depositType] === 0) {
                    creep.memory.full = false;
                    // delete creep.memory.waitStart;
                }
            } else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        // 其次存入 terminal
        if (creep.room.terminal && creep.room.terminal.store.getFreeCapacity(depositType) > 0) {
            if (creep.pos.isNearTo(creep.room.terminal)) {
                creep.transfer(creep.room.terminal, depositType);
                creep.memory.full = false;
                // delete creep.memory.waitStart;
            } else {
                creep.MoveCostMatrixRoadPrio(creep.room.terminal, 1);
            }
            return;
        }

        // 没有接收方——等待
        return;
    }


};

const roleDepositCarry = { run };
export default roleDepositCarry;
