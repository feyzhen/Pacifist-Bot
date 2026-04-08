function RunPowerCreepManager() {

for(const name in Game.powerCreeps) {
    if(name.startsWith("efficient")) {
        const creep = Game.powerCreeps[name];
        if(creep && creep.ticksToLive) {
        global.ROLES["efficient"].run(creep);
        }
    }
}

}

export default RunPowerCreepManager;
