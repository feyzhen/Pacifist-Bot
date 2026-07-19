/**
 * followMove — 通用跟随移动工具
 *
 * 基于 超级移动优化 的 squadMove，实现 leader 规划路径、follower 跟随的效果。
 * 支持 2~9 人的链式跟随：creeps[0]=leader, creeps[1] 跟随 creeps[0],
 * creeps[2] 跟随 creeps[1]，以此类推。
 *
 * 用法：
 *   followMove(leader, [follower1, follower2], targetRoomPosition);
 *
 * 每个 tick 由 role 调用一次，内部会：
 *   1. 检查缓存路径是否存在且有效
 *   2. 如果有效，沿路径前进一步，计算每个 follower 的目标位置
 *   3. 如果无效/不存在，重新寻路
 *   4. 调用 squadMove 注册移动意图
 *
 * @param leader       领头 creep（必须是小队第一个）
 * @param followers    跟随者数组（可空，整体构成 2~9 人小队）
 * @param target       目标 RoomPosition（跨房间也可）
 * @param opts         可选参数
 */

import { squadMove } from '../超级移动优化';

const FOLLOW_CACHE_KEY = '__followCache__';

/** @typedef {{ path: MyPath, dst: RoomPosition, idx: number }} FollowCache */

/**
 * 主入口：leader + followers 跟随移动到目标
 * @param {Creep} leader
 * @param {Creep[]} followers
 * @param {RoomPosition} target
 * @param {FollowOpts} [opts]
 * @returns {number|null} 返回 squadMove 的返回值，或 null 表示不需要移动
 */
export function followMove(leader: Creep, followers: Creep[] = [], target: RoomPosition, opts: FollowOpts = {}): number {
    const squad = [leader, ...followers];
    if (squad.length < 2 || squad.length > 9) {
        console.log(`[followMove] squad size ${squad.length} out of range [2,9]`);
        return ERR_INVALID_ARGS;
    }

    // 检查疲劳
    const tired = squad.find((c) => c.fatigue);
    if (tired) {
        // 疲劳时先注册不动的小队，防止被推走
        squadMove(squad);
        return ERR_TIRED;
    }

    // 检查是否已到达
    if (leader.pos.getRangeTo(target) <= 1) {
        squadMove(squad); // 注册不可推动
        return OK;
    }

    // 获取 follow cache
    /** @type {FollowCache} */
    let cache = leader.memory[FOLLOW_CACHE_KEY];
    if (!cache || !cache.path || !cache.dst || !cache.path.posArray) {
        cache = createCache(leader, target, squad, opts);
    }

    if (!cache.path || !cache.path.posArray || cache.path.posArray.length === 0) {
        return ERR_NO_PATH;
    }

    // 目的地变了 → 重建路径
    if (!isEqualPos(cache.dst, target)) {
        cache = createCache(leader, target, squad, opts);
    }

    /** @type {MyPath} */
    let path = cache.path;
    let idx = cache.idx;

    // 验证路径仍然畅通（检查当前房间路径段）
    if (idx < path.posArray.length - 1) {
        const nextPos = path.posArray[idx + 1];
        if (nextPos && nextPos.roomName === leader.room.name) {
            // 检查是否有新建筑挡路
            if (isObstacleAt(leader.room, nextPos)) {
                cache = createCache(leader, target, squad, opts);
                path = cache.path;
                idx = cache.idx;
            }
        }
    }

    // 前进到下一格
    idx++;
    cache.idx = idx;
    leader.memory[FOLLOW_CACHE_KEY] = cache;

    const leaderNextPos = path.posArray[idx];
    if (!leaderNextPos) {
        // 路径走完但还没到目标范围
        squadMove(squad);
        return OK;
    }

    // 计算每个 follower 的目标位置
    const targets = computeFollowTargets(squad, leaderNextPos);

    // 调用 squadMove
    const ret = squadMove(squad, targets);
    if (ret !== OK) {
        // squadMove 失败（如队形散掉），重新注册不动
        if (ret === ERR_INVALID_ARGS || ret === 70) { // ERR_INVALID_ARGS or ERR_NOT_IN_RANGE
            squadMove(squad);
            return ret;
        }
    }

    return ret;
}

/**
 * 为新目标创建路径缓存
 */
function createCache(leader: Creep, target: RoomPosition, squad: Creep[], opts: FollowOpts): FollowCache {
    const cache: FollowCache = {
        path: null,
        dst: target,
        idx: -1,
    };

    try {
        const result = findSquadLikePath(leader.pos, target, opts);

        if (result && result.path && result.path.length > 0) {
            // 把 path 包成 MyPath 格式
            const posArray: RoomPosition[] = [leader.pos, ...result.path];
            cache.path = {
                start: toFormal(posArray[0]),
                end: toFormal(posArray[posArray.length - 1]),
                posArray,
                ignoreStructures: !!opts.ignoreDestructibleStructures,
                ignoreRoads: !!opts.ignoreRoads,
                ignoreSwamps: !!opts.ignoreSwamps,
            };
            cache.idx = 0;
        }
    } catch (e) {
        console.log(`[followMove] path find error: ${e.message}`);
    }

    return cache;
}

/**
 * 模拟 squad 寻路：比普通 creep 寻路更宽松（允许穿过非敌方 creep）
 */
function findSquadLikePath(fromPos: RoomPosition, toPos: RoomPosition, opts: FollowOpts): { path: RoomPosition[]; incomplete: boolean } {
    const ignoreStructures = !!opts.ignoreDestructibleStructures;
    const costCallback = opts.costCallback || null;

    /** @type {PathFinderOpts} */
    const pfOpts: any = {
        maxRooms: opts.maxRooms || 10,
        maxCost: opts.maxCost || 1000,
        maxOps: opts.maxOps || 2000,
        heuristicWeight: opts.heuristicWeight || 1.2,
        plainCost: opts.ignoreSwamps ? (opts.plainCost || 1) : (opts.plainCost || 2),
        swampCost: opts.ignoreSwamps ? (opts.swampCost || 1) : (opts.ignoreRoads ? (opts.swampCost || 5) : (opts.swampCost || 10)),
    };

    if (fromPos.roomName !== toPos.roomName) {
        // 跨房寻路
        const avoidRooms = opts.avoidRooms || new Set<string>();
        const avoidExits = opts.avoidExits || new Map<string, Set<string>>();

        pfOpts.roomCallback = (rName: string): boolean | CostMatrix => {
            if (avoidRooms.has(rName)) return false;
            if (avoidExits.has(rName) && avoidExits.get(rName).has(toPos.roomName)) return false;

            const room = Game.rooms[rName];
            if (room) {
                return buildSimpleCostMatrix(room, ignoreStructures, costCallback);
            }
            return new PathFinder.CostMatrix();
        };
    } else {
        pfOpts.roomCallback = (rName: string): boolean | CostMatrix => {
            const room = Game.rooms[rName];
            if (room) {
                return buildSimpleCostMatrix(room, ignoreStructures, costCallback);
            }
            return false;
        };
    }

    return PathFinder.search(fromPos, { pos: toPos, range: 1 }, pfOpts);
}

/**
 * 构建简单的 cost matrix
 */
function buildSimpleCostMatrix(room: Room, ignoreStructures: boolean, costCallback: any): CostMatrix {
    const costs = new PathFinder.CostMatrix();
    const terrain = room.getTerrain();

    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const tile = terrain.get(x, y);
            if (tile & TERRAIN_MASK_WALL) {
                costs.set(x, y, 255);
            } else if (tile === TERRAIN_MASK_SWAMP) {
                costs.set(x, y, 5);
            } else {
                costs.set(x, y, 1);
            }
        }
    }

    // 处理结构体
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_ROAD) {
            if (costs.get(s.pos.x, s.pos.y) === 0) costs.set(s.pos.x, s.pos.y, 1);
            return;
        }
        if (s.structureType === STRUCTURE_CONTAINER) return;
        if (s.structureType === STRUCTURE_RAMPART && s.my) return;

        if (s.structureType === STRUCTURE_WALL && !s.hits) {
            costs.set(s.pos.x, s.pos.y, 255);
            return;
        }
        if (s.structureType === STRUCTURE_INVADER_CORE && s.ticksToDeploy) {
            costs.set(s.pos.x, s.pos.y, 255);
            return;
        }

        const walkable = [
            STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_TOWER,
            STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_LAB,
            STRUCTURE_NUKER, STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN,
        ];

        if (!walkable.includes(s.structureType) || (!s.my && !ignoreStructures)) {
            costs.set(s.pos.x, s.pos.y, 255);
        } else if (s.my) {
            costs.set(s.pos.x, s.pos.y, 1);
        }
    });

    // 处理 rampart
    room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } }).forEach((r: any) => {
        if (!r.isPublic) costs.set(r.pos.x, r.pos.y, 255);
    });
    room.find(FIND_HOSTILE_STRUCTURES, { filter: { structureType: STRUCTURE_RAMPART } }).forEach((r: any) => {
        if (!r.isPublic) costs.set(r.pos.x, r.pos.y, 255);
    });

    // 处理 creep
    room.find(FIND_CREEPS).forEach((c: Creep) => {
        if (!c.my) costs.set(c.pos.x, c.pos.y, 255);
    });

    // 处理 construction sites
    room.find(FIND_CONSTRUCTION_SITES).forEach((cs: any) => {
        if (![STRUCTURE_CONTAINER, STRUCTURE_ROAD, STRUCTURE_RAMPART].includes(cs.structureType)) {
            costs.set(cs.pos.x, cs.pos.y, 255);
        }
    });

    // border cost
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            if ((x === 0 || x === 49 || y === 0 || y === 49) && costs.get(x, y) === 1) {
                costs.set(x, y, 5);
            }
        }
    }

    if (costCallback) {
        const result = costCallback(room.name, costs);
        if (result instanceof PathFinder.CostMatrix) return result;
    }

    return costs;
}

/**
 * 计算每个 follower 的目标位置
 * 策略：follower[i] 保持与 follower[i-1] 的相对偏移，随 leader 一起前进
 */
function computeFollowTargets(squad: Creep[], leaderNext: RoomPosition): RoomPosition[] {
    const targets: RoomPosition[] = [leaderNext];

    for (let i = 1; i < squad.length; i++) {
        const prevTarget = targets[i - 1];
        const prevCreep = squad[i - 1];
        const currentCreep = squad[i];

        const dx = currentCreep.pos.x - prevCreep.pos.x;
        const dy = currentCreep.pos.y - prevCreep.pos.y;

        const nx = Math.max(0, Math.min(49, prevTarget.x + dx));
        const ny = Math.max(0, Math.min(49, prevTarget.y + dy));
        targets.push(new RoomPosition(nx, ny, prevTarget.roomName));
    }

    return targets;
}

/**
 * 检查位置是否有障碍物
 */
function isObstacleAt(room: Room, pos: RoomPosition): boolean {
    const structures = room.lookForAt(LOOK_STRUCTURES, pos);
    for (const s of structures) {
        const anyS: any = s;
        if (anyS.hits && !anyS.ticksToDeploy) {
            if (isUnwalkableStructure(anyS.structureType)) return true;
        } else if (!anyS.hits || anyS.ticksToDeploy) {
            return true;
        }
    }
    const consSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos);
    for (const cs of consSites) {
        const anyCs: any = cs;
        if (isUnwalkableStructure(anyCs.structureType)) return true;
    }
    return false;
}

function isUnwalkableStructure(type: any): boolean {
    return [
        STRUCTURE_RAMPART, STRUCTURE_WALL, STRUCTURE_SPAWN, STRUCTURE_EXTENSION,
        STRUCTURE_LINK, STRUCTURE_TOWER, STRUCTURE_STORAGE, STRUCTURE_TERMINAL,
        STRUCTURE_LAB, STRUCTURE_NUKER, STRUCTURE_OBSERVER, STRUCTURE_POWER_SPAWN,
        STRUCTURE_INVADER_CORE, STRUCTURE_PORTAL,
    ].includes(type);
}

/**
 * 简化的 isEqual
 */
function isEqualPos(a: RoomPosition, b: RoomPosition): boolean {
    return a.x === b.x && a.y === b.y && a.roomName === b.roomName;
}

/**
 * 将 RoomPosition 转为大地图坐标
 */
function toFormal(pos: RoomPosition): { x: number; y: number } {
    const parsed = parseRoomName(pos.roomName);
    if (parsed) {
        return { x: parsed.baseX + pos.x, y: parsed.baseY + pos.y };
    }
    return { x: 0, y: 0 };
}

/**
 * 解析房间名
 */
function parseRoomName(roomName: string): {
    ew: 'W' | 'E'; ewNum: number; ns: 'N' | 'S'; nsNum: number;
    baseX: number; baseY: number;
} | null {
    if (typeof roomName !== 'string' || roomName.length < 4) return null;

    const ewCode = roomName.charCodeAt(0);
    if (ewCode !== 69 && ewCode !== 87) return null;

    let i = 1, ewNum = 0;
    const len = roomName.length;
    const ewStart = i;
    while (i < len) {
        const code = roomName.charCodeAt(i);
        if (code === 78 || code === 83) break;
        const digit = code - 48;
        if (digit < 0 || digit > 9) return null;
        ewNum = ewNum * 10 + digit;
        i++;
    }
    if (i === ewStart || i >= len) return null;

    const nsCode = roomName.charCodeAt(i);
    if (nsCode !== 78 && nsCode !== 83) return null;
    i++;
    if (i >= len) return null;

    let nsNum = 0;
    const nsStart = i;
    while (i < len) {
        const digit = roomName.charCodeAt(i) - 48;
        if (digit < 0 || digit > 9) return null;
        nsNum = nsNum * 10 + digit;
        i++;
    }
    if (i === nsStart) return null;

    const halfWorldSize = 255 >> 1;
    return {
        ew: ewCode === 87 ? 'W' : 'E',
        ewNum,
        ns: nsCode === 83 ? 'S' : 'N',
        nsNum,
        baseX: (ewCode === 87 ? halfWorldSize - ewNum : halfWorldSize + ewNum + 1) * 50,
        baseY: (nsCode === 83 ? halfWorldSize + nsNum + 1 : halfWorldSize - nsNum) * 50,
    };
}

// ── 类型定义 ──

interface FollowCache {
    path: MyPath | null;
    dst: RoomPosition;
    idx: number;
}

interface MyPath {
    start: { x: number; y: number };
    end: { x: number; y: number };
    posArray: RoomPosition[];
    ignoreStructures: boolean;
    ignoreRoads: boolean;
    ignoreSwamps: boolean;
}

interface FollowOpts {
    ignoreDestructibleStructures?: boolean;
    ignoreRoads?: boolean;
    ignoreSwamps?: boolean;
    plainCost?: number;
    swampCost?: number;
    maxRooms?: number;
    maxCost?: number;
    maxOps?: number;
    heuristicWeight?: number;
    avoidRooms?: Set<string>;
    avoidExits?: Map<string, Set<string>>;
    costCallback?: (roomName: string, costs: CostMatrix) => CostMatrix;
}
