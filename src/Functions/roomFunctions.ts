// import {Room} from "../utils/Types";
interface Room {
    findStorage:() => object;
    findExtractor:() => object | void;
    findSpawn:() => object | void;
    findStorageContainer:() => object | void;
    findContainers:(capacity:number) => object | void;
    findMineral:() => object | void;
    findBin:(storage) => object | void;
    findStorageLink:() => object | void;
    findObserver:() => object | void;
    findNuker:() => object | void;
    roomTowersHealMe:any;
    roomTowersAttackEnemy:any;
    roomTowersRepairTarget:any;
}


Room.prototype.roomTowersHealMe = function(creep): object | void {
    if(creep) {
        const towerIDs = this.memory.Structures.towers;
        const towerObjs = [];
        for(const towerID of towerIDs) {
            const towerObj = Game.getObjectById(towerID);
            if(towerObj) {
                towerObjs.push(towerObj);
            }
        }
        if(towerObjs.length > 0) {
            for(const tower of towerObjs) {
                tower.heal(creep);
            }
        }
    }
}

Room.prototype.roomTowersAttackEnemy = function(enemyCreep) {
    if (enemyCreep) {
        const towerIDs = this.memory.Structures.towers || [];
        const towerObjs = [];
        for (const towerID of towerIDs) {
            const towerObj = Game.getObjectById(towerID);
            if (towerObj) {
                towerObjs.push(towerObj);
            }
        }
        if (towerObjs.length === 0) return; // No towers, exit the function

        if (enemyCreep.hits < enemyCreep.hitsMax / 1.5) {
            for (const tower of towerObjs) {
                tower.attack(enemyCreep);
            }
        }
        for (const tower of towerObjs) {
            if (tower.store[RESOURCE_ENERGY] < 100) return;
        }
        if (towerObjs.length > 0) {
            for (const tower of towerObjs) {
                tower.attack(enemyCreep);
            }
        }
    }
};


Room.prototype.roomTowersRepairTarget = function(target): object | void {
    if(target) {
        const towerIDs = this.memory.Structures.towers;
        const towerObjs = [];
        for(const towerID of towerIDs) {
            const towerObj = Game.getObjectById(towerID);
            if(towerObj) {
                towerObjs.push(towerObj);
            }
        }
        if(towerObjs.length > 0) {
            for(const tower of towerObjs) {
                tower.repair(target);
            }
        }
    }
}

Room.prototype.findNuker = function(): object | void {
    const nukers = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_NUKER);}});
    if(nukers.length > 0) {
        if(this.memory.Structures) {
            this.memory.Structures.nuker = nukers[0].id;
            return nukers[0];
        }
        else {
            this.memory.Structures = {};
        }
    }
}

Room.prototype.findObserver = function(): object | void {
    const observers = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_OBSERVER);}});
    if(observers.length > 0) {
        if(this.memory.Structures) {
            this.memory.Structures.observer = observers[0].id;
            return observers[0];
        }
        else {
            this.memory.Structures = {};
        }
    }
}


Room.prototype.findStorageLink = function(): object | void {
    const links = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_LINK);}});
    if(links.length > 0) {
        const storage = Game.getObjectById(this.memory.Structures.storage) || this.findStorage();
        if(!storage) return;
        
        // Find links within 2 range of storage
        const nearbyLinks = storage.pos.findInRange(links, 2);
        if(nearbyLinks.length > 0) {
            // Find the closest link to storage
            const closestLink = storage.pos.findClosestByRange(nearbyLinks);
            this.memory.Structures.StorageLink = closestLink.id;
            return closestLink;
        }
        else {
            this.memory.Structures.StorageLink = undefined;
        }
    }
}

Room.prototype.findStorage = function() {
    const storage = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_STORAGE);}});
    if(storage.length) {
        this.memory.Structures.storage = storage[0].id;
        return storage[0];
    }
    else {
        return this.findStorageContainer();
    }
}

Room.prototype.findExtractor = function() {
    const extractor = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_EXTRACTOR);}});
    if(extractor.length) {
        this.memory.Structures.extractor = extractor[0].id;
        return extractor[0];
    }

}

Room.prototype.findSpawn = function() {
    const spawns = this.find(FIND_MY_STRUCTURES, {filter: (structure) => {return (structure.structureType == STRUCTURE_SPAWN && !structure.spawning);}});
    if(spawns.length) {
        this.memory.Structures.spawn = spawns[0].id;
        return spawns[0]
    }
}


Room.prototype.findStorageContainer = function(): object | void {
    const spawn:any = Game.getObjectById(this.memory.Structures.spawn);
    if(spawn && spawn.pos.y >= 2) {
        const storagePosition = new RoomPosition(spawn.pos.x, spawn.pos.y - 2, this.name);
        const storagePositionStructures = storagePosition.lookFor(LOOK_STRUCTURES);
        if(storagePositionStructures.length > 0) {
            for(const building of storagePositionStructures) {
                if(building.structureType == STRUCTURE_CONTAINER) {
                    this.memory.Structures.storage = building.id;
                    return building;
                }
            }
        }
    }
}



Room.prototype.findContainers = function(capacity) {
    if(!this.memory.Structures) {
        this.memory.Structures = {};
    }
    let containers;
    if(this.controller && this.controller.my && this.controller.level !== 0) {
        containers = this.find(FIND_STRUCTURES, {filter: (i) => i.structureType == STRUCTURE_CONTAINER && i.store[RESOURCE_ENERGY] > capacity && i.id !== this.memory.Structures.bin && i.id !== this.memory.Structures.storage && i.id !== this.memory.Structures.controllerLink});
    }
    else {
        containers = this.find(FIND_STRUCTURES, {filter: (i) => i.structureType == STRUCTURE_CONTAINER && i.store[RESOURCE_ENERGY] > capacity});
    }
    if(containers.length > 0) {
        const CurrentContainer:any = Game.getObjectById(this.memory.Structures.container);
        if(CurrentContainer && CurrentContainer.store[RESOURCE_ENERGY] >= capacity) {
            this.memory.Structures.container = CurrentContainer.id;
            return CurrentContainer;
        }
        else {
            containers.sort((a,b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);
            this.memory.Structures.container = containers[0].id;
            return containers[0];
        }
    }
}

Room.prototype.findMineral = function() {
    const mineral = this.find(FIND_MINERALS);
    if(mineral.length) {
        this.memory.mineral = mineral[0].id;
        return mineral[0];
    }
}

Room.prototype.findBin = function(storage): object | void {
    if(storage && storage.pos.y < 49) {
        const binPosition = new RoomPosition(storage.pos.x, storage.pos.y + 1, this.name);
        const binPositionStructures = binPosition.lookFor(LOOK_STRUCTURES);
        if(binPositionStructures.length > 0) {
            for(const building of binPositionStructures) {
                if(building.structureType == STRUCTURE_CONTAINER) {
                    this.memory.Structures.bin = building.id;
                    return building;
                }
            }
        }
    }
}
