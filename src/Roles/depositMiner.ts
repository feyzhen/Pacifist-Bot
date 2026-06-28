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
    if (creep.ticksToLive == creep.body.length * 3 + 5) {
        if (deposit.lastCooldown <= 100 && creep.room.name == creep.memory.targetRoom) {
            global.SDMine(creep.memory.homeRoom, creep.memory.targetRoom)
        }
        return;
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
                const carriers = creep.pos.findInRange(FIND_MY_CREEPS, 1).filter( c =>
                        c.memory.role === "depositCarry" &&
                        c.store.getFreeCapacity() > 0
                );
                if (carriers.length > 0) {
                    const target = carriers[0]
                    creep.transfer(target, depositType);
                    return;
                } else {
                    if (Game.time % 30 == 0) {
                        const { miners, carries } = countAliveMinersCarries(Game.rooms[creep.memory.homeRoom], creep.memory.targetRoom, creep.memory.deposit);
                        let carryNeeded = Math.max(0, Math.floor((miners + 1) / 2) - carries);
                        const lineraDistanceTick = (Game.map.getRoomLinearDistance(creep.memory.targetRoom, creep.memory.homeRoom) + 1) * 50
                        if (carriers == 0 && creep.ticksToLive <= lineraDistanceTick) {
                            creep.memory.suicide = true
                            return;
                        }
                        if (carryNeeded > 0 && (creep.ticksToLive <= Math.max(creep.body.length * 3, lineraDistanceTick))){
                            global.SDCarry(creep.memory.homeRoom, creep.memory.targetRoom)
                        }
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
