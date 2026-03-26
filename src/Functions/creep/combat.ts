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
Creep.prototype.Boost = function Boost(): any {
    if (!this.memory.boostlabs?.length) return;

    const labs = this.memory.boostlabs.map((id: string) => Game.getObjectById(id)).filter(Boolean);
    const closestLab: any = this.pos.findClosestByRange(labs);
    if (!closestLab) return;

    if (closestLab.mineralAmount < 30) {
        if (this.ticksToLive < 1100 && this.getActiveBodyparts(CLAIM) === 0)
            this.memory.boostlabs = this.memory.boostlabs.filter((id: string) => id !== closestLab.id);
        this.MoveCostMatrixRoadPrio(closestLab, 3);
        return;
    }

    if (!this.pos.isNearTo(closestLab)) { this.MoveCostMatrixRoadPrio(closestLab, 1); return false; }

    const result = closestLab.boostCreep(this);
    if (result === 0) {
        // 减少实验室使用计数器 — 循环替换8个if/else-if块
        const labKeys = ["outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
        for (let i = 0; i < labKeys.length; i++) {
            const key = labKeys[i] as string;
            const labNum = `lab${i + 1}`;
            if (this.room.memory.labs?.[key] === closestLab.id && this.room.memory.labs?.status?.boost?.[labNum]?.use) {
                this.room.memory.labs.status.boost[labNum].use -= 1;
                if (i === 7 && this.room.memory.labs.status.boost[labNum].use === 0 && this.memory.role === "EnergyMiner")
                    this.room.memory.labs.lab8reserved = false;
                break;
            }
        }
        this.memory.boostlabs = this.memory.boostlabs.filter((id: string) => id !== closestLab.id);
        return true;
    }
    console.log("Boost result:", result);
};

/** 疏散creep以避免核弹攻击 */
Creep.prototype.evacuate = function evacuate(): any {
    const mem = this.room.memory;
    if (!(mem.defence?.nuke && mem.defence?.evacuate) && !this.memory.nukeHaven) return false;

    if (!this.memory.nukeTimer) {
        const nukes = this.room.find(FIND_NUKES).filter((n: any) => n.timeToLand < 300);
        if (nukes.length) { nukes.sort((a: any, b: any) => a.timeToLand - b.timeToLand); this.memory.nukeTimer = nukes[0].timeToLand + 1; }
    }
    if (!this.memory.homeRoom) this.memory.homeRoom = this.room.name;
    if (this.memory.nukeTimer > 0) this.memory.nukeTimer--;

    if (this.memory.nukeTimer > 0) {
        if (!this.memory.nukeHaven) {
            const adjacent = Object.values(Game.map.describeExits(this.room.name))
                .filter((rn: any) => Game.map.getRoomStatus(rn).status === Game.map.getRoomStatus(this.room.name).status);
            this.memory.nukeHaven = adjacent[Math.floor(Math.random() * adjacent.length)];
        }
        if (this.memory.nukeHaven) this.moveToRoom(this.memory.nukeHaven);
    } else {
        if (this.room.name === this.memory.homeRoom) return false;
        this.moveToRoom(this.memory.homeRoom); return true;
    }
    return true;
};

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

// 导出空对象以使此文件成为一个模块
export {};
