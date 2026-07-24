/**
 * Follower — 小队跟随者
 *
 * 职责：
 * 1. 出生后立即前往 homeRoom 的集合点与 Leader 会合
 * 2. 集合完成后，全程使用 moveTo 跟随 Leader 移动
 *
 * Body: MOVE（轻量快速）
 */
let partnerRef: Creep | null = null;

const run = function (creep) {
    creep.memory.moving = false;

    const leader = findOrCache(creep);
    if (!leader) {
        creep.say('❓ L lost');
        return;
    }

    const meetPos = leader.memory.meetPos;

    // ── Phase 1: 前往集合点 ──
    if (!meetPos) {
        creep.say('🏃 L未定');
        return;
    }

    if (!creep.memory.atMeetPoint) {
        const mp = new RoomPosition(meetPos.x, meetPos.y, creep.room.name);
        if (creep.pos.getRangeTo(mp) <= 1) {
            creep.memory.atMeetPoint = true;
            creep.say('🏃 到位');
            return;
        }
        creep.moveTo(mp, { priority: 1 });
        return;
    }

    // ── Phase 2: 等待 Leader 出发（squadReady=false，Leader 可能还在赶来集合点） ──
    if (!leader.memory.squadReady) {
        const mp = new RoomPosition(meetPos.x, meetPos.y, creep.room.name);
        if (creep.pos.getRangeTo(mp) > 1) {
            creep.moveTo(mp);
        }
        creep.say('⏳ 等L');
        return;
    }

    // ── Phase 3: 跟随 Leader 移动 ──
    // Leader 到达目标房间后才停止跟随；跨房时 leader.room 为 undefined 不会进入此分支
    if (leader.room && leader.room.name === leader.memory.targetRoom) {
        if (creep.pos.getRangeTo(leader.pos) > 3) {
            creep.moveTo(leader.pos, { range: 2, bypassHostileCreeps: true });
        } else {
            creep.say('✅ 已到');
        }
        return;
    }

    if (creep.pos.getRangeTo(leader.pos) > 2) {
        creep.moveTo(leader.pos, { range: 2, bypassHostileCreeps: true });
    } else {
        creep.say('👀 跟');
    }
};

/**
 * 优先用 memory.partnerId 恢复缓存；失效则全图扫描同 squadId 的 Leader，找到后回写
 */
function findOrCache(follower: Creep): Creep | null {
    // 1) memory 缓存命中
    if (follower.memory.partnerId && Game.creeps[follower.memory.partnerId]) {
        const c = Game.creeps[follower.memory.partnerId];
        if (c.memory.role === 'Leader' && c.memory.squadId === follower.memory.squadId) {
            partnerRef = c;
            return c;
        }
        delete follower.memory.partnerId;
    }
    partnerRef = null;

    // 2) 全图扫描，按 role + squadId 匹配
    for (const c of Object.values(Game.creeps)) {
        if (c.memory.role === 'Leader' && c.memory.squadId === follower.memory.squadId) {
            follower.memory.partnerId = c.name;
            partnerRef = c;
            return c;
        }
    }
    return null;
}

const roleFollower = {
    run,
};
export default roleFollower;
