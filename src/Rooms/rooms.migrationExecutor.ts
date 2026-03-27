/**
 * 房间迁移执行器
 * 负责执行具体的迁移操作
 */

import { RoomMigrationAnalyzer, MigrationAnalysis, MigrationStrategy, MigrationResult, MIGRATION_STRATEGIES } from './rooms.migration';

/**
 * 迁移执行器
 */
class MigrationExecutor {
    
    /**
     * 执行迁移策略
     */
    static executeMigration(roomName: string, strategyName: string = 'SMART'): MigrationResult {
        const startTime = Game.cpu.getUsed();
        const room = Game.rooms[roomName];
        
        if (!room) {
            throw new Error(`房间 ${roomName} 不存在或不可见`);
        }
        
        // 1. 分析房间
        const analysis = RoomMigrationAnalyzer.analyzeRoom(roomName);
        
        // 2. 选择策略
        const strategy = MIGRATION_STRATEGIES[strategyName];
        if (!strategy) {
            throw new Error(`未知的迁移策略: ${strategyName}`);
        }
        
        if (!strategy.conditions(analysis)) {
            throw new Error(`策略 ${strategyName} 不适用于当前风险等级: ${analysis.riskLevel}`);
        }
        
        console.log(`🚀 开始执行 ${strategy.name} 迁移...`);
        console.log(`📊 分析结果: 缺失${analysis.missing.length}, 错位${analysis.mismatches.length}, 多余${analysis.extras.length}`);
        
        const result: MigrationResult = {
            built: [],
            removed: [],
            errors: [],
            summary: {
                totalProcessed: 0,
                successRate: 0,
                timeElapsed: 0
            }
        };
        
        // 3. 执行策略动作
        for (const action of strategy.actions) {
            switch (action) {
                case 'build_missing':
                    this.buildMissingStructures(room, analysis, result);
                    break;
                case 'remove_extras':
                    this.removeExtraStructures(room, analysis, result);
                    break;
                case 'remove_mismatches':
                    this.removeMismatchedStructures(room, analysis, result);
                    break;
            }
        }
        
        // 4. 计算统计信息
        result.summary.totalProcessed = result.built.length + result.removed.length + result.errors.length;
        result.summary.successRate = result.summary.totalProcessed > 0 ? 
            (result.built.length + result.removed.length) / result.summary.totalProcessed : 1;
        result.summary.timeElapsed = Game.cpu.getUsed() - startTime;
        
        console.log(`✅ 迁移完成: 建造${result.built.length}, 拆除${result.removed.length}, 错误${result.errors.length}`);
        console.log(`⏱️ 用时: ${result.summary.timeElapsed.toFixed(2)} CPU`);
        
        return result;
    }
    
    /**
     * 建造缺失的建筑
     */
    private static buildMissingStructures(room: Room, analysis: MigrationAnalysis, result: MigrationResult): void {
        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
        const maxConstructionSites = 3; // 限制同时建造的工地数量
        
        if (constructionSites.length >= maxConstructionSites) {
            console.log(`⚠️ 工地数量已达上限 (${maxConstructionSites})，跳过建造`);
            return;
        }
        
        let sitesPlaced = 0;
        const availableSlots = maxConstructionSites - constructionSites.length;
        
        // 按优先级排序缺失建筑
        const prioritizedMissing = this.prioritizeMissingStructures(analysis.missing);
        
        for (const item of prioritizedMissing) {
            if (sitesPlaced >= availableSlots) break;
            
            const { structureType, pos } = item.planned!;
            const roomPos = new RoomPosition(pos.x, pos.y, room.name);
            
            // 检查位置是否可以建造
            const look = roomPos.look();
            const hasStructure = look.some(obj => obj.type === LOOK_STRUCTURES);
            const hasConstruction = look.some(obj => obj.type === LOOK_CONSTRUCTION_SITES);
            
            if (!hasStructure && !hasConstruction) {
                const buildResult = room.createConstructionSite(roomPos, structureType as any);
                if (buildResult === OK) {
                    result.built.push(item);
                    sitesPlaced++;
                    console.log(`🔨 建造 ${structureType} 在 (${pos.x},${pos.y})`);
                } else {
                    result.errors.push({ 
                        item, 
                        error: `建造失败: ${this.getBuildErrorString(buildResult)}` 
                    });
                }
            } else {
                result.errors.push({ 
                    item, 
                    error: '位置已有建筑或工地' 
                });
            }
        }
    }
    
    /**
     * 移除多余的建筑
     */
    private static removeExtraStructures(room: Room, analysis: MigrationAnalysis, result: MigrationResult): void {
        const layout = Memory.roomPlanner[room.name].layout;
        
        for (const item of analysis.extras) {
            const structure = item.existing;
            
            // 智能判断是否应该拆除
            const shouldRemove = RoomMigrationAnalyzer.shouldRemoveStructure(structure, layout, analysis);
            
            if (shouldRemove.shouldRemove) {
                // 安全检查
                const safetyCheck = this.performSafetyCheck(structure, room);
                if (!safetyCheck.safe) {
                    result.errors.push({ 
                        item, 
                        error: `安全检查失败: ${safetyCheck.reason}` 
                    });
                    continue;
                }
                
                try {
                    if (structure.destroy()) {
                        result.removed.push(item);
                        console.log(`🗑️ 拆除 ${structure.structureType} 在 (${structure.pos.x},${structure.pos.y}) - ${shouldRemove.reasons.join(', ')}`);
                    } else {
                        result.errors.push({ 
                            item, 
                            error: '拆除失败' 
                        });
                    }
                } catch (error) {
                    result.errors.push({ 
                        item, 
                        error: `拆除出错: ${error}` 
                    });
                }
            }
        }
    }
    
    /**
     * 移除错位的建筑
     */
    private static removeMismatchedStructures(room: Room, analysis: MigrationAnalysis, result: MigrationResult): void {
        for (const item of analysis.mismatches) {
            const existing = item.existing;
            const planned = item.planned!;
            
            // 确保有替代建筑才拆除
            if (!this.hasAlternativeStructure(room, planned)) {
                result.errors.push({ 
                    item, 
                    error: '没有可用的替代建筑' 
                });
                continue;
            }
            
            // 安全检查
            const safetyCheck = this.performSafetyCheck(existing, room);
            if (!safetyCheck.safe) {
                result.errors.push({ 
                    item, 
                    error: `安全检查失败: ${safetyCheck.reason}` 
                });
                continue;
            }
            
            try {
                if (existing.destroy()) {
                    result.removed.push(item);
                    console.log(`🔄 拆除错位建筑 ${existing.structureType} 在 (${existing.pos.x},${existing.pos.y})，计划建造 ${planned.structureType}`);
                    
                    // 立即尝试建造新建筑
                    setTimeout(() => {
                        const roomPos = new RoomPosition(planned.pos.x, planned.pos.y, room.name);
                        const buildResult = room.createConstructionSite(roomPos, planned.structureType as any);
                        if (buildResult === OK) {
                            console.log(`🔨 立即建造 ${planned.structureType} 在 (${planned.pos.x},${planned.pos.y})`);
                        }
                    }, 1);
                } else {
                    result.errors.push({ 
                        item, 
                        error: '拆除失败' 
                    });
                }
            } catch (error) {
                result.errors.push({ 
                    item, 
                    error: `拆除出错: ${error}` 
                });
            }
        }
    }
    
    /**
     * 按优先级排序缺失建筑
     */
    private static prioritizeMissingStructures(missing: any[]): any[] {
        const priority = {
            [STRUCTURE_SPAWN]: 100,
            [STRUCTURE_STORAGE]: 90,
            [STRUCTURE_TERMINAL]: 80,
            [STRUCTURE_EXTENSION]: 70,
            [STRUCTURE_CONTAINER]: 60,
            [STRUCTURE_LINK]: 50,
            [STRUCTURE_TOWER]: 40,
            [STRUCTURE_ROAD]: 30,
            [STRUCTURE_LAB]: 20,
            [STRUCTURE_FACTORY]: 15,
            [STRUCTURE_POWER_SPAWN]: 10,
            [STRUCTURE_EXTRACTOR]: 8,
            [STRUCTURE_NUKER]: 5,
            [STRUCTURE_OBSERVER]: 3,
            [STRUCTURE_RAMPART]: 1
        };
        
        return missing.sort((a, b) => {
            const priorityA = priority[a.planned.structureType] || 0;
            const priorityB = priority[b.planned.structureType] || 0;
            return priorityB - priorityA;
        });
    }
    
    /**
     * 执行安全检查
     */
    private static performSafetyCheck(structure: Structure, room: Room): { safe: boolean; reason: string } {
        // 1. 确保有可用的spawn
        if (structure.structureType === STRUCTURE_SPAWN) {
            const otherSpawns = room.find(FIND_MY_SPAWNS).filter(s => s.id !== structure.id);
            if (otherSpawns.length === 0) {
                return { safe: false, reason: '这是唯一的spawn' };
            }
        }
        
        // 2. 确保storage不为空（如果要拆除）
        if (structure.structureType === STRUCTURE_STORAGE) {
            const storage = structure as StructureStorage;
            if (storage.store) {
                const totalResources = Object.values(storage.store).reduce((a, b) => a + b, 0);
                if (totalResources > 100000) { // 超过10万资源
                    return { safe: false, reason: 'storage中有大量资源' };
                }
            }
        }
        
        // 3. 确保terminal不为空（如果要拆除）
        if (structure.structureType === STRUCTURE_TERMINAL) {
            const terminal = structure as StructureTerminal;
            if (terminal.store) {
                const totalResources = Object.values(terminal.store).reduce((a, b) => a + b, 0);
                if (totalResources > 50000) { // 超过5万资源
                    return { safe: false, reason: 'terminal中有大量资源' };
                }
            }
        }
        
        // 4. 确保能量充足
        const totalEnergy = room.energyAvailable;
        if (totalEnergy < room.energyCapacityAvailable * 0.3) {
            return { safe: false, reason: '房间能量不足30%' };
        }
        
        return { safe: true, reason: '' };
    }
    
    /**
     * 检查是否有替代建筑
     */
    private static hasAlternativeStructure(room: Room, planned: { structureType: string; pos: { x: number; y: number } }): boolean {
        // 对于关键建筑，检查是否有可用的替代
        switch (planned.structureType) {
            case STRUCTURE_SPAWN:
                return room.find(FIND_MY_SPAWNS).length > 0;
            case STRUCTURE_STORAGE:
                return room.storage !== null;
            case STRUCTURE_TERMINAL:
                return room.terminal !== null;
            default:
                return true; // 其他建筑可以暂时没有替代
        }
    }
    
    /**
     * 获取建造错误信息
     */
    private static getBuildErrorString(result: number): string {
        const errors = {
            [-10]: '房间控制器等级不足',
            [-8]: '位置被wall阻挡',
            [-7]: '位置已有建筑',
            [-6]: '位置已有工地',
            [-5]: '位置无效',
            [-4]: '位置被source/mineral阻挡',
            [-3]: '位置被exit阻挡',
            [-2]: '资源不足',
            [-1]: '位置被creep阻挡',
            [-14]: '位置被rampart阻挡',
            0: '成功'
        };
        
        return errors[result] || `未知错误 (${result})`;
    }
    
    /**
     * 备份房间状态
     */
    static backupRoomState(roomName: string): string {
        const room = Game.rooms[roomName];
        if (!room) {
            throw new Error(`房间 ${roomName} 不存在`);
        }
        
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
        
        const backupId = `migration_backup_${roomName}_${Game.time}`;
        Memory[backupId] = backup;
        
        console.log(`💾 已备份房间 ${roomName} 状态，备份ID: ${backupId}`);
        return backupId;
    }
    
    /**
     * 恢复房间状态
     */
    static restoreRoomState(backupId: string): boolean {
        const backup = Memory[backupId] as any;
        if (!backup) {
            console.log(`❌ 备份 ${backupId} 不存在`);
            return false;
        }
        
        const room = Game.rooms[backup.roomName];
        if (!room) {
            console.log(`❌ 房间 ${backup.roomName} 不存在或不可见`);
            return false;
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
        
        return true;
    }
}

export { MigrationExecutor };
