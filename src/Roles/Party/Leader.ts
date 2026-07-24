/**
 * Leader — 小队指挥者
 *
 * 职责：
 * 1. 出生后立即前往 homeRoom 的集合点
 * 2. 等待 Follower 到达集合点后，标记 squadReady=true
 * 3. squadReady=true 后，Leader 使用 moveTo 前往目标房间
 *
 * Body: MOVE（轻量快速）
 */
const run = function (creep) {
    creep.memory.moving = false;

    const follower = findFollower(creep);

    // ── Phase 0: 前往集合点 ──
    if (!creep.memory.meetPos) {
        creep.say('📍 L未定');
        return;
    }

    if (!creep.memory.atMeetPoint) {
        const mp = new RoomPosition(
            creep.memory.meetPos.x,
            creep.memory.meetPos.y,
            creep.room.name
        );
        if (creep.pos.getRangeTo(mp) <= 1) {
            creep.memory.atMeetPoint = true;
            creep.say('📍 到位');
        } else {
            creep.moveTo(mp, { priority: 1 });
        }
        return;
    }

    // ── Phase 1: 等待 Follower 到达集合点 ──
    if (!follower) {
        creep.say('⏳ 等F');
        return;
    }

    if (!follower.memory.atMeetPoint) {
        const mp = new RoomPosition(
            creep.memory.meetPos.x,
            creep.memory.meetPos.y,
            creep.room.name
        );
        if (creep.pos.getRangeTo(mp) > 1) {
            creep.moveTo(mp);
        }
        creep.say('⏳ 等F');
        return;
    }

    // ── Phase 2: 两队到位，标记 ready 并出发去目标房间 ──
    creep.memory.squadReady = true;
    creep.say('🎯 出发');

    const targetRoom = creep.memory.targetRoom;
    if (!targetRoom) {
        creep.say('❌ 无目标');
        return;
    }

    // 已到达目标房间 → 结束
    if (creep.room.name === targetRoom) {
        creep.say('✅ 已到');
        return;
    }

    // moveTo 支持跨房间，range=5 进入房间即可
    const target = new RoomPosition(25, 25, creep.memory.targetRoom);
    creep.moveTo(target);
};

/**
 * 用 Game.creeps 全图扫描同 squadId 的 Follower，找到后持久化 partnerId
 */
function findFollower(leader: Creep): Creep | null {
    // 优先用 memory 中记录的 partner
    if (leader.memory.partnerId && Game.creeps[leader.memory.partnerId]) {
        const c = Game.creeps[leader.memory.partnerId];
        if (c.memory.role === 'Follower' && c.memory.squadId === leader.memory.squadId) {
            return c;
        }
        delete leader.memory.partnerId;
    }

    for (const c of Object.values(Game.creeps)) {
        if (c.memory.role === 'Follower' && c.memory.squadId === leader.memory.squadId) {
            leader.memory.partnerId = c.name;
            return c;
        }
    }
    return null;
}

const roleLeader = {
    run,
};
export default roleLeader;
