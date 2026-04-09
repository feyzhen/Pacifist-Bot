/**
 * A little description of this function
 * @param {Creep} creep
 **/


const run = function (creep) {
    creep.memory.moving = false;
	if(creep.evacuate()) {
		return;
	}
    if(creep.fleeHomeIfInDanger() == "timeOut") {
        return;
    }

    if(Game.cpu.bucket < 1000) return;

    if(creep.memory.fleeing) {
        // find hostiles with attack or ranged attack
        const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        const meleeHostiles = hostiles.filter(c => c.getActiveBodyparts(ATTACK) > 0 );
        const rangedHostiles = hostiles.filter(c => c.getActiveBodyparts(RANGED_ATTACK) > 0 );
        if(rangedHostiles.length) {
            const closestRangedHostile = creep.pos.findClosestByRange(rangedHostiles);
            if(creep.pos.getRangeTo(closestRangedHostile) <= 5) {
                return;
            }
        }
        else if(meleeHostiles.length) {
            const closestMeleeHostile = creep.pos.findClosestByRange(meleeHostiles);
            if(creep.pos.getRangeTo(closestMeleeHostile) <= 3) {
                return;
            }
        }
    }
    else if(!creep.memory.danger) {
        creep.memory.fleeing = false;
    }
    // if(creep.fleeHomeIfInDanger() == true) {
    //     return;
    // }

    // if(creep.pos.x > 0 && creep.pos.y > 0 && creep.pos.y < 49 && creep.pos.x < 49) {
    //     return;
    // }
    // else {
    //     creep.moveTo(25,25)
    // }

    if(creep.room.controller && creep.room.controller.level < 6 || creep.memory.targetRoom != creep.memory.homeRoom || creep.room.find(FIND_MY_STRUCTURES, {filter: building => building.structureType == STRUCTURE_LINK}).length < 3) {
        // if(creep.roadCheck()) {
        //     creep.moveAwayIfNeedTo();
        // }

        if(creep.room.name === creep.memory.targetRoom && creep.ticksToLive === 700) {
            const storages = creep.room.find(FIND_STRUCTURES, {filter: s => !s.my && s.structureType === STRUCTURE_STORAGE&& s.store[RESOURCE_ENERGY] > 0});
            if(storages.length > 0) {
                global.SG(creep.memory.homeRoom, creep.memory.targetRoom)
            }
            if(!storages.length && creep.room.controller.my) {
                const ruinsWithEnergy = creep.room.find(FIND_RUINS, {filter: r => r.store[RESOURCE_ENERGY] > 0});
                if(ruinsWithEnergy.length > 0) {
                    global.SG(creep.memory.homeRoom, creep.memory.targetRoom)
                }
            }
        }

        if(!creep.memory.checkAmIOnRampart) {
            creep.memory.checkAmIOnRampart = true;
        }

        const result = creep.harvestEnergy();
        if(result == 0) {
            creep.memory.harvested = true;
        }
        if(creep.memory.harvested) {
            const containerNearby = creep.room.find(FIND_STRUCTURES, {filter: building => building.structureType == STRUCTURE_CONTAINER && creep.pos.getRangeTo(building) <= 2});
            const source:any = Game.getObjectById(creep.memory.source);
            if(!creep.memory.allGood) {
                const lookForStructures = creep.pos.lookFor(LOOK_STRUCTURES);
                if(lookForStructures.length > 0) {
                    for(const building of lookForStructures) {
                        if(building.structureType == STRUCTURE_CONTAINER) {
                            creep.memory.allGood = true;
                        }
                    }
                }
            }

            if(!creep.memory.allGood && containerNearby.length > 0 && !containerNearby[0].pos.isEqualTo(creep) && containerNearby[0].pos.lookFor(LOOK_CREEPS).length == 0 && source && creep.pos.getRangeTo(source) <= 2) {
                creep.MoveCostMatrixRoadPrio(containerNearby[0], 0)
            }
        }
    }
    else {

        if(creep.memory.boostlabs && creep.memory.boostlabs.length > 0) {
            const result = creep.Boost();
            if(!result) {
                return;
            }
            else if (result) {
                creep.memory.boosted = true;
            }
        }



        if(!creep.memory.potential) {
            if(creep.memory.boosted) {
                creep.memory.potential = creep.getActiveBodyparts(WORK) * 6;
            }
            else {
                creep.memory.potential = creep.getActiveBodyparts(WORK) * 2;
            }
        }


        if(creep.ticksToLive <= 2) {
            const closestLink = Game.getObjectById(creep.memory.closestLink) || creep.findClosestLink();
            if(creep.pos.isNearTo(closestLink)) {
                creep.transfer(closestLink, RESOURCE_ENERGY);
            }
            else {
                creep.MoveCostMatrixRoadPrio(closestLink, 1);
            }
        }


        if(creep.store.getFreeCapacity() < creep.memory.potential) {
            const source:any = Game.getObjectById(creep.memory.sourceId);
            if(creep.pos.isNearTo(source)) {
                if(!creep.memory.NearbyExtensions) {
                    creep.memory.NearbyExtensions = [];
                    const mystructures = creep.room.find(FIND_MY_STRUCTURES);
                    const buildings = creep.pos.findInRange(mystructures, 1)
                    for(const building of buildings) {
                        if(building.structureType == STRUCTURE_EXTENSION) {
                            creep.memory.NearbyExtensions.push(building.id);
                        }
                    }
                }
            }

            if(creep.memory.NearbyExtensions && creep.memory.NearbyExtensions.length > 0) {
                for(const extensionID of creep.memory.NearbyExtensions) {
                    const extension:any = Game.getObjectById(extensionID);
                    if(extension && extension.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                        creep.transfer(extension, RESOURCE_ENERGY);
                        return;
                    }
                }
            }

            if(creep.room.controller.level >= 7 && !creep.memory.myRampart && !creep.memory.checkedForRampartToRepair) {
                const myRamparts = creep.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART});
                const rampartsInRangeOne = creep.pos.findInRange(myRamparts, 1);

                if(rampartsInRangeOne.length > 0) {
                    rampartsInRangeOne.sort((a,b) => a.hits - b.hits);
                }

                let found = false;
                for(const building of rampartsInRangeOne) {
                    if(found) {
                        break;
                    }
                    if(building.structureType == STRUCTURE_RAMPART && building.hits < 50050000) {
                        const buildingsHereLookFor = building.pos.lookFor(LOOK_STRUCTURES);
                        for(const buildingHere of buildingsHereLookFor) {
                            if(buildingHere.structureType == STRUCTURE_LINK) {
                                creep.memory.myRampart = building.id;
                                found = true;
                                break;
                            }
                        }
                        const creepsHere = building.pos.lookFor(LOOK_CREEPS);
                        for(const c of creepsHere) {
                            if(c.my && c.memory.role == "EnergyMiner") {
                                creep.memory.myRampart = building.id;
                                found = true;
                                break;
                            }
                        }

                    }
                }
                creep.memory.checkedForRampartToRepair = true;
            }


            if(creep.ticksToLive > 275 && creep.memory.myRampart && source && source.ticksToRegeneration * 10.5 > source.energy) {
                const storage:any = Game.getObjectById(creep.room.memory.Structures.storage);
                const rampart:any = Game.getObjectById(creep.memory.myRampart);
                if(storage && storage.store[RESOURCE_ENERGY] >= 300000) {

                    if(rampart && rampart.hits < 100050000) {
                        creep.repair(rampart);
                        return;
                    }
                    else {
                        creep.memory.myRampart = false;
                    }
                }
                else if(storage && storage.store[RESOURCE_ENERGY] > 90000 && rampart && rampart.hits < 50050000) {
                    creep.repair(rampart);
                    return;
                }
                else {
                    creep.memory.myRampart = false;
                }
            }


            if(!creep.memory.checkedForSites) {
                const siteIDs = []
                const constructionSitesNearCreep = creep.pos.findInRange(creep.room.find(FIND_MY_CONSTRUCTION_SITES), 1);
                if(constructionSitesNearCreep.length > 0) {
                    for(const site of constructionSitesNearCreep) {
                        siteIDs.push(site.id);
                    }
                }
                if(siteIDs.length > 0) {
                    creep.memory.constructionSites = siteIDs;
                }
                creep.memory.checkedForSites = true;
            }
            if(creep.memory.constructionSites && creep.memory.constructionSites.length > 0) {
                const site:any = Game.getObjectById(creep.memory.constructionSites[creep.memory.constructionSites.length - 1]);
                if(site) {
                    creep.build(site);
                }
                else {
                    creep.memory.constructionSites.pop()
                }
            }




            // Initialize room.memory.sourceLinks if not exists
            if(!creep.room.memory.sourceLinks) {
                console.log("Initializing sourceLinks for room: " + creep.room.name);
                creep.room.memory.sourceLinks = {};
            } else {
                console.log("SourceLinks already initialized for room: " + creep.room.memory.sourceLinks);
            }

            // Get cached sourceLink or find and cache a new one
            let closestLink: StructureLink | null = Game.getObjectById(creep.memory.sourceLink) as StructureLink;
            if(!closestLink || !creep.room.memory.sourceLinks[creep.memory.sourceId]) {
                // Find the closest link to the source (within 5 tiles)
                const nearbyLinks = creep.room.find(FIND_MY_STRUCTURES, {
                    filter: (s: StructureLink) => s.structureType == STRUCTURE_LINK && source.pos.getRangeTo(s) < 5
                }) as StructureLink[];

                if(nearbyLinks.length > 0) {
                    closestLink = source.pos.findClosestByRange(nearbyLinks) as StructureLink;
                    // Cache the assignment
                    creep.room.memory.sourceLinks[creep.memory.sourceId] = closestLink.id;
                    creep.memory.sourceLink = closestLink.id;
                } else {
                    // No suitable link found, clear any existing cache
                    creep.room.memory.sourceLinks[creep.memory.sourceId] = null;
                    creep.memory.sourceLink = null;
                }
            } else {
                // Use cached link but verify it still exists and is valid
                closestLink = Game.getObjectById(creep.room.memory.sourceLinks[creep.memory.sourceId]) as StructureLink;
                if(!closestLink || source.pos.getRangeTo(closestLink) >= 5) {
                    // Cached link is invalid, clear and find new one
                    creep.room.memory.sourceLinks[creep.memory.sourceId] = null;
                    creep.memory.sourceLink = null;
                    // Recursive call to find new link
                    return; // Let next tick handle the finding
                }
            }
            if(closestLink && closestLink.store[RESOURCE_ENERGY] < 800) {
                if(creep.pos.isNearTo(closestLink)) {
                    creep.transfer(closestLink, RESOURCE_ENERGY);
                }
                else {
                    creep.MoveCostMatrixRoadPrio(closestLink, 1);
                }
            }
        }

        const storedSource:any = Game.getObjectById(creep.memory.sourceId)
        if(!creep.memory.checkAmIOnRampart && creep.pos.isNearTo(storedSource) && creep.memory.homeRoom == creep.memory.targetRoom) {
            const lookForRampart = creep.pos.lookFor(LOOK_STRUCTURES);
            if(lookForRampart.length > 0) {
                for(const building of lookForRampart) {
                    if(building.structureType == STRUCTURE_RAMPART) {
                        creep.memory.checkAmIOnRampart = true;
                        break;
                    }
                }
            }
            if(!creep.memory.checkAmIOnRampart) {
                const rampartsInRange3 = creep.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART && s.pos.getRangeTo(creep) <= 2});
                if(rampartsInRange3.length == 0) {
                    creep.memory.checkAmIOnRampart = true;
                }
                else {
                    const rampart = creep.pos.findClosestByRange(rampartsInRange3);
                    if(rampart) {
                        creep.memory.checkAmIOnRampart = true;
                        creep.MoveCostMatrixRoadPrio(rampart, 0);
                    }
                }
            }
        }

        if(creep.store.getFreeCapacity() >= creep.memory.potential) {
            const result = creep.harvestEnergy();
        }



        if(creep.store[RESOURCE_ENERGY] > 0 && creep.memory.homeRoom == creep.memory.targetRoom) {

            const closestLink = Game.getObjectById(creep.memory.closestLink) || creep.findClosestLink();

            if(closestLink && closestLink.pos.isNearTo(creep) && !creep.memory.checkedForRampart) {
                const lookForBuildingsHere = closestLink.pos.lookFor(LOOK_STRUCTURES);
                let found = false;
                for(const building of lookForBuildingsHere) {
                    if(building.structureType == STRUCTURE_RAMPART) {
                        found = true;
                    }
                }
                const storage:any = Game.getObjectById(creep.room.memory.Structures.storage);
                if(!found && storage && closestLink.pos.getRangeTo(storage) > 7) {
                    closestLink.pos.createConstructionSite(STRUCTURE_RAMPART);
                }
                creep.memory.checkedForRampart = true;
            }

            const targetLink:any = Game.getObjectById(creep.room.memory.Structures.StorageLink) || creep.room.findStorageLink();
            const closestLinkToController:any = Game.getObjectById(creep.room.memory.Structures.controllerLink);
            let extraLink = null;
            if(creep.room.memory.Structures.extraLinks && creep.room.memory.Structures.extraLinks.length > 0) {
                for(const linkID of creep.room.memory.Structures.extraLinks) {
                    const link:any = Game.getObjectById(linkID);
                    if(link && link.store[RESOURCE_ENERGY] < 200) {
                        extraLink =  link;
                        break;
                    }
                }

            }


            if(targetLink == null || closestLink == null) {
                if(!targetLink) {
                    creep.room.memory.Structures.StorageLink = undefined;
                    if(creep.room.storage) {
                        new RoomPosition(creep.room.storage.pos.x-2,creep.room.storage.pos.y,creep.room.name).createConstructionSite(STRUCTURE_LINK);
                    }
                }
                console.log("ALERT: stupid bug idk why. Link store is null.", creep.memory.targetRoom);
                return;
            }

            if(closestLink && closestLink.store[RESOURCE_ENERGY] >= 400 && closestLinkToController && closestLinkToController.store[RESOURCE_ENERGY] <= 400) {
                closestLink.transferEnergy(closestLinkToController);
            }

            else if(closestLink && closestLink.store[RESOURCE_ENERGY] >= 200 && extraLink && extraLink.store[RESOURCE_ENERGY] <= 200) {
                closestLink.transferEnergy(extraLink);
            }

            else if(closestLink && closestLink.store[RESOURCE_ENERGY] == 800 && targetLink && targetLink.store[RESOURCE_ENERGY] == 0) {
                closestLink.transferEnergy(targetLink);
            }
        }
    }
}
const roleEnergyMiner = {
    run,

    //function2,
    //function3
};


export default roleEnergyMiner;
