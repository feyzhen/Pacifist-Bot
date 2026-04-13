// ─────────────────────────────────────────────────────────────────────────────
// rooms.labs.ts  –  Refactored
//
// Changes vs original (962 lines → ~260 lines):
//  1. Lab position discovery: 10 nearly-identical 12-line blocks → data table
//     + single findLabAtPositions() helper
//  2. Lab variable lookup: 10 individual if/getObjectById → labObjects() loop
//  3. Reaction runner: 8 individual if blocks → single runOutputLabs() loop
//  4. Removed ~200 lines of commented-out dead code
// ─────────────────────────────────────────────────────────────────────────────

// ── Lab keys for dynamic discovery from auto-planner ───────────────────────────
const LAB_KEYS = [
    "inputLab1", "inputLab2",
    "outputLab1", "outputLab2", "outputLab3", "outputLab4",
    "outputLab5", "outputLab6", "outputLab7", "outputLab8"
];

function findLabAtPos(room: Room, x: number, y: number): string | undefined {
    if (x < 0 || x > 49 || y < 0 || y > 49) return undefined;
    const pos = new RoomPosition(x, y, room.name);
    const lab = pos.lookFor(LOOK_STRUCTURES).find((s: any) => s.structureType === STRUCTURE_LAB) as any;
    return lab?.id;
}

function discoverLabs(room: Room): void {
    // Check if auto-planner layout data exists
    if (!Memory.roomPlanner?.[room.name]?.layout?.[STRUCTURE_LAB]) {
        console.log(`[Labs] 房间 ${room.name} 没有自动建造布局数据，跳过 lab 发现`);
        return;
    }

    const labPositions = Memory.roomPlanner[room.name].layout[STRUCTURE_LAB];
    const totalLabs = labPositions.length;

    if (totalLabs < 2) {
        console.log(`[Labs] 房间 ${room.name} 的自动布局 lab 数量不足 (需要至少2个，实际${totalLabs}个)`);
        return;
    }

    // Find all actually built labs from the planned positions
    const builtLabs: Array<{x: number, y: number, id: string}> = [];
    for (const pos of labPositions) {
        const labId = findLabAtPos(room, pos.x, pos.y);
        if (labId) {
            builtLabs.push({ x: pos.x, y: pos.y, id: labId });
        }
    }

    if (builtLabs.length < 2) {
        console.log(`[Labs] 房间 ${room.name} 实际建成的 labs 数量不足 (规划${totalLabs}个，实际建成${builtLabs.length}个)`);
        return;
    }

    // Dynamic assignment: first 2 built labs as input labs, rest as output labs
    const inputLab1 = builtLabs[0];
    const inputLab2 = builtLabs[1];
    const outputLabs = builtLabs.slice(2);

    room.memory.labs.inputLab1 = inputLab1.id;
    room.memory.labs.inputLab2 = inputLab2.id;

    console.log(`[Labs] inputLab1 位置 (${inputLab1.x}, ${inputLab1.y}) → ${inputLab1.id}`);
    console.log(`[Labs] inputLab2 位置 (${inputLab2.x}, ${inputLab2.y}) → ${inputLab2.id}`);

    // Set output labs (max 8)
    const outputLabKeys = ["outputLab1", "outputLab2", "outputLab3", "outputLab4",
                           "outputLab5", "outputLab6", "outputLab7", "outputLab8"];
    for (let i = 0; i < outputLabs.length && i < 8; i++) {
        room.memory.labs[outputLabKeys[i]] = outputLabs[i].id;
        console.log(`[Labs] ${outputLabKeys[i]} 位置 (${outputLabs[i].x}, ${outputLabs[i].y}) → ${outputLabs[i].id}`);
    }

    console.log(`[Labs] 房间 ${room.name} 动态分配 labs: 规划${totalLabs}个，实际建成${builtLabs.length}个 (2 input, ${outputLabs.length} output)`);
}

/** Resolve all cached lab IDs into live objects (undefined if destroyed). */
function labObjects(mem: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key of LAB_KEYS) {
        if (mem[key]) result[key] = Game.getObjectById(mem[key]) ?? undefined;
    }
    return result;
}

// ── Recipe decision (unchanged logic, just de-duplicated) ─────────────────────
function pickRecipe(room: Room, currentOutput: string | false): [any, any, any] {
    const st: any = Game.getObjectById(room.memory.Structures.storage) || room.storage;
    const t: any  = room.terminal;
    if (!st || !t) return [undefined, undefined, undefined];

    // Helper: combined stock across storage + terminal
    const stock = (res: string) => (st.store[res] ?? 0) + (t.store[res] ?? 0);
    const has   = (res: string, min = 1000) => stock(res) >= min;

    type Recipe = [string, string, string]; // [lab1, lab2, output]

    // Priority-ordered list of reactions to attempt
    const recipes: Array<[Recipe, () => boolean]> = [
        // Hydroxide
        [[RESOURCE_OXYGEN, RESOURCE_HYDROGEN, RESOURCE_HYDROXIDE],
            () => (st.store[RESOURCE_HYDROXIDE] < (currentOutput === RESOURCE_HYDROXIDE ? 10000 : 1000)) && has(RESOURCE_OXYGEN) && has(RESOURCE_HYDROGEN)],
        // Lemergium Hydride → Acid → Catalyzed
        [[RESOURCE_LEMERGIUM, RESOURCE_HYDROGEN, RESOURCE_LEMERGIUM_HYDRIDE],
            () => (st.store[RESOURCE_LEMERGIUM_HYDRIDE] < (currentOutput === RESOURCE_LEMERGIUM_HYDRIDE ? 3000 : 1000)) && has(RESOURCE_LEMERGIUM) && has(RESOURCE_HYDROGEN)],
        [[RESOURCE_HYDROXIDE, RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_LEMERGIUM_ACID],
            () => (st.store[RESOURCE_LEMERGIUM_ACID] < (currentOutput === RESOURCE_LEMERGIUM_ACID ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_LEMERGIUM_HYDRIDE)],
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ACID] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ACID)],
        // Utrium Hydride → Acid → Catalyzed
        [[RESOURCE_UTRIUM, RESOURCE_HYDROGEN, RESOURCE_UTRIUM_HYDRIDE],
            () => (st.store[RESOURCE_UTRIUM_HYDRIDE] < (currentOutput === RESOURCE_UTRIUM_HYDRIDE ? 3000 : 1000)) && has(RESOURCE_UTRIUM) && has(RESOURCE_HYDROGEN)],
        [[RESOURCE_HYDROXIDE, RESOURCE_UTRIUM_HYDRIDE, RESOURCE_UTRIUM_ACID],
            () => (st.store[RESOURCE_UTRIUM_ACID] < (currentOutput === RESOURCE_UTRIUM_ACID ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_UTRIUM_HYDRIDE)],
        [[RESOURCE_CATALYST, RESOURCE_UTRIUM_ACID, RESOURCE_CATALYZED_UTRIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_UTRIUM_ACID] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_UTRIUM_ACID)],
        // Zynthium Oxide → Alkalide → Catalyzed
        [[RESOURCE_OXYGEN, RESOURCE_ZYNTHIUM, RESOURCE_ZYNTHIUM_OXIDE],
            () => (st.store[RESOURCE_ZYNTHIUM_OXIDE] < (currentOutput === RESOURCE_ZYNTHIUM_OXIDE ? 3000 : 1000)) && has(RESOURCE_OXYGEN) && has(RESOURCE_ZYNTHIUM)],
        [[RESOURCE_HYDROXIDE, RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_ZYNTHIUM_ALKALIDE],
            () => (st.store[RESOURCE_ZYNTHIUM_ALKALIDE] < (currentOutput === RESOURCE_ZYNTHIUM_ALKALIDE ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_ZYNTHIUM_OXIDE)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ALKALIDE)],
        // Lemergium Oxide → Alkalide → Catalyzed
        [[RESOURCE_LEMERGIUM, RESOURCE_OXYGEN, RESOURCE_LEMERGIUM_OXIDE],
            () => (st.store[RESOURCE_LEMERGIUM_OXIDE] < (currentOutput === RESOURCE_LEMERGIUM_OXIDE ? 3000 : 1000)) && has(RESOURCE_LEMERGIUM) && has(RESOURCE_OXYGEN)],
        [[RESOURCE_HYDROXIDE, RESOURCE_LEMERGIUM_OXIDE, RESOURCE_LEMERGIUM_ALKALIDE],
            () => (st.store[RESOURCE_LEMERGIUM_ALKALIDE] < (currentOutput === RESOURCE_LEMERGIUM_ALKALIDE ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_LEMERGIUM_OXIDE)],
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ALKALIDE)],
        // Ghodium chain
        [[RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM_KEANITE],
            () => (st.store[RESOURCE_ZYNTHIUM_KEANITE] < (currentOutput === RESOURCE_ZYNTHIUM_KEANITE ? 3000 : 1000)) && has(RESOURCE_ZYNTHIUM) && has(RESOURCE_KEANIUM)],
        [[RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_UTRIUM_LEMERGITE],
            () => (st.store[RESOURCE_UTRIUM_LEMERGITE] < (currentOutput === RESOURCE_UTRIUM_LEMERGITE ? 3000 : 1000)) && has(RESOURCE_UTRIUM) && has(RESOURCE_LEMERGIUM)],
        [[RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE, RESOURCE_GHODIUM],
            () => (st.store[RESOURCE_GHODIUM] < (currentOutput === RESOURCE_GHODIUM ? 20000 : 10000)) && has(RESOURCE_ZYNTHIUM_KEANITE) && has(RESOURCE_UTRIUM_LEMERGITE)],
        [[RESOURCE_GHODIUM, RESOURCE_OXYGEN, RESOURCE_GHODIUM_OXIDE],
            () => (st.store[RESOURCE_GHODIUM_OXIDE] < (currentOutput === RESOURCE_GHODIUM_OXIDE ? 3000 : 1000)) && has(RESOURCE_GHODIUM) && has(RESOURCE_OXYGEN)],
        [[RESOURCE_GHODIUM_OXIDE, RESOURCE_HYDROXIDE, RESOURCE_GHODIUM_ALKALIDE],
            () => (st.store[RESOURCE_GHODIUM_ALKALIDE] < (currentOutput === RESOURCE_GHODIUM_ALKALIDE ? 3000 : 1000)) && has(RESOURCE_GHODIUM_OXIDE) && has(RESOURCE_HYDROXIDE)],
        [[RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST, RESOURCE_CATALYZED_GHODIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] < 3000 && has(RESOURCE_GHODIUM_ALKALIDE) && has(RESOURCE_CATALYST)],
        // Keanium Oxide → Alkalide → Catalyzed
        [[RESOURCE_KEANIUM, RESOURCE_OXYGEN, RESOURCE_KEANIUM_OXIDE],
            () => (st.store[RESOURCE_KEANIUM_OXIDE] < (currentOutput === RESOURCE_KEANIUM_OXIDE ? 3000 : 1000)) && has(RESOURCE_KEANIUM) && has(RESOURCE_OXYGEN)],
        [[RESOURCE_HYDROXIDE, RESOURCE_KEANIUM_OXIDE, RESOURCE_KEANIUM_ALKALIDE],
            () => (st.store[RESOURCE_KEANIUM_ALKALIDE] < (currentOutput === RESOURCE_KEANIUM_ALKALIDE ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_KEANIUM_OXIDE)],
        [[RESOURCE_CATALYST, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_KEANIUM_ALKALIDE)],
        // Keanium Hydride → Acid → Catalyzed
        [[RESOURCE_HYDROGEN, RESOURCE_KEANIUM, RESOURCE_KEANIUM_HYDRIDE],
            () => (st.store[RESOURCE_KEANIUM_HYDRIDE] < (currentOutput === RESOURCE_KEANIUM_HYDRIDE ? 3000 : 1000)) && has(RESOURCE_HYDROGEN) && has(RESOURCE_KEANIUM)],
        [[RESOURCE_HYDROXIDE, RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_ACID],
            () => (st.store[RESOURCE_KEANIUM_ACID] < (currentOutput === RESOURCE_KEANIUM_ACID ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_KEANIUM_HYDRIDE)],
        [[RESOURCE_CATALYST, RESOURCE_KEANIUM_ACID, RESOURCE_CATALYZED_KEANIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_KEANIUM_ACID] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_KEANIUM_ACID)],
        // Zynthium Hydride → Acid → Catalyzed
        [[RESOURCE_HYDROGEN, RESOURCE_ZYNTHIUM, RESOURCE_ZYNTHIUM_HYDRIDE],
            () => (st.store[RESOURCE_ZYNTHIUM_HYDRIDE] < (currentOutput === RESOURCE_ZYNTHIUM_HYDRIDE ? 3000 : 1000)) && has(RESOURCE_HYDROGEN) && has(RESOURCE_ZYNTHIUM)],
        [[RESOURCE_HYDROXIDE, RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_ACID],
            () => (st.store[RESOURCE_ZYNTHIUM_ACID] < (currentOutput === RESOURCE_ZYNTHIUM_ACID ? 3000 : 1000)) && has(RESOURCE_HYDROXIDE) && has(RESOURCE_ZYNTHIUM_HYDRIDE)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYZED_ZYNTHIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ACID] < 10000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ACID)],
        // Utrium Oxide (miner efficiency)
        [[RESOURCE_OXYGEN, RESOURCE_UTRIUM, RESOURCE_UTRIUM_OXIDE],
            () => (st.store[RESOURCE_UTRIUM_OXIDE] < (currentOutput === RESOURCE_UTRIUM_OXIDE ? 40000 : 1000)) && has(RESOURCE_OXYGEN) && has(RESOURCE_UTRIUM)],
        // 40K top-up rounds
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ACID] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ACID)],
        [[RESOURCE_CATALYST, RESOURCE_UTRIUM_ACID, RESOURCE_CATALYZED_UTRIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_UTRIUM_ACID] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_UTRIUM_ACID)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_KEANIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYZED_ZYNTHIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ACID] < 40000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ACID)],
        [[RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST, RESOURCE_CATALYZED_GHODIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] < 40000 && has(RESOURCE_GHODIUM_ALKALIDE) && has(RESOURCE_CATALYST)],
        // 50-75K stockpile
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ACID] < 75000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ACID)],
        [[RESOURCE_CATALYST, RESOURCE_UTRIUM_ACID, RESOURCE_CATALYZED_UTRIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_UTRIUM_ACID] < 55000 && has(RESOURCE_CATALYST) && has(RESOURCE_UTRIUM_ACID)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] < 50000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE] < 55000 && has(RESOURCE_CATALYST) && has(RESOURCE_LEMERGIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_KEANIUM_ALKALIDE] < 55000 && has(RESOURCE_CATALYST) && has(RESOURCE_KEANIUM_ALKALIDE)],
        [[RESOURCE_CATALYST, RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYZED_ZYNTHIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_ZYNTHIUM_ACID] < 35000 && has(RESOURCE_CATALYST) && has(RESOURCE_ZYNTHIUM_ACID)],
        [[RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST, RESOURCE_CATALYZED_GHODIUM_ALKALIDE],
            () => st.store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] < 35000 && has(RESOURCE_GHODIUM_ALKALIDE) && has(RESOURCE_CATALYST)],
        [[RESOURCE_CATALYST, RESOURCE_KEANIUM_ACID, RESOURCE_CATALYZED_KEANIUM_ACID],
            () => st.store[RESOURCE_CATALYZED_KEANIUM_ACID] < 25000 && has(RESOURCE_CATALYST) && has(RESOURCE_KEANIUM_ACID)],
    ];

    for (const [[r1, r2, out], condition] of recipes) {
        if (condition()) return [r1, r2, out];
    }
    return [undefined, undefined, undefined];
}

// ── Run output labs (8 individual blocks → single loop) ───────────────────────
function runOutputLabs(room: Room, labs: Record<string, any>, inputLab1: any, inputLab2: any, lab1Input: any, lab2Input: any): void {
    // if (Game.cpu.bucket <= 4500) return;
    if (!inputLab1 || !inputLab2 || !lab1Input || !lab2Input) return;

    const inputsReady = inputLab1.store[lab1Input] >= 5 && inputLab2.store[lab2Input] >= 5;
    if (!inputsReady) return;

    const labKeys = ["outputLab1","outputLab2","outputLab3","outputLab4","outputLab5","outputLab6","outputLab7","outputLab8"];
    for (let i = 0; i < labKeys.length; i++) {
        const lab: any = labs[labKeys[i]];
        if (!lab || lab.cooldown !== 0 || lab.store.getFreeCapacity() === 0) continue;

        const labNum = `lab${i + 1}`;
        const boost   = room.memory.labs?.status?.boost;
        const boostSlot = boost?.[labNum];

        // Don't run reaction if the lab is reserved for boosting
        const reserved = boostSlot && boostSlot.use !== 0 && boostSlot.amount > 0;
        if (reserved) continue;

        const paused = room.memory.labs?.paused?.find((p: any) => p.id === lab.id && p.timer > 0);
        if (paused) { paused.timer--; continue; }

        lab.runReaction(inputLab1, inputLab2);
    }
}

// ── Main export ───────────────────────────────────────────────────────────────
function labs(room: Room): void {
    if (!room.memory.labs || Game.time % 120 === 0) {
        if (!room.memory.labs) room.memory.labs = {};
        discoverLabs(room);
    }

    const labMem  = room.memory.labs;
    const labObjs = labObjects(labMem);
    const inputLab1: any = labObjs["inputLab1"];
    const inputLab2: any = labObjs["inputLab2"];

    // Periodic boost-use reset when no combat creeps present
    if (Game.time % 21000 === 0) {
        const spawning = room.find(FIND_MY_SPAWNS).some((s: any) => s.spawning);
        if (!spawning && room.memory.spawn_list.length === 0) {
            const boost = labMem.status?.boost;
            if (boost) {
                const labNums = ["lab1","lab2","lab3","lab4","lab5","lab6","lab7","lab8"];
                const allClear = labNums.every((k) => !boost[k] || boost[k].amount === 0);
                if (allClear) {
                    const combatants = room.find(FIND_MY_CREEPS).filter((c: any) =>
                        c.memory.role === "ram" || c.name.startsWith("SquadCreep") || c.memory.role === "Solomon");
                    if (!combatants.length) labMem.status.boost = {};
                }
            }
        }
    }

    if (!labMem.status)                       labMem.status = {};
    if (!labMem.status.currentOutput)         labMem.status.currentOutput = false;
    if (labMem.status.lab1Input === undefined) labMem.status.lab1Input = false;
    if (labMem.status.lab2Input === undefined) labMem.status.lab2Input = false;

    // Re-pick recipe periodically or when inputs not set
    if (!labMem.status.lab1Input || !labMem.status.lab2Input || !labMem.status.currentOutput || Game.time % 500 === 0) {
        if (room.terminal) {
            const currentOut = labObjs["outputLab1"]?.mineralType ?? false;
            const [r1, r2, out] = pickRecipe(room, currentOut);
            labMem.status.lab1Input     = r1;
            labMem.status.lab2Input     = r2;
            labMem.status.currentOutput = out;
        }
    }

    runOutputLabs(room, labObjs, inputLab1, inputLab2, labMem.status.lab1Input, labMem.status.lab2Input);
}

export default labs;
