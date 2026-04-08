
function getNeighbours(tile, listOfLocations) {
    const neighbours = [];
    listOfLocations.forEach(function(delta) {
        neighbours.push({x: tile.x + delta[0], y: tile.y + delta[1]});
    });
    return neighbours;
}

function pathBuilder(neighbors, structure, room, usingPathfinder=true) {
    const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
    let buldingAlreadyHereCount = 0;
    let constructionSitesPlaced = 0;

    const keepTheseRoads = [];


    if(structure == STRUCTURE_RAMPART && !usingPathfinder) {

        const listOfRampartPositions = []

        const positionArray = [];
        _.forEach(neighbors, function(block) {
            positionArray.push(new RoomPosition(block.x, block.y, room.name))
        });
        positionArray.sort((a,b) => a.findPathTo(storage, {ignoreCreeps:true}).length - b.findPathTo(storage, {ignoreCreeps:true}).length);
        _.forEach(positionArray, function(blockSpot) {
            new RoomVisual(blockSpot.roomName).circle(blockSpot.x, blockSpot.y, {fill: 'transparent', radius: 0.25, stroke: '#000000'});
            const lookForExistingConstructionSites = blockSpot.lookFor(LOOK_CONSTRUCTION_SITES);
            const lookForExistingStructures = blockSpot.lookFor(LOOK_STRUCTURES);
            const lookForTerrain = blockSpot.lookFor(LOOK_TERRAIN);

            for(const building of lookForExistingStructures) {
                if((building as any).structureType === STRUCTURE_RAMPART && (building as any).hits > 5000000) {
                    return;
                }
            }

            if(lookForExistingConstructionSites.length > 0) {
                return;
            }

            if(lookForTerrain[0] != "swamp" && lookForTerrain[0] != "plain") {
                return;
            }


            const pathFromRampartToStorage = PathFinder.search(blockSpot, {pos:storage.pos, range:1}, {plainCost: 1, swampCost: 2, maxCost:50, roomCallback: () => RampartBorderCallbackFunction(room.name)});


            if(pathFromRampartToStorage.incomplete) {
                return;
            }



            const exits = Game.map.describeExits(room.name);
            let incomplete = true;
            if(exits[1] && incomplete) {

                const positionInRoom = new RoomPosition(25, 25, exits[1]);
                const pathFromRampartToOtherRoom = PathFinder.search(blockSpot, {pos:positionInRoom, range:22}, {plainCost: 1, swampCost: 1, maxCost:100, roomCallback: () => RampartBorderCallbackFunction(room.name)});


                if(!pathFromRampartToOtherRoom.incomplete) {
                    incomplete = false;
                }
            }


            if(exits[3] && incomplete) {

                const positionInRoom = new RoomPosition(25, 25, exits[3]);
                const pathFromRampartToOtherRoom = PathFinder.search(blockSpot, {pos:positionInRoom, range:22}, {plainCost: 1, swampCost: 1, maxCost:100, roomCallback: () => RampartBorderCallbackFunction(room.name)});


                if(!pathFromRampartToOtherRoom.incomplete) {
                    incomplete = false;
                }
            }

            if(exits[5] && incomplete) {

                const positionInRoom = new RoomPosition(25, 25, exits[5]);
                const pathFromRampartToOtherRoom = PathFinder.search(blockSpot, {pos:positionInRoom, range:22}, {plainCost: 1, swampCost: 1, maxCost:100, roomCallback: () => RampartBorderCallbackFunction(room.name)});


                if(!pathFromRampartToOtherRoom.incomplete) {
                    incomplete = false;
                }
            }
            if(exits[7] && incomplete) {

                const positionInRoom = new RoomPosition(25, 25, exits[7]);
                const pathFromRampartToOtherRoom = PathFinder.search(blockSpot, {pos:positionInRoom, range:22}, {plainCost: 1, swampCost: 1, maxCost:100, roomCallback: () => RampartBorderCallbackFunction(room.name)});


                if(!pathFromRampartToOtherRoom.incomplete) {
                    incomplete = false;
                }
            }


            if(incomplete) {
                if(lookForExistingStructures.length > 0) {
                    for(let i=0; i<lookForExistingStructures.length; i++) {
                        if(lookForExistingStructures[i].structureType == STRUCTURE_RAMPART) {
                            lookForExistingStructures[i].destroy();
                        }
                    }
                }
                return;
            }



            if(lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART) {
                return;
            }




            if(lookForExistingStructures.length == 0) {
                listOfRampartPositions.push([blockSpot.x, blockSpot.y])
                // blockSpot.createConstructionSite(structure);
                return;
            }
            if(lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType != STRUCTURE_RAMPART && blockSpot.findPathTo(storage, {ignoreCreeps:true}).length <= 14) {
                // blockSpot.createConstructionSite(structure);
                listOfRampartPositions.push([blockSpot.x, blockSpot.y])
                return;
            }
            if(lookForExistingStructures.length == 2 && lookForExistingStructures[0].structureType != STRUCTURE_RAMPART && lookForExistingStructures[1].structureType != STRUCTURE_RAMPART) {
                // blockSpot.createConstructionSite(structure);
                listOfRampartPositions.push([blockSpot.x, blockSpot.y])
                return;
            }
        });
        room.memory.construction.rampartLocations = listOfRampartPositions;
    }


    if (structure == STRUCTURE_EXTENSION) {
        const rampartsInRoomRange10FromStorage = room.find(FIND_MY_STRUCTURES).filter(function(s) {return s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) >= 8 && s.pos.getRangeTo(storage) <= 10;});
        _.forEach(neighbors, function(block) {
            if(block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
                return;
            }
            const blockSpot = new RoomPosition(block.x, block.y, room.name);
            const lookForExistingConstructionSites = blockSpot.lookFor(LOOK_CONSTRUCTION_SITES);
            const lookForExistingStructures = blockSpot.lookFor(LOOK_STRUCTURES);
            const lookForTerrain = blockSpot.lookFor(LOOK_TERRAIN);

            const sources = room.find(FIND_SOURCES);



            if(blockSpot.x <= 4 || blockSpot.x >= 45 || blockSpot.y <= 4 || blockSpot.y >= 45) {
                const closestRampart = blockSpot.findClosestByRange(rampartsInRoomRange10FromStorage)
                if(blockSpot.getRangeTo(closestRampart) < 3) {
                    return;
                }
            }

            for(const source of sources) {
                if(blockSpot.getRangeTo(source) <= 2) {
                    return;
                }
            }

            if(blockSpot.getRangeTo(storage) > 10) {
                return;
            }

            const Mineral:any = Game.getObjectById(room.memory.mineral) || room.findMineral();

            if(blockSpot.getRangeTo(room.controller) <= 3 || blockSpot.getRangeTo(Mineral) <= 1) {
                buldingAlreadyHereCount ++;
                return;
            }

            if(blockSpot.getRangeTo(storage) > 10) {
                return;
            }

            if(storage && PathFinder.search(blockSpot, storage.pos).path.length > 11) {
                return;
            }

            if(storage && storage.pos.getRangeTo(blockSpot) == 7) {
                if(blockSpot.x >= storage.pos.x) {
                    const lookForTerrainToLeft = new RoomPosition(blockSpot.x - 1,blockSpot.y, room.name).lookFor(LOOK_TERRAIN);
                    if(lookForTerrainToLeft[0] == "wall") {
                        return;
                    }
                }
                if(blockSpot.x <= storage.pos.x) {
                    const lookForTerrainToRight = new RoomPosition(blockSpot.x + 1,blockSpot.y, room.name).lookFor(LOOK_TERRAIN);
                    if(lookForTerrainToRight[0] == "wall") {
                        return;
                    }
                }
                if(blockSpot.y >= storage.pos.y) {
                    const lookForTerrainToTop = new RoomPosition(blockSpot.x,blockSpot.y - 1, room.name).lookFor(LOOK_TERRAIN);
                    if(lookForTerrainToTop[0] == "wall") {
                        return;
                    }
                }
                if(blockSpot.y <= storage.pos.y) {
                    const lookForTerrainToBottom = new RoomPosition(blockSpot.x,blockSpot.y + 1, room.name).lookFor(LOOK_TERRAIN);
                    if(lookForTerrainToBottom[0] == "wall") {
                        return;
                    }
                }
            }


            new RoomVisual(blockSpot.roomName).circle(blockSpot.x, blockSpot.y, {fill: '#000000', radius: 0.25, stroke: '#FABFAB'});

            if(lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_ROAD) {
                if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
                    constructionSitesPlaced ++;
                    const result = blockSpot.createConstructionSite(structure);
                    // if(result == 0) {
                    // if(result !== -8 && result !== -14) {
                        // lookForExistingStructures[0].destroy();
                    // }
                }
            }



            if(lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
                buldingAlreadyHereCount ++;
                return;
            }


            if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
                constructionSitesPlaced ++;
                blockSpot.createConstructionSite(structure);
                return;
            }
        });
    }
    else if(!usingPathfinder && structure == STRUCTURE_ROAD) {
        _.forEach(neighbors, function(block) {
            if(block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
                return;
            }
            const lookForExistingConstructionSites = block.lookFor(LOOK_CONSTRUCTION_SITES);
            const lookForExistingStructures = block.lookFor(LOOK_STRUCTURES);
            const lookForTerrain = block.lookFor(LOOK_TERRAIN);

            if(structure == STRUCTURE_ROAD) {
                new RoomVisual(block.roomName).circle(block.x, block.y, {fill: 'transparent', radius: 0.25, stroke: 'orange'});
            }

            _.forEach(lookForExistingStructures, function(building: any) {
                if(building.structureType === STRUCTURE_ROAD || building.structureType === STRUCTURE_CONTAINER) {
                    keepTheseRoads.push(building.id);
                }
            });

            _.forEach(keepTheseRoads, function(road) {
                if(Game.rooms[block.roomName] && Game.rooms[block.roomName].memory && Game.rooms[block.roomName].memory.keepTheseRoads && !_.includes(Game.rooms[block.roomName].memory.keepTheseRoads, road, 0)) {
                    Game.rooms[block.roomName].memory.keepTheseRoads.push(road);
                }
            });




            if(structure == STRUCTURE_ROAD && lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART && lookForExistingConstructionSites.length == 0) {
                constructionSitesPlaced ++;
                Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                return;
            }

            if(structure == STRUCTURE_ROAD && lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_CONTAINER && lookForExistingConstructionSites.length == 0) {
                constructionSitesPlaced ++;
                Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                return;
            }



            if(lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
                buldingAlreadyHereCount ++;
                return;
            }


            if(lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
                constructionSitesPlaced ++;
                Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                return;
            }
        });
    }
    else {
        _.forEach(neighbors.path, function(block) {
            if(block.x < 1 || block.x > 48 || block.y < 1 || block.y > 48) {
                return;
            }

            const lookForExistingConstructionSites = block.lookFor(LOOK_CONSTRUCTION_SITES);
            const lookForExistingStructures = block.lookFor(LOOK_STRUCTURES);
            const lookForTerrain = block.lookFor(LOOK_TERRAIN);

            if(structure == STRUCTURE_ROAD) {
                new RoomVisual(block.roomName).circle(block.x, block.y, {fill: 'transparent', radius: 0.45, stroke: 'orange'});
            }

            _.forEach(lookForExistingStructures, function(building: any) {
                if(building.structureType === STRUCTURE_ROAD || building.structureType === STRUCTURE_CONTAINER) {
                    keepTheseRoads.push(building.id);
                }
            });

            _.forEach(keepTheseRoads, function(road) {
                if(Game.rooms[block.roomName] && Game.rooms[block.roomName].memory && Game.rooms[block.roomName].memory.keepTheseRoads && !_.includes(Game.rooms[block.roomName].memory.keepTheseRoads, road, 0)) {
                    Game.rooms[block.roomName].memory.keepTheseRoads.push(road);
                }
            });




            if(structure == STRUCTURE_ROAD && lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART && lookForExistingConstructionSites.length == 0) {
                constructionSitesPlaced ++;
                Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                return;
            }

            if(structure == STRUCTURE_ROAD && lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_CONTAINER && lookForExistingConstructionSites.length == 0) {
                constructionSitesPlaced ++;
                Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                return;
            }

            if(lookForExistingStructures.length != 0 || lookForExistingConstructionSites.length != 0) {
                buldingAlreadyHereCount ++;
                return;
            }

            if (lookForTerrain[0] == "swamp" || lookForTerrain[0] == "plain") {
                if(structure == STRUCTURE_ROAD && Game.rooms[block.roomName].find(FIND_MY_CONSTRUCTION_SITES).length >= 12) {
                    buldingAlreadyHereCount ++;
                    return;
                }
                else {
                    constructionSitesPlaced ++;
                    Game.rooms[block.roomName].createConstructionSite(block.x, block.y, structure);
                    return;
                }
            }
        });
    }

    console.log(room.name , structure, "[", buldingAlreadyHereCount, "buildings here already ]", "[", constructionSitesPlaced, "construction sites placed ]");
    return (buldingAlreadyHereCount + constructionSitesPlaced);
}



function rampartPerimeter(tile) {
    const perimeter =
    [[0,-12],[1,-12],[2,-12],[3,-12],[4,-12],[5,-12],[6,-12],[7,-12],[8,-12],[9,-12],[10,-12],[11,-12],[12,-12],
    [12,-11],[12,-10],[12,-9],[12,-8],[12,-7],[12,-6],[12,-5],[12,-4],[12,-3],[12,-2],[12,-1],[12,0],[12,1],[12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[12,8],[12,9],[12,10],[12,11],[12,12],
    [11,12],[10,12],[9,12],[8,12],[7,12],[6,12],[5,12],[4,12],[3,12],[2,12],[1,12],[0,12],[-1,12],[-2,12],[-3,12],[-4,12],[-5,12],[-6,12],[-7,12],[-8,12],[-9,12],[-10,12],[-11,12],[-12,12],
    [-12,11],[-12,10],[-12,9],[-12,8],[-12,7],[-12,6],[-12,5],[-12,4],[-12,3],[-12,2],[-12,1],[-12,0],[-12,-1],[-12,-2],[-12,-3],[-12,-4],[-12,-5],[-12,-6],[-12,-7],[-12,-8],[-12,-9],[-12,-10],[-12,-11],[-12,-12],
    [-11,-12],[-10,-12],[-9,-12],[-8,-12],[-7,-12],[-6,-12],[-5,-12],[-4,-12],[-3,-12],[-2,-12],[-1,-12]];


    const neighbours = [];
    perimeter.forEach(function(delta) {
        neighbours.push({x: tile.x + delta[0], y: tile.y + delta[1]});
    });
    return neighbours;
}



// 🔥 步骤1: 注释主建造函数 - 已被 buildFromLayout 替代
// function construction(room) {
//     console.log(`Construction function called for room ${room.name}`);

//     if(!room.memory.construction) {
//         room.memory.construction = {};
//         console.log(`Initialized construction memory for room ${room.name}`);
//     }

//     if(room.controller.level >= 3 && room.storage) {
//         console.log(`Room ${room.name} meets criteria for rampart calculation`);
//         let storage = room.storage;
//         let rampartLocations = [];
//         for(let i = -10; i <= 10; i++) {
//             for(let o = -10; o <= 10; o++) {
//                 let combinedX = storage.pos.x + i;
//                 let combinedY = storage.pos.y + o;

//                 // Ensure combinedX is within the boundaries
//                 if (combinedX < 2) combinedX = 2;
//                 if (combinedX > 47) combinedX = 47;

//                 // Ensure combinedY is within the boundaries
//                 if (combinedY < 2) combinedY = 2;
//                 if (combinedY > 47) combinedY = 47;

//                 if (Math.abs(i) == 10 || Math.abs(o) == 10) {
//                     rampartLocations.push([combinedX, combinedY]);
//                 }
//             }
//         }

//         console.log(`Calculated ${rampartLocations.length} rampart locations for room ${room.name}`);

//         // Store rampartLocations in memory
//         room.memory.construction.rampartLocations = rampartLocations;
//         console.log(`Stored rampart locations in memory for room ${room.name}`);
//     } else {
//         console.log(`Room ${room.name} does not meet criteria for rampart calculation`);
//     }

//     // Log the current state of rampartLocations in memory
//     console.log(`Current rampartLocations in memory for room ${room.name}:`, JSON.stringify(room.memory.construction.rampartLocations));


//     if(room.controller.level == 1 && room.find(FIND_MY_SPAWNS).length == 0 && room.find(FIND_MY_CONSTRUCTION_SITES).length == 0 && Memory.target_colonise.room == room.name) {
//         let position = Memory.target_colonise.spawn_pos
//         Game.rooms[Memory.target_colonise.room].createConstructionSite(position.x, position.y, STRUCTURE_SPAWN);
//         return;
//     }

//     if(room.controller.level === 1 || room.controller.level === 2) {
//         let walls = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_WALL});
//         for(let wall of walls) {
//             wall.destroy();
//         }
//     }



//     if(room.memory.danger) {
//         return;
//     }

//     let myConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES).length




//     let storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();

//     if(room.controller.level >= 5) {
//         let nukes = room.find(FIND_NUKES);
//         if(nukes.length > 4) {
//             for(let nuke of nukes) {
//                 if(nuke.pos.getRangeTo(storage) > 7 && nuke.pos.getRangeTo(storage) < 13 && nuke.pos.x <= 44 && nuke.pos.y <= 44 && nuke.pos.x >= 5 && nuke.pos.y >= 5) {
//                     let perimeter = [
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 1, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 1, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 2, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 2, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x + 2, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x + 2, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x + 1, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x + 1, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 1, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 1, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 2, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 2, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x - 2, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x - 2, nuke.pos.y + 3, room.name),
//                         new RoomPosition(nuke.pos.x - 1, nuke.pos.y - 3, room.name),
//                         new RoomPosition(nuke.pos.x - 1, nuke.pos.y + 3, room.name)
//                     ];
//                     for(let position of perimeter) {
//                         if(position.getRangeTo(storage) > 10) {
//                             position.createConstructionSite(STRUCTURE_RAMPART);
//                         }
//                     }
//                 }
//             }
//         }
//     }


//     if (room.controller.level >= 3 && storage && myConstructionSites == 0) {

//         let rampartLocations = [];
//         for (let i = -10; i <= 10; i++) {
//             for (let o = -10; o <= 10; o++) {
//                 let combinedX = storage.pos.x + i;
//                 let combinedY = storage.pos.y + o;

//                 // Ensure combinedX is within the boundaries
//                 if (combinedX < 2) combinedX = 2;
//                 if (combinedX > 47) combinedX = 47;

//                 // Ensure combinedY is within the boundaries
//                 if (combinedY < 2) combinedY = 2;
//                 if (combinedY > 47) combinedY = 47;

//                 if (Math.abs(i) == 10 || Math.abs(o) == 10) {
//                     // Adjust to ensure they remain as close to 10 away as possible within bounds
//                     let adjustedX = storage.pos.x + (i < 0 ? -10 : 10);
//                     let adjustedY = storage.pos.y + (o < 0 ? -10 : 10);

//                     // Ensure the adjusted positions are within bounds
//                     if (adjustedX < 2) adjustedX = 2;
//                     if (adjustedX > 47) adjustedX = 47;

//                     if (adjustedY < 2) adjustedY = 2;
//                     if (adjustedY > 47) adjustedY = 47;

//                     rampartLocations.push([adjustedX, adjustedY]);
//                 }
//             }
//         }

//         let storageRampartNeighbors = getNeighbours(storage.pos, rampartLocations);
//         let filteredStorageRampartNeighbors = storageRampartNeighbors.filter(position => position.x > 0 && position.x < 49 && position.y > 0 && position.y < 49);
//         pathBuilder(filteredStorageRampartNeighbors, STRUCTURE_RAMPART, room, false);
//     }




//     if(room.controller.level >= 1 && room.memory.Structures.spawn) {
//         let spawn = Game.getObjectById(room.memory.Structures.spawn) || room.findSpawn();

//         // if(room.controller.level >= 3) {
//         //     if(spawn) {
//         //         let spawnlocationlook = spawn.pos.lookFor(LOOK_STRUCTURES);
//         //         if(spawnlocationlook.length == 1) {
//         //             spawn.pos.createConstructionSite(STRUCTURE_RAMPART);
//         //         }
//         //     }
//         //     if(storage) {
//         //         let storagelocationlook = storage.pos.lookFor(LOOK_STRUCTURES);
//         //         if(storagelocationlook.length == 1) {
//         //             storage.pos.createConstructionSite(STRUCTURE_RAMPART);
//         //         }
//         //     }
//         // }

//             // var index = array.indexOf(item);
//             // if (index !== -1) {
//             //   array.splice(index, 1);
//             // }

//             if(spawn) {
//                 let spawnlocationlook = spawn.pos.lookFor(LOOK_STRUCTURES);
//                 if(spawnlocationlook.length == 1) {
//                     spawn.pos.createConstructionSite(STRUCTURE_RAMPART);
//                 }
//             }

//             if(storage ) {
//                 let LabLocations = [];

//                 let first_location_good = true;
//                 let testLabLocations = [];
//                 // Check if storage is far enough from edges
//                 if(storage.pos.x >= 5 && storage.pos.y <= 46) {
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 1, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 2, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 1, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 2, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 3, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 3, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 2, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 1, room.name));
//                     testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y, room.name));
//                 } else {
//                     first_location_good = false;
//                 }
//                 for(let location of testLabLocations) {
//                     let lookForWall = location.lookFor(LOOK_TERRAIN);
//                     if(lookForWall.length > 0) {
//                         if(lookForWall[0] == "wall") {
//                             first_location_good = false;
//                         }
//                     }
//                 }


//                 if(first_location_good) {
//                     LabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 1, room.name));

//                     LabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 2, room.name));

//                     LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y, room.name));

//                     if(room.controller.level >= 7) {
//                         LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 1, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 2, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 3, room.name));
//                     }
//                     if(room.controller.level == 8) {
//                         LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 3, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 2, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 1, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y, room.name));
//                     }

//                 }
//                 else if(!first_location_good) {
//                     LabLocations = [];

//                     LabLocations.push(new RoomPosition(storage.pos.x + 4, storage.pos.y + 4, room.name));

//                     LabLocations.push(new RoomPosition(storage.pos.x + 4, storage.pos.y + 5, room.name));

//                     LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 3, room.name));

//                     if(room.controller.level >= 7) {
//                         LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 4, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 5, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 6, room.name));
//                     }
//                     if(room.controller.level == 8) {
//                         LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 3, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 4, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 5, room.name));

//                         LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 6, room.name));
//                     }
//                 }


//                 if(!first_location_good) {

//                     checkerboard = [
//                         [-2,-2], [2,-2], [2,0],
//                         [-3,-3], [-1,-3],[-1,3], [1,-3], [3,-3], [-3,-1],[-3,1], [-3,3], [1,3],[-3,-2],[-3,2],[3,-2],[3,1],[3,-1],
//                         [-4,-4],[-2,-4],[0,-4],[2,-4],[4,-4],[-4,-2],[-4,2],[-4,0],[-4,4],[-2,4],[0,4],[4,2],[4,-2],
//                         [-5,-5],[-5,3],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[-5,-3],[5,-3],[-5,1],[-5,-1],[-5,5],[-3,5],[-1,5],[1,5],[0,5],[0,-5],[-5,0],[5,1],[5,-1],
//                         [-6,-6],[-4,-6],[-2,-6],[0,-6],[2,-6],[4,-6],[6,-6],[-6,-4],[6,-4],[-6,-2],[-6,0],[-6,2],[6,-2],[6,0],[6,2],[-6,4],[-6,6],[-4,6],[-2,6],[0,6],[2,6],[4,6],[6,6],
//                         [-5,-7],[-3,-7],[-1,-7],[1,-7],[3,-7],[5,-7],[-7,-5],[-7,-3],[-7,-1],[-7,1],[-7,3],[-7,5],[-5,7],[-3,7],[-1,7],[1,7],[3,7],[5,7],[7,5],[7,3],[7,1],[7,-1],[7,-3],[7,-5],
//                         [0,7],[7,0],[0,-7],[-7,0],[4,7],[-4,7],[7,4],[7,-4],[4,-7],[-4,-7],[-7,4],[-7,-4]
//                     ];

//                 }
//                 else {
//                     checkerboard = [
//                         [-2,-2], [2,-2], [2,0],
//                         [-3,-3], [-1,-3],[-1,3], [1,-3], [3,-3], [1,3], [3,3],[-3,-2],[3,-2],[3,-1],[3,1],
//                         [-4,-4],[-2,-4],[0,-4],[2,-4],[4,-4],[-4,-2],[-4,4],[-2,4],[0,4],[2,4],[4,4],[4,-2],[4,2],
//                         [-5,-5],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[-5,-3],[5,-3],[-5,-1],[5,3],[-5,5],[-3,5],[-1,5],[1,5],[3,5],[5,5],[0,5],[0,-5],[5,1],[5,-1],
//                         [-6,-6],[-4,-6],[-2,-6],[0,-6],[2,-6],[4,-6],[6,-6],[-6,-4],[6,-4],[-6,-2],[6,-2],[6,0],[6,2],[-6,4],[-6,6],[-4,6],[-2,6],[0,6],[2,6],[4,6],[6,6],
//                         [-5,-7],[-3,-7],[-1,-7],[1,-7],[3,-7],[5,-7],[-7,-5],[-7,-3],[-7,-1],[-7,5],[-5,7],[-3,7],[-1,7],[1,7],[3,7],[5,7],[7,5],[7,3],[7,1],[7,-1],[7,-3],[7,-5],
//                         [0,7],[7,0],[0,-7],[4,7],[-4,7],[7,4],[7,-4],[4,-7],[-4,-7],[-7,4],[-7,-4]
//                     ];

//                 }

//                 if(room.controller.level >= 6 && room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LAB);}}).length <= 10) {

//                     DestroyAndBuild(room, LabLocations, STRUCTURE_LAB);

//                 }
//                 let labsInRoom = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LAB);}})
//                 if(labsInRoom.length > 0) {
//                     for(let lab of labsInRoom) {
//                         if(lab.pos.lookFor(LOOK_STRUCTURES).length == 1) {
//                             lab.pos.createConstructionSite(STRUCTURE_RAMPART);
//                         }
//                     }
//                 }
//             }





//         if(storage) {
//             let binLocation = new RoomPosition(storage.pos.x, storage.pos.y + 1, room.name);
//             let lookForExistingStructuresOnBinLocation = binLocation.lookFor(LOOK_STRUCTURES);
//             if(lookForExistingStructuresOnBinLocation.length > 0) {
//                 for(let existingStructure of lookForExistingStructuresOnBinLocation) {
//                     if(existingStructure.structureType == STRUCTURE_ROAD) {
//                         room.memory.keepTheseRoads.push(existingStructure.id);
//                     }
//                     if(existingStructure.structureType != STRUCTURE_CONTAINER && existingStructure.structureType != STRUCTURE_ROAD && existingStructure.structureType != STRUCTURE_SPAWN && existingStructure.structureType != STRUCTURE_STORAGE) {
//                         existingStructure.destroy();
//                     }
//                 }
//             }
//             else if(room.energyCapacityAvailable > 500) {
//                 binLocation.createConstructionSite(STRUCTURE_CONTAINER);
//             }
//             if(lookForExistingStructuresOnBinLocation.length == 1 && lookForExistingStructuresOnBinLocation[0].structureType == STRUCTURE_ROAD) {
//                 binLocation.createConstructionSite(STRUCTURE_CONTAINER);
//             }

//             if(room.controller.level > 4 && lookForExistingStructuresOnBinLocation.length == 1 && lookForExistingStructuresOnBinLocation[0].structureType == STRUCTURE_CONTAINER) {
//                 binLocation.createConstructionSite(STRUCTURE_ROAD);
//             }
//         }


//         if(room.controller.level == 2 || room.controller.level == 3) {
//             let storageLocation = new RoomPosition(spawn.pos.x, spawn.pos.y -2, room.name);
//             let lookForExistingStructures = storageLocation.lookFor(LOOK_STRUCTURES);
//             if(lookForExistingStructures.length != 0 && lookForExistingStructures[0].structureType != STRUCTURE_CONTAINER) {
//                 lookForExistingStructures[0].destroy();
//             }
//             else {
//                 room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_CONTAINER);
//             }
//         }
//         let storageLocation = new RoomPosition(spawn.pos.x, spawn.pos.y -2, room.name);
//         let lookForExistingStructures = storageLocation.lookFor(LOOK_STRUCTURES);
//         if(room.controller.level >= 4 && !storage || room.controller.level == 4 && storage.structureType == STRUCTURE_CONTAINER) {
//             if(lookForExistingStructures.length > 0) {
//                 if(lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART) {
//                     room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_STORAGE);
//                 }
//                 else {
//                     for(let building of lookForExistingStructures) {
//                         if(building.structureType == STRUCTURE_CONTAINER) {
//                             building.destroy();
//                         }
//                     }
//                     // for(let building of lookForExistingStructures) {
//                     //     if(building.)
//                     // }
//                     lookForExistingStructures[0].destroy();
//                 }

//             }
//             else {
//                 room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_STORAGE);
//             }
//         }


//         if(room.controller.level >= 1) {
//             let sources = room.find(FIND_SOURCES);
//             if(storage) {
//                 let pathFromStorageToSource1 = PathFinder.search(storage.pos, {pos:sources[0].pos, range:1}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
//                 let container1 = pathFromStorageToSource1.path[pathFromStorageToSource1.path.length - 1];
//                 // if(room.controller.level >= 6) {
//                 //     pathFromStorageToSource1.path.pop();
//                 // }
//                 if(storage.pos.getRangeTo(pathFromStorageToSource1.path[pathFromStorageToSource1.path.length - 1]) > 7 && room.controller.level >= 6) {
//                     container1.createConstructionSite(STRUCTURE_RAMPART);
//                 }

//                 let pathFromStorageToSource2 = PathFinder.search(storage.pos, {pos:sources[1].pos, range:1}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
//                 let container2 = pathFromStorageToSource2.path[pathFromStorageToSource2.path.length - 1];
//                 // if(room.controller.level >= 6) {
//                 //     pathFromStorageToSource2.path.pop();
//                 // }
//                 if(storage.pos.getRangeTo(pathFromStorageToSource2.path[pathFromStorageToSource2.path.length - 1]) > 7 && room.controller.level >= 6) {
//                     container2.createConstructionSite(STRUCTURE_RAMPART);
//                 }

//                 let pathFromStorageToController = PathFinder.search(storage.pos, {pos:room.controller.pos, range:2}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});

//                 pathFromStorageToController.path.pop();

//                 let linkLocation = pathFromStorageToController.path[pathFromStorageToController.path.length - 1];


//                 let mySpawns = room.find(FIND_MY_SPAWNS);

//                 if(room.controller.level <= 6 && room.controller.level >= 2) {
//                     let lookStructs = linkLocation.lookFor(LOOK_STRUCTURES);
//                     let foundContainer = false;

//                     for(let building of lookStructs) {
//                         if(building.structureType == STRUCTURE_TOWER || building.structureType == STRUCTURE_EXTENSION) {
//                             building.destroy();
//                         }
//                         else if(building.structureType == STRUCTURE_CONTAINER) {
//                             foundContainer = true;
//                         }
//                     }
//                     if(!foundContainer) {
//                         linkLocation.createConstructionSite(STRUCTURE_CONTAINER);
//                     }
//                 }
//                 if(room.controller.level >= 7) {
//                     let lookStructs = linkLocation.lookFor(LOOK_STRUCTURES);
//                     for(let building of lookStructs) {
//                         if(building.structureType !== STRUCTURE_LINK && building.structureType !== STRUCTURE_RAMPART && building.structureType !== STRUCTURE_ROAD) {
//                             building.destroy();
//                         }
//                     }

//                     let links = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LINK);}});
//                     // room.controller.getRangeTo(room.controller.pos.findClosestByRange(links)) > 3room.controller.getRangeTo(room.controller.pos.findClosestByRange(links)) > 3
//                     if(links.length == 3) {
//                         let currentControllerLink:any = Game.getObjectById(room.memory.Structures.controllerLink);
//                         if(currentControllerLink && currentControllerLink == STRUCTURE_CONTAINER || !currentControllerLink) {
//                             room.createConstructionSite(linkLocation.x, linkLocation.y, STRUCTURE_LINK);
//                         }

//                     }


//                     if(mySpawns.length < 2 && storage) {
//                         let secondSpawnPosition = new RoomPosition(storage.pos.x, storage.pos.y - 2, room.name);
//                         new RoomVisual(room.name).circle(secondSpawnPosition.x, secondSpawnPosition.y, {fill: 'transparent', radius: .75, stroke: '#BABABA'});
//                         let listOfSpawnPositions = [];
//                         listOfSpawnPositions.push(secondSpawnPosition);


//                         DestroyAndBuild(room, listOfSpawnPositions, STRUCTURE_SPAWN);
//                     }


//                     if(storage) {
//                         let FactoryPosition = new RoomPosition(storage.pos.x + 2, storage.pos.y + 2, room.name);
//                         new RoomVisual(room.name).circle(FactoryPosition.x, FactoryPosition.y, {fill: 'transparent', radius: .75, stroke: 'blue'});
//                         let listOfFactoryPositions = [];
//                         listOfFactoryPositions.push(FactoryPosition);


//                         DestroyAndBuild(room, listOfFactoryPositions, STRUCTURE_FACTORY);

//                         // let lookforfactorypositionstructures = FactoryPosition.lookFor(LOOK_STRUCTURES)
//                         // if(lookforfactorypositionstructures.length == 1 && lookforfactorypositionstructures[0].structureType == STRUCTURE_FACTORY) {
//                         //     FactoryPosition.createConstructionSite(STRUCTURE_RAMPART);
//                         // }
//                     }

//                 }

//                 if(room.controller.level == 8 && mySpawns.length == 2) {
//                     let thirdSpawnPosition = new RoomPosition(storage.pos.x + 2, storage.pos.y, room.name);
//                     new RoomVisual(room.name).circle(thirdSpawnPosition.x, thirdSpawnPosition.y, {fill: 'transparent', radius: .75, stroke: '#BABABA'});
//                     let listOfSpawnPositions = [];
//                     listOfSpawnPositions.push(thirdSpawnPosition);


//                     DestroyAndBuild(room, listOfSpawnPositions, STRUCTURE_SPAWN);
//                 }

//                 if(room.controller.level == 8 && myConstructionSites == 0) {
//                     let observers = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_OBSERVER});
//                     if(observers.length == 0) {
//                         let listOfObserverPosition = [new RoomPosition(storage.pos.x - 2, storage.pos.y + 1, room.name)]
//                         DestroyAndBuild(room, listOfObserverPosition, STRUCTURE_OBSERVER);
//                     }

//                     let nukers = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_NUKER});
//                     if(nukers.length == 0) {
//                         let listOfNukerPositions = [new RoomPosition(storage.pos.x + 4, storage.pos.y, room.name)]
//                         DestroyAndBuild(room, listOfNukerPositions, STRUCTURE_NUKER);
//                     }
//                     // else if(nukers.length == 1) {
//                     //     let NukerPosition = new RoomPosition(storage.pos.x + 4, storage.pos.y, room.name);
//                     //     let lookForS = NukerPosition.lookFor(LOOK_STRUCTURES);
//                     //     if(lookForS.length == 1) {
//                     //         NukerPosition.createConstructionSite(STRUCTURE_RAMPART);
//                     //     }
//                     // }
//                     let powerSpawns = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_POWER_SPAWN});
//                     if(powerSpawns.length == 0) {
//                         let listOfPowerSpawnPositions = [new RoomPosition(storage.pos.x + 3, storage.pos.y + 2, room.name)]
//                         DestroyAndBuild(room, listOfPowerSpawnPositions, STRUCTURE_POWER_SPAWN);
//                     }
//                     // else if(powerSpawns.length == 1) {
//                     //     let PowerSpawnPosition = new RoomPosition(storage.pos.x + 3, storage.pos.y + 2, room.name);
//                     //     let lookForS = PowerSpawnPosition.lookFor(LOOK_STRUCTURES);
//                     //     if(lookForS.length == 1) {
//                     //         PowerSpawnPosition.createConstructionSite(STRUCTURE_RAMPART);
//                     //     }
//                     // }
//                 }

//                 if(room.controller.level == 8 && myConstructionSites == 0 && room.controller.isPowerEnabled) {
//                     let openPositionsAroundController = room.controller.pos.getOpenPositionsIgnoreCreeps();
//                     for(let position of openPositionsAroundController) {
//                         let found = false;
//                         if(storage && (storage.pos.getRangeTo(position) >= 10 || storage.pos.findPathTo(position, { ignoreCreeps: true, ignoreRoads: true, swampCost: 1 }).length > 11)) {
//                             let structuresHere = position.lookFor(LOOK_STRUCTURES);
//                             if(structuresHere.length > 0) {
//                                 for(let building of structuresHere) {
//                                     if(building.structureType == STRUCTURE_RAMPART) {
//                                         found = true;
//                                     }
//                                 }
//                             }
//                             if(!found) {
//                                 position.createConstructionSite(STRUCTURE_WALL);
//                             }
//                         }
//                     }
//                     // build walls around controller
//                 }



//                 // 🔥 步骤2: 注释内部道路规划 - 新系统通过布局统一处理
//                 if(room.controller.level < 6) {
//                     Game.rooms[container1.roomName].createConstructionSite(container1.x, container1.y, STRUCTURE_CONTAINER);
//                 }
//                 // if(room.controller.level >= 3) pathBuilder(pathFromStorageToSource1, STRUCTURE_ROAD, room);

//                 if(room.controller.level < 6) {
//                     Game.rooms[container2.roomName].createConstructionSite(container2.x, container2.y, STRUCTURE_CONTAINER);
//                 }
//                 // if(room.controller.level >= 3) pathBuilder(pathFromStorageToSource2, STRUCTURE_ROAD, room);

//                 // if(room.controller.level >= 3) pathBuilder(pathFromStorageToController, STRUCTURE_ROAD, room);

//                 if(room.controller.level >= 6) {

//                     if(storage) {

//                         // 🔥 步骤2: 注释固定位置道路规划 - 新系统使用布局文件
//                         // let extraRoadPositions = [
//                         //     new RoomPosition(storage.pos.x-4, storage.pos.y, room.name),
//                         //     new RoomPosition(storage.pos.x-3, storage.pos.y-1, room.name),
//                         //     new RoomPosition(storage.pos.x-2, storage.pos.y-1, room.name),
//                         //     new RoomPosition(storage.pos.x-2, storage.pos.y+2, room.name),
//                         //     new RoomPosition(storage.pos.x-2, storage.pos.y+3, room.name),
//                         //     new RoomPosition(storage.pos.x-3, storage.pos.y+4, room.name),
//                         //     new RoomPosition(storage.pos.x-4, storage.pos.y+3, room.name)
//                         // ];

//                         // for(let position of extraRoadPositions) {
//                         //     if(position.lookFor(LOOK_TERRAIN)[0] !== "wall") {
//                         //         position.createConstructionSite(STRUCTURE_ROAD);
//                         //     }

//                         //     let lookForRoad = position.lookFor(LOOK_STRUCTURES);
//                         //     if(lookForRoad.length > 0) {
//                         //         for(let building of lookForRoad) {
//                         //             if(building.structureType == STRUCTURE_ROAD) {
//                         //                 let road = building.id;
//                         //                 if(room.memory.keepTheseRoads && !_.includes(room.memory.keepTheseRoads, road, 0)) {
//                         //                     room.memory.keepTheseRoads.push(road);
//                         //                 }
//                         //             }
//                         //         }
//                         //     }
//                         // }

//                         let MyRamparts = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) <= 10});
//                         if(myConstructionSites.length == 0 && Game.shard.name !== "shard3") {
//                             for(let rampart of MyRamparts) {
//                                 let lookForStructsHere = rampart.pos.lookFor(LOOK_STRUCTURES);
//                                 if(lookForStructsHere.length == 1) {
//                                     rampart.pos.createConstructionSite(STRUCTURE_ROAD);
//                                 }
//                                 else {
//                                     for(let building of lookForExistingStructures) {
//                                         if(building.structureType == STRUCTURE_ROAD) {
//                                             if(room.memory.keepTheseRoads && !_.includes(room.memory.keepTheseRoads, building.id, 0)) {
//                                                 room.memory.keepTheseRoads.push(building.id);
//                                             }
//                                         }
//                                     }
//                                 }
//                             }
//                         }


//                     }


//                     let extractor = Game.getObjectById(room.memory.Structures.extractor) || room.findExtractor();
//                     let mineral = Game.getObjectById(room.memory.mineral) || room.findMineral();
//                     if(!extractor) {
//                         room.createConstructionSite(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR);
//                     }
//                     else {
//                         room.memory.extractor = extractor.id;
//                     }

//                     let pathFromStorageToMineral = PathFinder.search(storage.pos, {pos:mineral.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
//                     let RampartLocationMineral = pathFromStorageToMineral.path[pathFromStorageToMineral.path.length - 1]
//                     if(storage.pos.getRangeTo(RampartLocationMineral) >= 8) {
//                         RampartLocationMineral.createConstructionSite(STRUCTURE_RAMPART);
//                     }

//                     // 🔥 步骤2: 注释高级建筑道路 - 新系统通过布局处理
//                     // pathBuilder(pathFromStorageToMineral, STRUCTURE_ROAD, room);

//                     if(room.terminal) {
//                         let pathFromStorageToTerminal = PathFinder.search(storage.pos, {pos:room.terminal.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
//                         // pathBuilder(pathFromStorageToTerminal, STRUCTURE_ROAD, room);
//                     }

//                 }
//             }

//         }



//         // if(spawn && !storage && room.controller.level < 4) {
//         //     let spawnNeighbours = getNeighbours(spawn.pos, checkerboard);
//         //     spawnNeighbours.sort((a,b) => new RoomPosition (a.x, a.y, room.name).getRangeTo(spawn) - new RoomPosition (b.x, b.y, room.name).getRangeTo(spawn));
//         //     pathBuilder(spawnNeighbours, STRUCTURE_EXTENSION, room, false);
//         // }
//         if(storage) {
//             let storageNeighbours = getNeighbours(storage.pos, checkerboard);
//             storageNeighbours = storageNeighbours.filter(function(location) {return location.x > 0 && location.x < 49 && location.y > 0 && location.y < 49;})
//             storageNeighbours.sort((a,b) => new RoomPosition (a.x, a.y, room.name).getRangeTo(storage) - new RoomPosition (b.x, b.y, room.name).getRangeTo(storage));

//             if(room.controller.level < 4) {
//                 pathBuilder(storageNeighbours, STRUCTURE_EXTENSION, room, false);
//             }


//             if(room.controller.level >= 4) {
//                 pathBuilder(storageNeighbours, STRUCTURE_EXTENSION, room, false);

//                 // 🔥 步骤2: 注释Storage周围道路 - 新系统通过布局处理
//                 // let aroundStorageList = [
//                 //     new RoomPosition(storage.pos.x + 1, storage.pos.y + 1, room.name),
//                 //     new RoomPosition(storage.pos.x + 1, storage.pos.y - 1, room.name),
//                 //     new RoomPosition(storage.pos.x -1, storage.pos.y + 1, room.name),
//                 //     new RoomPosition(storage.pos.x -1, storage.pos.y - 1, room.name),
//                 //     new RoomPosition(storage.pos.x + 1, storage.pos.y, room.name),
//                 //     new RoomPosition(storage.pos.x - 1, storage.pos.y, room.name),
//                 //     new RoomPosition(storage.pos.x, storage.pos.y + 1, room.name),
//                 //     new RoomPosition(storage.pos.x, storage.pos.y - 1, room.name),
//                 // ]

//                 // pathBuilder(aroundStorageList, STRUCTURE_ROAD, room, false);
//             }

//             // 🔥 步骤2: 注释Terminal周围道路 - 新系统通过布局处理
//             // if(room.terminal && room.controller.level >= 6) {
//             //     let aroundTerminalList = [
//             //         new RoomPosition(room.terminal.pos.x + 1, room.terminal.pos.y, room.name),
//             //         // new RoomPosition(room.terminal.pos.x - 1, room.terminal.pos.y, room.name),
//             //         new RoomPosition(room.terminal.pos.x, room.terminal.pos.y + 1, room.name),
//             //         new RoomPosition(room.terminal.pos.x, room.terminal.pos.y - 1, room.name),
//             //     ]
//             //     pathBuilder(aroundTerminalList, STRUCTURE_ROAD, room, false);

//             //     let lookterminallocation = room.terminal.pos.lookFor(LOOK_STRUCTURES);
//             //     if(lookterminallocation.length == 1) {
//             //         room.terminal.pos.createConstructionSite(STRUCTURE_RAMPART);
//             //     }
//             // }
//         }


//         // 🔥 步骤2: 注释防御墙连接道路 - 新系统通过布局处理
//         // if(room.controller.level >= 5 && storage && myConstructionSites == 0) {
//         //     let ramparts = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) == 10});
//         //     if(ramparts.length > 0) {
//         //         let topLeftRamparts = ramparts.filter(function(rampart) {return rampart.pos.x < storage.pos.x-1 && rampart.pos.y < storage.pos.y-1;});
//         //         if(topLeftRamparts.length > 0) {
//         //             // topLeftRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
//         //             let closestTopLeftRampart = storage.pos.findClosestByRange(topLeftRamparts);
//         //             let pathFromStorageToFurthestTopLeftRampart = PathFinder.search(storage.pos, {pos:closestTopLeftRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
//         //             // pathBuilder(pathFromStorageToFurthestTopLeftRampart, STRUCTURE_ROAD, room);
//         //         }
//         //         let topRightRamparts = ramparts.filter(function(rampart) {return rampart.pos.x > storage.pos.x+1 && rampart.pos.y < storage.pos.y-1;});
//         //         if(topRightRamparts.length > 0) {
//         //             // topRightRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
//         //             let closestTopRightRampart = storage.pos.findClosestByRange(topRightRamparts);
//         //             let pathFromStorageToFurthestTopRightRampart = PathFinder.search(storage.pos, {pos:closestTopRightRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
//         //             // pathBuilder(pathFromStorageToFurthestTopRightRampart, STRUCTURE_ROAD, room);
//         //         }
//         //         let bottomRightRamparts = ramparts.filter(function(rampart) {return rampart.pos.x > storage.pos.x+1 && rampart.pos.y > storage.pos.y+1;});
//         //         if(bottomRightRamparts.length > 0) {
//         //             // bottomRightRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
//         //             let closestBottomRightRampart = storage.pos.findClosestByRange(bottomRightRamparts);
//         //             let pathFromStorageToFurthestBottomRightRampart = PathFinder.search(storage.pos, {pos:closestBottomRightRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
//         //             // pathBuilder(pathFromStorageToFurthestBottomRightRampart, STRUCTURE_ROAD, room);
//         //         }

//         //         let bottomLeftRamparts = ramparts.filter(function(rampart) {return rampart.pos.x < storage.pos.x-1 && rampart.pos.y > storage.pos.y+1;});
//         //         if(bottomLeftRamparts.length > 0) {
//         //             // bottomLeftRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
//         //             let closestBottomLeftRampart = storage.pos.findClosestByRange(bottomLeftRamparts);
//         //             let pathFromStorageToFurthestBottomLeftRampart = PathFinder.search(storage.pos, {pos:closestBottomLeftRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
//         //             // pathBuilder(pathFromStorageToFurthestBottomLeftRampart, STRUCTURE_ROAD, room);
//         //         }
//         //     }
//         // }


//         if(room.controller.level >= 6 && storage) {
//             let sources = room.find(FIND_SOURCES);

//             sources.forEach(source => {
//                 let open = source.pos.getOpenPositionsIgnoreCreeps();
//                 findOpenSpotsForExtensions(open, storage, room, source.pos, source);
//             });
//         }





// // IMPORTNAT DO NOT DELETE
//         let links = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LINK);}});

//         if(room.controller.level >= 5) {
//             let sources = room.find(FIND_SOURCES);
//             if(sources.length > 0) {
//             sources.forEach(source => {
//                 let sourceLinks = source.pos.findInRange(links, 2);
//                 if(sourceLinks.length == 0) {
//                     let open = source.pos.getOpenPositionsIgnoreCreeps();
//                     findTwoOpenSpotsForLink(open, storage, room);
//                 }
//                 for(let link of sourceLinks) {
//                     if(storage.pos.getRangeTo(link) > 7) {
//                         link.pos.createConstructionSite(STRUCTURE_RAMPART);
//                     }
//                 }
//             }
//         )};
//         }

//         if(room.controller.level >= 6) {
//             if(storage) {
//                 let storageLinkPosition = new RoomPosition(storage.pos.x-2, storage.pos.y, room.name);
//                 let buildingsHere = storageLinkPosition.lookFor(LOOK_STRUCTURES);
//                 let found = false;
//                 for(let building of buildingsHere) {
//                     if(building.structureType == STRUCTURE_LINK) {
//                         found = true;
//                     }
//                 }
//                 if(!found) {
//                     new RoomVisual(room.name).circle(storageLinkPosition.x, storageLinkPosition.y, {fill: 'transparent', radius: .75, stroke: 'red'});
//                     let positionsList = [];
//                     positionsList.push(storageLinkPosition);

//                     DestroyAndBuild(room, positionsList, STRUCTURE_LINK);
//                 }

//                 if(!room.terminal) {
//                     let terminalPosition = new RoomPosition(storage.pos.x - 1, storage.pos.y + 2, room.name);
//                     let positionsList = [];
//                     positionsList.push(terminalPosition);
//                     new RoomVisual(room.name).circle(terminalPosition.x, terminalPosition.y, {fill: 'transparent', radius: .75, stroke: 'green'});

//                     DestroyAndBuild(room, positionsList, STRUCTURE_TERMINAL);
//                 }
//             }
//         }
//         if(room.controller.level >= 3) {
//             if(storage) {
//                 let storageX = storage.pos.x;
//                 let storageY = storage.pos.y;
//                 let tower_raw_locations = [
//                     [storageX + -5,storageY + -7],
//                     [storageX + -3,storageY + -7],
//                     [storageX + -1,storageY + -7],
//                     [storageX + 1,storageY + -7],
//                     [storageX + 3,storageY + -7],
//                     [storageX + 5,storageY + -7],
//                     [storageX + -7,storageY + -5],
//                     [storageX + -7,storageY + -3],
//                     [storageX + -7,storageY + -1],
//                     [storageX + -7,storageY + 5],
//                     [storageX + -5,storageY + 7],
//                     [storageX + -3,storageY + 7],
//                     [storageX + -1,storageY + 7],
//                     [storageX + 1,storageY + 7],
//                     [storageX + 3,storageY + 7],
//                     [storageX + 5,storageY + 7],
//                     [storageX + 7,storageY + 5],
//                     [storageX + 7,storageY + 3],
//                     [storageX + 7,storageY + 1],
//                     [storageX + 7,storageY + -1],
//                     [storageX + 7,storageY + -3],
//                     [storageX + 7,storageY + -5],
//                     [storageX + 0,storageY + 7],
//                     [storageX + 7,storageY + 0],
//                     [storageX + 0,storageY + -7],
//                     [storageX + 4,storageY + 7],
//                     [storageX + -4,storageY + 7],
//                     [storageX + 7,storageY + 4],
//                     [storageX + 7,storageY + -4],
//                     [storageX + 4,storageY + -7],
//                     [storageX + -4,storageY + -7],
//                     [storageX + -7,storageY + 4],
//                     [storageX + -7,storageY + -4]
//                 ];
//                 let tower_locations_to_filter = [];
//                 for(let raw_location of tower_raw_locations) {
//                     if(raw_location[0] >= 2 && raw_location[1] >= 2 && raw_location[0] <= 47 && raw_location[1] <= 47) {
//                         tower_locations_to_filter.push(new RoomPosition(raw_location[0], raw_location[1], room.name));
//                     }
//                 }
//                 let tower_locations_to_shuffle = [];
//                 if(storage) {
//                     let myRampartsRangeGreaterThanSixAndLessThanTwelve = room.find(FIND_MY_STRUCTURES).filter(function(s) {return s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) < 12 && s.pos.getRangeTo(storage) > 6;});
//                     if(myRampartsRangeGreaterThanSixAndLessThanTwelve.length > 0) {
//                         for(let location of tower_locations_to_filter) {
//                             let closestRampartToLocation = location.getRangeTo(location.findClosestByRange(myRampartsRangeGreaterThanSixAndLessThanTwelve));
//                             if(closestRampartToLocation == 3) {
//                                 tower_locations_to_shuffle.push(location);
//                             }
//                         }

//                         const shuffle = arr => {
//                             for (let i = arr.length - 1; i > 0; i--) {
//                               const j = Math.floor(Math.random() * (i + 1));
//                               const temp = arr[i];
//                               arr[i] = arr[j];
//                               arr[j] = temp;
//                             }
//                             return arr;
//                         }
//                         let shuffled_tower_locations = shuffle(tower_locations_to_shuffle)
//                         console.log(shuffled_tower_locations);

//                         BuildIfICan(shuffled_tower_locations, STRUCTURE_TOWER);
//                     }

//                 }
//                 else {
//                     BuildIfICan(tower_locations_to_filter, STRUCTURE_TOWER);
//                 }

//             }
//         }
//     }

//     // 处理需要搬运资源的建筑拆除任务
//     handleResourceDismantling(room);
// }


// 🔥 步骤1: 注释旧辅助函数 - 新系统有更好的拆除逻辑
// function DestroyAndBuild(room, LocationsList, StructureType:string) {
//     for(let location of LocationsList) {
//         let lookForExistingStructures = location.lookFor(LOOK_STRUCTURES);
//         if(lookForExistingStructures.length > 0) {
//             for(let existingstructure of lookForExistingStructures) {
//                 if(existingstructure.structureType !== StructureType && existingstructure.structureType !== STRUCTURE_RAMPART) {
//                     // 检查是否是需要特殊处理的建筑
//                     if(existingstructure.structureType === STRUCTURE_STORAGE || existingstructure.structureType === STRUCTURE_TERMINAL) {
//                         // 检查建筑是否有资源
//                         let hasResources = false;
//                         if(existingstructure.structureType === STRUCTURE_STORAGE) {
//                             let storage = existingstructure as StructureStorage;
//                             if(storage.store && Object.keys(storage.store).length > 0) {
//                                 hasResources = true;
//                             }
//                         } else if(existingstructure.structureType === STRUCTURE_TERMINAL) {
//                             let terminal = existingstructure as StructureTerminal;
//                             if(terminal.store && Object.keys(terminal.store).length > 0) {
//                                 hasResources = true;
//                             }
//                         }

//                         // 检查是否属于其他房间（通过位置判断）
//                         let isOtherRoomBuilding = false;
//                         if(existingstructure.pos.roomName !== room.name) {
//                             isOtherRoomBuilding = true;
//                         }

//                         if(hasResources && isOtherRoomBuilding) {
//                             // 标记需要搬运的建筑，而不是立即摧毁
//                             if(!room.memory.buildingsToDismantle) {
//                                 room.memory.buildingsToDismantle = [];
//                             }

//                             let existingTask = room.memory.buildingsToDismantle.find(task => task.id === existingstructure.id);
//                             if(!existingTask) {
//                                 room.memory.buildingsToDismantle.push({
//                                     id: existingstructure.id,
//                                     pos: existingstructure.pos,
//                                     structureType: existingstructure.structureType,
//                                     hasResources: true,
//                                     markedTime: Game.time,
//                                     targetStructureType: StructureType
//                                 });
//                                 console.log(`标记需要搬运的建筑: ${existingstructure.structureType} 在 ${location.roomName} 位置 ${existingstructure.pos.x},${existingstructure.pos.y}`);
//                             }
//                             continue; // 跳过摧毁，等待搬运
//                         }
//                     }

//                     existingstructure.destroy();
//                 }
//             }
//         }
//         location.createConstructionSite(StructureType);
//     }
// }

// 🔥 步骤1: 注释旧辅助函数 - 新系统统一处理建造
// function BuildIfICan(LocationsList, StructureType:string) {
//     let ramparts;
//     if(LocationsList.length > 0) {
//         let storage:any = Game.getObjectById(Game.rooms[LocationsList[0].roomName].memory.Structures.storage);

//         ramparts = Game.rooms[LocationsList[0].roomName].find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_RAMPART)}});

//         if(storage && ramparts.length > 0) {
//             ramparts = ramparts.filter(rampart => rampart.pos.getRangeTo(storage) <= 10);
//         }
//     }

//     _.forEach(LocationsList, function(location) {
//         let lookForExistingConstructionSites = location.lookFor(LOOK_CONSTRUCTION_SITES);
//         let lookForExistingStructures = location.lookFor(LOOK_STRUCTURES);

//         if(lookForExistingConstructionSites.length > 0) {
//             return;
//         }

//         if(lookForExistingStructures.length > 0) {
//             // 如果是道路，且在rampart范围内，保留
//             if(lookForExistingStructures[0].structureType == STRUCTURE_ROAD && ramparts && ramparts.length > 0) {
//                 let isNearRampart = false;
//                 for(let rampart of ramparts) {
//                     if(location.getRangeTo(rampart) <= 3) {
//                         isNearRampart = true;
//                         break;
//                     }
//                 }
//                 if(isNearRampart) {
//                     return;
//                 }
//             }

//             // 如果是container，且在source附近，保留
//             if(lookForExistingStructures[0].structureType == STRUCTURE_CONTAINER) {
//                 let sources = Game.rooms[location.roomName].find(FIND_SOURCES);
//                 for(let source of sources) {
//                     if(location.getRangeTo(source) <= 2) {
//                         return;
//                     }
//                 }
//             }

//             lookForExistingStructures[0].destroy();
//         }

//         location.createConstructionSite(StructureType);
//     });
// }

// 🔥 步骤1: 注释旧辅助函数 - 新系统通过布局处理
// function findTwoOpenSpotsForLink(open:Array<RoomPosition>, storage, room) {
//     if(open.length > 1) {
//         open.sort((a,b) => a.findPathTo(storage, {ignoreCreeps:true}).length - b.findPathTo(storage, {ignoreCreeps:true}).length)
//         open = open.filter(position => position.findPathTo(storage.pos, {ignoreCreeps:true}).length < open[0].findPathTo(storage.pos, {ignoreCreeps:true}).length + 3);
//         if(open.length > 2) {
//             open = open.slice(0, 2);
//         }

//         for(let position of open) {
//             let lookForExistingConstructionSites = position.lookFor(LOOK_CONSTRUCTION_SITES);
//             let lookForExistingStructures = position.lookFor(LOOK_STRUCTURES);
//             if(lookForExistingConstructionSites.length == 0 && lookForExistingStructures.length == 0) {
//                 position.createConstructionSite(STRUCTURE_LINK);
//             }
//         }
//     }
// }

// 🔥 步骤1: 注释旧辅助函数 - 新系统通过布局处理
// function findOpenSpotsForExtensions(open:Array<RoomPosition>, storage, room, origin, source) {
//     if(open.length > 1) {
//         open.sort((a,b) => a.findPathTo(storage, {ignoreCreeps:true}).length - b.findPathTo(storage, {ignoreCreeps:true}).length)
//         open = open.filter(position => position.findPathTo(storage.pos, {ignoreCreeps:true}).length < open[0].findPathTo(storage.pos, {ignoreCreeps:true}).length + 3);
//         if(open.length > 5) {
//             open = open.slice(0, 5);
//         }

//         for(let position of open) {
//             let lookForExistingConstructionSites = position.lookFor(LOOK_CONSTRUCTION_SITES);
//             let lookForExistingStructures = position.lookFor(LOOK_STRUCTURES);
//             if(lookForExistingConstructionSites.length == 0 && lookForExistingStructures.length == 0) {
//                 position.createConstructionSite(STRUCTURE_EXTENSION);
//             }
//         }
//     }
// }

// ✅ 保留跨房间道路建造 - 新系统未覆盖此功能
function Build_Remote_Roads(room) {
    console.log(`Building remote roads for room ${room.name}`);
    if(room.memory.danger) {
        console.log(`Room ${room.name} is in danger, skipping road building`);
        return;
    }
    const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
    if (!storage) {
        console.log(`No storage found in room ${room.name}`);
        return;
    }

    const resourceData = _.get(room.memory, ['resources']);
    console.log(`Resource data for room ${room.name}:`, JSON.stringify(resourceData));

    _.forEach(resourceData, function(data, targetRoomName){
        // We want to build roads to remote rooms, not the current room
        if(room.name !== targetRoomName) {
            _.forEach(data.energy, function(values, sourceId:any) {
                const source:any = Game.getObjectById(sourceId);
                // Check if we have visibility of the source
                if(source != null && storage) {
                    const pathFromStorageToRemoteSource = PathFinder.search(
                        storage.pos,
                        {pos:source.pos, range:1},
                        {
                            plainCost: 1,
                            swampCost: 3,
                            roomCallback: (roomName: string) => false,
                            maxRooms: 16  // Allow cross-room pathing
                        }
                    );

                    if(!pathFromStorageToRemoteSource.incomplete) {
                        const containerSpot = pathFromStorageToRemoteSource.path[pathFromStorageToRemoteSource.path.length - 1];
                        values.pathLength = pathFromStorageToRemoteSource.path.length;

                        if(containerSpot && Game.rooms[containerSpot.roomName]) {
                            console.log(`Creating container construction site at (${containerSpot.x}, ${containerSpot.y}) in room ${containerSpot.roomName}`);
                            Game.rooms[containerSpot.roomName].createConstructionSite(containerSpot.x, containerSpot.y, STRUCTURE_CONTAINER);
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
    if(room.controller.level == 4 && room.memory.data && room.memory.data.DOBug && (room.memory.data.DOGug == 3 || room.memory.data.DOBug == 4)) {
        if(room.memory.data.DOBug == 3) {
            const spawns = room.find(FIND_MY_SPAWNS);
            let spawn;
            if(spawns.length > 0) {
                spawn = spawns[0];
            }
            const storagePosition = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, room.name);
            const lookForStoragePositionBuildings = storagePosition.lookFor(LOOK_STRUCTURES);
            for(const building of lookForStoragePositionBuildings) {
                if((building as any).structureType === STRUCTURE_CONTAINER) {
                    building.destroy();
                }
            }
        }
        if(room.memory.data.DOBug == 4) {
            const spawns = room.find(FIND_MY_SPAWNS);
            let spawn;
            if(spawns.length > 0) {
                spawn = spawns[0];
            }
            const storagePosition = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, room.name);
            storagePosition.createConstructionSite(STRUCTURE_STORAGE);
        }
    }
}

// ✅ 保留资源处理函数 - 特殊功能
function handleResourceDismantling(room) {
    if(!room.memory.buildingsToDismantle || room.memory.buildingsToDismantle.length === 0) {
        return;
    }

    const buildingsToDismantle = [...room.memory.buildingsToDismantle];

    for(const task of buildingsToDismantle) {
        const building = Game.getObjectById(task.id);
        if(!building) {
            // 建筑已不存在，从任务列表中移除
            room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
            continue;
        }

        // 检查是否还有资源
        let hasResources = false;
        if((building as any).structureType === STRUCTURE_STORAGE) {
            const storage = building as StructureStorage;
            if(storage.store && Object.keys(storage.store).some(resource => storage.store[resource] > 0)) {
                hasResources = true;
            }
        } else if((building as any).structureType === STRUCTURE_TERMINAL) {
            const terminal = building as StructureTerminal;
            if(terminal.store && Object.keys(terminal.store).some(resource => terminal.store[resource] > 0)) {
                hasResources = true;
            }
        }

        if(!hasResources) {
            // 没有资源了，可以安全拆除
            const structure = building as AnyStructure;
            if(structure.destroy) {
                structure.destroy();
            }
            room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
            console.log(`拆除建筑: ${task.structureType} 在 ${task.pos.roomName} 位置 ${task.pos.x},${task.pos.y}`);
        } else {
            // 还有资源，检查是否需要生成搬运工
            const existingHaulers = countExistingHaulers(room, task.id);
            const neededHaulers = calculateHaulersNeeded(building);

            if(existingHaulers < neededHaulers) {
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
    const haulers = Object.values(Game.creeps).filter(creep =>
        creep.memory.homeRoom === room.name &&
        creep.memory.role === 'resourceHauler' &&
        creep.memory.targetBuildingId === buildingId
    );

    return haulers.length;
}

function spawnHauler(room, task) {
    const body = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
    const newName = 'ResourceHauler-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length > 0 && spawns[0].spawnCreep(body, newName, {
        memory: {
            role: 'resourceHauler',
            homeRoom: room.name,
            targetBuildingId: task.id,
            targetPos: task.pos,
            working: false
        }
    }) === OK) {
        console.log(`生成资源搬运工: ${newName} 目标建筑: ${task.id}`);
    }
}

/**
 * 根据布局建造建筑（支持策略配置）
 */
function buildFromLayout(room: Room): void {
    if (!Memory.roomPlanner || !Memory.roomPlanner[room.name]) {
        return;
    }

    // 🔍 检查策略配置
    const strategy = Memory.buildingStrategy?.[room.name];
    const mode = strategy?.mode || 'AUTO';
    const enabled = strategy?.enabled !== false; // 默认启用

    if (!enabled) {
        return; // 策略禁用时跳过建造
    }

    const layout = Memory.roomPlanner[room.name].layout;
    if (!layout) {
        return;
    }

    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    const maxConstructionSites = 3; // 限制同时建造的工地数量

    if (constructionSites.length >= maxConstructionSites) {
        return;
    }

    let sitesPlaced = 0;

    // 🎯 使用优先级建造（统一逻辑）
    const buildOrder = [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,
        STRUCTURE_STORAGE,
        STRUCTURE_TERMINAL,
        STRUCTURE_LINK,
        STRUCTURE_TOWER,
        STRUCTURE_CONTAINER,
        STRUCTURE_ROAD,
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
                const hasStructure = look.some(obj => obj.type === LOOK_STRUCTURES);
                const hasConstruction = look.some(obj => obj.type === LOOK_CONSTRUCTION_SITES);

                if (!hasStructure && !hasConstruction) {
                    const result = room.createConstructionSite(pos.x, pos.y, structureType);
                    if (result === OK) {
                        sitesPlaced++;
                        console.log(`🔨 [${mode}] 建造 ${structureType} → ${room.name}(${pos.x},${pos.y})`);
                    }
                }
            }
        }
    }

    // 🗑️ 根据策略执行拆除（SMART/AGGRESSIVE）
    if (mode === 'SMART' || mode === 'AGGRESSIVE') {
        executeDemolition(room, layout, mode);
    }
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
                    console.log(`🗑️ [${mode}] 拆除 ${structure.structureType} ← ${room.name}(${structure.pos.x},${structure.pos.y}) - ${shouldRemove.reason}`);
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
    if (structure.structureType === STRUCTURE_ROAD ||
        structure.structureType === STRUCTURE_CONTAINER ||
        structure.structureType === STRUCTURE_RAMPART) {
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
    const currentRoom:any = Game.rooms[roomName];

    const costs = new PathFinder.CostMatrix;

    const storage = Game.getObjectById(currentRoom.memory.Structures.storage) || currentRoom.findStorage();


    const rampartLocations = [];
    for(let i = -10; i<11; i++) {
        for(let o = -10; o <11; o++) {
            if((i==10 || i==-10)) {
                const combinedX = storage.pos.x + i;
                if(combinedX >= 2 && combinedX <= 47) {
                    rampartLocations.push([i,o]);
                }
                else {
                    if(combinedX == 48) {
                        rampartLocations.push([i-1,o]);
                    }
                    else if(combinedX == 49) {
                        rampartLocations.push([i-2,o]);
                    }
                    else if(combinedX == 1) {
                        rampartLocations.push([i+1,o]);
                    }
                    else if(combinedX == 0) {
                        rampartLocations.push([i+2,o]);
                    }
                }
            }
            else if((o==10 || o==-10)) {
                const combinedY = storage.pos.y + o;
                if(combinedY >= 2 && combinedY <= 47) {
                    rampartLocations.push([i,o]);
                }
                else {
                    if(combinedY == 48) {
                        rampartLocations.push([i,o-1]);
                    }
                    else if(combinedY == 49) {
                        rampartLocations.push([i,o-2]);
                    }
                    else if(combinedY == 1) {
                        rampartLocations.push([i,o+1]);
                    }
                    else if(combinedY == 0) {
                        rampartLocations.push([i,o+2]);
                    }
                }
            }
        }
    }
    const storageRampartNeighbors = getNeighbours(storage.pos, rampartLocations);
    for(const location of storageRampartNeighbors) {
        costs.set(location.x, location.y, 255);
    }

    return costs;
}

// 🔥 步骤3: 清理导出 - 移除 construction 的默认导出
export { Build_Remote_Roads, Situational_Building, handleResourceDismantling, buildFromLayout };

// 🔥 步骤3: 移除默认导出 - 新系统不需要导出 construction
// export default construction;
