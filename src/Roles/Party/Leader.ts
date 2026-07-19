/**
 * Leader — 小队先行者
 *
 * 职责：
 * 1. 出生时在 homeRoom 找一个合适的集合点（远离 spawn，周围有空地）
 * 2. 等待 Follower 到达集合点后，一起前往 targetRoom
 * 3. 使用 followMove 移动，follower 全程跟随
 *
 * Body: MOVE + CARRY（轻量快速）
 * @param {Creep} creep
 **/
import { followMove } from 'utils/followMove';

const run = function (creep) {
    creep.memory.moving = false;

    // ── Phase 1: 等待 Follower 集合 ──
    if (!creep.memory.squadReady) {
        const follower = findFollower(creep);
        if (!follower) {
            creep.say('👑 等F');
            return;
        }

        if (!creep.memory.meetPos) {
            const meetPos = findMeetPoint(creep.room);
            if (!meetPos) {
                creep.say('👑 无处集');
                return;
            }
            creep.memory.meetPos = meetPos;
        }

        const mp = creep.memory.meetPos;
        const targetPos = new RoomPosition(mp.x, mp.y, creep.room.name);
        if (creep.pos.getRangeTo(targetPos) <= 1) {
            creep.memory.atMeetPoint = true;
            creep.say('👑 到位');
        } else {
            creep.moveTo(targetPos, { priority: 2 });
            return;
        }

        // 检查 Follower 是否也到了集合点
        if (!follower.memory.atMeetPoint) {
            return;
        }

        creep.memory.squadReady = true;
        creep.say('👑 出发!');
        return;
    }

    // ── Phase 2: 前往 targetRoom ──
    if (creep.room.name === creep.memory.targetRoom) {
        creep.say('👑 已到');
        return;
    }

    const follower = findFollower(creep);
    if (!follower) {
        creep.say('👑 F lost');
        return;
    }

    const target = new RoomPosition(25, 25, creep.memory.targetRoom);
    followMove(creep, [follower], target);
};

/**
 * 在 homeRoom 找一个合适的集合点
 * 远离 spawn，周围 4x4 无墙
 */
function findMeetPoint(room: Room): { x: number; y: number } | null {
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return null;

    for (let dist = 10; dist <= 40; dist += 2) {
        for (let angle = 0; angle < 360; angle += 30) {
            const rad = (angle * Math.PI) / 180;
            const cx = Math.round(spawn.pos.x + dist * Math.cos(rad));
            const cy = Math.round(spawn.pos.y + dist * Math.sin(rad));
            if (cx < 5 || cx > 44 || cy < 5 || cy > 44) continue;

            const pos = new RoomPosition(cx, cy, room.name);
            const terrain = room.getTerrain();

            let ok = true;
            for (let dx = 0; dx < 4 && ok; dx++) {
                for (let dy = 0; dy < 4 && ok; dy++) {
                    if (terrain.get(cx + dx, cy + dy) & TERRAIN_MASK_WALL) ok = false;
                }
            }
            if (ok) return { x: cx, y: cy };
        }
    }
    return null;
}

function findFollower(leader: Creep): Creep | null {
    if (!leader.room) return null;
    return leader.room.find(FIND_MY_CREEPS).find(
        (c) => c.memory.role === 'Follower' && c.memory.squadId === leader.memory.squadId
    ) || null;
}

const roleLeader = {
    run,
};
export default roleLeader;
