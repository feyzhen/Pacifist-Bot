/**
 * 布局管理控制台命令
 * 提供便捷的命令来管理房间布局系统
 */

import layoutManager from '../Rooms/rooms.layoutManager';

/**
 * 启用自动规划
 * 用法: enableAutoPlanner('W1N1') 或 enableAutoPlanner()
 */
(global as any).enableAutoPlanner = function(roomName?: string): void {
    if (roomName) {
        layoutManager.enableAutoPlanner(roomName);
        console.log(`已为房间 ${roomName} 启用自动规划`);
    } else {
        console.log('要启用自动规划，请指定具体房间名称或使用 enableAllAutoPlanner()');
    }
};

/**
 * 禁用自动规划
 * 用法: disableAutoPlanner('W1N1')
 */
(global as any).disableAutoPlanner = function(roomName?: string): void {
    if (roomName) {
        layoutManager.disableAutoPlanner(roomName);
        console.log(`已为房间 ${roomName} 禁用自动规划`);
    } else {
        console.log('要禁用自动规划，请指定具体房间名称');
    }
};

/**
 * 强制重新规划房间
 * 用法: forceReplan('W1N1')
 */
(global as any).forceReplan = function(roomName: string): void {
    // 直接使用PlannerWrapper
    const plannerWrapper = (global as any).PlannerWrapper;
    if (!plannerWrapper) {
        console.log('PlannerWrapper 未加载');
        return;
    }

    const room = Game.rooms[roomName];
    if (!room || !room.controller || !room.controller.my) {
        console.log(`房间 ${roomName} 不存在或不是你的房间`);
        return;
    }

    // 运行规划
    const planSuccess = plannerWrapper.runPlan(roomName);
    if (!planSuccess) {
        console.log(`房间 ${roomName} 规划失败`);
        return;
    }

    // 应用布局
    const applySuccess = plannerWrapper.applyLayout(roomName);
    if (applySuccess) {
        console.log(`房间 ${roomName} 强制重新规划成功`);
    } else {
        console.log(`房间 ${roomName} 应用布局失败`);
    }
};

/**
 * 查看房间布局状态
 * 用法: layoutStatus('W1N1')
 */
(global as any).layoutStatus = function(roomName: string): void {
    const status = layoutManager.getRoomLayoutStatus(roomName);
    console.log(`房间 ${roomName} 布局状态:`);
    console.log(JSON.stringify(status, null, 2));
};

/**
 * 清除房间布局
 * 用法: clearLayout('W1N1')
 */
(global as any).clearLayout = function(roomName: string): void {
    const success = layoutManager.clearRoomLayout(roomName);
    if (success) {
        console.log(`房间 ${roomName} 布局已清除`);
    } else {
        console.log(`房间 ${roomName} 布局清除失败`);
    }
};

/**
 * 设置布局配置
 * 用法: setLayoutConfig({useAutoPlanner: true, minControllerLevel: 4})
 */
(global as any).setLayoutConfig = function(config: any): void {
    layoutManager.setConfig(config);
    console.log('布局配置已更新');
    console.log(JSON.stringify(layoutManager.getConfig(), null, 2));
};

/**
 * 查看当前布局配置
 * 用法: getLayoutConfig()
 */
(global as any).getLayoutConfig = function(): void {
    console.log('当前布局配置:');
    console.log(JSON.stringify(layoutManager.getConfig(), null, 2));
};

/**
 * 批量操作多个房间
 * 用法: batchReplan(['W1N1', 'W2N1', 'W3N1'])
 */
(global as any).batchReplan = function(roomNames: string[]): void {
    console.log(`开始批量重新规划 ${roomNames.length} 个房间`);
    
    for (const roomName of roomNames) {
        const success = layoutManager.forceReplanRoom(roomName);
        console.log(`房间 ${roomName}: ${success ? '成功' : '失败'}`);
    }
    
    console.log('批量重新规划完成');
};

/**
 * 查看所有房间的布局状态
 * 用法: allLayoutStatus()
 */
(global as any).allLayoutStatus = function(): void {
    console.log('=== 所有房间布局状态 ===');
    
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            const status = layoutManager.getRoomLayoutStatus(roomName);
            console.log(`${roomName}: ${status.hasLayout ? '有布局' : '无布局'} (${status.layoutVersion || '未知版本'})`);
        }
    }
};

/**
 * 启用指定房间列表的自动规划
 * 用法: enableRooms(['W1N1', 'W2N1'])
 */
(global as any).enableRooms = function(roomNames: string[]): void {
    for (const roomName of roomNames) {
        layoutManager.enableAutoPlanner(roomName);
    }
    console.log(`已为 ${roomNames.length} 个房间启用自动规划: ${roomNames.join(', ')}`);
};

/**
 * 检查自动规划系统性能
 * 用法: checkPerformance('W1N1')
 */
(global as any).checkPerformance = function(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room || !room.controller.my) {
        console.log('房间不存在或不是你的房间');
        return;
    }
    
    console.log(`=== 房间 ${roomName} 自动规划性能检查 ===`);
    
    // 测试自动规划系统
    console.log('测试自动规划系统...');
    const start = Game.cpu.getUsed();
    layoutManager.manageRoomLayout(room);
    const time = Game.cpu.getUsed() - start;
    
    console.log(`自动规划耗时: ${time.toFixed(2)}ms`);
    console.log(`房间状态: ${layoutManager.getRoomLayoutStatus(roomName)}`);
};

/**
 * 为所有符合条件的房间启用自动规划
 * 用法: enableAllAutoPlanner()
 */
(global as any).enableAllAutoPlanner = function(): void {
    console.log('开始为所有房间启用自动规划...');
    
    const myRooms = Object.values(Game.rooms).filter(room => 
        room.controller && room.controller.my && room.controller.level >= 3
    );
    
    console.log(`找到 ${myRooms.length} 个符合条件的房间`);
    
    let processed = 0;
    for (const room of myRooms) {
        console.log(`为房间 ${room.name} 启用自动规划...`);
        layoutManager.enableAutoPlanner(room.name);
        processed++;
        
        // 如果CPU使用率过高，暂停处理
        if (Game.cpu.getUsed() > Game.cpu.limit * 0.8) {
            console.log(`CPU使用率过高，已处理 ${processed}/${myRooms.length} 个房间`);
            console.log('下次tick会继续处理剩余房间');
            return;
        }
    }
    
    console.log(`完成，共为 ${processed} 个房间启用自动规划`);
};

// 直接使用PlannerWrapper的命令
(global as any).RP = function(roomName: string): void {
    const plannerWrapper = (global as any).PlannerWrapper;
    if (!plannerWrapper) {
        console.log('PlannerWrapper 未加载');
        return;
    }
    
    console.log(`[RP] 运行规划并可视化房间 ${roomName}`);
    const success = plannerWrapper.runPlan(roomName);
    if (success) {
        plannerWrapper.visualizePlan(roomName);
        console.log(`[RP] 房间 ${roomName} 规划完成`);
    } else {
        console.log(`[RP] 房间 ${roomName} 规划失败`);
    }
};

(global as any).VP = function(roomName: string): void {
    const plannerWrapper = (global as any).PlannerWrapper;
    if (!plannerWrapper) {
        console.log('PlannerWrapper 未加载');
        return;
    }
    
    console.log(`[VP] 可视化房间 ${roomName}`);
    plannerWrapper.visualizePlan(roomName);
};

(global as any).SP = function(roomName: string): void {
    const plannerWrapper = (global as any).PlannerWrapper;
    if (!plannerWrapper) {
        console.log('PlannerWrapper 未加载');
        return;
    }
    
    console.log(`[SP] 保存房间 ${roomName} 到Memory`);
    const success = plannerWrapper.savePlanToMemory(roomName);
    console.log(`[SP] 保存${success ? '成功' : '失败'}`);
};

console.log('布局管理命令已加载');
console.log('可用命令:');
console.log('- enableAutoPlanner([roomName])');
console.log('- disableAutoPlanner(roomName)');
console.log('- forceReplan(roomName)');
console.log('- layoutStatus(roomName)');
console.log('- clearLayout(roomName)');
console.log('- setLayoutConfig(config)');
console.log('- getLayoutConfig()');
console.log('- batchReplan(roomNames)');
console.log('- allLayoutStatus()');
console.log('- enableRooms(roomNames)');
console.log('- checkPerformance(roomName)');
console.log('- enableAllAutoPlanner()');
console.log('');
console.log('直接使用PlannerWrapper:');
console.log('- RP(roomName)  // 运行规划并可视化');
console.log('- VP(roomName)  // 可视化');
console.log('- SP(roomName)  // 保存到Memory');
