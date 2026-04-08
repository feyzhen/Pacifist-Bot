const run = function (creep: Creep) {
    creep.memory.moving = false;
    if (creep.memory.boostlabs && creep.memory.boostlabs.length > 0) {
      const result = creep.Boost();
      if (!result) {
        return;
      }
    }

  if (creep.memory.targetRoom && creep.room.name !== creep.memory.targetRoom) {
    if (creep.hits !== creep.hitsMax) creep.heal(creep);
    const hostileCreepsInRange3 = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
    if (hostileCreepsInRange3.length) {
      const closestEnemy = creep.pos.findClosestByRange(hostileCreepsInRange3);
      if (closestEnemy) {
        const range = creep.pos.getRangeTo(closestEnemy);
        if (range <= 3) {
          creep.heal(creep);
          if (range === 1) creep.rangedMassAttack();
          else creep.rangedAttack(closestEnemy);
        }
      }
    }
    if (creep.memory.boostlabs?.length > 0) return;
    return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
  }
};

const mosquito = {
  run
};

export default mosquito;
