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
 * 测试PlannerWrapper是否正确加载
 * 用法: testPlannerWrapper()
 */
(global as any).testPlannerWrapper = function(): void {
    const plannerWrapper = (global as any).PlannerWrapper;
    if (!plannerWrapper) {
        console.log('❌ PlannerWrapper 未加载');
        console.log('可用的全局属性:', Object.keys(global).filter(key => key.toLowerCase().includes('plan')));
        return;
    }
    
    console.log('✅ PlannerWrapper 已加载');
    console.log('可用方法:', Object.keys(plannerWrapper));
    
    // 测试RoomVisual
    try {
        const rv = new RoomVisual();
        console.log('✅ RoomVisual 可用');
    } catch (e) {
        console.log('❌ RoomVisual 不可用:', e.message);
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
// 注意：这些命令已经在planner-wrapper.js中定义为全局函数，这里不需要重新定义
// RP, VP, SP 等命令直接使用全局定义即可

/**
 * 分析房间迁移需求
 * 用法: analyzeMigration(roomName)
 */
(global as any).analyzeMigration = function(roomName: string): void {
    try {
        // 内联迁移分析逻辑，避免模块依赖问题
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`❌ 房间 ${roomName} 不存在或不可见`);
            return;
        }

        if (!Memory.roomPlanner || !Memory.roomPlanner[roomName]) {
            console.log(`❌ 房间 ${roomName} 没有布局数据`);
            console.log(`请先运行 RP('${roomName}') 生成布局`);
            return;
        }

        const layout = Memory.roomPlanner[roomName].layout;
        const analysis = {
            roomName,
            missing: [],
            mismatches: [],
            extras: [],
            correct: [],
            riskLevel: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            criticalStructures: [],
            recommendations: []
        };

        // 1. 扫描现有建筑
        const existingStructures = new Map<string, Structure>();
        room.find(FIND_MY_STRUCTURES).forEach(structure => {
            const key = `${structure.structureType}_${structure.pos.x}_${structure.pos.y}`;
            existingStructures.set(key, structure);
        });

        // 2. 对比布局差异
        for (const [structureType, positions] of Object.entries(layout)) {
            if (!Array.isArray(positions)) continue;

            for (const pos of positions) {
                const key = `${structureType}_${pos.x}_${pos.y}`;
                const existing = existingStructures.get(key);

                if (!existing) {
                    analysis.missing.push({
                        existing: null as any,
                        planned: { structureType, pos },
                        reason: 'missing'
                    });
                } else if (existing.structureType !== structureType) {
                    analysis.mismatches.push({
                        existing,
                        planned: { structureType, pos },
                        reason: 'type_mismatch'
                    });
                } else {
                    analysis.correct.push({
                        existing,
                        planned: { structureType, pos },
                        reason: 'correct'
                    });
                }

                existingStructures.delete(key); // 标记为已处理
            }
        }

        // 3. 剩余的都是多余建筑
        for (const structure of existingStructures.values()) {
            analysis.extras.push({
                existing: structure,
                reason: 'extra'
            });
        }

        // 4. 评估风险
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        const criticalTypes = ['spawn', 'storage', 'terminal'];
        for (const item of analysis.mismatches) {
            if (criticalTypes.includes(item.existing.structureType)) {
                riskLevel = 'CRITICAL';
                analysis.criticalStructures.push(item);
            }
        }

        if (analysis.extras.length > 10) {
            riskLevel = 'HIGH';
        } else if (analysis.extras.length > 5) {
            riskLevel = 'MEDIUM';
        }

        if (analysis.mismatches.length > 8) {
            riskLevel = 'HIGH';
        } else if (analysis.mismatches.length > 3) {
            riskLevel = 'MEDIUM';
        }

        analysis.riskLevel = riskLevel;

        // 生成建议
        if (riskLevel === 'CRITICAL') {
            analysis.recommendations.push('建议先建造新建筑，再拆除旧建筑');
            analysis.recommendations.push('确保有可用的spawn');
        } else if (riskLevel === 'HIGH') {
            analysis.recommendations.push('建议分批进行迁移');
            analysis.recommendations.push('注意能量储备');
        }

        // 输出分析结果
        console.log(`📊 房间 ${roomName} 迁移分析:`);
        console.log(`├─ 缺失建筑: ${analysis.missing.length}`);
        console.log(`├─ 错位建筑: ${analysis.mismatches.length}`);
        console.log(`├─ 多余建筑: ${analysis.extras.length}`);
        console.log(`├─ 正确建筑: ${analysis.correct.length}`);
        console.log(`├─ 风险等级: ${analysis.riskLevel}`);
        
        if (analysis.criticalStructures.length > 0) {
            console.log(`├─ ⚠️ 关键建筑冲突:`);
            for (const critical of analysis.criticalStructures) {
                console.log(`│  └─ ${critical.existing.structureType} 在 (${critical.existing.pos.x},${critical.existing.pos.y})`);
            }
        }
        
        if (analysis.recommendations.length > 0) {
            console.log(`├─ 💡 建议:`);
            for (const rec of analysis.recommendations) {
                console.log(`│  └─ ${rec}`);
            }
        }
        
        // 显示详细信息
        if (analysis.missing.length > 0) {
            console.log(`└─ 🔍 缺失建筑详情:`);
            const missingByType = {};
            for (const item of analysis.missing) {
                const type = item.planned.structureType;
                missingByType[type] = (missingByType[type] || 0) + 1;
            }
            for (const [type, count] of Object.entries(missingByType)) {
                console.log(`   └─ ${type}: ${count}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ 分析失败: ${error}`);
    }
};

/**
 * 执行房间迁移
 * 用法: migrateRoom(roomName, strategy?)
 * strategy: 'SAFE' | 'SMART' | 'AGGRESSIVE' (默认: 'SMART')
 */
/**
 * 设置房间建造策略
 * 用法: migrateRoom(roomName, strategy?)
 * strategy: 'AUTO' | 'SAFE' | 'SMART' | 'AGGRESSIVE' (默认: 'SMART')
 * 
 * 注意：这个函数现在只设置策略，实际建造由自动系统执行
 */
(global as any).migrateRoom = function(roomName: string, strategy: string = 'SMART'): void {
    try {
        // 验证房间存在
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`❌ 房间 ${roomName} 不存在或不可见`);
            return;
        }

        // 验证布局数据
        if (!Memory.roomPlanner || !Memory.roomPlanner[roomName]) {
            console.log(`❌ 房间 ${roomName} 没有布局数据`);
            console.log(`请先运行 RP('${roomName}') 生成布局`);
            return;
        }

        // 验证策略有效性
        const validStrategies = ['AUTO', 'SAFE', 'SMART', 'AGGRESSIVE'];
        if (!validStrategies.includes(strategy)) {
            console.log(`❌ 无效的策略: ${strategy}`);
            console.log(`可用策略: ${validStrategies.join(', ')}`);
            return;
        }

        console.log(`🎯 配置房间 ${roomName} 建筑策略: ${strategy}`);
        
        // 💾 自动备份
        const backupId = createBackup(roomName);
        
        // 🔄 设置策略配置
        if (!Memory.buildingStrategy) {
            Memory.buildingStrategy = {};
        }
        
        // 📝 记录策略
        Memory.buildingStrategy[roomName] = {
            mode: strategy as 'AUTO' | 'SAFE' | 'SMART' | 'AGGRESSIVE',
            enabled: true,
            lastMigration: Game.time,
            backupId: backupId
        };
        
        console.log(`✅ 策略配置成功`);
        console.log(`💾 自动备份ID: ${backupId}`);
        console.log(`⏱️ 自动建造系统将在下次tick执行新策略`);
        
        // 📊 显示策略说明
        showStrategyInfo(strategy);
        
    } catch (error) {
        console.log(`❌ 策略设置失败: ${error}`);
    }
};

/**
 * 创建房间备份
 */
function createBackup(roomName: string): string {
    const room = Game.rooms[roomName];
    if (!room) return '';
    
    const backupId = `migration_backup_${roomName}_${Game.time}`;
    const backup = {
        timestamp: Game.time,
        roomName,
        structures: room.find(FIND_MY_STRUCTURES).map(s => ({
            id: s.id,
            type: s.structureType,
            pos: { x: s.pos.x, y: s.pos.y },
            hits: s.hits,
            store: (s as any).store || null
        })),
        constructionSites: room.find(FIND_MY_CONSTRUCTION_SITES).map(s => ({
            id: s.id,
            type: s.structureType,
            pos: { x: s.pos.x, y: s.pos.y },
            progress: s.progress,
            progressTotal: s.progressTotal
        }))
    };
    Memory[backupId] = backup;
    return backupId;
}

/**
 * 显示策略说明
 */
function showStrategyInfo(strategy: string): void {
    const strategyInfo = {
        'AUTO': {
            name: '自动模式',
            description: '默认模式：按优先级建造缺失建筑，不拆除任何建筑',
            risk: '🟢 无风险'
        },
        'SAFE': {
            name: '安全模式',
            description: '保守策略：只建造缺失建筑，保留所有现有建筑',
            risk: '🟢 无风险'
        },
        'SMART': {
            name: '智能模式',
            description: '智能优化：建造缺失建筑 + 智能拆除多余低价值建筑',
            risk: '🟡 低风险'
        },
        'AGGRESSIVE': {
            name: '激进模式',
            description: '激进重建：建造缺失建筑 + 拆除所有多余建筑 + 处理错位建筑',
            risk: '🔴 中风险'
        }
    };
    
    const info = strategyInfo[strategy];
    if (info) {
        console.log(`📋 ${info.name} (${info.risk}):`);
        console.log(`   ${info.description}`);
    }
}

// 辅助函数
(global as any).shouldRemoveStructure = function(structure: Structure, layout: any): boolean {
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
};

(global as any).performSafetyCheck = function(structure: Structure, room: Room): { safe: boolean; reason: string } {
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
};

/**
 * 查看当前策略
 * 用法: getStrategy(roomName)
 */
(global as any).getStrategy = function(roomName: string): void {
    const strategy = Memory.buildingStrategy?.[roomName];
    if (strategy) {
        console.log(`📋 房间 ${roomName} 当前策略:`);
        console.log(`├─ 模式: ${strategy.mode}`);
        console.log(`├─ 状态: ${strategy.enabled ? '启用' : '禁用'}`);
        console.log(`├─ 上次迁移: ${new Date(strategy.lastMigration * 1000).toLocaleString()}`);
        console.log(`└─ 备份ID: ${strategy.backupId}`);
    } else {
        console.log(`📋 房间 ${roomName} 使用默认 AUTO 模式`);
    }
};

/**
 * 重置为自动模式
 * 用法: resetStrategy(roomName)
 */
(global as any).resetStrategy = function(roomName: string): void {
    if (Memory.buildingStrategy?.[roomName]) {
        delete Memory.buildingStrategy[roomName];
        console.log(`✅ 房间 ${roomName} 已重置为 AUTO 模式`);
    } else {
        console.log(`ℹ️ 房间 ${roomName} 本来就是 AUTO 模式`);
    }
};

/**
 * 暂停自动建造
 * 用法: pauseBuilding(roomName)
 */
(global as any).pauseBuilding = function(roomName: string): void {
    if (!Memory.buildingStrategy) Memory.buildingStrategy = {};
    Memory.buildingStrategy[roomName] = {
        mode: 'AUTO',
        enabled: false,
        lastMigration: 0,
        backupId: ''
    };
    console.log(`⏸️ 房间 ${roomName} 自动建造已暂停`);
};

/**
 * 恢复自动建造
 * 用法: resumeBuilding(roomName)
 */
(global as any).resumeBuilding = function(roomName: string): void {
    if (Memory.buildingStrategy?.[roomName]) {
        Memory.buildingStrategy[roomName].enabled = true;
        console.log(`▶️ 房间 ${roomName} 自动建造已恢复`);
    } else {
        console.log(`ℹ️ 房间 ${roomName} 本来就是启用状态`);
    }
};

/**
 * 恢复备份
 * 用法: restoreBackup(backupId)
 */
(global as any).restoreBackup = function(backupId: string): void {
    try {
        const backup = Memory[backupId] as any;
        if (!backup) {
            console.log(`❌ 备份 ${backupId} 不存在`);
            return;
        }
        
        const room = Game.rooms[backup.roomName];
        if (!room) {
            console.log(`❌ 房间 ${backup.roomName} 不存在或不可见`);
            return;
        }
        
        console.log(`🔄 开始恢复房间 ${backup.roomName} 状态...`);
        
        // 清除所有工地
        const currentSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        for (const site of currentSites) {
            site.remove();
        }
        
        // 重新创建工地（注意：不能恢复已建成的建筑）
        let restoredSites = 0;
        for (const site of backup.constructionSites) {
            const roomPos = new RoomPosition(site.pos.x, site.pos.y, room.name);
            const result = room.createConstructionSite(roomPos, site.type as any);
            if (result === OK) {
                restoredSites++;
            }
        }
        
        console.log(`✅ 恢复完成，重建了 ${restoredSites} 个工地`);
        
        // 清理备份
        delete Memory[backupId];
        
    } catch (error) {
        console.log(`❌ 恢复失败: ${error}`);
    }
};

/**
 * 列出所有备份
 * 用法: listBackups()
 */
(global as any).listBackups = function(): void {
    const backups = [];
    for (const key in Memory) {
        if (key.startsWith('migration_backup_')) {
            const backup = Memory[key] as any;
            backups.push({
                id: key,
                roomName: backup.roomName,
                timestamp: backup.timestamp,
                timeAgo: Game.time - backup.timestamp
            });
        }
    }
    
    if (backups.length === 0) {
        console.log(`📋 没有找到备份`);
        return;
    }
    
    console.log(`📋 找到 ${backups.length} 个备份:`);
    backups.sort((a, b) => b.timestamp - a.timestamp);
    
    for (const backup of backups) {
        console.log(`├─ ${backup.id}`);
        console.log(`│  ├─ 房间: ${backup.roomName}`);
        console.log(`│  └─ ${backup.timeAgo} tick前`);
    }
    console.log(`└─ 使用 restoreBackup(backupId) 恢复备份`);
};

/**
 * 清理过期备份
 * 用法: cleanupBackups()
 */
(global as any).cleanupBackups = function(): void {
    let cleaned = 0;
    const maxAge = 100000; // 100k tick后自动清理
    
    for (const key in Memory) {
        if (key.startsWith('migration_backup_')) {
            const backup = Memory[key] as any;
            if (Game.time - backup.timestamp > maxAge) {
                delete Memory[key];
                cleaned++;
            }
        }
    }
    
    console.log(`🧹 清理了 ${cleaned} 个过期备份`);
};

/**
 * 手动触发布局建造
 * 用法: buildLayout(roomName)
 */
(global as any).buildLayout = function(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room) {
        console.log(`❌ 房间 ${roomName} 不存在或不可见`);
        return;
    }
    
    if (!Memory.roomPlanner || !Memory.roomPlanner[roomName]) {
        console.log(`❌ 房间 ${roomName} 没有布局数据`);
        console.log(`请先运行 RP('${roomName}') 生成布局`);
        return;
    }
    
    console.log(`🔨 开始根据布局建造房间 ${roomName}`);
    
    // 导入建造函数
    try {
        const { buildFromLayout } = require("../Rooms/rooms.construction");
        buildFromLayout(room);
        console.log(`✅ 布局建造检查完成`);
    } catch (error) {
        console.log(`❌ 布局建造失败: ${error}`);
    }
};

console.log('布局管理命令已加载');
console.log('可用命令:');
console.log('- testPlannerWrapper() // 测试PlannerWrapper是否正确加载');
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
console.log('- buildLayout(roomName) // 手动触发布局建造');
console.log('');
console.log('🔄 智能迁移系统:');
console.log('- analyzeMigration(roomName) // 分析房间迁移需求');
console.log('- migrateRoom(roomName, strategy) // 执行迁移 (SAFE/SMART/AGGRESSIVE)');
console.log('- restoreBackup(backupId) // 恢复备份');
console.log('- listBackups() // 列出所有备份');
console.log('- cleanupBackups() // 清理过期备份');
console.log('');
console.log('直接使用PlannerWrapper:');
console.log('- RP(roomName)  // 运行规划+可视化+保存缓存');
console.log('- VP(roomName)  // 从缓存可视化');
console.log('- SP(roomName)  // 保存到Memory');
console.log('- runPlan(roomName)  // 只运行规划并保存缓存');
console.log('- listPlanCache()  // 列出所有缓存');
console.log('- clearRoomPlanCache(roomName)  // 清除指定房间缓存');
