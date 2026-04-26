// 扩展RoomMemory接口以支持布局系统
interface RoomMemory {
  layoutEnabled?: boolean;
  [key: string]: any;
}

function getNeighbours(tile, listOfLocations) {
  const neighbours = [];
  listOfLocations.forEach(function (delta) {
    neighbours.push({ x: tile.x + delta[0], y: tile.y + delta[1] });
  });
  return neighbours;
}

/**
 * 检查 rampart 是否在保护重要建筑
 * @param rampartPos rampart 位置
 * @param room 房间对象
 * @returns 是否在保护重要建筑
 */
function isProtectingImportantBuilding(rampartPos: RoomPosition, room: Room): boolean {
  // 检查 rampart 位置是否有除 rampart、road 以外的建筑物
  const structures = rampartPos.lookFor(LOOK_STRUCTURES);
  for (const structure of structures) {
    // 排除 rampart 和 road，其他建筑物都值得保护
    if (structure.structureType !== STRUCTURE_RAMPART && 
        structure.structureType !== STRUCTURE_ROAD) {
      return true; // 有需要保护的建筑
    }
  }
  
  // 检查是否在 source 附近（2格范围内）
  const sources = room.find(FIND_SOURCES);
  for (const source of sources) {
    if (rampartPos.getRangeTo(source) <= 2) {
      return true; // 在 source 采集范围内
    }
  }
  
  // 检查是否在 controller 附近
  if (room.controller && rampartPos.getRangeTo(room.controller) <= 2) {
    return true; // 在 controller 范围内
  }
  
  return false;
}

function pathBuilder(neighbors, structure, room, usingPathfinder = true) {
  const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
  let buldingAlreadyHereCount = 0;
  let constructionSitesPlaced = 0;

  const keepTheseRoads = [];

  // RCL 限制：road 和 rampart 只能在 RCL > 3 时建造
  if ((structure === STRUCTURE_ROAD || structure === STRUCTURE_RAMPART) && 
      room.controller.level <= 3) {
    return 0;
  }

  if (structure == STRUCTURE_RAMPART && !usingPathfinder) {
    const listOfRampartPositions = [];

    const positionArray = [];
    _.forEach(neighbors, function (block) {
      positionArray.push(new RoomPosition(block.x, block.y, room.name));
    });
    positionArray.sort(
      (a, b) =>
        a.findPathTo(storage, { ignoreCreeps: true }).length - b.findPathTo(storage, { ignoreCreeps: true }).length
    );
    _.forEach(positionArray, function (blockSpot) {
      new RoomVisual(blockSpot.roomName).circle(blockSpot.x, blockSpot.y, {
        fill: "transparent",
        radius: 0.25,
        stroke: "#000000"
      });
      const lookForExistingConstructionSites = blockSpot.lookFor(LOOK_CONSTRUCTION_SITES);
      const lookForExistingStructures = blockSpot.lookFor(LOOK_STRUCTURES);
      const lookForTerrain = blockSpot.lookFor(LOOK_TERRAIN);

      // 检查现有 rampart 的血量，用于后续拆除决策
      let existingRampart = null;
      let existingRampartHits = 0;
      
      for (const building of lookForExistingStructures) {
        if (building.structureType === STRUCTURE_RAMPART) {
          existingRampart = building;
          existingRampartHits = building.hits;
          break;
        }
      }

      if (lookForExistingConstructionSites.length > 0) {
        return;
      }

      if (lookForTerrain[0] != "swamp" && lookForTerrain[0] != "plain") {
        return;
      }

      const pathFromRampartToStorage = PathFinder.search(
        blockSpot,
        { pos: storage.pos, range: 1 },
        { plainCost: 1, swampCost: 2, maxCost: 50, roomCallback: () => RampartBorderCallbackFunction(room.name) }
      );

      if (pathFromRampartToStorage.incomplete) {
        return;
      }

      const exits = Game.map.describeExits(room.name);
      let incomplete = true;
      if (exits[1] && incomplete) {
        const positionInRoom = new RoomPosition(25, 25, exits[1]);
        const pathFromRampartToOtherRoom = PathFinder.search(
          blockSpot,
          { pos: positionInRoom, range: 22 },
          { plainCost: 1, swampCost: 1, maxCost: 100, roomCallback: () => RampartBorderCallbackFunction(room.name) }
        );

        if (!pathFromRampartToOtherRoom.incomplete) {
          incomplete = false;
        }
      }

      if (exits[3] && incomplete) {
        const positionInRoom = new RoomPosition(25, 25, exits[3]);
        const pathFromRampartToOtherRoom = PathFinder.search(
          blockSpot,
          { pos: positionInRoom, range: 22 },
          { plainCost: 1, swampCost: 1, maxCost: 100, roomCallback: () => RampartBorderCallbackFunction(room.name) }
        );

        if (!pathFromRampartToOtherRoom.incomplete) {
          incomplete = false;
        }
      }

      if (exits[5] && incomplete) {
        const positionInRoom = new RoomPosition(25, 25, exits[5]);
        const pathFromRampartToOtherRoom = PathFinder.search(
          blockSpot,
          { pos: positionInRoom, range: 22 },
          { plainCost: 1, swampCost: 1, maxCost: 100, roomCallback: () => RampartBorderCallbackFunction(room.name) }
        );

        if (!pathFromRampartToOtherRoom.incomplete) {
          incomplete = false;
        }
      }
      if (exits[7] && incomplete) {
        const positionInRoom = new RoomPosition(25, 25, exits[7]);
        const pathFromRampartToOtherRoom = PathFinder.search(
          blockSpot,
          { pos: positionInRoom, range: 22 },
          { plainCost: 1, swampCost: 1, maxCost: 100, roomCallback: () => RampartBorderCallbackFunction(room.name) }
        );

        if (!pathFromRampartToOtherRoom.incomplete) {
          incomplete = false;
        }
      }

      if (incomplete) {
        if (existingRampart) {
          // 检查是否是关键建筑的保护 rampart
          const isProtectingCriticalStructure = isProtectingImportantBuilding(existingRampart.pos, room);
          
          if (isProtectingCriticalStructure) {
            console.log(`[Rampart Layout] 保留关键建筑保护 rampart (${existingRampartHits} hits) 在 (${existingRampart.pos.x},${existingRampart.pos.y})`);
            return; // 永远不拆除关键建筑的保护 rampart
          }
          
          // 拆除决策：考虑血量因素
          // 高血量 rampart：保留，不拆除（避免资源浪费）
          if (existingRampartHits > 5000000) {
            console.log(`[Rampart Layout] 保留高血量 rampart (${existingRampartHits} hits) 在 (${existingRampart.pos.x},${existingRampart.pos.y})`);
            return;
          }
          // 中等血量 rampart：保留，让 maintainer 修复
          if (existingRampartHits >= 10000) {
            console.log(`[Rampart Layout] 保留中等血量 rampart (${existingRampartHits} hits) 在 (${existingRampart.pos.x},${existingRampart.pos.y}) - 让 maintainer 修复`);
            return;
          }
          // 低血量 rampart：拆除（资源成本低）
          console.log(`[Rampart Layout] 拆除低血量 rampart (${existingRampartHits} hits) 在 (${existingRampart.pos.x},${existingRampart.pos.y}) - 位置不合适`);
          existingRampart.destroy();
        }
        return;
      }

      if (lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART) {
        return;
      }

      if (lookForExistingStructures.length == 0) {
        listOfRampartPositions.push([blockSpot.x, blockSpot.y]);
        // blockSpot.createConstructionSite(structure);
        return;
      }
      if (
        lookForExistingStructures.length == 1 &&
        lookForExistingStructures[0].structureType != STRUCTURE_RAMPART &&
        blockSpot.findPathTo(storage, { ignoreCreeps: true }).length <= 14
      ) {
        // blockSpot.createConstructionSite(structure);
        listOfRampartPositions.push([blockSpot.x, blockSpot.y]);
        return;
      }
      if (
        lookForExistingStructures.length == 2 &&
        lookForExistingStructures[0].structureType != STRUCTURE_RAMPART &&
        lookForExistingStructures[1].structureType != STRUCTURE_RAMPART
      ) {
        // blockSpot.createConstructionSite(structure);
        listOfRampartPositions.push([blockSpot.x, blockSpot.y]);
        return;
      }
    });
    room.memory.construction.rampartLocations = listOfRampartPositions;
  }

  if (structure == STRUCTURE_EXTENSION) {
    const rampartsInRoomRange10FromStorage = room.find(FIND_MY_STRUCTURES).filter(function (s) {
      return s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) >= 8 && s.pos.getRangeTo(storage) <= 10;
    });
    _.forEach(neighbors, function (block) {
      if (block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
        return;
      }
      const blockSpot = new RoomPosition(block.x, block.y, room.name);
      const lookForExistingConstructionSites = blockSpot.lookFor(LOOK_CONSTRUCTION_SITES);
      const lookForExistingStructures = blockSpot.lookFor(LOOK_STRUCTURES);
      const lookForTerrain = blockSpot.lookFor(LOOK_TERRAIN);

      const sources = room.find(FIND_SOURCES);

      if (blockSpot.x <= 4 || blockSpot.x >= 45 || blockSpot.y <= 4 || blockSpot.y >= 45) {
        const closestRampart = blockSpot.findClosestByRange(rampartsInRoomRange10FromStorage);
        if (blockSpot.getRangeTo(closestRampart) < 3) {
          return;
        }
      }

      for (const source of sources) {
        if (blockSpot.getRangeTo(source) <= 2) {
          return;
        }
      }

      if (blockSpot.getRangeTo(storage) > 10) {
        return;
      }

      const Mineral: any = Game.getObjectById(room.memory.mineral) || room.findMineral();

      if (blockSpot.getRangeTo(room.controller) <= 3 || blockSpot.getRangeTo(Mineral) <= 1) {
        buldingAlreadyHereCount++;
        return;
      }

      if (blockSpot.getRangeTo(storage) > 10) {
        return;
      }

      if (storage && PathFinder.search(blockSpot, storage.pos).path.length > 11) {
        return;
      }

      if (storage && storage.pos.getRangeTo(blockSpot) == 7) {
        if (blockSpot.x >= storage.pos.x) {
          const lookForTerrainToLeft = new RoomPosition(blockSpot.x - 1, blockSpot.y, room.name).lookFor(LOOK_TERRAIN);
          if (lookForTerrainToLeft[0] == "wall") {
            return;
          }
        }
        if (blockSpot.x <= storage.pos.x) {
          const lookForTerrainToRight = new RoomPosition(blockSpot.x + 1, blockSpot.y, room.name).lookFor(LOOK_TERRAIN);
          if (lookForTerrainToRight[0] == "wall") {
            return;
          }
        }
        if (blockSpot.y >= storage.pos.y) {
          const lookForTerrainToTop = new RoomPosition(blockSpot.x, blockSpot.y - 1, room.name).lookFor(LOOK_TERRAIN);
          if (lookForTerrainToTop[0] == "wall") {
            return;
          }
        }
        if (blockSpot.y <= storage.pos.y) {
          const lookForTerrainToBottom = new RoomPosition(blockSpot.x, blockSpot.y + 1, room.name).lookFor(
            LOOK_TERRAIN
          );
          if (lookForTerrainToBottom[0] == "wall") {
            return;
          }
        }
      }

      new RoomVisual(blockSpot.roomName).circle(blockSpot.x, blockSpot.y, {
        fill: "#000000",
        radius: 0.25,
        stroke: "#FABFAB"
      });

      if (lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_ROAD) {
        if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
          constructionSitesPlaced++;
          const result = blockSpot.createConstructionSite(structure);
          // if(result == 0) {
          // if(result !== -8 && result !== -14) {
          // lookForExistingStructures[0].destroy();
          // }
        }
      }

      if (lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
        buldingAlreadyHereCount++;
        return;
      }

      if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
        constructionSitesPlaced++;
        blockSpot.createConstructionSite(structure);
        return;
      }
    });
  } else if (!usingPathfinder && structure == STRUCTURE_ROAD) {
    _.forEach(neighbors, function (block) {
      if (block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
        return;
      }
      const lookForExistingConstructionSites = block.lookFor(LOOK_CONSTRUCTION_SITES);
      const lookForExistingStructures = block.lookFor(LOOK_STRUCTURES);
      const lookForTerrain = block.lookFor(LOOK_TERRAIN);

      if (structure == STRUCTURE_ROAD) {
        new RoomVisual(block.roomName).circle(block.x, block.y, {
          fill: "transparent",
          radius: 0.25,
          stroke: "orange"
        });
      }

      _.forEach(lookForExistingStructures, function (building: any) {
        if (building.structureType === STRUCTURE_ROAD || building.structureType === STRUCTURE_CONTAINER) {
          keepTheseRoads.push(building.id);
        }
      });

      _.forEach(keepTheseRoads, function (road) {
        const targetRoom = Game.rooms[block.roomName];
        if (targetRoom && targetRoom.memory) {
          if (!targetRoom.memory.keepTheseRoads) {
            targetRoom.memory.keepTheseRoads = [];
          }
          if (!_.includes(targetRoom.memory.keepTheseRoads, road, 0)) {
            targetRoom.memory.keepTheseRoads.push(road);
            console.log(`[Cross-Road Sync] ${road} in ${block.roomName} has been registered`);
          }
        }
      });

      if (
        structure == STRUCTURE_ROAD &&
        lookForExistingStructures.length == 1 &&
        lookForExistingStructures[0].structureType == STRUCTURE_RAMPART &&
        lookForExistingConstructionSites.length == 0
      ) {
        constructionSitesPlaced++;
        Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
        return;
      }

      if (
        structure == STRUCTURE_ROAD &&
        lookForExistingStructures.length == 1 &&
        lookForExistingStructures[0].structureType == STRUCTURE_CONTAINER &&
        lookForExistingConstructionSites.length == 0
      ) {
        constructionSitesPlaced++;
        Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
        return;
      }

      if (lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
        buldingAlreadyHereCount++;
        return;
      }

      if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
        constructionSitesPlaced++;
        Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
        return;
      }
    });
  } else {
    _.forEach(neighbors.path, function (block) {
      if (block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
        return;
      }

      const lookForExistingConstructionSites = block.lookFor(LOOK_CONSTRUCTION_SITES);
      const lookForExistingStructures = block.lookFor(LOOK_STRUCTURES);
      const lookForTerrain = block.lookFor(LOOK_TERRAIN);

      if (structure == STRUCTURE_ROAD) {
        new RoomVisual(block.roomName).circle(block.x, block.y, {
          fill: "transparent",
          radius: 0.45,
          stroke: "orange"
        });
      }

      _.forEach(lookForExistingStructures, function (building: any) {
        if (building.structureType === STRUCTURE_ROAD || building.structureType === STRUCTURE_CONTAINER) {
          keepTheseRoads.push(building.id);
        }
      });

      _.forEach(keepTheseRoads, function (road) {
        const targetRoom = Game.rooms[block.roomName];
        if (targetRoom && targetRoom.memory) {
          if (!targetRoom.memory.keepTheseRoads) {
            targetRoom.memory.keepTheseRoads = [];
          }
          if (!_.includes(targetRoom.memory.keepTheseRoads, road, 0)) {
            targetRoom.memory.keepTheseRoads.push(road);
            console.log(`[Cross-Road Sync] ${road} in ${block.roomName} has been registered`);
          }
        }
      });

      if (
        structure == STRUCTURE_ROAD &&
        lookForExistingStructures.length == 1 &&
        lookForExistingStructures[0].structureType == STRUCTURE_RAMPART &&
        lookForExistingConstructionSites.length == 0
      ) {
        constructionSitesPlaced++;
        Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
        return;
      }

      if (
        structure == STRUCTURE_ROAD &&
        lookForExistingStructures.length == 1 &&
        lookForExistingStructures[0].structureType == STRUCTURE_CONTAINER &&
        lookForExistingConstructionSites.length == 0
      ) {
        constructionSitesPlaced++;
        Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
        return;
      }

      if (lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
        buldingAlreadyHereCount++;
        return;
      }

      if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
        if (structure == STRUCTURE_ROAD && Game.rooms[block.roomName].find(FIND_MY_CONSTRUCTION_SITES).length >= 12) {
          buldingAlreadyHereCount++;
          return;
        } else {
          constructionSitesPlaced++;
          Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
          return;
        }
      }
    });
  }

  console.log(
    room.name,
    structure,
    "[",
    buldingAlreadyHereCount,
    "buildings here already ]",
    "[",
    constructionSitesPlaced,
    "construction sites placed ]"
  );
  return buldingAlreadyHereCount + constructionSitesPlaced;
}

// ✅ 保留跨房间道路建造 - 新系统未覆盖此功能
function Build_Remote_Roads(room) {
  console.log(`Building remote roads for room ${room.name}`);
  if (room.memory.danger) {
    console.log(`Room ${room.name} is in danger, skipping road building`);
    return;
  }
  const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
  if (!storage) {
    console.log(`No storage found in room ${room.name}`);
    return;
  }

  const resourceData = _.get(room.memory, ["resources"]);
  console.log(`Resource data for room ${room.name}:`, JSON.stringify(resourceData));

  _.forEach(resourceData, function (data, targetRoomName) {
    // We want to build roads to remote rooms, not the current room
    if (room.name !== targetRoomName) {
      _.forEach(data.energy, function (values, sourceId: any) {
        const source: any = Game.getObjectById(sourceId);
        // Check if we have visibility of the source
        if (source != null && storage) {
          const pathFromStorageToRemoteSource = PathFinder.search(
            storage.pos,
            { pos: source.pos, range: 1 },
            {
              plainCost: 1,
              swampCost: 3,
              roomCallback: (roomName: string) => false,
              maxRooms: 16 // Allow cross-room pathing
            }
          );

          if (!pathFromStorageToRemoteSource.incomplete) {
            const containerSpot = pathFromStorageToRemoteSource.path[pathFromStorageToRemoteSource.path.length - 1];
            values.pathLength = pathFromStorageToRemoteSource.path.length;

            if (containerSpot && Game.rooms[containerSpot.roomName]) {
              console.log(
                `Creating container construction site at (${containerSpot.x}, ${containerSpot.y}) in room ${containerSpot.roomName}`
              );
              Game.rooms[containerSpot.roomName].createConstructionSite(
                containerSpot.x,
                containerSpot.y,
                STRUCTURE_CONTAINER
              );
              console.log(`Building road from storage to remote source in room ${targetRoomName}`);
              pathBuilder(pathFromStorageToRemoteSource, STRUCTURE_ROAD, room);
            } else {
              console.log(`No visibility in container room ${containerSpot?.roomName}`);
            }
          } else {
            console.log(`Could not find path to remote source in ${targetRoomName}`);
          }
        } else {
          console.log(`No visibility of source ${sourceId} in room ${targetRoomName}`);
        }
      });
    }
  });
}

// ✅ 保留特殊情况处理 - 处理 DOBug 等特殊情况
function Situational_Building(room) {
  if (
    room.controller.level == 4 &&
    room.memory.data &&
    room.memory.data.DOBug &&
    (room.memory.data.DOGug == 3 || room.memory.data.DOBug == 4)
  ) {
    if (room.memory.data.DOBug == 3) {
      const spawns = room.find(FIND_MY_SPAWNS);
      let spawn;
      if (spawns.length > 0) {
        spawn = spawns[0];
      }
      const storagePosition = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, room.name);
      const lookForStoragePositionBuildings = storagePosition.lookFor(LOOK_STRUCTURES);
      for (const building of lookForStoragePositionBuildings) {
        if ((building as any).structureType === STRUCTURE_CONTAINER) {
          building.destroy();
        }
      }
    }
    if (room.memory.data.DOBug == 4) {
      const spawns = room.find(FIND_MY_SPAWNS);
      let spawn;
      if (spawns.length > 0) {
        spawn = spawns[0];
      }
      const storagePosition = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, room.name);
      storagePosition.createConstructionSite(STRUCTURE_STORAGE);
    }
  }
}

// ✅ 保留资源处理函数 - 特殊功能
function handleResourceDismantling(room) {
  if (!room.memory.buildingsToDismantle || room.memory.buildingsToDismantle.length === 0) {
    return;
  }

  const buildingsToDismantle = [...room.memory.buildingsToDismantle];

  for (const task of buildingsToDismantle) {
    const building = Game.getObjectById(task.id);
    if (!building) {
      // 建筑已不存在，从任务列表中移除
      room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
      continue;
    }

    // 检查是否还有资源
    let hasResources = false;
    if ((building as any).structureType === STRUCTURE_STORAGE) {
      const storage = building as StructureStorage;
      if (storage.store && Object.keys(storage.store).some(resource => storage.store[resource] > 0)) {
        hasResources = true;
      }
    } else if ((building as any).structureType === STRUCTURE_TERMINAL) {
      const terminal = building as StructureTerminal;
      if (terminal.store && Object.keys(terminal.store).some(resource => terminal.store[resource] > 0)) {
        hasResources = true;
      }
    }

    if (!hasResources) {
      // 没有资源了，可以安全拆除
      const structure = building as AnyStructure;
      if (structure.destroy) {
        structure.destroy();
      }
      room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
      console.log(`拆除建筑: ${task.structureType} 在 ${task.pos.roomName} 位置 ${task.pos.x},${task.pos.y}`);
    } else {
      // 还有资源，检查是否需要生成搬运工
      const existingHaulers = countExistingHaulers(room, task.id);
      const neededHaulers = calculateHaulersNeeded(building);

      if (existingHaulers < neededHaulers) {
        spawnHauler(room, task);
      }
    }
  }
}

// ✅ 保留资源管理函数
function calculateHaulersNeeded(structure): number {
  let totalResources = 0;
  if (structure.structureType === STRUCTURE_STORAGE) {
    const storage = structure as StructureStorage;
    if (storage.store) {
      totalResources = Object.values(storage.store).reduce((sum, amount) => sum + amount, 0);
    }
  } else if (structure.structureType === STRUCTURE_TERMINAL) {
    const terminal = structure as StructureTerminal;
    if (terminal.store) {
      totalResources = Object.values(terminal.store).reduce((sum, amount) => sum + amount, 0);
    }
  }

  return Math.ceil(totalResources / 2000);
}

function countExistingHaulers(room, buildingId): number {
  const haulers = Object.values(Game.creeps).filter(
    creep =>
      creep.memory.homeRoom === room.name &&
      creep.memory.role === "resourceHauler" &&
      creep.memory.targetBuildingId === buildingId
  );

  return haulers.length;
}

function spawnHauler(room, task) {
  const body = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
  const newName = "ResourceHauler-" + Math.floor(Math.random() * Game.time) + "-" + room.name;

  const spawns = room.find(FIND_MY_SPAWNS);
  if (
    spawns.length > 0 &&
    spawns[0].spawnCreep(body, newName, {
      memory: {
        role: "resourceHauler",
        homeRoom: room.name,
        targetBuildingId: task.id,
        targetPos: task.pos,
        working: false
      }
    }) === OK
  ) {
    console.log(`生成资源搬运工: ${newName} 目标建筑: ${task.id}`);
  }
}

/**
 * 根据布局建造建筑（支持策略配置）
 * @param room 房间对象
 * @returns 创建的工地数组
 */
function buildFromLayout(room: Room): ConstructionSite[] | null {
  if (!Memory.roomPlanner || !Memory.roomPlanner[room.name]) {
    return null; // 回退到传统系统
  }

  // Periodically sync layout roads to keepTheseRoads (every 100 ticks)
  if (Game.time % 100 === 0) {
    syncLayoutRoadsToKeepTheseRoads(room);
  }

  // Intelligent road maintenance call (replaces aggressive clearing in rooms.ts)
  if (Game.time % 3012 === 0) {
    // Import and run intelligent cleanup
    try {
      const { comprehensiveRoadMaintenance } = require("./rooms.roadMaintenance");
      comprehensiveRoadMaintenance();
    } catch (error) {
      console.log(`[Road Maintenance] Error: ${error}`);
    }
  }

  // 🔍 检查策略配置
  const strategy = Memory.buildingStrategy?.[room.name];
  const mode = strategy?.mode || "AUTO";
  const enabled = strategy?.enabled !== false; // 默认启用

  if (!enabled) {
    return null; // 策略禁用时跳过建造
  }

  const layout = Memory.roomPlanner[room.name].layout;
  if (!layout) {
    return null;
  }

  const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
  const existingStructures = room.find(FIND_MY_STRUCTURES);

  // 原有的自动建造模式
  const maxConstructionSites = 3; // 限制同时建造的工地数量

  if (constructionSites.length >= maxConstructionSites) {
    return [];
  }

  let sitesPlaced = 0;
  const createdSites: ConstructionSite[] = [];

  // 🎯 使用优先级建造（统一逻辑）
  const buildOrder = [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
    STRUCTURE_STORAGE,
    STRUCTURE_TERMINAL,
    STRUCTURE_LINK,
    STRUCTURE_TOWER,
    STRUCTURE_CONTAINER,
    STRUCTURE_ROAD, STRUCTURE_RAMPART,
    STRUCTURE_POWER_SPAWN,
    STRUCTURE_EXTRACTOR,
    STRUCTURE_LAB,
    STRUCTURE_FACTORY,
    STRUCTURE_NUKER
  ];

  // 建造缺失建筑
  for (const structureType of buildOrder) {
    if (sitesPlaced >= maxConstructionSites - constructionSites.length) {
      break;
    }

    if (layout[structureType] && layout[structureType].length > 0) {
      for (const pos of layout[structureType]) {
        if (sitesPlaced >= maxConstructionSites - constructionSites.length) {
          break;
        }

        const roomPos = new RoomPosition(pos.x, pos.y, room.name);

        // 检查位置是否可以建造
        const look = roomPos.look();
        const hasConstruction = look.some(obj => obj.type === LOOK_CONSTRUCTION_SITES);
        const existingStructures = look.filter(obj => obj.type === LOOK_STRUCTURES);

        let canBuild = false;
        if (structureType === STRUCTURE_RAMPART) {
          // Rampart可以建造在除地形墙外的任何建筑上
          // 只需要检查是否已有工地，不需要检查现有建筑
          canBuild = !hasConstruction;
        } else {
          // 其他建筑只能在空地建造
          canBuild = existingStructures.length === 0 && !hasConstruction;
        }

        if (canBuild) {
          const result = room.createConstructionSite(pos.x, pos.y, structureType);
          if (result === OK) {
            sitesPlaced++;
            console.log(`🔨 [${mode}] 建造 ${structureType} → ${room.name}(${pos.x},${pos.y})`);

            // 获取创建的工地对象
            const newSite = roomPos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
            if (newSite) {
              createdSites.push(newSite);
            }

            // 替换第705-719行的逻辑
            // 实时登记road到keepTheseRoads（方案1：新建造road实时登记）
            if (structureType === STRUCTURE_ROAD) {
              if (!room.memory.keepTheseRoads) {
                room.memory.keepTheseRoads = [];
              }
              // 登记建筑工地位置用于后续监控
              const posKey = `${room.name}_${pos.x}_${pos.y}`;
              if (!room.memory.roadConstructionSites) {
                room.memory.roadConstructionSites = [];
              }
              if (!room.memory.roadConstructionSites.includes(posKey)) {
                room.memory.roadConstructionSites.push(posKey);
                console.log(`[Road Sync] Road construction site registered: ${posKey} in ${room.name}`);
              }

              // 检查该位置是否已有建成的road（处理已存在但未登记的情况）
              const existingStructures = roomPos.lookFor(LOOK_STRUCTURES);
              for (const structure of existingStructures) {
                if (structure.structureType === STRUCTURE_ROAD && !room.memory.keepTheseRoads.includes(structure.id)) {
                  room.memory.keepTheseRoads.push(structure.id);
                  console.log(`[Road Sync] Existing road registered: ${structure.id} in ${room.name}`);
                }
              }
            }
          }
        }
      }
    }
  }

  // 🗑️ 根据策略执行拆除（SMART/AGGRESSIVE）
  if (mode === "SMART" || mode === "AGGRESSIVE") {
    executeDemolition(room, layout, mode);
  }

  return createdSites;
}




/**
 * 执行拆除逻辑
 */
function executeDemolition(room: Room, layout: any, mode: string): void {
  const existingStructures = room.find(FIND_MY_STRUCTURES);
  const layoutPositions = new Set<string>();

  // 构建布局位置集合
  for (const [structureType, positions] of Object.entries(layout)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      layoutPositions.add(`${structureType}_${pos.x}_${pos.y}`);
    }
  }

  let removedCount = 0;

  // 识别和处理多余建筑
  for (const structure of existingStructures) {
    const structureKey = `${structure.structureType}_${structure.pos.x}_${structure.pos.y}`;

    // 如果建筑不在布局中，考虑拆除
    if (!layoutPositions.has(structureKey)) {
      const shouldRemove = shouldRemoveStructure(structure, layout);

      if (shouldRemove.shouldRemove) {
        const safetyCheck = performSafetyCheck(structure, room);

        if (safetyCheck.safe) {
          structure.destroy();
          removedCount++;
          console.log(
            `🗑️ [${mode}] 拆除 ${structure.structureType} ← ${room.name}(${structure.pos.x},${structure.pos.y}) - ${shouldRemove.reason}`
          );
        } else {
          console.log(`⚠️ [${mode}] 安全检查阻止拆除 ${structure.structureType} - ${safetyCheck.reason}`);
        }
      }
    }
  }

  if (removedCount > 0) {
    console.log(`📊 [${mode}] 拆除完成: ${removedCount} 个建筑`);
  }
}

/**
 * 判断是否应该拆除建筑
 */
function shouldRemoveStructure(structure: Structure, layout: any): { shouldRemove: boolean; reason: string } {
  const reasons = [];

  // 低价值建筑
  if (
    structure.structureType === STRUCTURE_ROAD ||
    structure.structureType === STRUCTURE_CONTAINER ||
    structure.structureType === STRUCTURE_RAMPART
  ) {
    reasons.push("低价值建筑");
  }

  // 检查是否阻碍路径（简化版本）
  if (structure.structureType === STRUCTURE_ROAD) {
    // 可以添加更复杂的路径检查逻辑
    reasons.push("可能阻碍路径");
  }

  // 检查是否孤立
  if (structure.structureType === STRUCTURE_CONTAINER) {
    const sources = structure.room.find(FIND_SOURCES);
    let nearSource = false;
    for (const source of sources) {
      if (structure.pos.getRangeTo(source) <= 2) {
        nearSource = true;
        break;
      }
    }
    if (!nearSource) {
      reasons.push("孤立的容器");
    }
  }

  // 重复建筑检查
  const sameTypeStructures = structure.room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === structure.structureType
  });

  const reasonableLimits = {
    [STRUCTURE_SPAWN]: 2,
    [STRUCTURE_STORAGE]: 1,
    [STRUCTURE_TERMINAL]: 1,
    [STRUCTURE_LINK]: 3,
    [STRUCTURE_TOWER]: 6,
    [STRUCTURE_LAB]: 10,
    [STRUCTURE_EXTENSION]: 60,
    [STRUCTURE_CONTAINER]: 20,
    [STRUCTURE_ROAD]: 200,
    [STRUCTURE_RAMPART]: 50
  };

  const limit = reasonableLimits[structure.structureType] || 1;
  if (sameTypeStructures.length > limit) {
    reasons.push(`超过合理数量 (${sameTypeStructures.length}/${limit})`);
  }

  return {
    shouldRemove: reasons.length > 0,
    reason: reasons.join(", ")
  };
}

/**
 * 执行安全检查
 */
function performSafetyCheck(structure: Structure, room: Room): { safe: boolean; reason: string } {
  // 确保有可用的spawn
  if (structure.structureType === STRUCTURE_SPAWN) {
    const otherSpawns = room.find(FIND_MY_SPAWNS).filter(s => s.id !== structure.id);
    if (otherSpawns.length === 0) {
      return { safe: false, reason: "唯一的spawn，不能拆除" };
    }
  }

  // 确保storage/terminal没有资源
  if (structure.structureType === STRUCTURE_STORAGE) {
    const storage = structure as StructureStorage;
    if (storage.store && Object.keys(storage.store).some(resource => storage.store[resource] > 0)) {
      return { safe: false, reason: "Storage中还有资源" };
    }
  }

  if (structure.structureType === STRUCTURE_TERMINAL) {
    const terminal = structure as StructureTerminal;
    if (terminal.store && Object.keys(terminal.store).some(resource => terminal.store[resource] > 0)) {
      return { safe: false, reason: "Terminal中还有资源" };
    }
  }

  // 检查房间是否处于危险状态
  if (room.memory.danger) {
    return { safe: false, reason: "房间处于危险状态" };
  }

  return { safe: true, reason: "安全" };
}

/**
 * 处理错位建筑（AGGRESSIVE模式）
 */
function handleMismatchedStructures(room: Room, layout: any): void {
  console.log(`[错位处理] AGGRESSIVE模式暂未完全实现错位建筑处理`);
  // TODO: 实现错位建筑处理逻辑
}

const RampartBorderCallbackFunction = (roomName: string): boolean | CostMatrix => {
  const currentRoom: any = Game.rooms[roomName];

  const costs = new PathFinder.CostMatrix();

  const storage = Game.getObjectById(currentRoom.memory.Structures.storage) || currentRoom.findStorage();

  const rampartLocations = [];
  for (let i = -10; i < 11; i++) {
    for (let o = -10; o < 11; o++) {
      if (i == 10 || i == -10) {
        const combinedX = storage.pos.x + i;
        if (combinedX >= 2 && combinedX <= 47) {
          rampartLocations.push([i, o]);
        } else {
          if (combinedX == 48) {
            rampartLocations.push([i - 1, o]);
          } else if (combinedX == 49) {
            rampartLocations.push([i - 2, o]);
          } else if (combinedX == 1) {
            rampartLocations.push([i + 1, o]);
          } else if (combinedX == 0) {
            rampartLocations.push([i + 2, o]);
          }
        }
      } else if (o == 10 || o == -10) {
        const combinedY = storage.pos.y + o;
        if (combinedY >= 2 && combinedY <= 47) {
          rampartLocations.push([i, o]);
        } else {
          if (combinedY == 48) {
            rampartLocations.push([i, o - 1]);
          } else if (combinedY == 49) {
            rampartLocations.push([i, o - 2]);
          } else if (combinedY == 1) {
            rampartLocations.push([i, o + 1]);
          } else if (combinedY == 0) {
            rampartLocations.push([i, o + 2]);
          }
        }
      }
    }
  }
  const storageRampartNeighbors = getNeighbours(storage.pos, rampartLocations);
  for (const location of storageRampartNeighbors) {
    costs.set(location.x, location.y, 255);
  }

  return costs;
};

// 🔥 步骤3: 清理导出 - 移除 construction 的默认导出
/**
 * 定期同步布局road到keepTheseRoads（方案2：处理所有布局road）
 */
function syncLayoutRoadsToKeepTheseRoads(room: Room): void {
  if (!Memory.roomPlanner?.[room.name]?.layout?.road) return;

  if (!room.memory.keepTheseRoads) {
    room.memory.keepTheseRoads = [];
  }

  let syncedCount = 0;
  for (const roadPos of Memory.roomPlanner[room.name].layout.road) {
    const roomPos = new RoomPosition(roadPos.x, roadPos.y, room.name);
    const structures = roomPos.lookFor(LOOK_STRUCTURES);

    for (const structure of structures) {
      if (structure.structureType === STRUCTURE_ROAD &&
          !room.memory.keepTheseRoads.includes(structure.id)) {
        room.memory.keepTheseRoads.push(structure.id);
        syncedCount++;
      }
    }
  }

  if (syncedCount > 0) {
    console.log(`[Road Sync] ${room.name} 同步了 ${syncedCount} 个布局road到keepTheseRoads`);
  }
}

export {
  Build_Remote_Roads,
  Situational_Building,
  handleResourceDismantling,
  buildFromLayout,
  syncLayoutRoadsToKeepTheseRoads
};

// 🔥 步骤3: 移除默认导出 - 新系统不需要导出 construction
// export default construction;
