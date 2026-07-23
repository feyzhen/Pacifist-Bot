/**
 * A little description of this function
 * @param {Creep} creep
 **/

import { getLabThreshold } from "../constants/constants.labs";
 const run = function (creep) {
    creep.memory.moving = false;
    if(creep.evacuate()) {
		return;
	}
    if(creep.ticksToLive == creep.body.length  * 3 && creep.room.find(FIND_MY_CREEPS, {filter: (c) => {return (c.memory.role == "EnergyManager")}}).length == 1) {
        const newName = 'EnergyManager-'+ Math.floor(Math.random() * Game.time) + "-" + creep.room.name;
        if(creep.room.memory.danger && creep.room.memory.danger_timer > 100) {
            creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
        }
        else {
            if(creep.room.controller.level == 6) {
                creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
            }
            else if(creep.room.controller.level == 7) {
                creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
            }
            else if(creep.room.controller.level == 8 && !creep.room.memory.danger && Game.cpu.bucket < 9000 && creep.room.terminal && creep.room.terminal.store[RESOURCE_BATTERY] > 1000) {
                creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
            }
            else if(creep.room.controller.level == 8 && !creep.room.memory.danger && (Game.cpu.bucket >= 5000 || Memory.pixelManager?.enabled)) {
                creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
            }
            else if(creep.room.controller.level == 8 && (creep.room.memory.danger || Game.cpu.bucket < 5000)) {
                creep.room.memory.spawn_list.unshift([CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE,MOVE], newName, {memory: {role: 'EnergyManager'}});
            }
        }

    }

    if(!creep.memory.MaxStorage) {
        let carryPartsAmount = 0
        for(const part of creep.body) {
            if(part.type == CARRY) {
                carryPartsAmount += 1;
            }
        }
        creep.memory.MaxStorage = carryPartsAmount * 50;
    }
    const MaxStorage = creep.memory.MaxStorage;

	if(creep.ticksToLive <= 10 && _.keys(creep.store).length == 0) {
		creep.memory.suicide = true;
	}
	if(creep.memory.suicide == true) {
		creep.recycle();
        return;
	}



    if(creep.store.getFreeCapacity() == MaxStorage) {
        creep.memory.target = false
    }

    if(creep.memory.target) {
        const target = Game.getObjectById(creep.memory.target);
        if(!target) {
            delete creep.memory.target;
        }
        else if(creep.pos.isNearTo(target)) {
            let delivered = false;
            for(const resource in creep.store) {
                if(creep.transfer(target, resource) === OK) {
                    delivered = true;
                }
            }
            if(delivered) {
                creep.memory.target = false;
            }
        }
        else {
            creep.MoveCostMatrixRoadPrio(target, 1);
        }
        if(creep.memory.target !== false) return;
    }
    if(!creep.memory.target) {
        const storage = Game.getObjectById(creep.memory.storage) || creep.findStorage();
        const terminal = creep.room.terminal;
        let factory; if(creep.room.controller.level >= 7 && creep.room.memory.Structures.factory) {factory = Game.getObjectById(creep.room.memory.Structures.factory);}
        const closestLink = Game.getObjectById(creep.room.memory.Structures.StorageLink) || creep.room.findStorageLink();
        const bin = Game.getObjectById(creep.room.memory.Structures.bin) || creep.room.findBin(storage);

        if(creep.store.getFreeCapacity() == 0) {
            creep.memory.target = storage.id;
            return;
        }



        if(creep.room.memory.labs) {
            let inputLab1; let inputLab2;
            let outputLab1; let outputLab2; let outputLab3; let outputLab4;
            let outputLab5; let outputLab6; let outputLab7; let outputLab8;

            const outputLabs = [];

            if(creep.room.memory.labs.inputLab1) {inputLab1 = Game.getObjectById(creep.room.memory.labs.inputLab1)}
            if(creep.room.memory.labs.inputLab2) {inputLab2 = Game.getObjectById(creep.room.memory.labs.inputLab2)}
            if(creep.room.memory.labs.outputLab1) {
                outputLab1 = Game.getObjectById(creep.room.memory.labs.outputLab1)
                outputLabs.push(outputLab1)
            }
            if(creep.room.memory.labs.outputLab2) {
                outputLab2 = Game.getObjectById(creep.room.memory.labs.outputLab2)
                outputLabs.push(outputLab2)
            }
            if(creep.room.memory.labs.outputLab3) {
                outputLab3 = Game.getObjectById(creep.room.memory.labs.outputLab3)
                outputLabs.push(outputLab3)
            }
            if(creep.room.memory.labs.outputLab4) {
                outputLab4 = Game.getObjectById(creep.room.memory.labs.outputLab4)
                outputLabs.push(outputLab4)
            }
            if(creep.room.memory.labs.outputLab5) {
                outputLab5 = Game.getObjectById(creep.room.memory.labs.outputLab5)
                outputLabs.push(outputLab5)
            }
            if(creep.room.memory.labs.outputLab6) {
                outputLab6 = Game.getObjectById(creep.room.memory.labs.outputLab6)
                outputLabs.push(outputLab6)
            }
            if(creep.room.memory.labs.outputLab7) {
                outputLab7 = Game.getObjectById(creep.room.memory.labs.outputLab7)
                outputLabs.push(outputLab7)
            }
            if(creep.room.memory.labs.outputLab8) {
                outputLab8 = Game.getObjectById(creep.room.memory.labs.outputLab8)
                outputLabs.push(outputLab8)
            }

            const currentOutput = creep.room.memory.labs.status.currentOutput;
            const lab1Input = creep.room.memory.labs.status.lab1Input;
            const lab2Input = creep.room.memory.labs.status.lab2Input;

            if(inputLab1 && inputLab1.mineralType != undefined && inputLab1.mineralType != lab1Input) {
                if(creep.pos.isNearTo(inputLab1)) {
                    creep.withdraw(inputLab1, inputLab1.mineralType);
                    creep.memory.target = storage.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(inputLab1, 1);
                }
                return;
            }

            if(inputLab2 && inputLab2.mineralType != undefined && inputLab2.mineralType != lab2Input) {
                if(creep.pos.isNearTo(inputLab2)) {
                    creep.withdraw(inputLab2, inputLab2.mineralType);
                    creep.memory.target = storage.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(inputLab2, 1);
                }
                return;
            }
            let boostHandled = false;
            const LAB_TO_TIER3: {[key: string]: ResourceConstant} = {
                lab1: RESOURCE_CATALYZED_LEMERGIUM_ACID,    // WORK-repair/build
                lab2: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, // MOVE
                lab3: RESOURCE_CATALYZED_UTRIUM_ACID,       // ATTACK
                lab4: RESOURCE_CATALYZED_KEANIUM_ALKALIDE,  // RANGED_ATTACK
                lab5: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,// HEAL
                lab6: RESOURCE_CATALYZED_ZYNTHIUM_ACID,     // WORK-dismantle
                lab7: RESOURCE_CATALYZED_GHODIUM_ALKALIDE,  // TOUGH
                lab8: RESOURCE_CATALYZED_KEANIUM_ACID       // CARRY / lab8reserved overrides to UTROXIDE-like
            };
            const BOOST_OUTPUT_ORDER: Array<{labName: string; outputIdKey: string}> = [
                {labName: 'lab1', outputIdKey: 'outputLab1'},
                {labName: 'lab2', outputIdKey: 'outputLab2'},
                {labName: 'lab3', outputIdKey: 'outputLab3'},
                {labName: 'lab4', outputIdKey: 'outputLab4'},
                {labName: 'lab5', outputIdKey: 'outputLab5'},
                {labName: 'lab6', outputIdKey: 'outputLab6'},
                {labName: 'lab7', outputIdKey: 'outputLab7'},
                {labName: 'lab8', outputIdKey: 'outputLab8'},
            ];

            for (const {labName, outputIdKey} of BOOST_OUTPUT_ORDER) {
                if (!creep.room.memory.labs[outputIdKey]) continue;
                const outputLab = Game.getObjectById(creep.room.memory.labs[outputIdKey]) as any;
                if (!outputLab) continue;

                const boostRecord = creep.room.memory.labs.status?.boost?.[labName];
                if (!boostRecord || boostRecord.use <= 0) continue;
                if (boostRecord.amount == 0) continue;

                // Determine which compound this lab needs.
                // Priority: recorded resourceType (supports downgrade to tier1/tier2) > lab8reservation override > tier3 default.
                let resource: ResourceConstant | null = boostRecord.resourceType || null;
                if (resource == null && labName == 'lab8') {
                    resource = creep.room.memory.labs.lab8reserved ? RESOURCE_UTRIUM_OXIDE : RESOURCE_CATALYZED_KEANIUM_ACID;
                }
                if (resource == null) {
                    resource = LAB_TO_TIER3[labName];
                }
                if (!resource) continue;

                // 1) If outputLab still contains old/different mineral: extract it first
                if (outputLab.mineralType != undefined && outputLab.mineralType != resource) {
                    if (creep.pos.isNearTo(outputLab)) {
                        creep.withdraw(outputLab, outputLab.mineralType);
                        creep.memory.target = storage.id;
                    } else {
                        creep.MoveCostMatrixRoadPrio(outputLab, 1);
                    }
                    boostHandled = true;
                    break;
                }

                // 2) OutputLab empty or already has the correct compound: load from storage
                if ((outputLab.mineralType == undefined || outputLab.mineralType == resource) &&
                    storage && storage.store[resource] >= boostRecord.amount) {
                    if (creep.pos.isNearTo(storage)) {
                        if (boostRecord.amount >= MaxStorage) {
                            boostRecord.amount -= MaxStorage;
                            creep.withdraw(storage, resource);
                        } else {
                            creep.withdraw(storage, resource, boostRecord.amount);
                            boostRecord.amount = 0;
                        }
                        creep.memory.target = outputLab.id;
                    } else {
                        creep.MoveCostMatrixRoadPrio(storage, 1);
                    }
                    boostHandled = true;
                    break;
                }
            }
            if (boostHandled) return;

            if((inputLab1 && inputLab1.mineralType == undefined || inputLab1 && inputLab1.mineralType == lab1Input && inputLab1.store[inputLab1.mineralType] < MaxStorage-20) &&
            storage && storage.store[lab1Input] >= MaxStorage) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, lab1Input);
                    creep.memory.target = inputLab1.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }

            if((inputLab1 && inputLab1.mineralType == undefined || inputLab1 && inputLab1.mineralType == lab1Input && inputLab1.store[inputLab1.mineralType] < MaxStorage-20) &&
            terminal && terminal.store[lab1Input] >= MaxStorage) {
                if(creep.pos.isNearTo(terminal)) {
                    creep.withdraw(terminal, lab1Input);
                    creep.memory.target = inputLab1.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(terminal, 1);
                }
                return;
            }

            if((inputLab2 && inputLab2.mineralType == undefined || inputLab2 && inputLab2.mineralType == lab2Input && inputLab2.store[inputLab2.mineralType] < MaxStorage-20) &&
            storage && storage.store[lab2Input] >= MaxStorage) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, lab2Input);
                    creep.memory.target = inputLab2.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }

            if((inputLab2 && inputLab2.mineralType == undefined || inputLab2 && inputLab2.mineralType == lab2Input && inputLab2.store[inputLab2.mineralType] < MaxStorage-20) &&
            terminal && terminal.store[lab2Input] >= MaxStorage) {
                if(creep.pos.isNearTo(terminal)) {
                    creep.withdraw(terminal, lab2Input);
                    creep.memory.target = inputLab2.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(terminal, 1);
                }
                return;
            }
        }
        if(closestLink && closestLink.store[RESOURCE_ENERGY] > 0 && creep.store.getFreeCapacity() == MaxStorage) {
            if(creep.pos.isNearTo(closestLink)) {
                creep.withdraw(closestLink, RESOURCE_ENERGY);
                creep.memory.target = storage.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(closestLink, 1);
            }
            return;
        }

        if(bin && bin.store.getFreeCapacity() < 2000 && creep.store.getFreeCapacity() == MaxStorage) {
            if(creep.pos.isNearTo(bin)) {
                for(const resourceType in bin.store) {
                    creep.withdraw(bin, resourceType);
                }
                creep.memory.target = storage.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(bin, 1);
            }
            return;
        }
		// if(!creep.memory.controllerLink && creep.room.controller && creep.room.controller.level >= 7) {
		// 	let links = creep.room.find(FIND_MY_STRUCTURES, {filter: building => building.structureType == STRUCTURE_LINK});
		// 	if(links.length > 3) {
		// 		let controllerLink = creep.room.controller.pos.findClosestByRange(links);
		// 		creep.memory.controllerLink = controllerLink.id;
		// 	}
		// }
        // if(creep.room.controller && creep.room.controller.level >= 7 && creep.memory.controllerLink) {
        //     let controllerLink:any = Game.getObjectById(creep.memory.controllerLink);
        //     if(controllerLink && controllerLink.store[RESOURCE_ENERGY] == 0) {
        //         if(creep.pos.isNearTo(storage)) {
        //             creep.withdraw(storage, RESOURCE_ENERGY);
        //             creep.memory.target = controllerLink.id;
        //         }
        //         else {
        //             creep.MoveCostMatrixRoadPrio(storage, 1);
        //         }
        //         return;
        //     }
        // }

        if(terminal && terminal.store[RESOURCE_ENERGY] > 45000 && creep.store.getFreeCapacity() == MaxStorage || storage && storage.store[RESOURCE_ENERGY] < 20000 && terminal && terminal.store[RESOURCE_ENERGY] > MaxStorage) {
            if(creep.pos.isNearTo(terminal)) {
                creep.withdraw(terminal, RESOURCE_ENERGY);
                creep.memory.target = storage.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(terminal, 1);
            }
            return;
        }



        if(terminal && terminal.store[RESOURCE_ENERGY] < 40000 && storage && storage.store[RESOURCE_ENERGY] > 100000 && terminal.store.getFreeCapacity() > 5000) {
            if(creep.pos.isNearTo(storage)) {
                creep.withdraw(storage, RESOURCE_ENERGY);
                creep.memory.target = terminal.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }


        const Mineral:any = Game.getObjectById(creep.room.memory.mineral) || creep.room.findMineral();
        const MineralType = Mineral.mineralType;
        if(storage && storage.store[MineralType] > 20000 && terminal && terminal.store.getFreeCapacity() > 10000) {
            if(creep.pos.isNearTo(storage)) {
                creep.withdraw(storage, MineralType);
                creep.memory.target = terminal.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        if(Game.time % 50 <= 50) {


        const listOfResourcesToTerminal1:any = [
            RESOURCE_ALLOY, RESOURCE_TUBE, RESOURCE_FIXTURES, RESOURCE_FRAME, RESOURCE_HYDRAULICS, RESOURCE_MACHINE,
            RESOURCE_CELL, RESOURCE_PHLEGM, RESOURCE_TISSUE, RESOURCE_MUSCLE, RESOURCE_ORGANOID, RESOURCE_ORGANISM,
            RESOURCE_WIRE, RESOURCE_SWITCH, RESOURCE_TRANSISTOR, RESOURCE_MICROCHIP, RESOURCE_CIRCUIT, RESOURCE_DEVICE,
            RESOURCE_CONDENSATE, RESOURCE_CONCENTRATE, RESOURCE_EXTRACT, RESOURCE_SPIRIT, RESOURCE_EMANATION, RESOURCE_ESSENCE,
            RESOURCE_GHODIUM_MELT, RESOURCE_COMPOSITE, RESOURCE_CRYSTAL, RESOURCE_LIQUID,
            RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_ZYNTHIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_UTRIUM_BAR, RESOURCE_KEANIUM_BAR, RESOURCE_PURIFIER,
            RESOURCE_METAL, RESOURCE_BIOMASS, RESOURCE_SILICON, RESOURCE_MIST];
            // RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID, RESOURCE_KEANIUM_ACID];
            if(storage && terminal && terminal.store.getFreeCapacity() > MaxStorage * 5) {
                for(const resource in storage.store) {
                    if(listOfResourcesToTerminal1.includes(resource) && storage.store[resource] > 4000 && terminal.store[resource] < 3000) {
                        // const threshold = getLabThreshold(resource as ResourceConstant);
                        // if(storage.store[resource] <= threshold.pause) return;
                        if(creep.pos.isNearTo(storage)) {
                            creep.withdraw(storage, resource);
                            creep.memory.target = terminal.id;
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(storage, 1);
                        }
                        return;
                    }
                }
            }


            const listOfResourcesToTerminal2:any = [
                RESOURCE_CATALYZED_LEMERGIUM_ACID,
                RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
                RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                RESOURCE_CATALYZED_UTRIUM_ACID,
                RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                RESOURCE_CATALYZED_ZYNTHIUM_ACID,
                RESOURCE_CATALYZED_KEANIUM_ACID
            ];

            if(storage && terminal && terminal.store.getFreeCapacity() > MaxStorage * 5) {
                for(const resource in storage.store) {
                    if(listOfResourcesToTerminal2.includes(resource) && storage.store[resource] > 20000 && terminal.store[resource] < 3000) {
                        if(creep.pos.isNearTo(storage)) {


                            creep.withdraw(storage, resource);
                            creep.memory.target = terminal.id;
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(storage, 1);
                        }
                        return;
                    }
                }
            }


            const listOfResourcesToStorage2:any = [
                RESOURCE_CATALYZED_LEMERGIUM_ACID,
                RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
                RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                RESOURCE_CATALYZED_UTRIUM_ACID,
                RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                RESOURCE_CATALYZED_ZYNTHIUM_ACID,
                RESOURCE_CATALYZED_KEANIUM_ACID
            ];

            if(storage && terminal && storage.store.getFreeCapacity() > MaxStorage * 5) {
                for(const resource in terminal.store) {
                    if(listOfResourcesToStorage2.includes(resource) && (storage.store[resource] < 18000 && terminal.store[resource] > 0 || terminal.store[resource] > 4000)) {
                        if(creep.pos.isNearTo(terminal)) {
                            if(storage.store[resource] > 25000 && terminal.store[resource] > 3000) {
                                let amount = terminal.store[resource] - 3000;
                                if(amount > creep.store.getFreeCapacity()) {
                                    amount = creep.store.getFreeCapacity();
                                }
                                creep.withdraw(terminal,resource, amount);
                            }
                            else {
                                creep.withdraw(terminal, resource);
                            }
                            creep.memory.target = storage.id;
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(terminal, 1);
                        }
                        return;
                    }
                }
            }


            if(storage && factory && factory.store[RESOURCE_ENERGY] < 10000 && storage.store[RESOURCE_BATTERY] < 200 && storage.store[RESOURCE_ENERGY] > 380000 && factory.store.getFreeCapacity() > 0) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, RESOURCE_ENERGY);
                    creep.memory.target = factory.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }
            else if(storage && factory && terminal && (storage.store[RESOURCE_BATTERY] >= 200 || storage.store[RESOURCE_ENERGY] < 95000 || Memory.targetRampRoom.urgent) && factory.store[RESOURCE_ENERGY] > 0) {

                if(creep.pos.isNearTo(factory)) {
                    creep.withdraw(factory, RESOURCE_ENERGY);
                    if(storage.store[RESOURCE_ENERGY] < 95000 && Memory.targetRampRoom.urgent && terminal) {
                        creep.memory.target = terminal.id;
                        creep.MoveCostMatrixRoadPrio(terminal, 1);
                    }
                    else {
                        creep.memory.target = storage.id;
                        if(Game.time % 5 === 0) {
                            creep.moveTo(storage.pos.x + 1, storage.pos.y + 1)
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(storage, 1);
                        }
                    }
                }
                else {
                    creep.MoveCostMatrixRoadPrio(factory, 1);
                }
                return;
            }
            else if(storage && factory && storage.store[RESOURCE_BATTERY] >= 200 && factory.store.getFreeCapacity() >= 5000) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, RESOURCE_BATTERY);
                    creep.memory.target = factory.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }







            const listOfResourcesToStorage1:any = [RESOURCE_KEANIUM_OXIDE,RESOURCE_ZYNTHIUM_ALKALIDE,RESOURCE_ZYNTHIUM_HYDRIDE,RESOURCE_POWER,RESOURCE_BATTERY];
            if(storage && terminal && storage.store.getFreeCapacity() > MaxStorage * 5) {
                for(const resource in terminal.store) {
                    if(listOfResourcesToStorage1.includes(resource) && (storage.store.getFreeCapacity() <= 100000 && storage.store[resource] <= 15000 || storage.store.getFreeCapacity() > 175000 && storage.store[resource] <= 50000)) {
                        if(creep.pos.isNearTo(terminal)) {
                            creep.withdraw(terminal, resource);
                            creep.memory.target = storage.id;
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(terminal, 1);
                        }
                        return;
                    }
                }
            }


            // if(creep.ticksToLive % 50 == 40 || creep.ticksToLive % 50 == 41 || creep.ticksToLive % 50 == 42 || creep.ticksToLive % 50 == 43 || creep.ticksToLive % 50 == 44 || creep.ticksToLive % 50 == 45 || creep.ticksToLive % 50 == 46 || creep.ticksToLive % 50 == 47 || creep.ticksToLive % 50 == 48 || creep.ticksToLive % 50 == 49) {
            //     let listOfResourcesToTerminalFromFactory:any = [RESOURCE_KEANIUM, RESOURCE_MIST, RESOURCE_CONDENSATE, RESOURCE_KEANIUM_BAR];
            //     if(terminal && factory && terminal.store.getUsedCapacity() < 295000) {
            //         for(let resource in factory.store) {
            //             if(listOfResourcesToTerminalFromFactory.includes(resource)) {
            //                 if(creep.pos.isNearTo(factory)) {
            //                     creep.withdraw(factory, resource);
            //                     creep.memory.target = terminal.id;
            //                 }
            //                 else {
            //                     creep.MoveCostMatrixRoadPrio(factory, 1);
            //                 }
            //                 return;
            //             }
            //         }
            //     }
            // }


        const nuker = Game.getObjectById(creep.room.memory.Structures.nuker) || creep.room.findNuker();
        if(storage && nuker) {
            if(storage.store[RESOURCE_GHODIUM] >= 3000 && nuker.store[RESOURCE_GHODIUM] < 5000) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, RESOURCE_GHODIUM);
                    creep.memory.target = nuker.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }
        }


        if(storage && nuker) {
            if(storage.store[RESOURCE_ENERGY] >= 275000 && nuker.store[RESOURCE_ENERGY] < 300000) {
                if(creep.pos.isNearTo(storage)) {
                    creep.withdraw(storage, RESOURCE_ENERGY);
                    creep.memory.target = nuker.id;
                }
                else {
                    creep.MoveCostMatrixRoadPrio(storage, 1);
                }
                return;
            }
        }


        const powerSpawn:any = Game.getObjectById(creep.room.memory.Structures.powerSpawn);
        if(storage && powerSpawn && storage.store[RESOURCE_POWER] >= 1 && powerSpawn.store[RESOURCE_POWER] == 0) {
            if(creep.pos.isNearTo(storage)) {
                if(storage.store[RESOURCE_POWER] >= 100) {
                    creep.withdraw(storage, RESOURCE_POWER, 100);
                }
                else {
                    creep.withdraw(storage, RESOURCE_POWER);
                }
                creep.memory.target = powerSpawn.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        if(storage && terminal && storage.store[RESOURCE_OPS] > 30000 && terminal.store.getUsedCapacity() < 290000) {
            if(creep.pos.isNearTo(storage)) {
                creep.withdraw(storage, RESOURCE_OPS);
                creep.memory.target = terminal.id;
            }
            else {
                creep.MoveCostMatrixRoadPrio(storage, 1);
            }
            return;
        }

        }

        // ── 搬运 terminal 中多余的外来基础资源到 storage ──────────────────────
        // 放在所有高优先级搬运（energy/labs/factory/mineral）之后，
        // 确保 terminal.ENERGY > 45000 等条件不会把这个逻辑提前截断。
        // rooms.market.ts 会通过 terminal.send() 从其他房间送来 H/O/U/K/L/Z/Catalyst，
        // 如果 terminal 中堆积过多会占用容量，需要搬回 storage。
        // 跳过本房间产出的矿物（MineralType）：market 模块需要它在 terminal 中挂卖单，
        // 且 L570-581 的逻辑会在 storage > 20000 时主动补到 terminal，两者配合即可。
        const BaseResources: ResourceConstant[] = [
            RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM,
            RESOURCE_KEANIUM, RESOURCE_LEMERGIUM, RESOURCE_ZYNTHIUM, RESOURCE_CATALYST
        ];
        if(storage && terminal && storage.store.getFreeCapacity() > MaxStorage * 5) {
            for(const resource of BaseResources) {
                if(resource === MineralType) continue;
                const terminalAmount = terminal.store[resource] || 0;
                const storageAmount = storage.store[resource] || 0;
                // terminal 中外来资源 > 3000 且 storage 不足 < 5000 时才搬回，
                // 搬运时 terminal 保留 3000，避免把 market 需要的原料抢回来
                if(terminalAmount > 3000 && storageAmount < 5000) {
                    const amount = Math.min(terminalAmount - 3000, creep.store.getFreeCapacity());
                    if(amount > 0) {
                        if(creep.pos.isNearTo(terminal)) {
                            creep.withdraw(terminal, resource, amount);
                            creep.memory.target = storage.id;
                        }
                        else {
                            creep.MoveCostMatrixRoadPrio(terminal, 1);
                        }
                        return;
                    }
                }
            }
        }


        if(!creep.memory.target) {
            creep.MoveCostMatrixRoadPrio(storage, 1);
        }

    }








}


const roleEnergyManager = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleEnergyManager;
