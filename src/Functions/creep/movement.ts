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

// 导出空对象以使此文件成为一个模块
export {};
