// ─────────────────────────────────────────────────────────────────────────────
// combat.ts  –  Creep战斗相关函数
//
// 从creepFunctions.ts中提取的战斗相关功能：
// - 增强功能 (Boost)
// - 疏散功能 (evacuate)
// - 逃跑和防御移动
// - 战斗辅助功能
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// CREEP COMBAT PROTOTYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** 增强creep */
Creep.prototype.Boost = function Boost():any {

    if(this.memory.boostlabs.length == 0) {
        return;
    }
    else {
        let labs = [];
        for(let labID of this.memory.boostlabs) {
            labs.push(Game.getObjectById(labID));
        }
        let closestLab = this.pos.findClosestByRange(labs);
        if(closestLab.mineralAmount <  30) {
            if(this.ticksToLive < 1100 && this.getActiveBodyparts(CLAIM)===0) {
                let idToRemove = closestLab.id;
                this.memory.boostlabs = this.memory.boostlabs.filter(labid => labid !== idToRemove);
            }
            this.MoveCostMatrixRoadPrio(closestLab, 3);
        }
        else {
            if(this.pos.isNearTo(closestLab)) {
                let result = closestLab.boostCreep(this);
                if(result == 0) {
                    if(this.room.memory.labs.outputLab1 && this.room.memory.labs.outputLab1 == closestLab.id && this.room.memory.labs.status.boost.lab1?.use) {
                        this.room.memory.labs.status.boost.lab1.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab2 && this.room.memory.labs.outputLab2 == closestLab.id && this.room.memory.labs.status.boost.lab2?.use) {
                        this.room.memory.labs.status.boost.lab2.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab3 && this.room.memory.labs.outputLab3 == closestLab.id && this.room.memory.labs.status.boost.lab3?.use) {
                        this.room.memory.labs.status.boost.lab3.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab4 && this.room.memory.labs.outputLab4 == closestLab.id && this.room.memory.labs.status.boost.lab4?.use) {
                        this.room.memory.labs.status.boost.lab4.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab5 && this.room.memory.labs.outputLab5 == closestLab.id && this.room.memory.labs.status.boost.lab5?.use) {
                        this.room.memory.labs.status.boost.lab5.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab6 && this.room.memory.labs.outputLab6 == closestLab.id && this.room.memory.labs.status.boost.lab6?.use) {
                        this.room.memory.labs.status.boost.lab6.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab7 && this.room.memory.labs.outputLab7 == closestLab.id && this.room.memory.labs.status.boost.lab7?.use) {
                        this.room.memory.labs.status.boost.lab7.use -= 1;
                    }
                    else if(this.room.memory.labs.outputLab8 && this.room.memory.labs.outputLab8 == closestLab.id && this.room.memory.labs.status.boost.lab8?.use) {
                        this.room.memory.labs.status.boost.lab8.use -= 1;
                        if(this.room.memory.labs.status.boost.lab8.use ===0 && this.memory.role === "EnergyMiner") {
                            this.room.memory.labs.lab8reserved = false;
                        }
                    }

                    let idToRemove = closestLab.id;
                    this.memory.boostlabs = this.memory.boostlabs.filter(labid => labid !== idToRemove);
                    return true;
                }
                else {
                    console.log(result)
                }
            }

            else {
                this.MoveCostMatrixRoadPrio(closestLab, 1);
                return false;
            }
        }

    }
}

/** 疏散creep以避免核弹攻击 */
Creep.prototype.evacuate = function evacuate():any {
    if(this.room.memory.defence && this.room.memory.defence.nuke && this.room.memory.defence.evacuate || this.memory.nukeHaven) {
        if(!this.memory.nukeTimer) {
            let nukes = this.room.find(FIND_NUKES).filter(function(nuke) {return nuke.timeToLand < 300;});;
            if(nukes.length > 0) {
                nukes.sort((a,b) => a.timeToLand - b.timeToLand);
                this.memory.nukeTimer = nukes[0].timeToLand + 1;
            }
        }
        if(!this.memory.homeRoom) {
            this.memory.homeRoom = this.room.name;
        }
        if(this.memory.nukeTimer && this.memory.nukeTimer > 0) {
            this.memory.nukeTimer --;
        }

        if(this.memory.nukeTimer > 0) {

            if(!this.memory.nukeHaven) {
                let possibleRooms = Object.values(Game.map.describeExits(this.room.name)).filter(roomname => Game.map.getRoomStatus(roomname).status === Game.map.getRoomStatus(this.room.name).status);
                let index = Math.floor(Math.random() * possibleRooms.length);
                this.memory.nukeHaven = possibleRooms[index];
            }
            if(this.memory.nukeHaven) {
                this.moveToRoom(this.memory.nukeHaven)
            }

        }
        else {
            if(this.room.name == this.memory.homeRoom) {
                return false;
            }
            else {
                this.moveToRoom(this.memory.homeRoom);
                return true;
            }
        }

        return true;
    }
    return false;
}

/** 如果在危险中则撤回家园 */
Creep.prototype.fleeHomeIfInDanger = function (): void | string {
    const tr = this.memory.targetRoom, hr = this.memory.homeRoom;
    if (!tr || !hr || tr === hr || !Memory.rooms?.[tr]?.roomData?.has_hostile_creeps) return;

    if (this.room.name === tr) { this.memory.timeOut = 25; this.moveToRoom(hr); return "timeOut"; }
    if (this.memory.timeOut > 0) {
        this.memory.timeOut--;
        // 向正确的方向推离边缘
        const { x, y } = this.pos;
        const moves: [boolean, DirectionConstant[]][] = [
            [x === 49, [LEFT, TOP_LEFT, BOTTOM_LEFT, TOP, BOTTOM]],
            [x === 0,  [RIGHT, TOP_RIGHT, BOTTOM_RIGHT, TOP, BOTTOM]],
            [y === 49, [TOP, TOP_LEFT, TOP_RIGHT, LEFT, RIGHT]],
            [y === 0,  [BOTTOM, BOTTOM_LEFT, BOTTOM_RIGHT, LEFT, RIGHT]],
        ];
        for (const [cond, dirs] of moves) {
            if (!cond) continue;
            for (const d of dirs) { if (this.move(d) === OK) break; }
            break;
        }
        return "timeOut";
    }
};

/** 如果需要则移开 */
Creep.prototype.moveAwayIfNeedTo = function (): any {
    const { x, y } = this.pos, rn = this.room.name;
    const candidates: [number, number][] = [];
    if (x > 0) { if (y > 0) candidates.push([x-1,y-1]); candidates.push([x-1,y]); if (y < 49) candidates.push([x-1,y+1]); }
    if (y > 0) candidates.push([x,y-1]);
    if (y < 49) candidates.push([x,y+1]);
    if (x < 49) { if (y > 0) candidates.push([x+1,y-1]); candidates.push([x+1,y]); if (y < 49) candidates.push([x+1,y+1]); }

    const storage = Game.getObjectById(this.memory.storage) || this.findStorage();
    let creepNearby = false, emptyBlock: [number,number] | null = null;

    for (const [cx, cy] of candidates) {
        const pos = new RoomPosition(cx, cy, rn);
        if (pos.lookFor(LOOK_TERRAIN)[0] === "wall") continue;
        const creepsHere = pos.lookFor(LOOK_CREEPS);
        const structsHere = pos.lookFor(LOOK_STRUCTURES);
        if (creepsHere.length > 0) {
            const c = creepsHere[0];
            if (c.store.getFreeCapacity() === 0 && !["EnergyManager","upgrader","EnergyMiner","repair","filler"].includes(c.memory.role)) {
                if (!storage || (c.pos.getRangeTo(storage) >= this.pos.getRangeTo(storage))) creepNearby = true;
            }
        }
        const isOpen = creepsHere.length === 0 && (structsHere.length === 0 || (structsHere.length === 1 && structsHere[0].structureType === STRUCTURE_ROAD));
        if (isOpen) { emptyBlock = [cx, cy]; if (creepNearby) break; }
    }

    if (creepNearby && emptyBlock) {
        this.moveTo(new RoomPosition(emptyBlock[0], emptyBlock[1], rn));
        return "i moved";
    }
    return false;
};

/** 检查是否在道路上 */
Creep.prototype.roadCheck = function (): boolean {
    return this.pos.lookFor(LOOK_STRUCTURES).some((s: any) => s.structureType === STRUCTURE_ROAD);
};

/** 找到无道路位置 */
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

// ── 逃离相关函数 ─────────────────────────────────────────────────────────────

/** 构建逃离用的 CostMatrix */
function buildFleeCostMatrix(creep: any, room: Room): CostMatrix {
    const isCarrier = creep.memory.role === "carry" || creep.memory.role === "filler";
    const costs = new PathFinder.CostMatrix();
    
    // 地形基础权重
    const terrain = new Room.Terrain(room.name);
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const t = terrain.get(x, y);
            costs.set(x, y,
                t === TERRAIN_MASK_WALL  ? 255 :
                t === TERRAIN_MASK_SWAMP ? (isCarrier ? 1 : 5) : (isCarrier ? 2 : 1)
            );
        }
    }
    
    // 结构物处理
    room.find(FIND_STRUCTURES).forEach((s: any) => {
        if (s.structureType === STRUCTURE_RAMPART && s.my && s.pos.lookFor(LOOK_STRUCTURES).length === 1) { 
            costs.set(s.pos.x, s.pos.y, 2); return; 
        }
        if (s.structureType === STRUCTURE_ROAD) { 
            costs.set(s.pos.x, s.pos.y, 1); return; 
        }
        if (s.structureType !== STRUCTURE_CONTAINER) costs.set(s.pos.x, s.pos.y, 255);
    });
    
    return costs;
}

/** 远程攻击时从近战单位逃离 */
Creep.prototype.RangedAttackFleeFromMelee = function (fleeTarget: any): void {
    const path = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 3 }, { flee: true });
    if (path.path.length > 0) {
        this.move(this.pos.getDirectionTo(path.path[0]));
    }
};

/** 从近战单位逃离 */
Creep.prototype.fleeFromMelee = function (fleeTarget: Creep): void {
    const costs = buildFleeCostMatrix(this, this.room);
    const path = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 5 }, { flee: true, roomCallback: () => costs });
    if (path.path.length > 0) {
        this.move(this.pos.getDirectionTo(path.path[0]));
    }
};

/** 从远程单位逃离 */
Creep.prototype.fleeFromRanged = function (fleeTarget: Creep): void {
    const costs = buildFleeCostMatrix(this, this.room);
    const path = PathFinder.search(this.pos, { pos: fleeTarget.pos, range: 7 }, { flee: true, roomCallback: () => costs });
    if (path.path.length > 0) {
        this.move(this.pos.getDirectionTo(path.path[0]));
    }
};

// 导出空对象以使此文件成为一个模块
export {};
