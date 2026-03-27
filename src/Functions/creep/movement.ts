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
Creep.prototype.moveToRoom = function(roomName: string): any {
    if (this.room.name === roomName) return false;
    
    const exitDir = Game.map.findExit(this.room.name, roomName);
    if (exitDir === -2) return false; // 没有路径
    
    const exit = this.pos.findClosestByPath(exitDir);
    if (!exit) return false;
    
    this.moveTo(exit);
    return true;
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

// 导出空对象以使此文件成为一个模块
export {};
