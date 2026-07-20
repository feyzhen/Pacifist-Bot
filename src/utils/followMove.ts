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

import { squadMove, getSquadCostMatrix } from '../超级移动优化';

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

    // 验证路径仍然畅通
    if (idx < path.posArray.length - 1) {
        const nextPos = path.posArray[idx + 1];

        // 检查当前房间的下一个格子
        if (nextPos && nextPos.roomName === leader.room.name) {
            if (isObstacleAt(leader.room, nextPos)) {
                cache = createCache(leader, target, squad, opts);
                path = cache.path;
                idx = cache.idx;
            }
        }

        // 检查新进入的房间：遍历该房间内的所有路径段
        if (nextPos && nextPos.roomName !== path.posArray[idx]?.roomName) {
            const newRoom = Game.rooms[nextPos.roomName];
            if (newRoom && !validatePathInRoom(newRoom, path, idx + 1, !!opts.ignoreDestructibleStructures)) {
                cache = createCache(leader, target, squad, opts);
                path = cache.path;
                idx = cache.idx;
            }
        }

        // 卡住检测：如果在同一位置停留超过 4 tick，重新寻路
        if (cache.lastMoveTick && Game.time - cache.lastMoveTick >= 4) {
            const currentPos = path.posArray[idx];
            if (currentPos &&
                currentPos.x === leader.pos.x &&
                currentPos.y === leader.pos.y &&
                currentPos.roomName === leader.room.name) {
                cache = createCache(leader, target, squad, opts);
                path = cache.path;
                idx = cache.idx;
            }
        }
    }

    // 前进到下一格
    idx++;
    cache.idx = idx;
    cache.lastMoveTick = Game.time;
    leader.memory[FOLLOW_CACHE_KEY] = cache;

    const leaderNextPos = path.posArray[idx];
    if (!leaderNextPos) {
        // 路径走完但还没到目标范围
        squadMove(squad);
        return OK;
    }

    // 用 formal 坐标计算 follower 目标位置（支持跨房）
    const leaderFormalPos = toFormal(leader.pos);
    const { targets, wait } = computeFollowTargetsFormal(squad, leader, leaderNextPos, leaderFormalPos);

    if (wait) {
        return OK;
    }

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
        lastMoveTick: 0,
        ignoreStructures: !!opts.ignoreDestructibleStructures,
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
 * 模拟 squad 寻路：使用 squad CostMatrix 或 fallback 到 chain-aware matrix
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

            // 优先使用 super module 的 squad CostMatrix
            const squadCost = getSquadCostMatrix(rName, ignoreStructures);
            if (squadCost) return squadCost;

            const room = Game.rooms[rName];
            if (room) return buildChainAwareCostMatrix(room, ignoreStructures, costCallback);
            return new PathFinder.CostMatrix();
        };
    } else {
        pfOpts.roomCallback = (rName: string): boolean | CostMatrix => {
            const squadCost = getSquadCostMatrix(rName, ignoreStructures);
            if (squadCost) return squadCost;

            const room = Game.rooms[rName];
            if (room) return buildChainAwareCostMatrix(room, ignoreStructures, costCallback);
            return false;
        };
    }

    return PathFinder.search(fromPos, { pos: toPos, range: 1 }, pfOpts);
}

/**
 * 构建 chain-aware cost matrix：比普通 creep 更宽松，但保证链式队形能放下
 */
function buildChainAwareCostMatrix(room: Room, ignoreStructures: boolean, costCallback: any): CostMatrix {
    const costs = new PathFinder.CostMatrix();
    const terrain = room.getTerrain();

    // 基础地形
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

    // Chain footprint check: 确保每个格子至少有一个相邻的可通行格子
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            if (costs.get(x, y) === 255) continue;

            let hasNeighbor = false;
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50 && costs.get(nx, ny) !== 255) {
                    hasNeighbor = true;
                    break;
                }
            }
            if (!hasNeighbor) {
                costs.set(x, y, 255);
            }
        }
    }

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
 * 用 formal 坐标计算每个 follower 的目标位置，支持跨房队形保持
 *
 * 策略：follower[i] 保持与 leader 的 formal 相对偏移。当跨越房间边界时，
 * 如果 follower 会被出口隔开，则原地等待下一 tick 再一起跳房。
 *
 * 参考 superMove 的 squadStepToPos 逻辑。
 *
 * @returns { targets: RoomPosition[], wait: boolean }
 *   - targets: 每个 creep 的目标位置（leader 的第一个）
 *   - wait: true 表示需要原地等待（已调用 squadMove(squad)）
 */
function computeFollowTargetsFormal(
    squad: Creep[],
    leader: Creep,
    leaderNext: RoomPosition,
    leaderFormalPos: { x: number; y: number }
): { targets: RoomPosition[]; wait: boolean } {
    const targets: RoomPosition[] = [leaderNext];

    // 将 leaderNext 转为 formal 坐标进行比较
    const leaderNextFormal = toFormal(leaderNext);

    for (let i = 1; i < squad.length; i++) {
        const prevCreep = squad[i - 1];
        const currentCreep = squad[i];

        const currentFormal = toFormal(currentCreep.pos);

        // 计算当前 creep 相对于 leader 的 formal 偏移（follower - leader）
        let xdiff = currentFormal.x - leaderFormalPos.x;
        let ydiff = currentFormal.y - leaderFormalPos.y;

        // 跨房等待逻辑（x 方向，参考 squadStepToPos）
        if (xdiff === -2) {
            // follower 在 leader 后方 2 格
            if (leader.pos.x === 1) {
                // leader 在 x=1，下一步向右移动（formal x 增加）→ 需要等待跳房
                if (leaderNextFormal.x > leaderFormalPos.x) {
                    squadMove(squad);
                    return { targets, wait: true };
                }
            } else if (leaderNext.x === 49 && leader.pos.x === 0) {
                // leader 从 x=0 跳到 x=49 → follower 的相对偏移调整为 -1
                xdiff = -1;
            }
        } else if (xdiff === -1) {
            // follower 在 leader 后方 1 格
            if ((leader.pos.x === 1 && leaderNextFormal.x < leaderFormalPos.x) ||
                (leader.pos.x === 49 && leaderNextFormal.x > leaderFormalPos.x)) {
                // leader 正在跨越边界 → 等待
                squadMove(squad);
                return { targets, wait: true };
            }
        }

        // 跨房等待逻辑（y 方向，参考 squadStepToPos）
        if (ydiff === -2) {
            if (leader.pos.y === 1) {
                if (leaderNextFormal.y > leaderFormalPos.y) {
                    squadMove(squad);
                    return { targets, wait: true };
                }
            } else if (leaderNext.y === 49 && leader.pos.y === 0) {
                ydiff = -1;
            }
        } else if (ydiff === -1) {
            if ((leader.pos.y === 1 && leaderNextFormal.y < leaderFormalPos.y) ||
                (leader.pos.y === 49 && leaderNextFormal.y > leaderFormalPos.y)) {
                squadMove(squad);
                return { targets, wait: true };
            }
        }

        // 计算 follower 的目标 formal 坐标
        const px = leaderFormalPos.x + xdiff;
        const py = leaderFormalPos.y + ydiff;

        // 将 formal 坐标转为 RoomPosition（自动处理跨房）
        // 注意：这里不能直接用 leaderNext.roomName，因为 follower 可能在不同的房间
        const targetRoomName = getRoomNameFromFormal(px, py);
        const localX = px - parseRoomName(targetRoomName)!.baseX;
        const localY = py - parseRoomName(targetRoomName)!.baseY;

        targets.push(new RoomPosition(localX, localY, targetRoomName));
    }

    return { targets, wait: false };
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
 * 验证路径在新房间中是否仍然畅通
 */
function validatePathInRoom(room: Room, path: MyPath, startIdx: number, ignoreDestructibleStructures: boolean): boolean {
    // 优先使用 squad CostMatrix
    const squadCost = getSquadCostMatrix(room.name, ignoreDestructibleStructures);
    if (squadCost) {
        for (let i = startIdx; i + 1 < path.posArray.length && path.posArray[i].roomName === room.name; i++) {
            if (squadCost.get(path.posArray[i].x, path.posArray[i].y) === 255) {
                return false;
            }
        }
        return true;
    }

    // Fallback: 逐个检查障碍物
    for (let i = startIdx; i + 1 < path.posArray.length && path.posArray[i].roomName === room.name; i++) {
        if (isObstacleAt(room, path.posArray[i])) {
            return false;
        }
    }
    return true;
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
 * 将 formal 坐标转为房间名
 */
function getRoomNameFromFormal(formalX: number, formalY: number): string {
    const halfWorldSize = 255 >> 1;

    // 计算房间坐标
    const roomX = Math.floor(formalX / 50);
    const roomY = Math.floor(formalY / 50);

    // 转换为 W/E 和 N/S 格式
    let ewCode: string;
    let ewNum: number;
    if (roomX <= halfWorldSize) {
        ewCode = 'W';
        ewNum = halfWorldSize - roomX;
    } else {
        ewCode = 'E';
        ewNum = roomX - halfWorldSize - 1;
    }

    let nsCode: string;
    let nsNum: number;
    if (roomY <= halfWorldSize) {
        nsCode = 'N';
        nsNum = halfWorldSize - roomY;
    } else {
        nsCode = 'S';
        nsNum = roomY - halfWorldSize - 1;
    }

    return `${ewCode}${ewNum}${nsCode}${nsNum}`;
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
    lastMoveTick: number;      // Game.time of last successful move
    ignoreStructures: boolean; // mirror of opts.ignoreDestructibleStructures
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
