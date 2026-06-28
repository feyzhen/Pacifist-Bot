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
    if (creep.hits < creep.hitsMax * 0.8) {
        creep.heal(creep);
        return;
    }

    const injuredAllies = creep.room.find(FIND_MY_CREEPS, {
        filter: c => c !== creep && c.hits < c.hitsMax * 0.6
    });
    if (injuredAllies.length > 0) {
        const injured = injuredAllies[0];
        if (creep.pos.getRangeTo(injured) <= 3) {
            if (creep.pos.isNearTo(injured)) {
                creep.heal(injured)
            } else {
                creep.rangedHeal(injured);
            }
            return;
        } else {
            creep.moveTo(injured);
            return;
        }
    }

    // ── 攻击 + 拉扯逻辑（参考 RangedAttacker 的距离分层） ────────
    const range = creep.pos.getRangeTo(target);

    // 判断目标是否有近战部件（ATTACK）
    let isMelee = false;
    let isRanged = false;
    let isHeal = false;
    for (const part of target.body) {
        if (part.type === ATTACK) {
            isMelee = true;
        } else if (part.type === RANGED_ATTACK) {
            isRanged = true;
        } else if (part.type === HEAL) {
            isHeal = true;
        }
    }

    if(creep.pos.getRangeTo(target) > 3) {
        creep.moveTo(target);
        return;
    } else if(creep.pos.isNearTo(target)) {
        creep.rangedMassAttack();
    } else {
        creep.rangedAttack(target);
        creep.moveTo(target);
    }
    if(isMelee && creep.rangedAttack(target) == 0) {
        creep.RangedAttackFleeFromMelee(target);
    } else {
        creep.moveTo(target);
    }
    // if (isMelee && range <= 2) {
    //     // 近战敌人贴脸：先打一下，然后拉开
    //     if (range === 1) {
    //         creep.rangedAttack(target);
    //     }
    //     creep.moveTo(target, { range: 4 });
    // } else if (range === 1) {
    //     // 贴脸无近战威胁：全力输出
    //     creep.rangedMassAttack(target);
    // } else if (range === 2 || range === 3) {
    //     // 中程：远程攻击 + 继续靠近
    //     creep.rangedAttack(target);
    //     creep.moveTo(target, { range: 1 });
    // } else {
    //     // 远距离：靠近到射程内
    //     creep.rangedAttack(target);
    //     creep.moveTo(target, { range: 3 });
    // }
};

const roleRangedElite = { run };
export default roleRangedElite;
