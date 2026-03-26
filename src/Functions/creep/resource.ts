// ─────────────────────────────────────────────────────────────────────────────
// resource.ts  –  Creep资源管理相关函数
//
// 从creepFunctions.ts中提取的资源相关功能：
// - 资源收集
// - 资源存储和转移
// - 能量管理
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// CREEP RESOURCE PROTOTYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** 获取能量 */
Creep.prototype.getEnergy = function(): any {
    // 如果已经满能量，返回false
    if (this.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return false;
    
    // 优先从容器获取
    const containers = this.room.find(FIND_STRUCTURES, {
        filter: (s: any) => s.structureType === STRUCTURE_CONTAINER && 
                          s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });
    
    if (containers.length > 0) {
        const closestContainer = this.pos.findClosestByPath(containers);
        if (closestContainer) {
            if (this.pos.isNearTo(closestContainer)) {
                this.withdraw(closestContainer, RESOURCE_ENERGY);
                return true;
            } else {
                this.moveTo(closestContainer);
                return true;
            }
        }
    }
    
    // 从存储获取
    const storage = this.room.storage;
    if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        if (this.pos.isNearTo(storage)) {
            this.withdraw(storage, RESOURCE_ENERGY);
            return true;
        } else {
            this.moveTo(storage);
            return true;
        }
    }
    
    // 从终端获取
    const terminal = this.room.terminal;
    if (terminal && terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 10000) {
        if (this.pos.isNearTo(terminal)) {
            this.withdraw(terminal, RESOURCE_ENERGY);
            return true;
        } else {
            this.moveTo(terminal);
            return true;
        }
    }
    
    // 从掉落的能量获取
    const droppedEnergy = this.room.find(FIND_DROPPED_RESOURCES, {
        filter: (r: any) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });
    
    if (droppedEnergy.length > 0) {
        const closestDropped = this.pos.findClosestByPath(droppedEnergy);
        if (closestDropped) {
            if (this.pos.isNearTo(closestDropped)) {
                this.pickup(closestDropped);
                return true;
            } else {
                this.moveTo(closestDropped);
                return true;
            }
        }
    }
    
    // 从源点获取
    const sources = this.room.find(FIND_SOURCES);
    if (sources.length > 0) {
        const closestSource = this.pos.findClosestByPath(sources);
        if (closestSource) {
            if (this.pos.isNearTo(closestSource)) {
                this.harvest(closestSource);
                return true;
            } else {
                this.moveTo(closestSource);
                return true;
            }
        }
    }
    
    return false;
};

/** 存储能量 */
Creep.prototype.storeEnergy = function(): any {
    // 如果没有能量，返回false
    if (this.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return false;
    
    // 优先存储到存储
    const storage = this.room.storage;
    if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        if (this.pos.isNearTo(storage)) {
            this.transfer(storage, RESOURCE_ENERGY);
            return true;
        } else {
            this.moveTo(storage);
            return true;
        }
    }
    
    // 存储到终端
    const terminal = this.room.terminal;
    if (terminal && terminal.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        if (this.pos.isNearTo(terminal)) {
            this.transfer(terminal, RESOURCE_ENERGY);
            return true;
        } else {
            this.moveTo(terminal);
            return true;
        }
    }
    
    // 存储到容器
    const containers = this.room.find(FIND_STRUCTURES, {
        filter: (s: any) => s.structureType === STRUCTURE_CONTAINER && 
                          s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    
    if (containers.length > 0) {
        const closestContainer = this.pos.findClosestByPath(containers);
        if (closestContainer) {
            if (this.pos.isNearTo(closestContainer)) {
                this.transfer(closestContainer, RESOURCE_ENERGY);
                return true;
            } else {
                this.moveTo(closestContainer);
                return true;
            }
        }
    }
    
    return false;
};

/** 转移能量到其他creep */
Creep.prototype.transferEnergy = function(target?: Creep): any {
    if (this.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return false;
    
    let transferTarget = target;
    
    if (!transferTarget) {
        // 寻找需要能量的creep
        const needyCreeps = this.room.find(FIND_MY_CREEPS, {
            filter: (c: Creep) => c !== this && 
                               c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });
        
        if (needyCreeps.length === 0) return false;
        
        transferTarget = this.pos.findClosestByPath(needyCreeps);
    }
    
    if (!transferTarget) return false;
    
    if (this.pos.isNearTo(transferTarget)) {
        this.transfer(transferTarget, RESOURCE_ENERGY);
        return true;
    } else {
        this.moveTo(transferTarget);
        return true;
    }
};

/** 检查是否需要能量 */
Creep.prototype.needsEnergy = function(): boolean {
    return this.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
};

/** 检查是否满能量 */
Creep.prototype.isFullOfEnergy = function(): boolean {
    return this.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
};

/** 获取总携带量 */
Creep.prototype.getTotalCarry = function(): number {
    return this.store.getUsedCapacity();
};

/** 获取能量携带量 */
Creep.prototype.getEnergyCarry = function(): number {
    return this.store.getUsedCapacity(RESOURCE_ENERGY);
};

/** 检查是否有空余容量 */
Creep.prototype.hasEmptyCapacity = function(): boolean {
    return this.store.getFreeCapacity() > 0;
};

/** 获取工作状态 */
Creep.prototype.getWorkingStatus = function(): string {
    const energyPercent = this.store.getUsedCapacity(RESOURCE_ENERGY) / this.store.getCapacity(RESOURCE_ENERGY);
    
    if (energyPercent === 0) return "empty";
    if (energyPercent < 0.5) return "low";
    if (energyPercent < 1) return "medium";
    return "full";
};

// 导出空对象以使此文件成为一个模块
export {};
