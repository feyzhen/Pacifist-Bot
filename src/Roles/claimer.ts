/**
 * A little description of this function
 * @param {Creep} creep
 **/

import { getBody } from "Rooms/rooms.spawning";

 const run = function (creep) {
    creep.memory.moving = false;
    if(creep.memory.boostlabs && creep.memory.boostlabs.length > 0) {
        const result = creep.Boost();
        if(!result) {
            return;
        }
    }
    creep.heal(creep);

    if(creep.room.name != creep.memory.targetRoom && !creep.memory.line) {
        console.log(`[Claimer] ${creep.name} 移动到目标房间 ${creep.memory.targetRoom}, 当前在 ${creep.room.name}`);
        return creep.moveToRoomAvoidEnemyRooms(creep.memory.targetRoom);
    }
    else if(creep.room.name != creep.memory.targetRoom && creep.memory.line) {
        return;
    }

    if(creep.ticksToLive == 1 && creep.room.name == creep.memory.targetRoom && !creep.room.controller.upgradeBlocked && !creep.room.controller.reservation) {
        const newName = 'DismantleControllerWalls-' + creep.memory.homeRoom + "-" + creep.memory.targetRoom;
        Game.rooms[creep.memory.homeRoom].memory.spawn_list.push(getBody([MOVE,WORK], Game.rooms[creep.memory.homeRoom], 50), newName, {memory: {role: 'DismantleControllerWalls', homeRoom: creep.memory.homeRoom, targetRoom:creep.memory.targetRoom}});
        console.log('Adding DismantleControllerWalls to Spawn List: ' + newName);
    }

    const controller = creep.room.controller;

    if(controller && controller.level == 0 && !controller.reservation) {
        console.log(`[Claimer] ${creep.name} 在目标房间 ${creep.room.name}, 控制器状态: level=${controller.level}, reservation=${controller.reservation ? controller.reservation.ticksToEnd : "none"}`
        );
        if (creep.pos.isNearTo(controller)) {
            const result = creep.claimController(controller);
            if (result == 0) {
                // claim成功后，启用自动建造
                if(!Memory.layoutConfig) {
                    Memory.layoutConfig = {
                        forceReplan: false,
                        minControllerLevel: 1,
                        enabledRooms: []
                    };
                }
                if(!Memory.layoutConfig.enabledRooms.includes(creep.room.name)) {
                    Memory.layoutConfig.enabledRooms.push(creep.room.name);
                    console.log(`[Claimer] ${creep.name} 已将房间 ${creep.room.name} 添加到自动建造列表`);
                }

                // 设置房间layoutEnabled
                if(!creep.room.memory) {
                    creep.room.memory = {};
                }
                (creep.room.memory as any).layoutEnabled = true;

                creep.suicide();
                return;
            } else {
                console.log(`[Claimer] ${creep.name} claim结果: ${result}`);
            }
        } else {
            console.log(`[Claimer] ${creep.name} 正moveTo ${controller.pos}`)
            creep.moveTo(controller);
        }

    }

    else if(controller && !controller.my && controller.level > 0 && !controller.reservation) {
        if(creep.pos.isNearTo(controller)) {
            const result = creep.attackController(controller);
            if(result == 0) {
                creep.suicide();
            }
        }
        else {
            creep.moveTo(controller);
        }
    }

    else if(controller && controller.level == 0 && controller.reservation && controller.reservation.ticksToEnd > 0) {
        if(creep.pos.isNearTo(controller)) {
            creep.attackController(controller);
        }
        else {
            creep.moveTo(controller);
        }
    }

}


const roleClaimer = {
    run,
    //run: run,
    //function2,
    //function3
};
export default roleClaimer;
