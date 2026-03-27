// ─────────────────────────────────────────────────────────────────────────────
// movement.ts  –  Creep移动相关函数
//
// 从creepFunctions.ts中提取的移动相关功能：
// - 基础移动函数
// - 路径寻找和导航
// - 特殊移动逻辑
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// CREEP MOVEMENT PROTOTYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** 移动到指定房间 */
Creep.prototype.moveToRoom = function(roomName: string, tx = 25, ty = 25, ignoreRoads = false, swampCost = 5, range = 20): void {
    this.moveTo(new RoomPosition(tx, ty, roomName), { range, reusePath: 200, ignoreRoads, swampCost });
};

/** 智能移动到目标 */
Creep.prototype.smartMoveTo = function(target: any, range = 1): any {
    if (!target) return false;

    const currentRange = this.pos.getRangeTo(target);
    if (currentRange <= range) return false;

    return this.moveTo(target, { range });
};

/** 避开敌人移动 */
Creep.prototype.avoidEnemiesMoveTo = function(target: any, range = 1): any {
    if (!target) return false;

    const enemies = this.room.find(FIND_HOSTILE_CREEPS);
    if (enemies.length === 0) {
        return this.moveTo(target, { range });
    }

    // 创建避开敌人的路径回调
    const avoidCallback = (roomName: string) => {
        const costs = new PathFinder.CostMatrix();

        // 标记敌人位置为高成本
        enemies.forEach(enemy => {
            if (enemy.room.name === roomName) {
                costs.set(enemy.pos.x, enemy.pos.y, 255);
                // 敌人周围的格子也设为高成本
                enemy.pos.findNearbyPositions(3).forEach(pos => {
                    costs.set(pos.x, pos.y, 100);
                });
            }
        });

        return costs;
    };

    return this.moveTo(target, {
        range,
        costCallback: avoidCallback,
        swampCost: 5,
        plainCost: 1
    });
};

/** 沿着道路移动 */
Creep.prototype.roadMoveTo = function(target: any, range = 1): any {
    if (!target) return false;

    const roadCallback = (roomName: string) => {
        const costs = new PathFinder.CostMatrix();
        const terrain = new Room.Terrain(roomName);

        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                const terrainType = terrain.get(x, y);
                if (terrainType === 1) { // 墙壁
                    costs.set(x, y, 255);
                } else if (terrainType === 2) { // 沼泽
                    costs.set(x, y, 5); // 沼泽默认成本
                }
            }
        }

        // 道路设为低优先级
        const roads = this.room.find(FIND_STRUCTURES, {
            filter: (s: any) => s.structureType === STRUCTURE_ROAD
        });

        roads.forEach(road => {
            costs.set(road.pos.x, road.pos.y, 1);
        });

        return costs;
    };

    return this.moveTo(target, {
        range,
        costCallback: roadCallback,
        swampCost: 5,
        plainCost: 2
    });
};

/** 紧急撤退 */
Creep.prototype.retreat = function(): any {
    const enemies = this.room.find(FIND_HOSTILE_CREEPS);
    if (enemies.length === 0) return false;

    // 找到最近的敌人
    const closestEnemy = this.pos.findClosestByPath(enemies);
    if (!closestEnemy) return false;

    // 计算远离敌人的方向
    const fleePath = PathFinder.search(this.pos, closestEnemy.pos, {
        flee: true,
        maxRooms: 1
    });

    if (fleePath.path.length > 0) {
        const nextPos = fleePath.path[0];
        this.moveTo(nextPos.x, nextPos.y);
        return true;
    }

    return false;
};

/** 检查是否被卡住 */
Creep.prototype.isStuck = function(): boolean {
    if (!this.memory.lastPosition) {
        this.memory.lastPosition = { x: this.pos.x, y: this.pos.y };
        this.memory.stuckCounter = 0;
        return false;
    }

    const samePosition = this.memory.lastPosition.x === this.pos.x &&
                        this.memory.lastPosition.y === this.pos.y;

    if (samePosition) {
        this.memory.stuckCounter = (this.memory.stuckCounter || 0) + 1;
    } else {
        this.memory.stuckCounter = 0;
        this.memory.lastPosition = { x: this.pos.x, y: this.pos.y };
    }

    return this.memory.stuckCounter > 3;
};

/** 处理卡住情况 */
Creep.prototype.handleStuck = function(): boolean {
    if (!this.isStuck()) return false;

    // 随机移动尝试解卡
    const directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    const randomDir = directions[Math.floor(Math.random() * directions.length)];

    const result = this.move(randomDir);
    if (result === OK) {
        this.memory.stuckCounter = 0;
        return true;
    }

    return false;
};

// ── moveToRoomAvoidEnemyRooms ─────────────────────────────────────────────────
Creep.prototype.moveToRoomAvoidEnemyRooms = function (targetRoom: string): void {
    function isHighwayAdjacent(roomName: string): boolean {
        const m = roomName.match(/^[EW](\d+)[NS](\d+)$/);
        if (!m) return false;
        const ex = parseInt(m[1]) % 10, ey = parseInt(m[2]) % 10;
        return (ex >= 4 && ex <= 6) && (ey >= 4 && ey <= 6);
    }

    // Guard: flee if dangerous
    if (this.memory.role === "Guard" && this.memory.targetRoom !== targetRoom) {
        const strongHostiles = this.room.find(FIND_HOSTILE_CREEPS).filter((c: Creep) =>
            c.getActiveBodyparts(ATTACK) > 25 || c.getActiveBodyparts(RANGED_ATTACK) > 25);
        if (strongHostiles.length && this.pos.getRangeTo(this.pos.findClosestByRange(strongHostiles)) <= 9) {
            this.moveToRoomAvoidEnemyRooms(this.memory.homeRoom); return;
        }
    }

    // Auto-add hostile rooms to avoid list
    if (this.room.name !== this.memory.homeRoom) {
        if (this.room.controller && !this.room.controller.my && this.room.controller.level > 2 &&
            this.room.find(FIND_HOSTILE_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_TOWER }).length > 0 &&
            !Memory.AvoidRooms?.includes(this.room.name)) {
            Memory.AvoidRooms.push(this.room.name);
        } else if (isHighwayAdjacent(this.room.name) && Game.time % 2 === 0) {
            const cores = this.room.find(FIND_HOSTILE_STRUCTURES, {
                filter: (s: any) => s.structureType === STRUCTURE_INVADER_CORE && (s as any).level > 0
            });
            if (cores.length && (cores[0] as any).effects?.[0]?.effect === EFFECT_COLLAPSE_TIMER) {
                if (!Memory.AvoidRoomsTemp) Memory.AvoidRoomsTemp = {};
                const ticks = (cores[0] as any).effects[0].ticksRemaining;
                if (!Memory.AvoidRoomsTemp[this.room.name]) Memory.AvoidRoomsTemp[this.room.name] = ticks;
            }
        }
    }

    // Shift completed route step
    if (this.memory.route?.length > 0 && this.memory.route[0].room === this.room.name) this.memory.route.shift();

    const needReroute = !this.memory.route || this.memory.route === -2 || this.memory.route.length === 0 ||
        (this.memory.route.length === 1 && this.memory.route[0].room === this.room.name) ||
        this.memory.route[this.memory.route.length - 1].room !== targetRoom;

    if (needReroute) {
        this.memory.route = Game.map.findRoute(this.room.name, targetRoom, {
            routeCallback(roomName: string) {
                if (Game.map.getRoomStatus(roomName).status !== "normal") return Infinity;
                if ((Memory.AvoidRooms?.includes(roomName) || Memory.AvoidRoomsTemp?.[roomName]) && roomName !== targetRoom) return 24;
                if (roomName.length >= 4) {
                    const m = roomName.match(/^[EW](\d+)[NS](\d+)$/);
                    if (m) {
                        if (parseInt(m[1]) % 10 === 0 || parseInt(m[2]) % 10 === 0) return 2;
                        const ex = parseInt(m[1]) % 10, ey = parseInt(m[2]) % 10;
                        if (ex >= 4 && ex <= 6 && ey >= 4 && ey <= 6) return 24;
                    }
                }
                return 4;
            }
        });
    }

    if (!this.memory.route || this.memory.route === -2 || !this.memory.route.length) return;

    if (!this.memory.exit || this.memory.exit.roomName !== this.room.name) {
        const routeData = this.memory.route[0];
        const exits = this.room.find(routeData.exit).filter((p: RoomPosition) =>
            !p.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_WALL));
        this.memory.exit = this.pos.findClosestByPath(exits, { ignoreCreeps: true });
    }

    let exit = this.memory.exit;
    if (!exit) exit = this.pos.findClosestByRange(this.memory.route[0].exit);
    if (exit && typeof exit.x === "number" && typeof exit.y === "number") {
        const position = new RoomPosition(exit.x, exit.y, this.room.name);
        this.MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch(position, 0);
    }
};

// ── CostMatrix 移动函数 ───────────────────────────────────────────────────────
// 注意：这些函数需要相应的 CostMatrix 回调函数支持
// 为了简化，这里提供基础实现

Creep.prototype.MoveCostMatrixRoadPrio = function (target: any, range: number, role?: string): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    // 简化版本：使用标准的 moveTo，优先道路
    this.moveTo(target, {
        range,
        reusePath: 50,
        ignoreCreeps: false,
        costCallback: (roomName: string, costMatrix: CostMatrix) => {
            const room = Game.rooms[roomName];
            if (!room) return false;

            // 优先道路
            const roads = room.find(FIND_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_ROAD });
            roads.forEach((road: any) => {
                costMatrix.set(road.pos.x, road.pos.y, 1);
            });

            // 其他建筑不可通过
            room.find(FIND_STRUCTURES).forEach((s: any) => {
                if (s.structureType !== STRUCTURE_ROAD &&
                    s.structureType !== STRUCTURE_CONTAINER &&
                    s.structureType !== STRUCTURE_RAMPART) {
                    costMatrix.set(s.pos.x, s.pos.y, 255);
                }
            });

            return true;
        }
    });
};

Creep.prototype.MoveCostMatrixSwampPrio = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    // 优先沼泽移动
    this.moveTo(target, {
        range,
        reusePath: 50,
        swampCost: 1,
        plainCost: 2
    });
};

Creep.prototype.MoveCostMatrixIgnoreRoads = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    // 忽略道路的移动
    this.moveTo(target, {
        range,
        reusePath: 50,
        ignoreRoads: true
    });
};

Creep.prototype.MoveToSourceSafely = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    // 优先移动到 source 附近的 rampart
    const ramparts = this.room.find(FIND_MY_STRUCTURES, {
        filter: (s: any) => s.structureType === STRUCTURE_RAMPART
    });
    const nearRamparts = target.pos.findInRange(ramparts, 1);
    let finalTarget = target, finalRange = range;

    for (const r of nearRamparts) {
        const structs = r.pos.lookFor(LOOK_STRUCTURES);
        if (!structs.some((s: any) => [STRUCTURE_LINK, STRUCTURE_EXTENSION, STRUCTURE_TOWER].includes(s.structureType))) {
            finalTarget = r;
            finalRange = 0;
            break;
        }
    }

    this.moveTo(finalTarget, { range: finalRange, reusePath: 50 });
};

// ── SwapPositionWithCreep (数据驱动表替换8个分支) ──────────────────────────
Creep.prototype.SwapPositionWithCreep = function (direction: DirectionConstant): void {
    // [dx, dy, opposite direction]
    const TABLE: Record<number, [number, number, DirectionConstant]> = {
        1: [ 0, -1, 5], 2: [ 1, -1, 6], 3: [ 1,  0, 7],
        4: [ 1,  1, 8], 5: [ 0,  1, 1], 6: [-1,  1, 2],
        7: [-1,  0, 3], 8: [-1, -1, 4],
    };
    const entry = TABLE[direction];
    if (!entry) return;
    const [dx, dy, opposite] = entry;
    const nx = this.pos.x + dx, ny = this.pos.y + dy;
    if (nx < 0 || nx > 49 || ny < 0 || ny > 49) return;
    const pos = new RoomPosition(nx, ny, this.room.name);
    let targets = pos.lookFor(LOOK_CREEPS) as any[];
    if (!targets.length) {
        const pcs: any[] = pos.lookFor(LOOK_POWER_CREEPS);
        if (pcs.length) targets = pcs;
    }
    if (targets.length > 0 && targets[0].my && !targets[0].memory.moving) {
        if (targets[0].ticksToLive % 2 < 1) targets[0].move(opposite);
        else if (targets[0].move(direction) !== OK) targets[0].move(opposite);
    }
};

Creep.prototype.MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch = function (target: any, range: number): void {
    if (!target || this.fatigue !== 0 || this.pos.getRangeTo(target) <= range) return;

    if (this.memory.path?.length > 0) {
        const step = this.memory.path[0];
        if (Math.abs(this.pos.x - step.x) > 1 || Math.abs(this.pos.y - step.y) > 1) this.memory.path = false;
    }

    const needNew = !this.memory.path?.length || this.memory.MoveTargetId !== target.id || target.roomName !== this.room.name;
    if (needNew) {
        let cb: (rn: string) => any;
        if (this.memory.role === "carry" && this.memory.full) cb = (roomName: string) => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            const costs = new PathFinder.CostMatrix();

            // 基础地形权重 - 满载carrier
            costs.set(this.pos.x, this.pos.y, 255);
            const terrain = new Room.Terrain(roomName);
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const t = terrain.get(x, y);
                    costs.set(x, y, t === TERRAIN_MASK_WALL ? 255 : t === TERRAIN_MASK_SWAMP ? 30 : 10);
                }
            }

            // 敌人creep高成本
            room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
                costs.set(c.pos.x, c.pos.y, 255);
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        const nx = c.pos.x + dx, ny = c.pos.y + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            const current = costs.get(nx, ny);
                            if (current < 100) costs.set(nx, ny, 100);
                        }
                    }
                }
            });

            return costs;
        };
        else if (this.memory.role === "carry" && !this.memory.full) cb = (roomName: string) => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            const costs = new PathFinder.CostMatrix();

            // 基础地形权重 - 空载carrier
            costs.set(this.pos.x, this.pos.y, 255);
            const terrain = new Room.Terrain(roomName);
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const t = terrain.get(x, y);
                    costs.set(x, y, t === TERRAIN_MASK_WALL ? 255 : t === TERRAIN_MASK_SWAMP ? 2 : 2);
                }
            }

            // 敌人creep高成本
            room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
                costs.set(c.pos.x, c.pos.y, 255);
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        const nx = c.pos.x + dx, ny = c.pos.y + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            const current = costs.get(nx, ny);
                            if (current < 100) costs.set(nx, ny, 100);
                        }
                    }
                }
            });

            return costs;
        };
        else if (this.memory.role === "ram" || this.memory.role === "Solomon") cb = (roomName: string) => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            const costs = new PathFinder.CostMatrix();

            // 基础地形权重 - ram角色
            costs.set(this.pos.x, this.pos.y, 255);
            const terrain = new Room.Terrain(roomName);
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const t = terrain.get(x, y);
                    costs.set(x, y, t === TERRAIN_MASK_WALL ? 254 : t === TERRAIN_MASK_SWAMP ? 10 : 2);
                }
            }

            // 敌人creep高成本
            room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
                costs.set(c.pos.x, c.pos.y, 255);
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        const nx = c.pos.x + dx, ny = c.pos.y + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            const current = costs.get(nx, ny);
                            if (current < 30) costs.set(nx, ny, 30);
                        }
                    }
                }
            });

            return costs;
        };
        else cb = (roomName: string) => {
            const room = Game.rooms[roomName];
            if (!room) return false;
            const costs = new PathFinder.CostMatrix();

            // 基础地形权重 - 默认
            costs.set(this.pos.x, this.pos.y, 255);
            const terrain = new Room.Terrain(roomName);
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const t = terrain.get(x, y);
                    costs.set(x, y, t === TERRAIN_MASK_WALL ? 255 : t === TERRAIN_MASK_SWAMP ? 10 : 2);
                }
            }

            // 敌人creep高成本
            room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
                costs.set(c.pos.x, c.pos.y, 255);
                for (let dx = -3; dx <= 3; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        const nx = c.pos.x + dx, ny = c.pos.y + dy;
                        if (nx >= 0 && nx < 50 && ny >= 0 && ny < 50) {
                            const current = costs.get(nx, ny);
                            if (current < 30) costs.set(nx, ny, 30);
                        }
                    }
                }
            });

            return costs;
        };

        const result = PathFinder.search(this.pos, { pos: target, range }, { maxOps: 1000, maxRooms: 1, roomCallback: (rn) => cb(rn) });
        const pos = result.path[0];
        this.SwapPositionWithCreep(this.pos.getDirectionTo(pos));
        this.memory.path       = result.path;
        this.memory.MoveTargetId = target.id;
    }

    const next = this.memory.path[0];
    this.move(this.pos.getDirectionTo(next));
    this.memory.moving = true;
    this.memory.path.shift();
};

// ── 防御者相关回调函数 ─────────────────────────────────────────────────────

/** 构建防御者基础 CostMatrix */
function buildDefenderBase(roomName: string, roadCost: number): CostMatrix | false {
    const room = Game.rooms[roomName];
    if (!room) return false;
    const costs = new PathFinder.CostMatrix();

    // 地形基础权重
    const terrain = new Room.Terrain(roomName);
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const t = terrain.get(x, y);
            costs.set(x, y,
                t === TERRAIN_MASK_WALL  ? 255 :
                t === TERRAIN_MASK_SWAMP ? 25 : 5
            );
        }
    }

    // 结构物处理
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_ROAD) {
            if (costs.get(s.pos.x, s.pos.y) !== 255) costs.set(s.pos.x, s.pos.y, roadCost);
            return;
        }
        if (s.structureType === STRUCTURE_RAMPART) {
            const others = s.pos.lookFor(LOOK_STRUCTURES).filter((b: any) => b.structureType !== STRUCTURE_RAMPART);
            if (others.length === 0) costs.set(s.pos.x, s.pos.y, 4);
            return;
        }
        if (s.structureType === STRUCTURE_CONTAINER) return;
        costs.set(s.pos.x, s.pos.y, 255);
    });

    // 防御半径排除区域
    const defenceRadius = room.memory.defenceRadius || 11;
    if (room.memory.Structures?.storage) {
        const storage = Game.getObjectById(room.memory.Structures.storage) as any;
        if (storage) {
            for (let x = storage.pos.x - defenceRadius; x <= storage.pos.x + defenceRadius; x++) {
                for (let y = storage.pos.y - defenceRadius; y <= storage.pos.y + defenceRadius; y++) {
                    if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                        if (x !== storage.pos.x || y !== storage.pos.y) {
                            costs.set(x, y, 255);
                        }
                    }
                }
            }
        }
    }

    return costs;
}

/** 躲避入侵者回调 */
const roomCallbackAvoidInvaders = (roomName: string): boolean | CostMatrix => {
    const result = buildDefenderBase(roomName, 5);
    if (!result) return false;
    const room = Game.rooms[roomName];

    // 阻挡每个敌人附近的格子 (±3 硬阻挡)
    room.find(FIND_HOSTILE_CREEPS).forEach((eCreep: Creep) => {
        for (let i = -3; i <= 3; i++) {
            for (let o = -3; o <= 3; o++) {
                const nx = eCreep.pos.x + i, ny = eCreep.pos.y + o;
                if (nx >= 0 && nx <= 49 && ny >= 0 && ny <= 49) result.set(nx, ny, 255);
            }
        }
    });

    // 阻挡 SpecialCarry 格子
    room.find(FIND_MY_CREEPS).forEach((c: any) => {
        if (c.memory.role === "SpecialCarry") result.set(c.pos.x, c.pos.y, 25);
    });

    return result;
};

/** RampartDefender 回调 */
const roomCallbackForRampartDefender = (roomName: string): boolean | CostMatrix => {
    return buildDefenderBase(roomName, 3) || false;
};

/** 远程 RampartDefender 回调 */
const roomCallbackForRangedRampartDefender = (roomName: string): boolean | CostMatrix => {
    const result = buildDefenderBase(roomName, 0); // 道路可通过 (不惩罚)
    if (!result) return false;
    const room = Game.rooms[roomName];

    // 在高 RANGED_ATTACK 敌人附近添加惩罚
    room.find(FIND_HOSTILE_CREEPS).forEach((c: Creep) => {
        if (c.getActiveBodyparts(RANGED_ATTACK) > 15) {
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const nx = c.pos.x + dx, ny = c.pos.y + dy;
                    if (nx > 0 && nx < 49 && ny > 0 && ny < 49) {
                        const cur = result.get(nx, ny);
                        if (cur + 25 <= 255) result.set(nx, ny, cur + 25);
                    }
                }
            }
        }
    });

    return result;
};

/** 共享路径移动函数 */
function moveWithPath(
    creep: any,
    target: any,
    range: number,
    callbackFn: (rn: string) => boolean | CostMatrix,
    maxRooms = 1
): void {
    if (!target || creep.fatigue !== 0 || creep.pos.getRangeTo(target) <= range) return;

    // 使过期的缓存路径无效
    if (creep.memory.path?.length > 0) {
        const step = creep.memory.path[0];
        if (Math.abs(creep.pos.x - step.x) > 1 || Math.abs(creep.pos.y - step.y) > 1)
            creep.memory.path = false;
    }

    if (!creep.memory.path?.length || creep.memory.MoveTargetId !== target.id) {
        const result = PathFinder.search(
            creep.pos, { pos: target.pos ?? target, range },
            { maxOps: 1000, maxRooms, roomCallback: (rn) => callbackFn(rn) }
        );
        const pos = result.path[0];
        if (pos) {
            creep.SwapPositionWithCreep(creep.pos.getDirectionTo(pos));
            creep.memory.path = result.path;
            creep.memory.MoveTargetId = target.id;
        }
    }

    const next = creep.memory.path?.[0];
    if (next) {
        creep.move(creep.pos.getDirectionTo(next));
        creep.memory.moving = true;
    }
}

/** 交换位置与 Creep */
Creep.prototype.SwapPositionWithCreep = function (direction: DirectionConstant): void {
    // [dx, dy, opposite direction]
    const TABLE: Record<number, [number, number, DirectionConstant]> = {
        1: [ 0, -1, 5], 2: [ 1, -1, 6], 3: [ 1,  0, 7],
        4: [ 1,  1, 8], 5: [ 0,  1, 1], 6: [-1,  1, 2],
        7: [-1,  0, 3], 8: [-1, -1, 4],
    };
    const entry = TABLE[direction];
    if (!entry) return;
    const [dx, dy, opposite] = entry;
    const nx = this.pos.x + dx, ny = this.pos.y + dy;
    if (nx < 0 || nx > 49 || ny < 0 || ny > 49) return;
    const pos = new RoomPosition(nx, ny, this.room.name);
    let targets = pos.lookFor(LOOK_CREEPS) as any[];
    if (!targets.length) {
        this.move(direction);
        return;
    }
    const target = targets[0];
    if (!target.my || target.memory.role === "SpecialCarry") return;
    if (target.fatigue > 0) return;
    if (target.move(opposite) === OK) this.move(direction);
};

/** 移动到安全位置修复 Rampart */
Creep.prototype.moveToSafePositionToRepairRampart = function (target: any, range: number): void {
    let cb: (rn: string) => any;
    if (this.memory.role === "RampartDefender")   cb = roomCallbackForRampartDefender;
    else if (this.memory.role === "RRD")          cb = roomCallbackForRangedRampartDefender;
    else                                          cb = roomCallbackAvoidInvaders;
    moveWithPath(this, target, range, cb);
};

// 导出空对象以使此文件成为一个模块
export {};
