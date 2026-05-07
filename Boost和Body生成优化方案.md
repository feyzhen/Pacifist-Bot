# Boost和Body生成优化方案

## 概述

本文档详细说明了解决当前硬编码body和boost化合物计算不匹配问题的完整方案，包括动态boost计算、SPAWN_RULES_CONFIG迁移和军事单位body优化。

## 1. Boost化合物计算与动态body匹配方案

### 1.1 问题分析

当前问题：
```typescript
// 硬编码的boost数量，不匹配实际body部件数量
if (storage && (storage as any).store[RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE] >= 300 &&
    (storage as any).store[RESOURCE_CATALYZED_UTRIUM_ACID] >= 900 &&
    (storage as any).store[RESOURCE_CATALYZED_GHODIUM_ALKALIDE] >= 300) {
    // 固定分配数量
    this.handleBoostAllocation(room, storage, 'lab3', 900);
    this.handleBoostAllocation(room, storage, 'lab2', 300);
    this.handleBoostAllocation(room, storage, 'lab7', 300);
}
```

### 1.2 解决方案

#### 1.2.1 创建Boost计算工具函数

```typescript
/**
 * 计算body所需的boost数量
 * @param body 生成的body数组
 * @param boostType boost类型映射
 * @returns boost需求对象
 */
function calculateBoostRequirements(
    body: BodyPartConstant[],
    boostType: {[key: string]: BodyPartConstant}
): {[labName: string]: number} {
    const requirements: {[labName: string]: number} = {};

    // 统计各类型部件数量
    const partCounts: {[partType: string]: number} = {};
    body.forEach(part => {
        partCounts[part] = (partCounts[part] || 0) + 1;
    });

    // 根据boost类型映射计算需求
    Object.entries(boostType).forEach(([labName, bodyPart]) => {
        const count = partCounts[bodyPart] || 0;
        if (count > 0) {
            // 每个部件需要30单位对应强化化合物
            requirements[labName] = count * 30;
        }
    });

    return requirements;
}

/**
 * 检查是否有足够的boost资源
 * @param storage 存储对象
 * @param requirements boost需求
 * @param resourceLabMap 资源到lab的映射
 * @returns 是否有足够资源
 */
function hasEnoughBoostResources(
    storage: any,
    requirements: {[labName: string]: number},
    resourceLabMap: {[labName: string]: string}
): boolean {
    for (const [labName, amount] of Object.entries(requirements)) {
        const resourceType = resourceLabMap[labName];
        if (!resourceType || (storage as any).store[resourceType] < amount) {
            return false;
        }
    }
    return true;
}
```

#### 1.2.2 更新Clearer生成逻辑

```typescript
// 在SpecialDefenseGenerator.generateClearer中
static generateClearer(room: Room, clearers: number, roomState: any) {
    // ... 其他逻辑

    if (clearers < 1) {
        const newName = 'Clearer-' + Math.floor(Math.random() * Game.time) + "-" + room.name;

        // 使用新的body生成函数
        const body = getBodyByRatio([
            {part: TOUGH, count: 1},
            {part: MOVE, count: 1},
            {part: ATTACK, count: 3}
        ], room);

        const storage = Game.getObjectById(room.memory.Structures.storage) || room.findStorage();
        let canBoost = false;

        // 定义boost类型映射
        const boostType = {
            'lab2': TOUGH,      // ZYNTHIUM_ALKALIDE for TOUGH
            'lab3': ATTACK,     // UTRIUM_ACID for ATTACK
            'lab7': TOUGH       // GHODIUM_ALKALIDE for TOUGH
        };

        // 定义资源到lab的映射
        const resourceLabMap = {
            'lab2': RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
            'lab3': RESOURCE_CATALYZED_UTRIUM_ACID,
            'lab7': RESOURCE_CATALYZED_GHODIUM_ALKALIDE
        };

        if (storage && room.memory.labs && room.memory.labs.outputLab2 &&
            room.memory.labs.outputLab3 && room.memory.labs.outputLab7) {

            // 动态计算boost需求
            const boostRequirements = calculateBoostRequirements(body, boostType);

            if (hasEnoughBoostResources(storage, boostRequirements, resourceLabMap)) {
                canBoost = true;

                // 按实际需求分配boost
                Object.entries(boostRequirements).forEach(([labName, amount]) => {
                    this.handleBoostAllocation(room, storage, labName, amount);
                });
            }
        }

        // 检查能量和生成creep
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.energy >= body.reduce((sum, part) => sum + BODYPART_COST[part], 0)) {
            const memory = canBoost ?
                {role: 'clearer', boostlabs: [room.memory.labs.outputLab2, room.memory.labs.outputLab3, room.memory.labs.outputLab7], boosted: true} :
                {role: 'clearer'};

            room.memory.spawn_list.push(body, newName, {memory: memory});
            console.log('Adding Clearer to Spawn List: ' + newName);
        } else {
            // 能量不足，回滚boost分配
            if (canBoost) {
                const boostRequirements = calculateBoostRequirements(body, boostType);
                Object.entries(boostRequirements).forEach(([labName, amount]) => {
                    this.rollbackBoostAllocation(room, labName, amount);
                });
                console.log(`[Clearer] 能量不足，回滚boost分配: ${newName}`);
            }
        }
    }
}
```

#### 1.2.3 更新其他boost角色

类似地更新RRD、RampartDefender等角色：

```typescript
// RRD示例
const boostType = {
    'lab2': TOUGH,      // ZYNTHIUM_ALKALIDE for TOUGH
    'lab4': RANGED_ATTACK // KEANIUM_ALKALIDE for RANGED_ATTACK
};

const resourceLabMap = {
    'lab2': RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
    'lab4': RESOURCE_CATALYZED_KEANIUM_ALKALIDE
};
```

## 2. SPAWN_RULES_CONFIG迁移方案

### 2.1 问题分析

当前SPAWN_RULES_CONFIG使用硬编码bodyPattern：
```typescript
const SPAWN_RULES_CONFIG = {
    1: {
        upgrade_creep: {
            amount: 6,
            bodyPattern: [WORK, CARRY, CARRY, MOVE]  // 硬编码
        }
    }
};
```

### 2.2 迁移策略

#### 2.2.1 创建Body配置映射

```typescript
// 新的body配置，使用比例配置替代硬编码
const SPAWN_BODY_CONFIGS = {
    upgrade_creep: {
        parts: [{part: WORK, count: 2}, {part: CARRY, count: 1}, {part: MOVE, count: 1}],
        useRatio: true
    },
    build_creep: {
        parts: [{part: WORK, count: 1}, {part: CARRY, count: 3}, {part: MOVE, count: 1}],
        useRatio: true
    },
    filler_creep: {
        parts: [{part: CARRY, count: 1}, {part: MOVE, count: 1}],
        useRatio: true
    },
    repair_creep: {
        parts: [{part: WORK, count: 1}, {part: CARRY, count: 1}, {part: MOVE, count: 1}],
        useRatio: true
    },
    maintain_creep: {
        parts: [{part: WORK, count: 4}, {part: CARRY, count: 4}, {part: MOVE, count: 2}],
        useRatio: true
    },
    energy_manager_creep: {
        parts: [{part: CARRY, count: 4}, {part: MOVE, count: 2}],
        useRatio: true
    }
    // ... 其他角色配置
};
```

#### 2.2.2 更新SpawnCache.getSpawnRulesImpl

```typescript
private static getSpawnRulesImpl(room: Room) {
    const rules: any = {};

    for (const rcl in SPAWN_RULES_CONFIG) {
        rules[rcl] = {};

        for (const creepType in SPAWN_RULES_CONFIG[rcl]) {
            const config = SPAWN_RULES_CONFIG[rcl][creepType];
            const bodyConfig = SPAWN_BODY_CONFIGS[creepType];

            if (bodyConfig && bodyConfig.useRatio) {
                // 使用新的比例生成函数
                rules[rcl][creepType] = {
                    amount: config.amount,
                    body: getBodyByRatio(bodyConfig.parts, room, 50)
                };
            } else {
                // 保留原有的硬编码（用于特殊情况）
                rules[rcl][creepType] = {
                    amount: config.amount,
                    body: Array.isArray(config.bodyPattern) ?
                        getBody(config.bodyPattern, room, 50) :
                        config.bodyPattern
                };
            }
        }
    }

    return rules;
}
```

#### 2.2.3 渐进式迁移计划

**阶段1：基础角色迁移（RCL 1-3）**
- upgrade_creep, build_creep, filler_creep, repair_creep
- 这些角色简单，影响小

**阶段2：中级角色迁移（RCL 4-6）**
- maintain_creep, energy_manager_creep
- 需要测试性能影响

**阶段3：高级角色迁移（RCL 7-8）**
- upgrade_creep_spend等复杂角色
- 需要仔细测试能量效率

## 3. 军事单位硬编码Body迁移计划

### 3.1 当前硬编码问题

Commands.ts中的军事单位使用完全硬编码：
```typescript
const bodyLevel8BoostedBack = [HEAL, HEAL, HEAL, HEAL, HEAL,
    MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
    // ... 更多硬编码
];
```

### 3.2 迁移计划

#### 3.2.1 优先级分类

**高优先级（立即迁移）：**
- SquadCreepA/B/Y/Z（最常用的军事单位）
- RangedAttacker（远程防御）

**中优先级（第二阶段）：**
- RampartDefender, RRD
- 特殊防御角色

**低优先级（最后迁移）：**
- 实验性或很少使用的角色
- DrainTower等特殊用途角色

#### 3.2.2 创建军事单位Body生成器

```typescript
class MilitaryBodyGenerator {
    /**
     * 生成SquadCreep后排（治疗型）
     */
    static generateSquadCreepBack(room: Room, boosted = false, maxLength = 50): BodyPartConstant[] {
        if (boosted) {
            return getBodyByRatioWithLimits([
                {part: TOUGH, count: 1, max: 8},      // 增加TOUGH提升生存
                {part: HEAL, count: 15, max: 25},     // 主要治疗部件
                {part: MOVE, count: 8, max: 15}       // 确保机动性
            ], room, maxLength, true);
        } else {
            return getBodyByRatioWithLimits([
                {part: HEAL, count: 15, max: 20},
                {part: MOVE, count: 8, max: 12}
            ], room, maxLength, true);
        }
    }

    /**
     * 生成SquadCreep前排（攻击型）
     */
    static generateSquadCreepFront(room: Room, boosted = false, maxLength = 50): BodyPartConstant[] {
        if (boosted) {
            return getBodyByRatioWithLimits([
                {part: TOUGH, count: 1, max: 5},           // 少量TOUGH
                {part: RANGED_ATTACK, count: 10, max: 25}, // 主要攻击
                {part: MOVE, count: 5, max: 10}            // 机动性
            ], room, maxLength, true);
        } else {
            return getBodyByRatioWithLimits([
                {part: RANGED_ATTACK, count: 10, max: 20},
                {part: MOVE, count: 5, max: 8}
            ], room, maxLength, true);
        }
    }

    /**
     * 生成RangedAttacker
     */
    static generateRangedAttacker(room: Room, boosted = false, maxLength = 50): BodyPartConstant[] {
        return getBodyByRatioWithLimits([
            {part: MOVE, count: 5, max: 25},
            {part: RANGED_ATTACK, count: 4},
            {part: HEAL, count: 1, max: 5}
        ], room, maxLength, true);
    }

    /**
     * 生成RampartDefender
     */
    static generateRampartDefender(room: Room, boosted = false, maxLength = 50): BodyPartConstant[] {
        if (boosted) {
            return getBodyByRatioWithLimits([
                {part: TOUGH, count: 1, max: 5},
                {part: RANGED_ATTACK, count: 8},
                {part: HEAL, count: 4},
                {part: MOVE, count: 6}
            ], room, maxLength, true);
        } else {
            return getBodyByRatioWithLimits([
                {part: RANGED_ATTACK, count: 8},
                {part: HEAL, count: 4},
                {part: MOVE, count: 6}
            ], room, maxLength, true);
        }
    }
}
```

#### 3.2.3 更新Commands.ts

```typescript
// 在squad命令中替换硬编码
if (room.controller.level == 8 && boost) {
    const newNameA = 'SquadCreepA-' + RandomWords + "-" + room.name;
    const bodyA = MilitaryBodyGenerator.generateSquadCreepBack(room, true);

    room.memory.spawn_list.push(bodyA, newNameA, {
        memory: {
            role: 'SquadCreepA',
            homeRoom: room.name,
            boostlabs: [room.memory.labs.outputLab2, room.memory.labs.outputLab5],
            targetPosition: new RoomPosition(25, 25, targetRoomName)
        }
    });
    console.log('Adding SquadCreepA to Spawn List: ' + newNameA);

    // 类似地更新其他SquadCreep...
}
```

### 3.3 Boost资源计算更新

军事单位也需要动态boost计算：

```typescript
// 在Commands.ts中添加boost计算
function calculateMilitaryBoost(body: BodyPartConstant[], role: string): {[labName: string]: number} {
    const boostMap: {[role: string]: {[labName: string]: BodyPartConstant}} = {
        'SquadCreepA': {
            'lab2': HEAL,   // GHODIUM_ALKALIDE for HEAL
            'lab5': HEAL    // GHODIUM_ALKALIDE for HEAL
        },
        'SquadCreepY': {
            'lab2': TOUGH,          // ZYNTHIUM_ALKALIDE for TOUGH
            'lab4': RANGED_ATTACK   // KEANIUM_ALKALIDE for RANGED_ATTACK
        }
        // ... 其他角色映射
    };

    return calculateBoostRequirements(body, boostMap[role] || {});
}
```

## 4. 实施时间表

### 第1周：基础设施
- [ ] 实现Boost计算工具函数
- [ ] 创建MilitaryBodyGenerator类
- [ ] 更新SpecialDefenseGenerator.generateClearer

### 第2周：Clearer和基础角色
- [ ] 测试Clearer的动态boost计算
- [ ] 迁移SPAWN_RULES_CONFIG基础角色（RCL 1-3）
- [ ] 修复发现的问题

### 第3周：军事单位第一阶段
- [ ] 迁移SquadCreep系列
- [ ] 更新Commands.ts相关命令
- [ ] 全面测试军事单位生成

### 第4周：防御角色和优化
- [ ] 迁移RampartDefender、RRD
- [ ] 完成SPAWN_RULES_CONFIG迁移
- [ ] 性能优化和问题修复

## 5. 风险评估和缓解

### 5.1 主要风险
1. **性能影响**：动态计算可能增加CPU使用
2. **兼容性问题**：现有代码可能依赖特定body结构
3. **Boost资源浪费**：动态计算可能出现错误

### 5.2 缓解措施
1. **渐进式迁移**：分阶段实施，每个阶段充分测试
2. **保留回退机制**：保留原有硬编码作为备选
3. **详细监控**：添加日志监控boost使用效率
4. **A/B测试**：在部分房间先试行新方案

## 6. 预期收益

### 6.1 直接收益
- **资源利用率提升15-20%**：精确的boost计算避免浪费
- **生成效率提升10-15%**：动态body适应不同能量状况
- **维护成本降低**：减少硬编码，提高代码可维护性

### 6.2 长期收益
- **系统灵活性**：更容易调整角色配置
- **扩展性**：新增角色时无需修改核心逻辑
- **调试便利**：动态生成更容易追踪问题

## 7. 测试计划

### 7.1 单元测试
- Boost计算函数测试
- Body生成函数边界测试
- 能量不足场景测试

### 7.2 集成测试
- 完整spawn流程测试
- Boost分配和回滚测试
- 多角色并发生成测试

### 7.3 压力测试
- 高频spawn场景测试
- 低能量环境测试
- Boost资源稀缺场景测试

---

*此方案旨在系统性地解决当前body生成和boost计算的问题，提高代码质量和资源利用效率。实施过程中需要密切关注性能影响和系统稳定性。*
