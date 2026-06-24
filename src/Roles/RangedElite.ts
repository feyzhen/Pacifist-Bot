/**
 * RangedElite — 远程精英驻防爬。
 * 部署到 deposit 房间后持续驻扎，自动攻击 hostile creeps，
 * 为 deposit 采集提供远程火力支援。
 *
 * 身体配比：TOUGH:RANGED_ATTACK:HEAL:MOVE = 1:3:1:5
 * 通过 getBodyByRatio 动态计算，总容量 50 parts。
 * 消灭波（eliminate）使用 lab boost，采集波（drain）不 boost。
 */
const run = function (creep: any) {
    creep.memory.moving = false;

    // ── 阶段0：boost 补给（仅在 home room 时执行） ──────────────
    if (creep.memory.boostlabs?.length && creep.room.name === creep.memory.homeRoom) {
        const result = creep.Boost();
        if (!result) return;
    }

    // ── 阶段1：前往目标房间 ──────────────────────────────────────
    if (creep.room.name !== creep.memory.targetRoom) {
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }

    // ── 阶段5：boosted creep 生命末期处理 ────────────────────────
    // 仅消灭波（使用了 boost）在生命到期时 suicide + recycle
    if (creep.memory.wave === "eliminate" && creep.ticksToLive <= 300) {
        if (creep.store.getUsedCapacity() > 0) {
            // 尝试把身上能量交给附近队友
            const nearby = creep.room.find(FIND_MY_CREEPS, {
                filter: c => c.store.getFreeCapacity() > 0
            });
            const target = nearby.length > 0 ? creep.pos.findClosestByRange(nearby) : null;
            if (target) {
                for (const resource in creep.store) {
                    creep.transfer(target, resource);
                }
                return;
            }
        }
        creep.memory.homeRoom = creep.room.name;
        creep.memory.suicide = true;
    }
    if (creep.memory.suicide) {
        creep.recycle();
        return;
    }

    // ── 阶段2：驻扎战斗 ──────────────────────────────────────────
    const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);

    if (hostiles.length === 0) {
        // 没有 hostile：巡逻到房间边缘，保持视野
        const edgeX = Math.random() < 0.5 ? 1 : 48;
        const edgeY = Math.random() < 0.5 ? 1 : 48;
        const targetPos = new RoomPosition(edgeX, edgeY, creep.room.name);
        if (creep.pos.getRangeTo(targetPos) > 3) {
            creep.moveTo(targetPos);
        }
        return;
    }

    const target = creep.pos.findClosestByRange(hostiles);

    // 治疗逻辑：先治疗自己，再治疗队友
    if (creep.hits < creep.hitsMax * 0.5) {
        creep.heal(creep);
        return;
    }

    const injuredAllies = creep.room.find(FIND_MY_CREEPS, {
        filter: c => c !== creep && c.hits < c.hitsMax * 0.6
    });
    if (injuredAllies.length > 0) {
        const injured = injuredAllies[0];
        if (creep.pos.getRangeTo(injured) <= 3) {
            creep.heal(injured);
            return;
        } else {
            creep.moveTo(injured);
            return;
        }
    }

    // 攻击逻辑
    if (creep.pos.getRangeTo(target) <= 1) {
        creep.attack(target);
        creep.rangedAttack(target);
    } else {
        creep.rangedAttack(target);
    }
};

const roleRangedElite = { run };
export default roleRangedElite;
