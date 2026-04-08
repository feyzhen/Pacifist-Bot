function find_exposed_creeps(pos: RoomPosition, hostileCreeps: Array<Creep>): Array<Creep> {
  const exposedHostiles: Array<Creep> = [];
  hostileCreeps.forEach(Hostile => {
    const range = pos.getRangeTo(Hostile);
    if (range > 3) return;
    const structures = Hostile.pos.lookFor(LOOK_STRUCTURES);
    const ramparts = structures.filter(s => s.structureType === STRUCTURE_RAMPART);
    if (ramparts.length && ramparts[0].hits > 1000) return;
    exposedHostiles.push(Hostile);
  });
  return exposedHostiles;
}

export default find_exposed_creeps;
