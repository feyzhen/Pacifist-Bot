/**
 * Road Maintenance Module
 * 
 * This module provides intelligent road maintenance functions to replace
 * the aggressive keepTheseRoads clearing logic in rooms.ts
 */

/**
 * Intelligent road cleanup - instead of clearing all roads, clean only invalid ones
 * This replaces the aggressive clearing logic in rooms.ts line 254-264
 */
function intelligentRoadCleanup(): void {
    if (Game.time % 3012 !== 0 || Game.cpu.bucket <= 3500) return;
    
    let totalCleaned = 0;
    let totalRooms = 0;
    
    _.forEach(Game.rooms, function (room) {
        if (room && room.memory && !room.memory.danger) {
            let roomCleaned = 0;
            
            if (room.memory.keepTheseRoads) {
                const validRoads = [];
                for (const roadId of room.memory.keepTheseRoads) {
                    const road = Game.getObjectById(roadId) as Structure;
                    if (road && road.structureType === STRUCTURE_ROAD) {
                        validRoads.push(roadId);
                    } else {
                        roomCleaned++;
                    }
                }
                room.memory.keepTheseRoads = validRoads;
                totalCleaned += roomCleaned;
            }
            
            totalRooms++;
        }
    });
    
    if (totalCleaned > 0) {
        console.log(`[Road Cleanup] Cleaned ${totalCleaned} invalid roads across ${totalRooms} rooms`);
    }
}

/**
 * Emergency road repair for critical roads not in keepTheseRoads
 * This provides a safety net for roads that might have been missed
 */
function emergencyRoadRepair(room: Room): void {
    if (!room.controller || room.controller.level < 6) return;
    
    const allRoads = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_ROAD});
    const criticalRoads = allRoads.filter(road => road.hits <= road.hitsMax * 0.2); // 20% or less
    
    if (criticalRoads.length > 0) {
        // Ensure critical roads are in keepTheseRoads
        if (!room.memory.keepTheseRoads) {
            room.memory.keepTheseRoads = [];
        }
        
        let addedCount = 0;
        for (const road of criticalRoads) {
            if (!room.memory.keepTheseRoads.includes(road.id)) {
                room.memory.keepTheseRoads.push(road.id);
                addedCount++;
            }
        }
        
        if (addedCount > 0) {
            console.log(`[Emergency Road] Added ${addedCount} critical roads to maintenance list in ${room.name}`);
        }
    }
}

/**
 * Comprehensive road maintenance check
 * Combines intelligent cleanup and emergency repair
 */
function comprehensiveRoadMaintenance(): void {
    intelligentRoadCleanup();
    
    // Also run emergency repair for rooms with low RCL or high decay
    _.forEach(Game.rooms, function (room) {
        if (room && room.controller && room.controller.level >= 4) {
            emergencyRoadRepair(room);
        }
    });
}

export { intelligentRoadCleanup, emergencyRoadRepair, comprehensiveRoadMaintenance };
