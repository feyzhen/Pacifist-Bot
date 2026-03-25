// ─────────────────────────────────────────────────────────────────────────────
// Squad Helper Functions
// Refactored: replaced 3 near-identical roomCallback functions with a single
// parameterised builder.  614 lines → ~160 lines, behaviour identical.
// ─────────────────────────────────────────────────────────────────────────────

interface SquadCostMatrixOptions {
    swampCost: number;
    borderCost: number;
    softBlockNonSquadCreeps: boolean;
    penaliseEnemyStructures: boolean;
}

/** Set the same weight on all four tiles of a 2×2 quad (top-left = x,y). */
function setQuadCost(costs: CostMatrix, x: number, y: number, weight: number): void {
    costs.set(x,     y,     weight);
    costs.set(x - 1, y,     weight);
    costs.set(x - 1, y - 1, weight);
    costs.set(x,     y - 1, weight);
}

function buildSquadCostMatrix(roomName: string, opts: SquadCostMatrixOptions): boolean | CostMatrix {
    const room = Game.rooms[roomName];
    if (!room) return false;

    const costs   = new PathFinder.CostMatrix();
    const terrain = new Room.Terrain(roomName);

    // Interior tiles
    for (let y = 1; y < 49; y++) {
        for (let x = 1; x < 49; x++) {
            const tile = terrain.get(x, y);
            let weight: number;

            if (tile === TERRAIN_MASK_WALL) {
                weight = 255;
            } else if (tile === TERRAIN_MASK_SWAMP) {
                weight = opts.swampCost;
            } else {
                weight = (
                    terrain.get(x + 1, y)     === TERRAIN_MASK_SWAMP ||
                    terrain.get(x + 1, y + 1) === TERRAIN_MASK_SWAMP ||
                    terrain.get(x,     y + 1) === TERRAIN_MASK_SWAMP
                ) ? opts.swampCost : 0;
            }

            if (weight !== 255) {
                for (const n of [terrain.get(x+1,y), terrain.get(x,y+1), terrain.get(x+1,y+1)]) {
                    if (n === TERRAIN_MASK_WALL) { weight = 255; break; }
                }
            }
            costs.set(x, y, weight);
        }
    }

    // Structures
    room.find(FIND_STRUCTURES).forEach((struct: any) => {
        if (
            struct.structureType === STRUCTURE_ROAD      ||
            struct.structureType === STRUCTURE_CONTAINER ||
            (struct.structureType === STRUCTURE_RAMPART && struct.my)
        ) return;

        const { x, y } = struct.pos;

        if (struct.my) {
            setQuadCost(costs, x, y, 255);
        } else if (struct.structureType !== STRUCTURE_CONTROLLER) {
            if (opts.penaliseEnemyStructures) {
                const pairs: [number,number][] = [[x,y],[x-1,y],[x-1,y-1],[x,y-1]];
                for (const [cx,cy] of pairs) {
                    if (costs.get(cx, cy) !== 255)
                        costs.set(cx, cy, costs.get(cx, cy) === 60 ? 120 : 60);
                }
            } else {
                const pairs: [number,number][] = [[x,y],[x-1,y],[x-1,y-1],[x,y-1]];
                for (const [cx,cy] of pairs) {
                    costs.set(cx, cy, costs.get(cx,cy) !== 255 ? 100 : 255);
                }
            }
        } else {
            if (!opts.penaliseEnemyStructures) {
                setQuadCost(costs, x, y, (struct.hits ?? Infinity) < 50000 ? 100 : 255);
            } else {
                setQuadCost(costs, x, y, 255);
            }
        }
    });

    // Non-squad creeps
    room.find(FIND_CREEPS).forEach((creep) => {
        const isSquadMember = creep.my &&
            creep.memory.role !== "carry" &&
            ["SquadCreepA","SquadCreepB","SquadCreepY","SquadCreepZ"].includes(creep.memory.role);
        if (isSquadMember) return;

        const { x, y } = creep.pos;
        if (opts.softBlockNonSquadCreeps) {
            const allCheap = costs.get(x,y)<=5 && costs.get(x-1,y)<=5 && costs.get(x-1,y-1)<=5 && costs.get(x,y-1)<=5;
            setQuadCost(costs, x, y, allCheap ? 10 : 255);
        } else {
            setQuadCost(costs, x, y, 255);
        }
    });

    // Border tiles
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            if (x !== 0 && x !== 49 && y !== 0 && y !== 49) continue;
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) { costs.set(x,y,255); continue; }

            let blocked = false;
            if (y === 49 && terrain.get(x+1, y) === TERRAIN_MASK_WALL) blocked = true;
            if (y === 0  && terrain.get(x+1, y) === TERRAIN_MASK_WALL) blocked = true;
            if (x === 49 && terrain.get(x, y+1) === TERRAIN_MASK_WALL) blocked = true;
            if (x === 0  && terrain.get(x, y+1) === TERRAIN_MASK_WALL) blocked = true;
            costs.set(x, y, blocked ? 255 : opts.borderCost);
        }
    }

    return costs;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Standard attack movement: penalise swamps, soft-block non-squad creeps. */
const roomCallbackSquadA = (roomName: string): boolean | CostMatrix =>
    buildSquadCostMatrix(roomName, { swampCost:5, borderCost:5,  softBlockNonSquadCreeps:true,  penaliseEnemyStructures:true  });

/** Swamp-cost-same: treat swamp as plain (for faster rush routes). */
const roomCallbackSquadASwampCostSame = (roomName: string): boolean | CostMatrix =>
    buildSquadCostMatrix(roomName, { swampCost:1, borderCost:3,  softBlockNonSquadCreeps:true,  penaliseEnemyStructures:true  });

/** Get-ready / staging: hard-block non-squad creeps, softer on enemy structures. */
const roomCallbackSquadGetReady = (roomName: string): boolean | CostMatrix =>
    buildSquadCostMatrix(roomName, { swampCost:5, borderCost:15, softBlockNonSquadCreeps:false, penaliseEnemyStructures:false });

export { roomCallbackSquadA, roomCallbackSquadASwampCostSame, roomCallbackSquadGetReady };
