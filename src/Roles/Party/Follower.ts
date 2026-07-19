/**
 * Follower — 小队跟随者
 *
 * 职责：
 * 1. 出生后立即前往 homeRoom 的集合点与 Leader 会合
 * 2. 集合完成后，全程跟随 Leader 移动
 *
 * Body: MOVE + CARRY（轻量快速）
 * @param {Creep} creep
 **/
const run = function (creep) {
    creep.memory.moving = false;

    // ── Phase 1: 前往集合点 ──
    if (!creep.memory.atMeetPoint) {
        const leader = findLeader(creep);
        if (!leader) {
            creep.say('🏃 等L');
            return;
        }

        // Leader 还没确定集合点
        if (!leader.memory.meetPos) {
            creep.say('🏃 L未定');
            return;
        }

        const mp = leader.memory.meetPos;
        const meetPos = new RoomPosition(mp.x, mp.y, creep.room.name);
        if (creep.pos.getRangeTo(meetPos) <= 1) {
            creep.memory.atMeetPoint = true;
            creep.say('🏃 到位');
            return;
        }

        creep.moveTo(meetPos, { priority: 1 });
        return;
    }

    // ── Phase 2: 跟随 Leader ──
    // 跟随逻辑由 Leader 端的 followMove 驱动，这里只需确保不被挤散
    const leader = findLeader(creep);
    if (!leader) {
        creep.say('❓ L lost');
        // Leader 丢了，尝试回到集合点等待
        if (creep.memory.meetPos) {
            const mp = new RoomPosition(
                creep.memory.meetPos.x,
                creep.memory.meetPos.y,
                creep.room.name
            );
            if (creep.pos.getRangeTo(mp) > 1) {
                creep.moveTo(mp);
                return;
            }
        }
        return;
    }

    // Leader 已到达 targetRoom
    if (leader.room.name === leader.memory.targetRoom) {
        creep.say('✅ 已到');
        return;
    }

    // 如果跟丢了（距离太远），跑回去追
    if (creep.pos.getRangeTo(leader.pos) > 3) {
        creep.moveTo(leader.pos, { range: 2, bypassHostileCreeps: true });
    }
};

function findLeader(follower: Creep): Creep | null {
    if (!follower.room) return null;
    return follower.room.find(FIND_MY_CREEPS).find(
        (c) => c.memory.role === 'Leader' && c.memory.squadId === follower.memory.squadId
    ) || null;
}

const roleFollower = {
    run,
};
export default roleFollower;
