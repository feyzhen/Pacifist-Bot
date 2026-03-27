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

// ── harvestEnergy ─────────────────────────────────────────────────────────────
Creep.prototype.harvestEnergy = function harvestEnergy(): any {
    if (this.memory.targetRoom && this.memory.targetRoom !== this.room.name)
        return this.moveToRoomAvoidEnemyRooms(this.memory.targetRoom);

    let source: any = Game.getObjectById(this.memory.source);
    if (!source || (!source.pos.getOpenPositions().length && !this.pos.isNearTo(source) && !this.memory.sourceId)) {
        delete this.memory.source; source = this.findSource();
    }
    if (!source) return;

    if (this.pos.isNearTo(source) &&
        (this.memory.checkAmIOnRampart && this.memory.role === "EnergyMiner" ||
         this.memory.role !== "EnergyMiner" || this.memory.targetRoom !== this.memory.homeRoom)) {
        return this.harvest(source);
    }
    this.room.memory.danger ? this.MoveToSourceSafely(source, 1) : this.MoveCostMatrixRoadPrio(source, 1, this.memory.role);
    if (this.memory.danger) {
        const closest = this.pos.findClosestByRange(this.room.find(FIND_HOSTILE_CREEPS));
        if (closest && this.pos.getRangeTo(closest) <= 3) this.room.roomTowersHealMe(this);
    }
};

// ── acquireEnergyWithContainersAndOrDroppedEnergy ─────────────────────────────
Creep.prototype.acquireEnergyWithContainersAndOrDroppedEnergy = function (): any {
    if (!this.room.memory.Structures) this.room.memory.Structures = {};
    const spawn: any = Game.getObjectById(this.memory.spawn);
    let container: any = Game.getObjectById(this.room.memory.Structures.container) || this.room.findContainers(this.store.getFreeCapacity());

    if (container?.store[RESOURCE_ENERGY] <= this.store.getFreeCapacity())
        container = this.room.findContainers(this.store.getFreeCapacity());

    const moveTo = (target: any) => {
        if (this.memory.role === "carry") this.MoveCostMatrixSwampPrio(target, 1);
        else this.MoveCostMatrixRoadPrio(target, 1);
    };

    const droppedFilter = (res: any) =>
        this.pos.getRangeTo(res.pos) < 8 &&
        res.amount > this.store.getFreeCapacity() + this.pos.findPathTo(res.pos).length + 1 &&
        res.resourceType === RESOURCE_ENERGY &&
        (!spawn || !res.pos.isNearTo(spawn));

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, { filter: droppedFilter });
    if (dropped.length) {
        const closest = this.pos.findClosestByRange(dropped);
        if (this.pos.isNearTo(closest)) return this.pickup(closest);
        moveTo(closest); return;
    }

    if (container) {
        if (this.pos.isNearTo(container)) return this.withdraw(container, RESOURCE_ENERGY);
        moveTo(container); return;
    }

    const lastChance = this.room.find(FIND_DROPPED_RESOURCES, { filter: (r: any) => r.resourceType === RESOURCE_ENERGY });
    if (lastChance.length) {
        lastChance.sort((a: any, b: any) => b.amount - a.amount);
        if (this.pos.isNearTo(lastChance[0])) return this.pickup(lastChance[0]);
        moveTo(lastChance[0]);
    }
};

// ── roadCheck / roadlessLocation ──────────────────────────────────────────────
Creep.prototype.roadCheck = function (): boolean {
    return this.pos.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_ROAD);
};

Creep.prototype.roadlessLocation = function (repairTarget: any): RoomPosition | null {
    const nearby = this.pos.getNearbyPositions();
    let candidates = nearby.filter((b: RoomPosition) => {
        if (b.getRangeTo(repairTarget) !== 3) return false;
        return b.lookFor(LOOK_STRUCTURES).length === 0 && b.lookFor(LOOK_CREEPS).length === 0;
    });

    if (candidates.length > 0 && this.room.memory.Structures?.storage) {
        const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
        let best: RoomPosition | null = null, bestRange = 100;
        for (const b of candidates) {
            const r = b.getRangeTo(storage as any);
            if (r < bestRange) { bestRange = r; best = b; }
        }
        return best;
    }
    if (candidates.length > 0) return candidates[0];

    if (!this.room.memory.danger) {
        for (const b of nearby) {
            if (b.getRangeTo(repairTarget) <= 3 && b.lookFor(LOOK_STRUCTURES).length === 0 && b.lookFor(LOOK_CREEPS).length === 0)
                return b;
        }
    }
    return null;
};

// ── findFillerTarget ──────────────────────────────────────────────────────────
Creep.prototype.findFillerTarget = function findFillerTarget(): any {
    const reserveFill = this.room.memory.reserveFill;

    // Helper: detect and cache controller link/container
    const refreshControllerLink = (role: string) => {
        if (this.memory.role !== role) return;
        if (this.room.memory.Structures.controllerLink && Game.time % 10000 !== 0) return;
        if (!this.room.controller || this.room.controller.level < 2) return;
        if (this.room.controller.level < 7) {
            let containers = this.room.find(FIND_STRUCTURES, {
                filter: (b: any) => b.structureType === STRUCTURE_CONTAINER &&
                    b.id !== this.room.memory.Structures.bin &&
                    b.id !== this.room.memory.Structures.storage &&
                    b.pos.getRangeTo(this.room.controller) === 3
            });
            if (!containers.length) return;
            let best = this.room.controller.pos.findClosestByRange(containers);
            if (containers.length > 1) {
                const sources = this.room.find(FIND_SOURCES);
                if (best.pos.findInRange(sources, 1).length > 0) {
                    containers = containers.filter((c: any) => c.id !== best.id);
                    best = this.room.controller.pos.findClosestByRange(containers);
                }
            }
            this.room.memory.Structures.controllerLink = best.id;
        } else {
            const links = this.room.find(FIND_MY_STRUCTURES, {
                filter: (b: any) => b.structureType === STRUCTURE_LINK && b.pos.getRangeTo(this.room.controller) <= 3
            });
            if (!links.length) return;
            const cl = this.room.controller.pos.findClosestByRange(links);
            if (cl.pos.getRangeTo(this.room.controller) <= 4) this.room.memory.Structures.controllerLink = cl.id;
        }
    };

    refreshControllerLink("ControllerLinkFiller");

    // Controller link / container fill
    if ((this.memory.role === "ControllerLinkFiller" || this.memory.role === "filler") &&
        this.room.controller && this.room.memory.Structures.controllerLink) {
        const cl: any = Game.getObjectById(this.room.memory.Structures.controllerLink);
        if (cl) {
            const isContainer = cl.structureType === STRUCTURE_CONTAINER;
            const isLink      = cl.structureType === STRUCTURE_LINK;
            const needFill    = isContainer
                ? (this.memory.role === "ControllerLinkFiller" ? cl.store.getFreeCapacity() >= 200 : cl.store.getFreeCapacity() > 1800)
                : (isLink && cl.store[RESOURCE_ENERGY] <= (this.memory.role === "ControllerLinkFiller" ? 600 : 400));
            if (needFill) {
                if (isContainer && this.room.controller.level >= 7) { this.room.memory.Structures.controllerLink = false; }
                else { this.memory.t = cl.id; return cl; }
            }
        } else {
            this.room.memory.Structures.controllerLink = false;
        }
    }

    // Output labs (loop replaces 8 individual variables)
    if (this.room.memory.labs && Object.keys(this.room.memory.labs).length >= 4) {
        const labKeys = ["outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
        for (const key of labKeys) {
            if (!this.room.memory.labs[key]) continue;
            const lab: any = Game.getObjectById(this.room.memory.labs[key]);
            if (lab && (lab.store[RESOURCE_ENERGY] <= 2000 - this.memory.MaxStorage * 2 || lab.store[RESOURCE_ENERGY] < 1200) && !reserveFill.includes(lab.id)) {
                if (!this.room.memory.reserveFill.includes(lab.id)) this.room.memory.reserveFill.push(lab.id);
                this.memory.t = lab.id; return lab;
            }
        }
    }

    // Spawns & extensions
    if (this.room.energyAvailable < this.room.energyCapacityAvailable) {
        const targets = this.room.find(FIND_MY_STRUCTURES, {
            filter: (b: any) => (b.structureType === STRUCTURE_SPAWN || b.structureType === STRUCTURE_EXTENSION) &&
                b.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && !reserveFill.includes(b.id)
        });
        if (targets.length) {
            const t = this.pos.findClosestByRange(targets);
            if (!this.room.memory.reserveFill.includes(t.id)) this.room.memory.reserveFill.push(t.id);
            this.memory.t = t.id; return t;
        }
    }

    // Towers
    const towers = this.room.find(FIND_MY_STRUCTURES, {
        filter: (b: any) => b.structureType === STRUCTURE_TOWER && b.store.getFreeCapacity(RESOURCE_ENERGY) >= 100 && !reserveFill.includes(b.id)
    });
    if (towers.length) {
        const t = this.pos.findClosestByRange(towers);
        if (!this.room.memory.reserveFill.includes(t.id)) this.room.memory.reserveFill.push(t.id);
        this.memory.t = t.id; return t;
    }

    const storage = Game.getObjectById(this.memory.storage) || this.findStorage() || this.room.storage;

    // Factory
    if (this.room.memory.Structures.factory) {
        const factory: any = Game.getObjectById(this.room.memory.Structures.factory);
        if (factory && factory.store[RESOURCE_ENERGY] < 20000 && storage && storage.store[RESOURCE_ENERGY] > 450000 && storage.store[RESOURCE_BATTERY] < 200 && !reserveFill.includes(factory.id)) {
            if (!this.room.memory.reserveFill.includes(factory.id)) this.room.memory.reserveFill.push(factory.id);
            this.memory.t = factory.id; return factory;
        }
    }

    // Extra links
    if (this.room.memory.Structures.extraLinks) {
        for (const linkID of this.room.memory.Structures.extraLinks) {
            const el: any = Game.getObjectById(linkID);
            if (el && el.store[RESOURCE_ENERGY] < 800 && storage && storage.store[RESOURCE_ENERGY] > 100000 && !reserveFill.includes(el.id)) {
                if (!this.room.memory.reserveFill.includes(el.id)) this.room.memory.reserveFill.push(el.id);
                this.memory.t = el.id; return el;
            }
        }
    }

    // PowerSpawn
    if (this.room.memory.Structures.powerSpawn) {
        const ps: any = Game.getObjectById(this.room.memory.Structures.powerSpawn);
        if (ps && ps.store[RESOURCE_ENERGY] < 2500 && storage && storage.store[RESOURCE_ENERGY] > 280000 && !reserveFill.includes(ps.id)) {
            if (!this.room.memory.reserveFill.includes(ps.id)) this.room.memory.reserveFill.push(ps.id);
            this.memory.t = ps.id; return ps;
        }
    }

    refreshControllerLink("filler");
    return false;
};

// ── findSource / findSpawn / findStorage / findClosestLink ────────────────────
Creep.prototype.findSource = function () {
    let source: any = this.memory.sourceId ? Game.getObjectById(this.memory.sourceId) : null;
    if (!source) {
        let sources = this.room.find(FIND_SOURCES, { filter: (s: any) => s.energy > 0 });
        if (sources.length) {
            sources = sources.filter((s: any) => s.pos.getOpenPositions().length > 0);
            source = this.pos.findClosestByRange(sources);
        }
    }
    if (source) { this.memory.source = source.id; return source; }
};

Creep.prototype.findSpawn = function () {
    const spawns = this.room.find(FIND_MY_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_SPAWN });
    if (spawns.length) { this.memory.spawn = spawns[0].id; return spawns[0]; }
};

Creep.prototype.findStorage = function () {
    if (this.room.controller?.level >= 4) {
        const st = this.room.find(FIND_MY_STRUCTURES, { filter: (s: any) => s.structureType === STRUCTURE_STORAGE });
        if (st.length) { this.memory.storage = st[0].id; return st[0]; }
    } else if (this.room.controller?.level > 0) {
        const spawn: any = Game.getObjectById(this.memory.spawn) || this.findSpawn();
        if (spawn && spawn.pos.y >= 2) {
            const pos = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, this.room.name);
            for (const s of pos.lookFor(LOOK_STRUCTURES)) {
                if ((s as any).structureType === STRUCTURE_CONTAINER) { this.memory.storage = (s as any).id; return s; }
            }
        }
    }
};

Creep.prototype.findClosestLink = function () {
    const links = this.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });
    if (links.length) { const l = this.pos.findClosestByRange(links); this.memory.closestLink = l.id; return l; }
};

Creep.prototype.findClosestLinkToStorage = function (): any {
    const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
    if (storage && (storage as any).pos.x >= 2) {
        const pos = new RoomPosition((storage as any).pos.x - 2, (storage as any).pos.y, this.room.name);
        const links = this.room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });
        const nearby = pos.findInRange(links, 2);
        if (nearby.length) { 
            const link = nearby[0] as any; 
            this.memory.closestLink = link.id; 
            return nearby[0]; 
        }
    }
    return this.findClosestLink();
};

// ── withdrawStorage ───────────────────────────────────────────────────────────
Creep.prototype.withdrawStorage = function withdrawStorage(storage: any): any {
    if (!storage) { this.findStorage(); return; }
    const energy = storage.store[RESOURCE_ENERGY];
    const role   = this.memory.role;
    const minEnergy = storage.structureType === STRUCTURE_STORAGE ? 2000 : 300;
    if (energy < minEnergy && role !== "filler") {
        if (Game.time % 50 === 0) console.log(`Not enough energy to withdraw in ${this.room.name}`);
        this.acquireEnergyWithContainersAndOrDroppedEnergy(); return;
    }
    if (this.pos.isNearTo(storage)) return this.withdraw(storage, RESOURCE_ENERGY);
    role ? this.MoveCostMatrixRoadPrio(storage, 1) : this.MoveCostMatrixIgnoreRoads(storage, 1);
};

// ── Speak ─────────────────────────────────────────────────────────────────────
Creep.prototype.Speak = function Speak(): void {
    // Chained sayings
    const chain: Record<string, string> = {
        "AB42": "BBB4", "BB14": "BBB4", "BBB4": "33472A",
        "33472A": "E41N58", "E41N58": "E41N58"
    };
    
    if (!this.memory.saying) return;
    const msg = this.memory.saying;
    this.say(msg, true);
    
    if (chain[msg]) {
        this.memory.saying = chain[msg];
    } else {
        delete this.memory.saying;
    }
};

// ── Sweep ─────────────────────────────────────────────────────────────────────
Creep.prototype.Sweep = function Sweep(): any {
    if (!this.memory.lockedDropped || Game.getObjectById(this.memory.lockedDropped) == null) {
        const sources = this.room.find(FIND_SOURCES);
        if (!sources.length) return "nothing to sweep";

        let dropped = this.room.find(FIND_DROPPED_RESOURCES);
        if (this.room.controller?.level <= 3)
            dropped = dropped.filter((r: any) => r.pos.getRangeTo(r.pos.findClosestByRange(sources)) > 1);

        const tombs = this.room.find(FIND_TOMBSTONES, { filter: (t: any) => _.keys(t.store).length > 0 });
        if (!dropped.length && !tombs.length) return "nothing to sweep";

        const nearbyDropped = dropped.filter((r: any) => r.pos.getRangeTo(this) < 6);
        const nearbyTombs   = tombs.filter((t: any) => t.pos.getRangeTo(this) < 6);

        if (nearbyDropped.length)   { nearbyDropped.sort((a: any, b: any) => a.amount - b.amount);   this.memory.lockedDropped = nearbyDropped[0].id; }
        else if (nearbyTombs.length){ nearbyTombs.sort((a: any, b: any) => a.amount - b.amount);     this.memory.lockedDropped = nearbyTombs[0].id; }
        else if (dropped.length)    { dropped.sort((a: any, b: any) => a.amount - b.amount);         this.memory.lockedDropped = dropped[0].id; }
        else                        { this.memory.lockedDropped = tombs[tombs.length - 1].id; }
    }

    const target: any = Game.getObjectById(this.memory.lockedDropped);
    if (this.pickup(target) === OK) return "picked up";
    if (this.pickup(target) === ERR_NOT_IN_RANGE) { this.moveTo(target, { reusePath: 25, ignoreRoads: true, swampCost: 1 }); return false; }
    if (this.withdraw(target, RESOURCE_ENERGY) === OK) return "picked up";
    if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) { this.MoveCostMatrixSwampPrio(target, 1); }
    return false;
};

// ── recycle ───────────────────────────────────────────────────────────────────
Creep.prototype.recycle = function recycle(): void {
    if (this.memory.homeRoom && this.memory.homeRoom !== this.room.name)
        return this.moveToRoomAvoidEnemyRooms(this.memory.homeRoom);

    // Unboost if boosted and near end of life
    if (this.ticksToLive < 600 && this.room.memory.labs) {
        const boosted = this.body.some((p: BodyPartDefinition) => p.boost);
        if (boosted) {
            const labKeys = ["inputLab1","inputLab2","outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
            let lab: any = null;
            for (const key of labKeys) {
                const l: any = this.room.memory.labs[key] ? Game.getObjectById(this.room.memory.labs[key]) : null;
                if (l && l.cooldown <= 20) { lab = l; break; }
            }
            if (lab) {
                if (!this.room.memory.labs.paused) this.room.memory.labs.paused = [];
                const existing = this.room.memory.labs.paused.find((p: any) => p.id === lab.id);
                if (!existing) this.room.memory.labs.paused.push({ timer: 21, id: lab.id });
                else existing.timer = 50;

                if (this.pos.isNearTo(lab)) {
                    if (lab.unboostCreep(this) === OK) {
                        const entry = this.room.memory.labs.paused.find((p: any) => p.id === lab.id);
                        if (entry) entry.timer = 1;
                    }
                } else {
                    this.room.find(FIND_MY_CREEPS, { filter: (c: any) => c.memory.role === "sweeper" && !c.memory.full })
                        .forEach((sw: any) => sw.MoveCostMatrixIgnoreRoads(lab, 3));
                    this.MoveCostMatrixRoadPrio(lab, 1);
                }
                if (!this.memory.spawnedSweeper && this.room.find(FIND_MY_CREEPS, { filter: (c: any) => c.memory.role === "sweeper" }).length < 1) {
                    const name = "Sweeper-" + Math.floor(Math.random() * Game.time) + "-" + this.room.name;
                    this.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], name, { memory: { role: "sweeper" } });
                    this.memory.spawnedSweeper = true;
                }
                return;
            }
        }
    }

    const SO = this.room.memory.Structures;
    if (!SO) { this.room.memory.Structures = {}; return; }
    const bin: any = SO.bin ? this.room.find(FIND_STRUCTURES, { filter: (s: any) => s.id === SO.bin })[0] : null;

    if (bin) {
        if (this.pos.isEqualTo(bin)) {
            const spawnPos = new RoomPosition(this.pos.x, this.pos.y + 1, this.room.name);
            const spawn: any = spawnPos.lookFor(LOOK_STRUCTURES).find((s: any) => s.structureType === STRUCTURE_SPAWN);
            if (spawn) spawn.recycleCreep(this); else this.suicide();
        } else { this.MoveCostMatrixRoadPrio(bin, 0); }
    } else if (!SO.bin) {
        const storage: any = Game.getObjectById(SO.storage) || this.room.storage;
        if (storage) {
            const binPos = new RoomPosition(storage.pos.x, storage.pos.y + 1, storage.room.name);
            for (const s of binPos.lookFor(LOOK_STRUCTURES)) {
                if ((s as any).structureType === STRUCTURE_CONTAINER) { SO.bin = (s as any).id; break; }
            }
        }
        const spawns = this.room.find(FIND_MY_SPAWNS);
        if (spawns.length) {
            if (this.pos.isNearTo(spawns[0])) spawns[0].recycleCreep(this);
            else this.MoveCostMatrixRoadPrio(spawns[0], 1);
        } else { this.suicide(); }
    }
};

// 导出空对象以使此文件成为一个模块
export {};
