/**
 * A little description of this function
 * @param {Creep} creep
 **/
const run = function (creep) {

    if(creep.memory.suicide) {
        creep.recycle();
        return;
    }

    if (
      creep.room.controller &&
      creep.room.controller.my &&
      (!creep.room.controller.sign ||
        creep.room.controller.sign.text !==
          "种田流,请勿攻击。I'm a peace lover.Please don't attack me.Tell me if you need any room I claimed.")
    ) {
      if (creep.pos.isNearTo(creep.room.controller)) {
        creep.signController(
          creep.room.controller,
          "种田流,请勿攻击。I'm a peace lover.Please don't attack me.Tell me if you need any room I claimed."
        );
      } else {
        creep.MoveCostMatrixIgnoreRoads(creep.room.controller, 1);
      }
    } else {
      creep.memory.suicide = true;
    }
}


const roleSign = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleSign;
