let checkerboard =
[[-2,-2], [2,-2], [2,0],
[-3,-3], [-1,-3],[-1,3], [1,-3], [3,-3], [-3,-1],[-3,1], [-3,3], [1,3], [3,3],
[-4,-4],[-2,-4],[0,-4],[2,-4],[4,-4],[-4,-2],[-4,2],[-4,0],[4,0],[-4,4],[-2,4],[0,4],[2,4],[4,4],
[-5,-5],[-5,3],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[-5,-3],[5,-3],[-5,1],[-5,-1],[5,3],[-5,5],[-3,5],[-1,5],[1,5],[3,5],[5,5],
[-6,-6],[-4,-6],[-2,-6],[0,-6],[2,-6],[4,-6],[6,-6],[-6,-4],[6,-4],[-6,-2],[-6,0],[-6,2],[6,-2],[6,0],[6,2],[-6,4],[6,4],[-6,6],[-4,6],[-2,6],[0,6],[2,6],[4,6],[6,6],
[-5,-7],[-3,-7],[-1,-7],[1,-7],[3,-7],[5,-7],[-7,-5],[-7,-3],[-7,-1],[-7,1],[-7,3],[-7,5],[-5,7],[-3,7],[-1,7],[1,7],[3,7],[5,7],[7,5],[7,3],[7,1],[7,-1],[7,-3],[7,-5],
[0,7],[7,0],[0,-7],[-7,0],[4,7],[-4,7],[7,4],[7,-4],[4,-7],[-4,-7],[-7,4],[-7,-4]];

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
                if(building.structureType == STRUCTURE_RAMPART && building.hits > 5000000) {
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

            _.forEach(lookForExistingStructures, function(building) {
                if(building.structureType == STRUCTURE_ROAD || building.structureType == STRUCTURE_CONTAINER) {
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

            _.forEach(lookForExistingStructures, function(building) {
                if(building.structureType == STRUCTURE_ROAD || building.structureType == STRUCTURE_CONTAINER) {
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



function construction(room) {
    console.log(`Construction function called for room ${room.name}`);

    if(!room.memory.construction) {
        room.memory.construction = {};
        console.log(`Initialized construction memory for room ${room.name}`);
    }

    if(room.controller.level >= 3 && room.storage) {
        console.log(`Room ${room.name} meets criteria for rampart calculation`);
        const storage = room.storage;
        const rampartLocations = [];
        for(let i = -10; i <= 10; i++) {
            for(let o = -10; o <= 10; o++) {
                let combinedX = storage.pos.x + i;
                let combinedY = storage.pos.y + o;

                // Ensure combinedX is within the boundaries
                if (combinedX < 2) combinedX = 2;
                if (combinedX > 47) combinedX = 47;

                // Ensure combinedY is within the boundaries
                if (combinedY < 2) combinedY = 2;
                if (combinedY > 47) combinedY = 47;

                if (Math.abs(i) == 10 || Math.abs(o) == 10) {
                    rampartLocations.push([combinedX, combinedY]);
                }
            }
        }

        console.log(`Calculated ${rampartLocations.length} rampart locations for room ${room.name}`);

        // Store rampartLocations in memory
        room.memory.construction.rampartLocations = rampartLocations;
        console.log(`Stored rampart locations in memory for room ${room.name}`);
    } else {
        console.log(`Room ${room.name} does not meet criteria for rampart calculation`);
    }

    // Log the current state of rampartLocations in memory
    console.log(`Current rampartLocations in memory for room ${room.name}:`, JSON.stringify(room.memory.construction.rampartLocations));


    if(room.controller.level == 1 && room.find(FIND_MY_SPAWNS).length == 0 && room.find(FIND_MY_CONSTRUCTION_SITES).length == 0 && Memory.target_colonise.room == room.name) {
        const position = Memory.target_colonise.spawn_pos
        Game.rooms[Memory.target_colonise.room].createConstructionSite(position.x, position.y, STRUCTURE_SPAWN);
        return;
    }

    if(room.controller.level === 1 || room.controller.level === 2) {
        const walls = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_WALL});
        for(const wall of walls) {
            wall.destroy();
        }
    }



    if(room.memory.danger) {
        return;
    }

    const myConstructionSites = room.find(FIND_MY_CONSTRUCTION_SITES).length





    const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();

    if(room.controller.level >= 5) {
        const nukes = room.find(FIND_NUKES);
        if(nukes.length > 4) {
            for(const nuke of nukes) {
                if(nuke.pos.getRangeTo(storage) > 7 && nuke.pos.getRangeTo(storage) < 13 && nuke.pos.x <= 44 && nuke.pos.y <= 44 && nuke.pos.x >= 5 && nuke.pos.y >= 5) {
                    const perimeter = [
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 1, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 1, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 2, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 2, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x + 3, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x + 2, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x + 2, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x + 1, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x + 1, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 1, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 1, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 2, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 2, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x - 3, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x - 2, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x - 2, nuke.pos.y + 3, room.name),
                        new RoomPosition(nuke.pos.x - 1, nuke.pos.y - 3, room.name),
                        new RoomPosition(nuke.pos.x - 1, nuke.pos.y + 3, room.name)
                    ];
                    for(const position of perimeter) {
                        if(position.getRangeTo(storage) > 10) {
                            position.createConstructionSite(STRUCTURE_RAMPART);
                        }
                    }
                }
            }
        }
    }


    if (room.controller.level >= 3 && storage && myConstructionSites == 0) {

        const rampartLocations = [];
        for (let i = -10; i <= 10; i++) {
            for (let o = -10; o <= 10; o++) {
                let combinedX = storage.pos.x + i;
                let combinedY = storage.pos.y + o;

                // Ensure combinedX is within the boundaries
                if (combinedX < 2) combinedX = 2;
                if (combinedX > 47) combinedX = 47;

                // Ensure combinedY is within the boundaries
                if (combinedY < 2) combinedY = 2;
                if (combinedY > 47) combinedY = 47;

                if (Math.abs(i) == 10 || Math.abs(o) == 10) {
                    // Adjust to ensure they remain as close to 10 away as possible within bounds
                    let adjustedX = storage.pos.x + (i < 0 ? -10 : 10);
                    let adjustedY = storage.pos.y + (o < 0 ? -10 : 10);

                    // Ensure the adjusted positions are within bounds
                    if (adjustedX < 2) adjustedX = 2;
                    if (adjustedX > 47) adjustedX = 47;

                    if (adjustedY < 2) adjustedY = 2;
                    if (adjustedY > 47) adjustedY = 47;

                    rampartLocations.push([adjustedX, adjustedY]);
                }
            }
        }

        const storageRampartNeighbors = getNeighbours(storage.pos, rampartLocations);
        const filteredStorageRampartNeighbors = storageRampartNeighbors.filter(position => position.x > 0 && position.x < 49 && position.y > 0 && position.y < 49);
        pathBuilder(filteredStorageRampartNeighbors, STRUCTURE_RAMPART, room, false);
    }




    if(room.controller.level >= 1 && room.memory.Structures.spawn) {
        const spawn = Game.getObjectById(room.memory.Structures.spawn) || room.findSpawn();

        // if(room.controller.level >= 3) {
        //     if(spawn) {
        //         let spawnlocationlook = spawn.pos.lookFor(LOOK_STRUCTURES);
        //         if(spawnlocationlook.length == 1) {
        //             spawn.pos.createConstructionSite(STRUCTURE_RAMPART);
        //         }
        //     }
        //     if(storage) {
        //         let storagelocationlook = storage.pos.lookFor(LOOK_STRUCTURES);
        //         if(storagelocationlook.length == 1) {
        //             storage.pos.createConstructionSite(STRUCTURE_RAMPART);
        //         }
        //     }
        // }

            // var index = array.indexOf(item);
            // if (index !== -1) {
            //   array.splice(index, 1);
            // }

            if(spawn) {
                const spawnlocationlook = spawn.pos.lookFor(LOOK_STRUCTURES);
                if(spawnlocationlook.length == 1) {
                    spawn.pos.createConstructionSite(STRUCTURE_RAMPART);
                }
            }

            if(storage ) {
                let LabLocations = [];

                let first_location_good = true;
                const testLabLocations = [];
                // Check if storage is far enough from edges
                if(storage.pos.x >= 5 && storage.pos.y <= 46) {
                    testLabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 1, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 2, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 1, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 2, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 3, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 3, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 2, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 1, room.name));
                    testLabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y, room.name));
                } else {
                    first_location_good = false;
                }
                for(const location of testLabLocations) {
                    const lookForWall = location.lookFor(LOOK_TERRAIN);
                    if(lookForWall.length > 0) {
                        if(lookForWall[0] == "wall") {
                            first_location_good = false;
                        }
                    }
                }


                if(first_location_good) {
                    LabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 1, room.name));

                    LabLocations.push(new RoomPosition(storage.pos.x - 4, storage.pos.y + 2, room.name));

                    LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y, room.name));

                    if(room.controller.level >= 7) {
                        LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 1, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 2, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x - 3, storage.pos.y + 3, room.name));
                    }
                    if(room.controller.level == 8) {
                        LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 3, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 2, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y + 1, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x - 5, storage.pos.y, room.name));
                    }

                }
                else if(!first_location_good) {
                    LabLocations = [];

                    LabLocations.push(new RoomPosition(storage.pos.x + 4, storage.pos.y + 4, room.name));

                    LabLocations.push(new RoomPosition(storage.pos.x + 4, storage.pos.y + 5, room.name));

                    LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 3, room.name));

                    if(room.controller.level >= 7) {
                        LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 4, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 5, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x + 3, storage.pos.y + 6, room.name));
                    }
                    if(room.controller.level == 8) {
                        LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 3, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 4, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 5, room.name));

                        LabLocations.push(new RoomPosition(storage.pos.x + 5, storage.pos.y + 6, room.name));
                    }
                }


                if(!first_location_good) {

                    checkerboard = [
                        [-2,-2], [2,-2], [2,0],
                        [-3,-3], [-1,-3],[-1,3], [1,-3], [3,-3], [-3,-1],[-3,1], [-3,3], [1,3],[-3,-2],[-3,2],[3,-2],[3,1],[3,-1],
                        [-4,-4],[-2,-4],[0,-4],[2,-4],[4,-4],[-4,-2],[-4,2],[-4,0],[-4,4],[-2,4],[0,4],[4,2],[4,-2],
                        [-5,-5],[-5,3],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[-5,-3],[5,-3],[-5,1],[-5,-1],[-5,5],[-3,5],[-1,5],[1,5],[0,5],[0,-5],[-5,0],[5,1],[5,-1],
                        [-6,-6],[-4,-6],[-2,-6],[0,-6],[2,-6],[4,-6],[6,-6],[-6,-4],[6,-4],[-6,-2],[-6,0],[-6,2],[6,-2],[6,0],[6,2],[-6,4],[-6,6],[-4,6],[-2,6],[0,6],[2,6],[4,6],[6,6],
                        [-5,-7],[-3,-7],[-1,-7],[1,-7],[3,-7],[5,-7],[-7,-5],[-7,-3],[-7,-1],[-7,1],[-7,3],[-7,5],[-5,7],[-3,7],[-1,7],[1,7],[3,7],[5,7],[7,5],[7,3],[7,1],[7,-1],[7,-3],[7,-5],
                        [0,7],[7,0],[0,-7],[-7,0],[4,7],[-4,7],[7,4],[7,-4],[4,-7],[-4,-7],[-7,4],[-7,-4]
                    ];

                }
                else {
                    checkerboard = [
                        [-2,-2], [2,-2], [2,0],
                        [-3,-3], [-1,-3],[-1,3], [1,-3], [3,-3], [1,3], [3,3],[-3,-2],[3,-2],[3,-1],[3,1],
                        [-4,-4],[-2,-4],[0,-4],[2,-4],[4,-4],[-4,-2],[-4,4],[-2,4],[0,4],[2,4],[4,4],[4,-2],[4,2],
                        [-5,-5],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[-5,-3],[5,-3],[-5,-1],[5,3],[-5,5],[-3,5],[-1,5],[1,5],[3,5],[5,5],[0,5],[0,-5],[5,1],[5,-1],
                        [-6,-6],[-4,-6],[-2,-6],[0,-6],[2,-6],[4,-6],[6,-6],[-6,-4],[6,-4],[-6,-2],[6,-2],[6,0],[6,2],[-6,4],[6,4],[-6,6],[-4,6],[-2,6],[0,6],[2,6],[4,6],[6,6],
                        [-5,-7],[-3,-7],[-1,-7],[1,-7],[3,-7],[5,-7],[-7,-5],[-7,-3],[-7,-1],[-7,5],[-5,7],[-3,7],[-1,7],[1,7],[3,7],[5,7],[7,5],[7,3],[7,1],[7,-1],[7,-3],[7,-5],
                        [0,7],[7,0],[0,-7],[4,7],[-4,7],[7,4],[7,-4],[4,-7],[-4,-7],[-7,4],[-7,-4]
                    ];

                }

                if(room.controller.level >= 6 && room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LAB);}}).length <= 10) {

                    DestroyAndBuild(room, LabLocations, STRUCTURE_LAB);

                }
                const labsInRoom = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LAB);}})
                if(labsInRoom.length > 0) {
                    for(const lab of labsInRoom) {
                        if(lab.pos.lookFor(LOOK_STRUCTURES).length == 1) {
                            lab.pos.createConstructionSite(STRUCTURE_RAMPART);
                        }
                    }
                }
            }





        if(storage) {
            const binLocation = new RoomPosition(storage.pos.x, storage.pos.y + 1, room.name);
            const lookForExistingStructuresOnBinLocation = binLocation.lookFor(LOOK_STRUCTURES);
            if(lookForExistingStructuresOnBinLocation.length > 0) {
                for(const existingStructure of lookForExistingStructuresOnBinLocation) {
                    if(existingStructure.structureType == STRUCTURE_ROAD) {
                        room.memory.keepTheseRoads.push(existingStructure.id);
                    }
                    if(existingStructure.structureType != STRUCTURE_CONTAINER && existingStructure.structureType != STRUCTURE_ROAD && existingStructure.structureType != STRUCTURE_SPAWN && existingStructure.structureType != STRUCTURE_STORAGE) {
                        existingStructure.destroy();
                    }
                }
            }
            else if(room.energyCapacityAvailable > 500) {
                binLocation.createConstructionSite(STRUCTURE_CONTAINER);
            }
            if(lookForExistingStructuresOnBinLocation.length == 1 && lookForExistingStructuresOnBinLocation[0].structureType == STRUCTURE_ROAD) {
                binLocation.createConstructionSite(STRUCTURE_CONTAINER);
            }

            if(room.controller.level > 4 && lookForExistingStructuresOnBinLocation.length == 1 && lookForExistingStructuresOnBinLocation[0].structureType == STRUCTURE_CONTAINER) {
                binLocation.createConstructionSite(STRUCTURE_ROAD);
            }
        }


        if(room.controller.level == 2 || room.controller.level == 3) {
            const storageLocation = new RoomPosition(spawn.pos.x, spawn.pos.y -2, room.name);
            const lookForExistingStructures = storageLocation.lookFor(LOOK_STRUCTURES);
            if(lookForExistingStructures.length != 0 && lookForExistingStructures[0].structureType != STRUCTURE_CONTAINER) {
                lookForExistingStructures[0].destroy();
            }
            else {
                room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_CONTAINER);
            }
        }
        const storageLocation = new RoomPosition(spawn.pos.x, spawn.pos.y -2, room.name);
        const lookForExistingStructures = storageLocation.lookFor(LOOK_STRUCTURES);
        if(room.controller.level >= 4 && !storage || room.controller.level == 4 && storage.structureType == STRUCTURE_CONTAINER) {
            if(lookForExistingStructures.length > 0) {
                if(lookForExistingStructures.length == 1 && lookForExistingStructures[0].structureType == STRUCTURE_RAMPART) {
                    room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_STORAGE);
                }
                else {
                    for(const building of lookForExistingStructures) {
                        if(building.structureType == STRUCTURE_CONTAINER) {
                            building.destroy();
                        }
                    }
                    // for(let building of lookForExistingStructures) {
                    //     if(building.)
                    // }
                    lookForExistingStructures[0].destroy();
                }

            }
            else {
                room.createConstructionSite(spawn.pos.x, spawn.pos.y -2, STRUCTURE_STORAGE);
            }
        }


        if(room.controller.level >= 1) {
            const sources = room.find(FIND_SOURCES);
            if(storage) {
                const pathFromStorageToSource1 = PathFinder.search(storage.pos, {pos:sources[0].pos, range:1}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
                const container1 = pathFromStorageToSource1.path[pathFromStorageToSource1.path.length - 1];
                // if(room.controller.level >= 6) {
                //     pathFromStorageToSource1.path.pop();
                // }
                if(storage.pos.getRangeTo(pathFromStorageToSource1.path[pathFromStorageToSource1.path.length - 1]) > 7 && room.controller.level >= 6) {
                    container1.createConstructionSite(STRUCTURE_RAMPART);
                }

                const pathFromStorageToSource2 = PathFinder.search(storage.pos, {pos:sources[1].pos, range:1}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
                const container2 = pathFromStorageToSource2.path[pathFromStorageToSource2.path.length - 1];
                // if(room.controller.level >= 6) {
                //     pathFromStorageToSource2.path.pop();
                // }
                if(storage.pos.getRangeTo(pathFromStorageToSource2.path[pathFromStorageToSource2.path.length - 1]) > 7 && room.controller.level >= 6) {
                    container2.createConstructionSite(STRUCTURE_RAMPART);
                }

                const pathFromStorageToController = PathFinder.search(storage.pos, {pos:room.controller.pos, range:2}, {plainCost: 1, swampCost: 3, maxRooms:1, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});

                pathFromStorageToController.path.pop();

                const linkLocation = pathFromStorageToController.path[pathFromStorageToController.path.length - 1];


                const mySpawns = room.find(FIND_MY_SPAWNS);

                if(room.controller.level <= 6 && room.controller.level >= 2) {
                    const lookStructs = linkLocation.lookFor(LOOK_STRUCTURES);
                    let foundContainer = false;

                    for(const building of lookStructs) {
                        if(building.structureType == STRUCTURE_TOWER || building.structureType == STRUCTURE_EXTENSION) {
                            building.destroy();
                        }
                        else if(building.structureType == STRUCTURE_CONTAINER) {
                            foundContainer = true;
                        }
                    }
                    if(!foundContainer) {
                        linkLocation.createConstructionSite(STRUCTURE_CONTAINER);
                    }
                }
                if(room.controller.level >= 7) {
                    const lookStructs = linkLocation.lookFor(LOOK_STRUCTURES);
                    for(const building of lookStructs) {
                        if(building.structureType !== STRUCTURE_LINK && building.structureType !== STRUCTURE_RAMPART && building.structureType !== STRUCTURE_ROAD) {
                            building.destroy();
                        }
                    }

                    const links = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LINK);}});
                    // room.controller.getRangeTo(room.controller.pos.findClosestByRange(links)) > 3room.controller.getRangeTo(room.controller.pos.findClosestByRange(links)) > 3
                    if(links.length == 3) {
                        const currentControllerLink:any = Game.getObjectById(room.memory.Structures.controllerLink);
                        if(currentControllerLink && currentControllerLink == STRUCTURE_CONTAINER || !currentControllerLink) {
                            room.createConstructionSite(linkLocation.x, linkLocation.y, STRUCTURE_LINK);
                        }

                    }


                    if(mySpawns.length < 2 && storage) {
                        const secondSpawnPosition = new RoomPosition(storage.pos.x, storage.pos.y - 2, room.name);
                        new RoomVisual(room.name).circle(secondSpawnPosition.x, secondSpawnPosition.y, {fill: 'transparent', radius: .75, stroke: '#BABABA'});
                        const listOfSpawnPositions = [];
                        listOfSpawnPositions.push(secondSpawnPosition);


                        DestroyAndBuild(room, listOfSpawnPositions, STRUCTURE_SPAWN);
                    }


                    if(storage) {
                        const FactoryPosition = new RoomPosition(storage.pos.x + 2, storage.pos.y + 2, room.name);
                        new RoomVisual(room.name).circle(FactoryPosition.x, FactoryPosition.y, {fill: 'transparent', radius: .75, stroke: 'blue'});
                        const listOfFactoryPositions = [];
                        listOfFactoryPositions.push(FactoryPosition);


                        DestroyAndBuild(room, listOfFactoryPositions, STRUCTURE_FACTORY);

                        // let lookforfactorypositionstructures = FactoryPosition.lookFor(LOOK_STRUCTURES)
                        // if(lookforfactorypositionstructures.length == 1 && lookforfactorypositionstructures[0].structureType == STRUCTURE_FACTORY) {
                        //     FactoryPosition.createConstructionSite(STRUCTURE_RAMPART);
                        // }
                    }

                }

                if(room.controller.level == 8 && mySpawns.length == 2) {
                    const thirdSpawnPosition = new RoomPosition(storage.pos.x + 2, storage.pos.y, room.name);
                    new RoomVisual(room.name).circle(thirdSpawnPosition.x, thirdSpawnPosition.y, {fill: 'transparent', radius: .75, stroke: '#BABABA'});
                    const listOfSpawnPositions = [];
                    listOfSpawnPositions.push(thirdSpawnPosition);


                    DestroyAndBuild(room, listOfSpawnPositions, STRUCTURE_SPAWN);
                }

                if(room.controller.level == 8 && myConstructionSites == 0) {
                    const observers = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_OBSERVER});
                    if(observers.length == 0) {
                        const listOfObserverPosition = [new RoomPosition(storage.pos.x - 2, storage.pos.y + 1, room.name)]
                        DestroyAndBuild(room, listOfObserverPosition, STRUCTURE_OBSERVER);
                    }

                    const nukers = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_NUKER});
                    if(nukers.length == 0) {
                        const listOfNukerPositions = [new RoomPosition(storage.pos.x + 4, storage.pos.y, room.name)]
                        DestroyAndBuild(room, listOfNukerPositions, STRUCTURE_NUKER);
                    }
                    // else if(nukers.length == 1) {
                    //     let NukerPosition = new RoomPosition(storage.pos.x + 4, storage.pos.y, room.name);
                    //     let lookForS = NukerPosition.lookFor(LOOK_STRUCTURES);
                    //     if(lookForS.length == 1) {
                    //         NukerPosition.createConstructionSite(STRUCTURE_RAMPART);
                    //     }
                    // }
                    const powerSpawns = room.find(FIND_MY_STRUCTURES, {filter:s => s.structureType == STRUCTURE_POWER_SPAWN});
                    if(powerSpawns.length == 0) {
                        const listOfPowerSpawnPositions = [new RoomPosition(storage.pos.x + 3, storage.pos.y + 2, room.name)]
                        DestroyAndBuild(room, listOfPowerSpawnPositions, STRUCTURE_POWER_SPAWN);
                    }
                    // else if(powerSpawns.length == 1) {
                    //     let PowerSpawnPosition = new RoomPosition(storage.pos.x + 3, storage.pos.y + 2, room.name);
                    //     let lookForS = PowerSpawnPosition.lookFor(LOOK_STRUCTURES);
                    //     if(lookForS.length == 1) {
                    //         PowerSpawnPosition.createConstructionSite(STRUCTURE_RAMPART);
                    //     }
                    // }
                }

                if(room.controller.level == 8 && myConstructionSites == 0 && room.controller.isPowerEnabled) {
                    const openPositionsAroundController = room.controller.pos.getOpenPositionsIgnoreCreeps();
                    for(const position of openPositionsAroundController) {
                        let found = false;
                        if(storage && (storage.pos.getRangeTo(position) >= 10 || storage.pos.findPathTo(position, { ignoreCreeps: true, ignoreRoads: true, swampCost: 1 }).length > 11)) {
                            const structuresHere = position.lookFor(LOOK_STRUCTURES);
                            if(structuresHere.length > 0) {
                                for(const building of structuresHere) {
                                    if(building.structureType == STRUCTURE_RAMPART) {
                                        found = true;
                                    }
                                }
                            }
                            if(!found) {
                                position.createConstructionSite(STRUCTURE_WALL);
                            }
                        }
                    }
                    // build walls around controller
                }



                if(room.controller.level < 6) {
                    Game.rooms[container1.roomName].createConstructionSite(container1.x, container1.y, STRUCTURE_CONTAINER);
                }
                if(room.controller.level >= 3) pathBuilder(pathFromStorageToSource1, STRUCTURE_ROAD, room);

                if(room.controller.level < 6) {
                    Game.rooms[container2.roomName].createConstructionSite(container2.x, container2.y, STRUCTURE_CONTAINER);
                }
                if(room.controller.level >= 3) pathBuilder(pathFromStorageToSource2, STRUCTURE_ROAD, room);

                if(room.controller.level >= 3) pathBuilder(pathFromStorageToController, STRUCTURE_ROAD, room);

                if(room.controller.level >= 6) {

                    if(storage) {

                        const extraRoadPositions = [
                            new RoomPosition(storage.pos.x-4, storage.pos.y, room.name),
                            new RoomPosition(storage.pos.x-3, storage.pos.y-1, room.name),
                            new RoomPosition(storage.pos.x-2, storage.pos.y-1, room.name),
                            new RoomPosition(storage.pos.x-2, storage.pos.y+2, room.name),
                            new RoomPosition(storage.pos.x-2, storage.pos.y+3, room.name),
                            new RoomPosition(storage.pos.x-3, storage.pos.y+4, room.name),
                            new RoomPosition(storage.pos.x-4, storage.pos.y+3, room.name)
                        ];

                        for(const position of extraRoadPositions) {
                            if(position.lookFor(LOOK_TERRAIN)[0] !== "wall") {
                                position.createConstructionSite(STRUCTURE_ROAD);
                            }

                            const lookForRoad = position.lookFor(LOOK_STRUCTURES);
                            if(lookForRoad.length > 0) {
                                for(const building of lookForRoad) {
                                    if(building.structureType == STRUCTURE_ROAD) {
                                        const road = building.id;
                                        if(room.memory.keepTheseRoads && !_.includes(room.memory.keepTheseRoads, road, 0)) {
                                            room.memory.keepTheseRoads.push(road);
                                        }
                                    }
                                }
                            }
                        }

                        const MyRamparts = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) <= 10});
                        if(myConstructionSites.length == 0 && Game.shard.name !== "shard3") {
                            for(const rampart of MyRamparts) {
                                const lookForStructsHere = rampart.pos.lookFor(LOOK_STRUCTURES);
                                if(lookForStructsHere.length == 1) {
                                    rampart.pos.createConstructionSite(STRUCTURE_ROAD);
                                }
                                else {
                                    for(const building of lookForExistingStructures) {
                                        if(building.structureType == STRUCTURE_ROAD) {
                                            if(room.memory.keepTheseRoads && !_.includes(room.memory.keepTheseRoads, building.id, 0)) {
                                                room.memory.keepTheseRoads.push(building.id);
                                            }
                                        }
                                    }
                                }
                            }
                        }


                    }


                    const extractor = Game.getObjectById(room.memory.Structures.extractor) || room.findExtractor();
                    const mineral = Game.getObjectById(room.memory.mineral) || room.findMineral();
                    if(!extractor) {
                        room.createConstructionSite(mineral.pos.x, mineral.pos.y, STRUCTURE_EXTRACTOR);
                    }
                    else {
                        room.memory.extractor = extractor.id;
                    }

                    const pathFromStorageToMineral = PathFinder.search(storage.pos, {pos:mineral.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
                    const RampartLocationMineral = pathFromStorageToMineral.path[pathFromStorageToMineral.path.length - 1]
                    if(storage.pos.getRangeTo(RampartLocationMineral) >= 8) {
                        RampartLocationMineral.createConstructionSite(STRUCTURE_RAMPART);
                    }

                    pathBuilder(pathFromStorageToMineral, STRUCTURE_ROAD, room);

                    if(room.terminal) {
                        const pathFromStorageToTerminal = PathFinder.search(storage.pos, {pos:room.terminal.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrix(roomName)});
                        pathBuilder(pathFromStorageToTerminal, STRUCTURE_ROAD, room);
                    }

                }
            }

        }



        // if(spawn && !storage && room.controller.level < 4) {
        //     let spawnNeighbours = getNeighbours(spawn.pos, checkerboard);
        //     spawnNeighbours.sort((a,b) => new RoomPosition (a.x, a.y, room.name).getRangeTo(spawn) - new RoomPosition (b.x, b.y, room.name).getRangeTo(spawn));
        //     pathBuilder(spawnNeighbours, STRUCTURE_EXTENSION, room, false);
        // }
        if(storage) {
            let storageNeighbours = getNeighbours(storage.pos, checkerboard);
            storageNeighbours = storageNeighbours.filter(function(location) {return location.x > 0 && location.x < 49 && location.y > 0 && location.y < 49;})
            storageNeighbours.sort((a,b) => new RoomPosition (a.x, a.y, room.name).getRangeTo(storage) - new RoomPosition (b.x, b.y, room.name).getRangeTo(storage));

            if(room.controller.level < 4) {
                pathBuilder(storageNeighbours, STRUCTURE_EXTENSION, room, false);
            }


            if(room.controller.level >= 4) {
                pathBuilder(storageNeighbours, STRUCTURE_EXTENSION, room, false);

                const aroundStorageList = [
                    new RoomPosition(storage.pos.x + 1, storage.pos.y + 1, room.name),
                    new RoomPosition(storage.pos.x + 1, storage.pos.y - 1, room.name),
                    new RoomPosition(storage.pos.x -1, storage.pos.y + 1, room.name),
                    new RoomPosition(storage.pos.x -1, storage.pos.y - 1, room.name),
                    new RoomPosition(storage.pos.x + 1, storage.pos.y, room.name),
                    new RoomPosition(storage.pos.x - 1, storage.pos.y, room.name),
                    new RoomPosition(storage.pos.x, storage.pos.y + 1, room.name),
                    new RoomPosition(storage.pos.x, storage.pos.y - 1, room.name),
                ]

                pathBuilder(aroundStorageList, STRUCTURE_ROAD, room, false);
            }

            if(room.terminal && room.controller.level >= 6) {
                const aroundTerminalList = [
                    new RoomPosition(room.terminal.pos.x + 1, room.terminal.pos.y, room.name),
                    // new RoomPosition(room.terminal.pos.x - 1, room.terminal.pos.y, room.name),
                    new RoomPosition(room.terminal.pos.x, room.terminal.pos.y + 1, room.name),
                    new RoomPosition(room.terminal.pos.x, room.terminal.pos.y - 1, room.name),
                ]
                pathBuilder(aroundTerminalList, STRUCTURE_ROAD, room, false);

                const lookterminallocation = room.terminal.pos.lookFor(LOOK_STRUCTURES);
                if(lookterminallocation.length == 1) {
                    room.terminal.pos.createConstructionSite(STRUCTURE_RAMPART);
                }
            }
        }


        if(room.controller.level >= 5 && storage && myConstructionSites == 0) {
            const ramparts = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) == 10});
            if(ramparts.length > 0) {
                const topLeftRamparts = ramparts.filter(function(rampart) {return rampart.pos.x < storage.pos.x-1 && rampart.pos.y < storage.pos.y-1;});
                if(topLeftRamparts.length > 0) {
                    // topLeftRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
                    const closestTopLeftRampart = storage.pos.findClosestByRange(topLeftRamparts);
                    const pathFromStorageToFurthestTopLeftRampart = PathFinder.search(storage.pos, {pos:closestTopLeftRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
                    pathBuilder(pathFromStorageToFurthestTopLeftRampart, STRUCTURE_ROAD, room);
                }
                const topRightRamparts = ramparts.filter(function(rampart) {return rampart.pos.x > storage.pos.x+1 && rampart.pos.y < storage.pos.y-1;});
                if(topRightRamparts.length > 0) {
                    // topRightRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
                    const closestTopRightRampart = storage.pos.findClosestByRange(topRightRamparts);
                    const pathFromStorageToFurthestTopRightRampart = PathFinder.search(storage.pos, {pos:closestTopRightRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
                    pathBuilder(pathFromStorageToFurthestTopRightRampart, STRUCTURE_ROAD, room);
                }
                const bottomRightRamparts = ramparts.filter(function(rampart) {return rampart.pos.x > storage.pos.x+1 && rampart.pos.y > storage.pos.y+1;});
                if(bottomRightRamparts.length > 0) {
                    // bottomRightRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
                    const closestBottomRightRampart = storage.pos.findClosestByRange(bottomRightRamparts);
                    const pathFromStorageToFurthestBottomRightRampart = PathFinder.search(storage.pos, {pos:closestBottomRightRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
                    pathBuilder(pathFromStorageToFurthestBottomRightRampart, STRUCTURE_ROAD, room);
                }

                const bottomLeftRamparts = ramparts.filter(function(rampart) {return rampart.pos.x < storage.pos.x-1 && rampart.pos.y > storage.pos.y+1;});
                if(bottomLeftRamparts.length > 0) {
                    // bottomLeftRamparts.sort((a,b) => b.pos.getRangeTo(storage) - a.pos.getRangeTo(storage));
                    const closestBottomLeftRampart = storage.pos.findClosestByRange(bottomLeftRamparts);
                    const pathFromStorageToFurthestBottomLeftRampart = PathFinder.search(storage.pos, {pos:closestBottomLeftRampart.pos, range:1}, {plainCost: 1, swampCost: 3, roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName)});
                    pathBuilder(pathFromStorageToFurthestBottomLeftRampart, STRUCTURE_ROAD, room);
                }
            }
        }


        if(room.controller.level >= 6 && storage) {
            const sources = room.find(FIND_SOURCES);

            sources.forEach(source => {
                const open = source.pos.getOpenPositionsIgnoreCreeps();
                findOpenSpotsForExtensions(open, storage, room, source.pos, source);
            });
        }








// IMPORTNAT DO NOT DELETE
        const links = room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LINK);}});

        if(room.controller.level >= 5) {
            const sources = room.find(FIND_SOURCES);
            if(sources.length > 0) {
            sources.forEach(source => {
                const sourceLinks = source.pos.findInRange(links, 2);
                if(sourceLinks.length == 0) {
                    const open = source.pos.getOpenPositionsIgnoreCreeps();
                    findTwoOpenSpotsForLink(open, storage, room);
                }
                for(const link of sourceLinks) {
                    if(storage.pos.getRangeTo(link) > 7) {
                        link.pos.createConstructionSite(STRUCTURE_RAMPART);
                    }
                }
            }
        )}
        }

        if(room.controller.level >= 6) {
            if(storage) {
                const storageLinkPosition = new RoomPosition(storage.pos.x-2, storage.pos.y, room.name);
                const buildingsHere = storageLinkPosition.lookFor(LOOK_STRUCTURES);
                let found = false;
                for(const building of buildingsHere) {
                    if(building.structureType == STRUCTURE_LINK) {
                        found = true;
                    }
                }
                if(!found) {
                    new RoomVisual(room.name).circle(storageLinkPosition.x, storageLinkPosition.y, {fill: 'transparent', radius: .75, stroke: 'red'});
                    const positionsList = [];
                    positionsList.push(storageLinkPosition);

                    DestroyAndBuild(room, positionsList, STRUCTURE_LINK);
                }

                if(!room.terminal) {
                    const terminalPosition = new RoomPosition(storage.pos.x - 1, storage.pos.y + 2, room.name);
                    const positionsList = [];
                    positionsList.push(terminalPosition);
                    new RoomVisual(room.name).circle(terminalPosition.x, terminalPosition.y, {fill: 'transparent', radius: .75, stroke: 'green'});

                    DestroyAndBuild(room, positionsList, STRUCTURE_TERMINAL);
                }
            }
        }
        if(room.controller.level >= 3) {
            if(storage) {
                const storageX = storage.pos.x;
                const storageY = storage.pos.y;
                const tower_raw_locations = [
                    [storageX + -5,storageY + -7],
                    [storageX + -3,storageY + -7],
                    [storageX + -1,storageY + -7],
                    [storageX + 1,storageY + -7],
                    [storageX + 3,storageY + -7],
                    [storageX + 5,storageY + -7],
                    [storageX + -7,storageY + -5],
                    [storageX + -7,storageY + -3],
                    [storageX + -7,storageY + -1],
                    [storageX + -7,storageY + 5],
                    [storageX + -5,storageY + 7],
                    [storageX + -3,storageY + 7],
                    [storageX + -1,storageY + 7],
                    [storageX + 1,storageY + 7],
                    [storageX + 3,storageY + 7],
                    [storageX + 5,storageY + 7],
                    [storageX + 7,storageY + 5],
                    [storageX + 7,storageY + 3],
                    [storageX + 7,storageY + 1],
                    [storageX + 7,storageY + -1],
                    [storageX + 7,storageY + -3],
                    [storageX + 7,storageY + -5],
                    [storageX + 0,storageY + 7],
                    [storageX + 7,storageY + 0],
                    [storageX + 0,storageY + -7],
                    [storageX + 4,storageY + 7],
                    [storageX + -4,storageY + 7],
                    [storageX + 7,storageY + 4],
                    [storageX + 7,storageY + -4],
                    [storageX + 4,storageY + -7],
                    [storageX + -4,storageY + -7],
                    [storageX + -7,storageY + 4],
                    [storageX + -7,storageY + -4]
                ];
                const tower_locations_to_filter = [];
                for(const raw_location of tower_raw_locations) {
                    if(raw_location[0] >= 2 && raw_location[1] >= 2 && raw_location[0] <= 47 && raw_location[1] <= 47) {
                        tower_locations_to_filter.push(new RoomPosition(raw_location[0], raw_location[1], room.name));
                    }
                }
                const tower_locations_to_shuffle = [];
                if(storage) {
                    const myRampartsRangeGreaterThanSixAndLessThanTwelve = room.find(FIND_MY_STRUCTURES).filter(function(s) {return s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) < 12 && s.pos.getRangeTo(storage) > 6;});
                    if(myRampartsRangeGreaterThanSixAndLessThanTwelve.length > 0) {
                        for(const location of tower_locations_to_filter) {
                            const closestRampartToLocation = location.getRangeTo(location.findClosestByRange(myRampartsRangeGreaterThanSixAndLessThanTwelve));
                            if(closestRampartToLocation == 3) {
                                tower_locations_to_shuffle.push(location);
                            }
                        }

                        const shuffle = arr => {
                            for (let i = arr.length - 1; i > 0; i--) {
                              const j = Math.floor(Math.random() * (i + 1));
                              const temp = arr[i];
                              arr[i] = arr[j];
                              arr[j] = temp;
                            }
                            return arr;
                        }
                        const shuffled_tower_locations = shuffle(tower_locations_to_shuffle)
                        console.log(shuffled_tower_locations);

                        BuildIfICan(shuffled_tower_locations, STRUCTURE_TOWER);
                    }

                }
                else {
                    BuildIfICan(tower_locations_to_filter, STRUCTURE_TOWER);
                }

            }
        }
    }

    // 处理需要搬运资源的建筑拆除任务
    handleResourceDismantling(room);
}


function DestroyAndBuild(room, LocationsList, StructureType:string) {
    for(const location of LocationsList) {
        const lookForExistingStructures = location.lookFor(LOOK_STRUCTURES);
        if(lookForExistingStructures.length > 0) {
            for(const existingstructure of lookForExistingStructures) {
                if(existingstructure.structureType !== StructureType && existingstructure.structureType !== STRUCTURE_RAMPART) {
                    // 检查是否是需要特殊处理的建筑
                    if(existingstructure.structureType === STRUCTURE_STORAGE || existingstructure.structureType === STRUCTURE_TERMINAL) {
                        // 检查建筑是否有资源
                        let hasResources = false;
                        if(existingstructure.structureType === STRUCTURE_STORAGE) {
                            const storage = existingstructure as StructureStorage;
                            if(storage.store && Object.keys(storage.store).length > 0) {
                                hasResources = true;
                            }
                        } else if(existingstructure.structureType === STRUCTURE_TERMINAL) {
                            const terminal = existingstructure as StructureTerminal;
                            if(terminal.store && Object.keys(terminal.store).length > 0) {
                                hasResources = true;
                            }
                        }

                        // 检查是否属于其他房间（通过位置判断）
                        let isOtherRoomBuilding = false;
                        if(existingstructure.pos.roomName !== room.name) {
                            isOtherRoomBuilding = true;
                        }

                        if(hasResources && isOtherRoomBuilding) {
                            // 标记需要搬运的建筑，而不是立即摧毁
                            if(!room.memory.buildingsToDismantle) {
                                room.memory.buildingsToDismantle = [];
                            }

                            const existingTask = room.memory.buildingsToDismantle.find(task => task.id === existingstructure.id);
                            if(!existingTask) {
                                room.memory.buildingsToDismantle.push({
                                    id: existingstructure.id,
                                    pos: existingstructure.pos,
                                    structureType: existingstructure.structureType,
                                    hasResources: true,
                                    markedTime: Game.time,
                                    targetStructureType: StructureType
                                });
                                console.log(`标记需要搬运的建筑: ${existingstructure.structureType} 在 ${location.roomName} 位置 ${existingstructure.pos.x},${existingstructure.pos.y}`);
                            }
                            continue; // 跳过摧毁，等待搬运
                        }
                    }

                    // 对于普通建筑或无资源的特殊建筑，直接摧毁
                    existingstructure.destroy();
                }
            }
        }
        else {
            room.createConstructionSite(location, StructureType);
        }
    }
}

function BuildIfICan(LocationsList, StructureType:string) {
    let ramparts;
    if(LocationsList.length > 0) {
        const storage:any = Game.getObjectById(Game.rooms[LocationsList[0].roomName].memory.Structures.storage);
        if(storage) {
            ramparts = Game.rooms[LocationsList[0].roomName].find(FIND_MY_STRUCTURES).filter(function(s) {return s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(storage) > 6;});
        }
    }
    for(const location of LocationsList) {
        const source = location.findClosestByRange(Game.rooms[location.roomName].find(FIND_SOURCES));
        if(location.getRangeTo(source) == 1) {
            continue;
        }

        if(ramparts.length > 0) {
            if(location.getRangeTo(location.findClosestByRange(ramparts)) > 4) {
                continue;
            }
        }

        const lookForExistingStructures = location.lookFor(LOOK_STRUCTURES);
        if(lookForExistingStructures.length > 0) {
            let canIBuild = true;
            for(const existingstructure of lookForExistingStructures) {
                if(existingstructure.structureType === STRUCTURE_ROAD || existingstructure.structureType === STRUCTURE_RAMPART || existingstructure.structureType === STRUCTURE_CONTAINER) {
                    continue;
                }
                else {
                    canIBuild = false;
                    break;
                }
            }

            if(canIBuild) {
                new RoomVisual(location.roomName).circle(location.x, location.y, {fill: 'full', radius: 0.25, stroke: 'black'});
                location.createConstructionSite(StructureType);
            }
        }
    }
}


function findTwoOpenSpotsForLink(open:Array<RoomPosition>, storage, room) {
    if(open.length > 1) {
        open.sort((a,b) => a.findPathTo(storage, {ignoreCreeps:true}).length - b.findPathTo(storage, {ignoreCreeps:true}).length)
        open = open.filter(position => position.findPathTo(storage.pos, {ignoreCreeps:true}).length < open[0].findPathTo(storage.pos, {ignoreCreeps:true}).length + 3);
        if(open.length > 1) {
            if(open.length == 2 && open[0].getRangeTo(open[1]) > 1) {
                const NewOpen = open[0].getOpenPositionsIgnoreCreeps();
                findTwoOpenSpotsForLink(NewOpen, storage, room)
            }
            else {
            // let closestOpen = storage.pos.findClosestByRange(open);
            new RoomVisual(room.name).circle(open[1].x, open[1].y, {fill: 'transparent', radius: 0.75, stroke: 'red'});
            for (let i = 1; i < open.length; i++) {
                const result = open[i].createConstructionSite(STRUCTURE_LINK);
                if(result == 0) {
                    return;
                }
            }
            }
        }
        else {
            const NewOpen = open[0].getOpenPositionsIgnoreCreeps();
            findTwoOpenSpotsForLink(NewOpen, storage, room)
        }
    }
    else {
        const NewOpen = open[0].getOpenPositionsIgnoreCreeps();
        findTwoOpenSpotsForLink(NewOpen, storage, room)
    }
}

function findOpenSpotsForExtensions(open:Array<RoomPosition>, storage, room, origin, source) {
    if(open.length > 1) {
        open.sort((a,b) => a.findPathTo(storage, {ignoreCreeps:true}).length - b.findPathTo(storage, {ignoreCreeps:true}).length)
        open = open.filter(position => position.findPathTo(storage.pos, {ignoreCreeps:true}).length < open[0].findPathTo(storage.pos, {ignoreCreeps:true}).length + 3);
        if(open.length > 1) {

            const pathFromSourceToStorage = source.pos.findPathTo(storage.pos, {ignoreCreeps:true});

            if(pathFromSourceToStorage.length > 0) {
                const firstLocation = pathFromSourceToStorage[0];

                const firstSpotOnPath = new RoomPosition(firstLocation.x, firstLocation.y, room.name);

                if(firstSpotOnPath.getRangeTo(storage) >= 8) {
                    const lookForBuildingsOnFirstSpotOnPath = firstSpotOnPath.lookFor(LOOK_STRUCTURES);
                    if(lookForBuildingsOnFirstSpotOnPath.length == 0 || lookForBuildingsOnFirstSpotOnPath.length == 1 && lookForBuildingsOnFirstSpotOnPath[0].structureType == STRUCTURE_ROAD) {
                        firstSpotOnPath.createConstructionSite(STRUCTURE_RAMPART);
                    }
                }


                const buildhere = firstSpotOnPath.getOpenPositionsIgnoreCreeps();

                const myLinks = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_LINK});
                if(myLinks.length >= 4) {
                    for (let i = 0; i < buildhere.length; i++) {
                        new RoomVisual(room.name).circle(buildhere[i].x, buildhere[i].y, {fill: 'transparent', radius: 0.75, stroke: 'white'});

                        const buildings = buildhere[i].lookFor(LOOK_STRUCTURES);
                        if(buildings.length == 0) {
                            let count = 0;
                            if(new RoomPosition(buildhere[i].x + 1, buildhere[i].y, room.name).lookFor(LOOK_TERRAIN)[0] == "wall") {
                                count ++;
                            }
                            if(new RoomPosition(buildhere[i].x - 1, buildhere[i].y, room.name).lookFor(LOOK_TERRAIN)[0] == "wall") {
                                count ++;
                            }
                            if(new RoomPosition(buildhere[i].x, buildhere[i].y + 1, room.name).lookFor(LOOK_TERRAIN)[0] == "wall") {
                                count ++;
                            }
                            if(new RoomPosition(buildhere[i].x, buildhere[i].y - 1, room.name).lookFor(LOOK_TERRAIN)[0] == "wall") {
                                count ++;
                            }
                            if(count < 2) {
                                buildhere[i].createConstructionSite(STRUCTURE_EXTENSION);
                            }
                        }
                    }
                }

                return;
            }
            else {
                console.log(room.name, 'this room sucks')
            }

        }
        else {
            const NewOpen = open[0].getOpenPositionsIgnoreCreeps();
            findOpenSpotsForExtensions(NewOpen, storage, room, open[0], source)
        }
    }
    else {
        const NewOpen = open[0].getOpenPositionsIgnoreCreeps();
        findOpenSpotsForExtensions(NewOpen, storage, room, open[0], source)
    }
}

    // let roomPositionArray = [];
    // for(let x = 1; x < 48; x++) {
    //     for(let y = 1; y < 48; y++) {
    //         roomPositionArray.push(new RoomPosition(x, y, roomName));
    //     }
    // }
    // let terrain = Game.map.getRoomTerrain(roomName);
    // let unWalkablePositions = _.filter(roomPositionArray, function(pos:any) {
    //     return terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL;});

    // for(let position of unWalkablePositions) {
    //     costs.set(position.x, position.y, 255);
    // }

    // let allowedRooms = { [ roomName ]: true };

    // if (allowedRooms[roomName] === undefined) {
    //     return false;
    // }




const makeStructuresCostMatrix = (roomName: string): boolean | CostMatrix => {
    const currentRoom = Game.rooms[roomName];
    if(currentRoom == undefined || currentRoom === undefined || !currentRoom || currentRoom === null || currentRoom == null) {
        return false;
    }
    const costs = new PathFinder.CostMatrix;

    const existingStructures = currentRoom.find(FIND_STRUCTURES);
    if(existingStructures.length > 0) {
        existingStructures.forEach(building => {
            if(building.structureType != STRUCTURE_RAMPART && building.structureType != STRUCTURE_CONTAINER && building.structureType != STRUCTURE_ROAD) {
                costs.set(building.pos.x, building.pos.y, 255);
            }
            // else {
            //     costs.set(building.pos.x, building.pos.y, 0);
            // }
        });
    }

    const storages = currentRoom.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_STORAGE});
    let storage;
    if(storages.length > 0) {
        storage = storages[0];
    }
    if(storage) {
        const storageX = storage.pos.x;
        const storageY = storage.pos.y;

        const listOfPositionsInFutureToBeBuilt = [
            [storageX + -2,storageY + -2],
            [storageX + 2,storageY + -2],
            [storageX + 2,storageY],
            [storageX + -3,storageY + -3],
            [storageX + -1,storageY + -3],
            [storageX + -1,storageY + 3],
            [storageX + 1,storageY + -3],
            [storageX + 3,storageY + -3],
            [storageX + 1,storageY + 3],
            [storageX + 3,storageY + 3],
            [storageX + -3,storageY + -2],
            [storageX + 3,storageY + -2],
            [storageX + -4,storageY + -4],
            [storageX + -2,storageY + -4],
            [storageX,storageY + -4],
            [storageX + 2,storageY + -4],
            [storageX + 4,storageY + -4],
            [storageX + -4,storageY + -2],
            [storageX + -4,storageY + 4],
            [storageX + -2,storageY + 4],
            [storageX + 0,storageY + 4],
            [storageX + 2,storageY + 4],
            [storageX + 4,storageY + 4],
            [storageX + -5,storageY + -5],
            [storageX + -3,storageY + -5],
            [storageX + -1,storageY + -5],
            [storageX + 1,storageY + -5],
            [storageX + 3,storageY + -5],
            [storageX + 5,storageY + -5],
            [storageX + -5,storageY + -3],
            [storageX + 5,storageY + -3],
            [storageX + -5,storageY + -1],
            [storageX + 5,storageY + 3],
            [storageX + -5,storageY + 5],
            [storageX + -3,storageY + 5],
            [storageX + -1,storageY + 5],
            [storageX + 1,storageY + 5],
            [storageX + 3,storageY + 5],
            [storageX + 0,storageY + 5],
            [storageX + 0,storageY - 5],
            [storageX + -6,storageY + -6],
            [storageX + -4,storageY + -6],
            [storageX + -2,storageY + -6],
            [storageX + 0,storageY + -6],
            [storageX + 2,storageY + -6],
            [storageX + 4,storageY + -6],
            [storageX + 6,storageY + -6],
            [storageX + -6,storageY + -4],
            [storageX + 6,storageY + -4],
            [storageX + -6,storageY + -2],
            [storageX + 6,storageY + -2],
            [storageX + 6,storageY + 0],
            [storageX + 6,storageY + 2],
            [storageX + -6,storageY + 4],
            [storageX + 6,storageY + 4],
            [storageX + -6,storageY + 6],
            [storageX + -4,storageY + 6],
            [storageX + -2,storageY + 6],
            [storageX + 0,storageY + 6],
            [storageX + 2,storageY + 6],
            [storageX + 4,storageY + 6],
            [storageX + 6,storageY + 6],
            // [storageX + -5,storageY + -7],
            // [storageX + -3,storageY + -7],
            // [storageX + -1,storageY + -7],
            // [storageX + 1,storageY + -7],
            // [storageX + 3,storageY + -7],
            // [storageX + 5,storageY + -7],
            // [storageX + -7,storageY + -5],
            // [storageX + -7,storageY + -3],
            // [storageX + -7,storageY + -1],
            // [storageX + -7,storageY + 5],
            // [storageX + -5,storageY + 7],
            // [storageX + -3,storageY + 7],
            // [storageX + -1,storageY + 7],
            // [storageX + 1,storageY + 7],
            // [storageX + 3,storageY + 7],
            // [storageX + 5,storageY + 7],
            // [storageX + 7,storageY + 5],
            // [storageX + 7,storageY + 3],
            // [storageX + 7,storageY + 1],
            // [storageX + 7,storageY + -1],
            // [storageX + 7,storageY + -3],
            // [storageX + 7,storageY + -5],
            // [storageX + 0,storageY + 7],
            // [storageX + 7,storageY + 0],
            // [storageX + 0,storageY + -7],
            // [storageX + 4,storageY + 7],
            // [storageX + -4,storageY + 7],
            // [storageX + 7,storageY + 4],
            // [storageX + 7,storageY + -4],
            // [storageX + 4,storageY + -7],
            // [storageX + -4,storageY + -7],
            // [storageX + -7,storageY + 4],
            // [storageX + -7,storageY + -4],

            // non extension buildings
            [storageX + -1,storageY + 2],
            [storageX + 0,storageY + -2],
            [storageX + 2,storageY + 0],
            [storageX + 4,storageY + 0],
            [storageX + 2,storageY + 2],
            [storageX + 3,storageY + 2],
            [storageX + -2,storageY + 0],
            // towers
            // [storageX + 4,storageY + -2],
            // [storageX + 3,storageY + -1],
            // [storageX + 5,storageY + -1],
            // [storageX + 3,storageY + 1],
            // [storageX + 5,storageY + 1],
            // [storageX + 4,storageY + 2],
            // labs
            [storageX + -3,storageY + 0],
            [storageX + -3,storageY + 1],
            [storageX + -3,storageY + 2],
            [storageX + -3,storageY + 3],
            [storageX + -4,storageY + 1],
            [storageX + -4,storageY + 2],
            [storageX + -5,storageY + 0],
            [storageX + -5,storageY + 1],
            [storageX + -5,storageY + 2],
            [storageX + -5,storageY + 3],
        ]

        for(const position of listOfPositionsInFutureToBeBuilt) {
            if(position[0] <= 47 && position[0] >= 2 && position[1] <= 47 && position[1] >= 2) {
                costs.set(position[0], position[1], 10);
            }
        }
    }


    return costs;
}


const makeStructuresCostMatrixModifiedTest = (roomName: string): boolean | CostMatrix => {
    const currentRoom = Game.rooms[roomName];
    if(currentRoom == undefined || currentRoom === undefined || !currentRoom || currentRoom === null || currentRoom == null) {
        return false;
    }
    if(currentRoom.controller && currentRoom.controller.level == 0) {
        return makeStructuresCostMatrix(roomName);
    }

    const costs = new PathFinder.CostMatrix;

    const terrain = new Room.Terrain(roomName);

    for(let y = 0; y <= 49; y++) {
        for(let x = 0; x <= 49; x++) {
            const tile = terrain.get(x, y);
            let weight;
            if(tile == TERRAIN_MASK_WALL) {
                weight = 255
            }
            else if(tile == TERRAIN_MASK_SWAMP) {
                weight = 15;
            }
            else if(tile == 0){
                weight = 3;
            }
            costs.set(x, y, weight);
        }
    }


    const existingStructures = currentRoom.find(FIND_STRUCTURES);
    if(existingStructures.length > 0) {
        existingStructures.forEach(building => {
            if(building.structureType != STRUCTURE_RAMPART && building.structureType != STRUCTURE_CONTAINER && building.structureType != STRUCTURE_ROAD) {
                costs.set(building.pos.x, building.pos.y, 255);
            }
            else if(building.structureType == STRUCTURE_ROAD) {
                costs.set(building.pos.x, building.pos.y, 2)
            }

            // else {
            //     costs.set(building.pos.x, building.pos.y, 0);
            // }
        });
    }

    const storages = currentRoom.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_STORAGE});
    let storage;
    if(storages.length > 0) {
        storage = storages[0];
    }
    if(storage) {
        const storageX = storage.pos.x;
        const storageY = storage.pos.y;

        const listOfPositionsInFutureToBeBuilt = [
            [storageX + -2,storageY + -2],
            [storageX + 2,storageY + -2],
            [storageX + 2,storageY],
            [storageX + -3,storageY + -3],
            [storageX + -1,storageY + -3],
            [storageX + -1,storageY + 3],
            [storageX + 1,storageY + -3],
            [storageX + 3,storageY + -3],
            [storageX + 1,storageY + 3],
            [storageX + 3,storageY + 3],
            [storageX + -3,storageY + -2],
            [storageX + 3,storageY + -2],
            [storageX + -4,storageY + -4],
            [storageX + -2,storageY + -4],
            [storageX,storageY + -4],
            [storageX + 2,storageY + -4],
            [storageX + 4,storageY + -4],
            [storageX + -4,storageY + -2],
            [storageX + -4,storageY + 4],
            [storageX + -2,storageY + 4],
            [storageX + 0,storageY + 4],
            [storageX + 2,storageY + 4],
            [storageX + 4,storageY + 4],
            [storageX + -5,storageY + -5],
            [storageX + -3,storageY + -5],
            [storageX + -1,storageY + -5],
            [storageX + 1,storageY + -5],
            [storageX + 3,storageY + -5],
            [storageX + 5,storageY + -5],
            [storageX + -5,storageY + -3],
            [storageX + 5,storageY + -3],
            [storageX + -5,storageY + -1],
            [storageX + 5,storageY + 3],
            [storageX + -5,storageY + 5],
            [storageX + -3,storageY + 5],
            [storageX + -1,storageY + 5],
            [storageX + 1,storageY + 5],
            [storageX + 3,storageY + 5],
            [storageX + 0,storageY + 5],
            [storageX + 0,storageY - 5],
            [storageX + -6,storageY + -6],
            [storageX + -4,storageY + -6],
            [storageX + -2,storageY + -6],
            [storageX + 0,storageY + -6],
            [storageX + 2,storageY + -6],
            [storageX + 4,storageY + -6],
            [storageX + 6,storageY + -6],
            [storageX + -6,storageY + -4],
            [storageX + 6,storageY + -4],
            [storageX + -6,storageY + -2],
            [storageX + 6,storageY + -2],
            [storageX + 6,storageY + 0],
            [storageX + 6,storageY + 2],
            [storageX + -6,storageY + 4],
            [storageX + 6,storageY + 4],
            [storageX + -6,storageY + 6],
            [storageX + -4,storageY + 6],
            [storageX + -2,storageY + 6],
            [storageX + 0,storageY + 6],
            [storageX + 2,storageY + 6],
            [storageX + 4,storageY + 6],
            [storageX + 6,storageY + 6],
            // [storageX + -5,storageY + -7],
            // [storageX + -3,storageY + -7],
            // [storageX + -1,storageY + -7],
            // [storageX + 1,storageY + -7],
            // [storageX + 3,storageY + -7],
            // [storageX + 5,storageY + -7],
            // [storageX + -7,storageY + -5],
            // [storageX + -7,storageY + -3],
            // [storageX + -7,storageY + -1],
            // [storageX + -7,storageY + 5],
            // [storageX + -5,storageY + 7],
            // [storageX + -3,storageY + 7],
            // [storageX + -1,storageY + 7],
            // [storageX + 1,storageY + 7],
            // [storageX + 3,storageY + 7],
            // [storageX + 5,storageY + 7],
            // [storageX + 7,storageY + 5],
            // [storageX + 7,storageY + 3],
            // [storageX + 7,storageY + 1],
            // [storageX + 7,storageY + -1],
            // [storageX + 7,storageY + -3],
            // [storageX + 7,storageY + -5],
            // [storageX + 0,storageY + 7],
            // [storageX + 7,storageY + 0],
            // [storageX + 0,storageY + -7],
            // [storageX + 4,storageY + 7],
            // [storageX + -4,storageY + 7],
            // [storageX + 7,storageY + 4],
            // [storageX + 7,storageY + -4],
            // [storageX + 4,storageY + -7],
            // [storageX + -4,storageY + -7],
            // [storageX + -7,storageY + 4],
            // [storageX + -7,storageY + -4],

            // non extension buildings
            [storageX + -1,storageY + 2],
            [storageX + 0,storageY + -2],
            [storageX + 2,storageY + 0],
            [storageX + 4,storageY + 0],
            [storageX + 2,storageY + 2],
            [storageX + 3,storageY + 2],
            [storageX + -2,storageY + 0],
            // towers
            // [storageX + 4,storageY + -2],
            // [storageX + 3,storageY + -1],
            // [storageX + 5,storageY + -1],
            // [storageX + 3,storageY + 1],
            // [storageX + 5,storageY + 1],
            // [storageX + 4,storageY + 2],
            // labs
            [storageX + -3,storageY + 0],
            [storageX + -3,storageY + 1],
            [storageX + -3,storageY + 2],
            [storageX + -3,storageY + 3],
            [storageX + -4,storageY + 1],
            [storageX + -4,storageY + 2],
            [storageX + -5,storageY + 0],
            [storageX + -5,storageY + 1],
            [storageX + -5,storageY + 2],
            [storageX + -5,storageY + 3],
        ]

        for(const position of listOfPositionsInFutureToBeBuilt) {
            if(position[0] <= 47 && position[0] >= 2 && position[1] <= 47 && position[1] >= 2) {
                costs.set(position[0], position[1], 10);
            }
        }
    }



    return costs;
}
// const makeStructuresCostMatrix = (roomName: string): boolean | CostMatrix => {
//     let currentRoom = Game.rooms[roomName];
//     if(currentRoom == undefined || currentRoom === undefined || !currentRoom || currentRoom === null || currentRoom == null) {
//         return false;
//     }
//     let costs = new PathFinder.CostMatrix;

//     let storage:any = Game.getObjectById(currentRoom.memory.Structures.storage) || currentRoom.findStorage();


//     let illegal_locations_for_roads = [
//         []
//     ]

//     let positions_to_loop_through = getNeighbours(storage.pos, illegal_locations_for_roads);

//     for(let almost_position of checkerboard) {
//         costs.set(almost_position[0],almost_position[1],255);
//     }


//     let existingStructures = currentRoom.find(FIND_STRUCTURES);
//     if(existingStructures.length > 0) {
//         existingStructures.forEach(building => {
//             if(building.structureType != STRUCTURE_RAMPART && building.structureType != STRUCTURE_CONTAINER && building.structureType != STRUCTURE_ROAD) {
//                 costs.set(building.pos.x, building.pos.y, 255);
//             }
//             // else {
//             //     costs.set(building.pos.x, building.pos.y, 0);
//             // }
//         });
//     }



//     return costs;
// }




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












// let route = Game.map.findRoute(room.name, targetRoomName)
// let roomNames = [];
// _.forEach(route, function(point){
//     roomNames.push(point.room);
// });



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
                            roomCallback: (roomName) => makeStructuresCostMatrixModifiedTest(roomName),
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
                if(building.structureType == STRUCTURE_CONTAINER) {
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


function handleResourceDismantling(room) {
    if(!room.memory.buildingsToDismantle || room.memory.buildingsToDismantle.length === 0) {
        return;
    }

    // 清理过期的任务（超过1000tick的任务）
    room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(task => {
        return Game.time - task.markedTime < 1000;
    });

    for(const task of room.memory.buildingsToDismantle) {
        const structure = Game.getObjectById(task.id);
        if(!structure) {
            // 建筑已经被摧毁，移除任务
            room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
            continue;
        }

        // 检查是否还有资源
        let hasResources = false;
        const anyStructure = structure as AnyStructure;
        if(anyStructure.structureType === STRUCTURE_STORAGE) {
            const storage = structure as StructureStorage;
            if(storage.store && Object.keys(storage.store).length > 0) {
                hasResources = true;
            }
        } else if(anyStructure.structureType === STRUCTURE_TERMINAL) {
            const terminal = structure as StructureTerminal;
            if(terminal.store && Object.keys(terminal.store).length > 0) {
                hasResources = true;
            }
        }

        if(!hasResources) {
            // 没有资源了，可以安全摧毁
            const destructibleStructure = structure as AnyStructure;
            if(destructibleStructure.destroy) {
                destructibleStructure.destroy();
            }
            room.memory.buildingsToDismantle = room.memory.buildingsToDismantle.filter(t => t.id !== task.id);
            console.log(`已摧毁空建筑: ${task.structureType} 在 ${task.pos.roomName} 位置 ${task.pos.x},${task.pos.y}`);

            // 尝试在原位置建造目标建筑
            if(task.pos.roomName === room.name) {
                room.createConstructionSite(task.pos.x, task.pos.y, task.targetStructureType);
            }
        } else {
            // 检查是否需要派遣搬运creep
            const haulersNeeded = calculateHaulersNeeded(structure);
            const existingHaulers = countExistingHaulers(room, task.id);

            if(existingHaulers < haulersNeeded) {
                // 派遣搬运creep
                spawnHauler(room, task);
            }
        }
    }
}

function calculateHaulersNeeded(structure): number {
    let totalResources = 0;
    if (structure.structureType === STRUCTURE_STORAGE) {
      const storage = structure as StructureStorage;
      for (const resourceType in storage.store) {
        totalResources += storage.store[resourceType];
      }
    } else if (structure.structureType === STRUCTURE_TERMINAL) {
      const terminal = structure as StructureTerminal;
      for (const resourceType in terminal.store) {
        totalResources += terminal.store[resourceType];
      }
    }

    // 每2000资源需要一个搬运工
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

    room.memory.spawn_list.push([body, newName, {
        memory: {
            role: 'resourceHauler',
            homeRoom: room.name,
            targetRoom: task.pos.roomName,
            targetBuildingId: task.id,
            targetPos: task.pos
        }
    }]);
    console.log(`派遣资源搬运工: ${newName} 到 ${task.pos.roomName}`);
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
        const key = `${structure.structureType}_${structure.pos.x}_${structure.pos.y}`;
        if (!layoutPositions.has(key)) {
            // 这是多余建筑
            const shouldRemove = shouldRemoveStructure(structure, layout);

            if (shouldRemove) {
                const safeCheck = performSafetyCheck(structure, room);
                if (safeCheck.safe) {
                    if (structure.destroy()) {
                        removedCount++;
                        console.log(`🗑️ [${mode}] 拆除 ${structure.structureType} ← ${room.name}(${structure.pos.x},${structure.pos.y})`);
                    }
                } else {
                    console.log(`⚠️ [${mode}] 安全检查阻止拆除 ${structure.structureType}: ${safeCheck.reason}`);
                }
            }
        }
    }

    if (removedCount > 0) {
        console.log(`📊 [${mode}] 拆除完成: ${removedCount} 个建筑`);
    }

    // AGGRESSIVE 模式处理错位建筑
    if (mode === 'AGGRESSIVE') {
        handleMismatchedStructures(room, layout);
    }
}

/**
 * 判断是否应该拆除建筑
 */
function shouldRemoveStructure(structure: Structure, layout: any): boolean {
    const reasons = [];

    // 低价值建筑
    if (['road', 'container', 'rampart', 'wall'].includes(structure.structureType)) {
        reasons.push('低价值建筑');
    }

    // 位置不佳
    const pos = structure.pos;
    const room = structure.room;
    const storage = room.storage;

    if (storage) {
        const distance = pos.getRangeTo(storage);
        if (distance > 15 || distance < 2) {
            reasons.push('位置不佳');
        }
    }

    return reasons.length >= 1;
}

/**
 * 执行安全检查
 */
function performSafetyCheck(structure: Structure, room: Room): { safe: boolean; reason: string } {
    // 确保有可用的spawn
    if (structure.structureType === STRUCTURE_SPAWN) {
        const otherSpawns = room.find(FIND_MY_SPAWNS).filter(s => s.id !== structure.id);
        if (otherSpawns.length === 0) {
            return { safe: false, reason: '这是唯一的spawn' };
        }
    }

    // 确保storage不为空（如果要拆除）
    if (structure.structureType === STRUCTURE_STORAGE) {
        const storage = structure as StructureStorage;
        if (storage.store) {
            const totalResources = Object.values(storage.store).reduce((a, b) => a + b, 0);
            if (totalResources > 100000) { // 超过10万资源
                return { safe: false, reason: 'storage中有大量资源' };
            }
        }
    }

    // 确保terminal不为空（如果要拆除）
    if (structure.structureType === STRUCTURE_TERMINAL) {
        const terminal = structure as StructureTerminal;
        if (terminal.store) {
            const totalResources = Object.values(terminal.store).reduce((a, b) => a + b, 0);
            if (totalResources > 50000) { // 超过5万资源
                return { safe: false, reason: 'terminal中有大量资源' };
            }
        }
    }

    // 确保能量充足
    const totalEnergy = room.energyAvailable;
    if (totalEnergy < room.energyCapacityAvailable * 0.3) {
        return { safe: false, reason: '房间能量不足30%' };
    }

    return { safe: true, reason: '' };
}

/**
 * 处理错位建筑（AGGRESSIVE模式）
 */
function handleMismatchedStructures(room: Room, layout: any): void {
    console.log(`[错位处理] AGGRESSIVE模式暂未完全实现错位建筑处理`);
    // TODO: 实现错位建筑处理逻辑
}

export { Build_Remote_Roads, Situational_Building, handleResourceDismantling, buildFromLayout };

export default construction;

// module.exports = construction;
