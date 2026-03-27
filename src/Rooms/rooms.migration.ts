/**
 * 房间建筑智能迁移系统
 * 用于处理现有房间与新布局之间的建筑迁移
 */

interface StructureAnalysis {
    existing: Structure;
    planned?: { structureType: string; pos: { x: number; y: number } };
    reason: 'missing' | 'type_mismatch' | 'extra' | 'correct';
}

interface MigrationAnalysis {
    roomName: string;
    missing: StructureAnalysis[];
    mismatches: StructureAnalysis[];
    extras: StructureAnalysis[];
    correct: StructureAnalysis[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    criticalStructures: StructureAnalysis[];
    recommendations: string[];
}

interface MigrationStrategy {
    name: string;
    description: string;
    actions: ('build_missing' | 'remove_extras' | 'remove_mismatches')[];
    conditions: (analysis: MigrationAnalysis) => boolean;
}

interface MigrationResult {
    built: StructureAnalysis[];
    removed: StructureAnalysis[];
    errors: { item: StructureAnalysis; error: string }[];
    summary: {
        totalProcessed: number;
        successRate: number;
        timeElapsed: number;
    };
}

/**
 * 建筑价值评估
 */
const STRUCTURE_VALUES = {
    // 低价值建筑 - 容易重建或影响较小
    LOW_VALUE: {
        [STRUCTURE_ROAD]: { priority: 1, maxCount: Infinity, reason: '道路可重建' },
        [STRUCTURE_CONTAINER]: { priority: 2, maxCount: 3, reason: 'container容易重建' },
        [STRUCTURE_RAMPART]: { priority: 1, maxCount: 20, reason: '过度防御' },
        [STRUCTURE_WALL]: { priority: 1, maxCount: 5, reason: '过度防御' }
    },

    // 高价值建筑 - 重要且难以重建
    HIGH_VALUE: {
        [STRUCTURE_SPAWN]: { priority: 10, maxCount: 3 },
        [STRUCTURE_STORAGE]: { priority: 9, maxCount: 1 },
        [STRUCTURE_TERMINAL]: { priority: 8, maxCount: 1 },
        [STRUCTURE_LINK]: { priority: 7, maxCount: 5 },
        [STRUCTURE_TOWER]: { priority: 6, maxCount: 6 },
        [STRUCTURE_LAB]: { priority: 5, maxCount: 10 },
        [STRUCTURE_FACTORY]: { priority: 4, maxCount: 1 },
        [STRUCTURE_POWER_SPAWN]: { priority: 3, maxCount: 1 },
        [STRUCTURE_EXTRACTOR]: { priority: 2, maxCount: 1 },
        [STRUCTURE_NUKER]: { priority: 1, maxCount: 1 },
        [STRUCTURE_OBSERVER]: { priority: 1, maxCount: 1 }
    }
};

/**
 * 迁移策略定义
 */
const MIGRATION_STRATEGIES: Record<string, MigrationStrategy> = {
    SAFE: {
        name: '安全模式',
        description: '只建造缺失的建筑，不拆除任何现有建筑',
        actions: ['build_missing'],
        conditions: () => true
    },

    SMART: {
        name: '智能模式',
        description: '建造缺失建筑，拆除明显多余的建筑',
        actions: ['build_missing', 'remove_extras'],
        conditions: (analysis) => analysis.riskLevel !== 'CRITICAL'
    },

    AGGRESSIVE: {
        name: '激进模式',
        description: '完全按照布局重建，包括拆除错位建筑',
        actions: ['build_missing', 'remove_mismatches', 'remove_extras'],
        conditions: (analysis) => analysis.riskLevel === 'LOW'
    }
};

/**
 * 房间迁移分析器
 */
class RoomMigrationAnalyzer {

    /**
     * 分析房间现状与布局的差异
     */
    static analyzeRoom(roomName: string): MigrationAnalysis {
        const room = Game.rooms[roomName];
        if (!room) {
            throw new Error(`房间 ${roomName} 不存在或不可见`);
        }

        if (!Memory.roomPlanner || !Memory.roomPlanner[roomName]) {
            throw new Error(`房间 ${roomName} 没有布局数据`);
        }

        const layout = Memory.roomPlanner[roomName].layout;
        const analysis: MigrationAnalysis = {
            roomName,
            missing: [],
            mismatches: [],
            extras: [],
            correct: [],
            riskLevel: 'LOW',
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

            // 确保structureType是有效的建筑类型
            const buildableType = structureType;

            for (const pos of positions) {
                const key = `${structureType}_${pos.x}_${pos.y}`;
                const existing = existingStructures.get(key);

                if (!existing) {
                    analysis.missing.push({
                        existing: null as any,
                        planned: { structureType: buildableType, pos },
                        reason: 'missing'
                    });
                } else if (existing.structureType !== buildableType) {
                    analysis.mismatches.push({
                        existing,
                        planned: { structureType: buildableType, pos },
                        reason: 'type_mismatch'
                    });
                } else {
                    analysis.correct.push({
                        existing,
                        planned: { structureType: buildableType, pos },
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
        analysis.riskLevel = this.assessRisk(analysis);

        return analysis;
    }

    /**
     * 评估迁移风险
     */
    private static assessRisk(analysis: MigrationAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

        // 检查关键建筑冲突
        const criticalTypes = [STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL];
        for (const item of analysis.mismatches) {
            if (criticalTypes.includes(item.existing.structureType as any)) {
                riskLevel = 'CRITICAL';
                analysis.criticalStructures.push(item);
            }
        }

        // 检查建筑数量
        if (analysis.extras.length > 10) {
            riskLevel = 'HIGH';
        } else if (analysis.extras.length > 5) {
            riskLevel = 'MEDIUM';
        }

        // 检查错位建筑数量
        if (analysis.mismatches.length > 8) {
            riskLevel = 'HIGH';
        } else if (analysis.mismatches.length > 3) {
            riskLevel = 'MEDIUM';
        }

        // 生成建议
        if (riskLevel === 'CRITICAL') {
            analysis.recommendations.push('建议先建造新建筑，再拆除旧建筑');
            analysis.recommendations.push('确保有可用的spawn');
        } else if (riskLevel === 'HIGH') {
            analysis.recommendations.push('建议分批进行迁移');
            analysis.recommendations.push('注意能量储备');
        }

        return riskLevel;
    }

    /**
     * 判断建筑是否应该被拆除
     */
    static shouldRemoveStructure(structure: Structure, layout: any, analysis: MigrationAnalysis): {
        shouldRemove: boolean;
        reasons: string[];
        confidence: number;
    } {
        const reasons: string[] = [];

        // 1. 基础价值判断
        if (STRUCTURE_VALUES.LOW_VALUE[structure.structureType]) {
            reasons.push('低价值建筑');
        }

        // 2. 位置判断
        if (this.isPoorlyPositioned(structure, layout)) {
            reasons.push('位置不佳');
        }

        // 3. 效率判断
        if (this.isInefficientStructure(structure)) {
            reasons.push('使用效率低');
        }

        // 4. 重复建筑判断
        if (this.isDuplicatedStructure(structure, layout)) {
            reasons.push('重复建筑');
        }

        return {
            shouldRemove: reasons.length >= 2,
            reasons,
            confidence: Math.min(reasons.length * 0.3, 0.9)
        };
    }

    /**
     * 检查建筑位置是否不佳
     */
    private static isPoorlyPositioned(structure: Structure, layout: any): boolean {
        const pos = structure.pos;
        const room = structure.room;

        // 检查是否阻碍重要路径
        if (this.blocksCriticalPath(structure)) {
            return true;
        }

        // 检查是否在低价值区域
        if (this.isInLowValueArea(structure)) {
            return true;
        }

        // 检查是否孤立
        if (this.isIsolated(structure)) {
            return true;
        }

        return false;
    }

    /**
     * 检查建筑是否阻碍关键路径
     */
    private static blocksCriticalPath(structure: Structure): boolean {
        const pos = structure.pos;
        const room = structure.room;

        // 检查是否阻碍source到storage的路径
        const sources = room.find(FIND_SOURCES);
        const storage = room.storage;

        if (storage) {
            for (const source of sources) {
                const path = PathFinder.search(pos, source.pos, { heuristicWeight: 1 });
                if (path.incomplete) return true;
            }
        }

        return false;
    }

    /**
     * 检查建筑是否在低价值区域
     */
    private static isInLowValueArea(structure: Structure): boolean {
        const pos = structure.pos;
        const room = structure.room;
        const storage = room.storage;

        if (!storage) return false;

        // 距离storage太远或太近
        const distance = pos.getRangeTo(storage);
        return distance > 15 || distance < 2;
    }

    /**
     * 检查建筑是否孤立
     */
    private static isIsolated(structure: Structure): boolean {
        const pos = structure.pos;
        const room = structure.room;

        // 检查周围5格内是否有其他建筑
        const nearbyStructures = room.find(FIND_STRUCTURES, {
            filter: s => s.pos.getRangeTo(pos) <= 5 && s.id !== structure.id
        });

        return nearbyStructures.length === 0;
    }

    /**
     * 检查建筑效率是否低下
     */
    private static isInefficientStructure(structure: Structure): boolean {
        switch (structure.structureType) {
            case STRUCTURE_EXTENSION:
                const room = structure.room;
                return room.controller.level >= 8 &&
                       room.find(FIND_MY_STRUCTURES, { filter: s => s.structureType === STRUCTURE_EXTENSION }).length > 60;

            case STRUCTURE_TOWER:
                const tower = structure as StructureTower;
                return tower.store[RESOURCE_ENERGY] < tower.store.getCapacity(RESOURCE_ENERGY) * 0.3;

            case STRUCTURE_CONTAINER:
                return this.isEmptyForLongTime(structure as StructureContainer, 5000);

            case STRUCTURE_LINK:
                return this.isInactiveLink(structure as StructureLink);

            default:
                return false;
        }
    }

    /**
     * 检查container是否长期空着
     */
    private static isEmptyForLongTime(container: StructureContainer, ticks: number): boolean {
        const room = container.room;
        if (!room.memory.containerStats) {
            room.memory.containerStats = {};
        }

        const stats = room.memory.containerStats[container.id] || { lastFull: Game.time, totalTransferred: 0 };
        room.memory.containerStats[container.id] = stats;

        const timeSinceLastFull = Game.time - stats.lastFull;
        return timeSinceLastFull > ticks;
    }

    /**
     * 检查link是否活跃
     */
    private static isInactiveLink(link: StructureLink): boolean {
        // 简单检查：如果能量长期不变，说明不活跃
        const room = link.room;
        if (!room.memory.linkStats) {
            room.memory.linkStats = {};
        }

        const stats = room.memory.linkStats[link.id] || { lastTransfer: Game.time, totalTransferred: 0 };
        room.memory.linkStats[link.id] = stats;

        const timeSinceLastTransfer = Game.time - stats.lastTransfer;
        return timeSinceLastTransfer > 1000; // 1000tick没有传输
    }

    /**
     * 检查是否为重复建筑
     */
    private static isDuplicatedStructure(structure: Structure, layout: any): boolean {
        const structureType = structure.structureType;
        const maxValue = STRUCTURE_VALUES.HIGH_VALUE[structureType];

        if (maxValue) {
            const room = structure.room;
            const currentCount = room.find(FIND_MY_STRUCTURES, {
                filter: s => s.structureType === structureType
            }).length;

            return currentCount > maxValue.maxCount;
        }

        return false;
    }
}

export {
    RoomMigrationAnalyzer,
    MigrationAnalysis,
    MigrationStrategy,
    MigrationResult,
    MIGRATION_STRATEGIES,
    STRUCTURE_VALUES
};
