function mosquito_manager() {
  if (Game.cpu.bucket < 1500) return;
  if(!Memory.e) Memory.e = {mosquito: []};

  for (const u of Memory.e.mosquito) {
    if (u.ts > 0) {
      /** @param {string} roomName */
      function findClosestRooms(roomName) {
        const range = 5;
        let myRoomNames = ["E45N59","E49N59","E49N58","E51N54","E41N58","E42N59"];
        myRoomNames = _.shuffle(myRoomNames);

        /** @type {Array<Room>} */
        const myRooms = [];
        for (const myRoomName of myRoomNames) {
          if (Game.map.getRoomLinearDistance(roomName, myRoomName) > range) {
            continue;
          }
          const room = Game.rooms[myRoomName];
          const storage = room.storage;
          const terminal = room.terminal;
          if (room && storage && terminal && room.controller && room.controller.my && room.controller.level === 8) {
            if (
              storage.store[RESOURCE_ENERGY] >= 10000
            )
              myRooms.push(room);
          }
        }


        const closestRooms = myRooms.sort((a, b) => {
          const distanceA = Game.map.getRoomLinearDistance(roomName, a.name);
          const distanceB = Game.map.getRoomLinearDistance(roomName, b.name);
          return distanceA - distanceB;
        });
        return closestRooms.slice(0, 3);
      }

      const closestRooms = findClosestRooms(u.n);
      for (const closestRoom of closestRooms) {
        if (u.ts > 0) {
          if (global.spawn_mosquito(closestRoom.name, u.n)) {
            u.ts--;
            continue;
          }
        }
      }
    }
  }
}

export default mosquito_manager
