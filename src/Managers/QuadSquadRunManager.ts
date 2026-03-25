// Refactored: single pass instead of two identical loops.
// SquadCreepA runs first (sets movement direction), then B/Y/Z follow.
function QuadSquadRunManager(QuadSquadNameList: string[]): void {

    const listA:    string[] = [];
    const listOther: string[] = [];

    // Single pass: clean dead creeps and sort into A vs non-A
    for (const name of QuadSquadNameList) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            continue;
        }
        const creep = Game.creeps[name];
        if (creep.memory.role === undefined) {
            console.log("QuadSquadRunManager: undefined role on", name);
            creep.suicide();
            continue;
        }
        if (creep.memory.role === "SquadCreepA") listA.push(name);
        else                                      listOther.push(name);
    }

    // A moves first so followers have an updated anchor position
    for (const name of listA) {
        global.ROLES[Game.creeps[name].memory.role].run(Game.creeps[name]);
    }
    for (const name of listOther) {
        global.ROLES[Game.creeps[name].memory.role].run(Game.creeps[name]);
    }
}

export default QuadSquadRunManager;
