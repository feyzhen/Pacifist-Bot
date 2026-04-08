function find_exposed_structs(pos: RoomPosition, structures: Array<Structure>): Array<Structure> {
  const exposedStructs: Array<Structure> = [];
  structures.forEach(struct => {
    const range = pos.getRangeTo(struct);
    if (range > 3) return;
    const structures = struct.pos.lookFor(LOOK_STRUCTURES);
    const ramparts = structures.filter(s => s.structureType === STRUCTURE_RAMPART);
    if (ramparts.length && ramparts[0].hits > 1000) return;
    exposedStructs.push(struct);
  });
  return exposedStructs;
}

export default find_exposed_structs;
