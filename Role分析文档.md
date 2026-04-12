# Pacifist-Bot Role 分析文档

## 概述

本文档分析了 Pacifist-Bot 中各个 role 在 `rooms.spawning.ts` 中的生成逻辑，以及各个爬虫自己的运行逻辑。

---

## 一、生成逻辑分析 (rooms.spawning.ts)

### 1.1 生成系统架构

`rooms.spawning.ts` 文件包含以下主要函数：

- **`spawning(room)`**: 主生成函数，负责协调整个生成流程
- **`add_creeps_to_spawn_list(room, spawn)`**: 根据房间状态添加爬虫到生成队列
- **`spawnFirstInLine(room, spawn)`**: 执行生成队列中的第一个任务
- **`spawn_energy_miner()`**: 生成能量矿工
- **`spawn_carrier()`**: 生成搬运工
- **`spawn_remote_repairer()`**: 生成远程维修工
- **`spawn_reserver()`**: 生成保留者

### 1.2 生成规则配置 (spawnrules)

系统为每个 RCL (Room Controller Level) 等级（1-8）定义了不同的生成规则：

```typescript
const spawnrules = {
    1: { upgrade_creep, build_creep, filler_creep },
    2: { upgrade_creep, build_creep, repair_creep, filler_creep },
    3: { build_creep, upgrade_creep, filler_creep, repair_creep, maintain_creep },
    4: { build_creep, upgrade_creep, filler_creep, repair_creep, maintain_creep },
    5: { build_creep, upgrade_creep, filler_creep, repair_creep, maintain_creep },
    6: { build_creep, upgrade_creep, filler_creep, energy_manager_creep, repair_creep, maintain_creep },
    7: { build_creep, upgrade_creep, upgrade_creep_spend, filler_creep, energy_manager_creep, repair_creep, maintain_creep },
    8: { build_creep, upgrade_creep, filler_creep, energy_manager_creep, repair_creep, maintain_creep }
}
```

### 1.3 主要 Role 的生成条件

#### **Builder (建造者)**

**生成条件：**
- RCL 1-8: 当建造工地数量 > 0 且搬运工/能量矿工数量充足时
- RCL 4+: 需要存储能量 > 15000
- RCL 6+: 如果建造工地只有城墙，生成小型建造者

**优先级：**
- 优先建造 Link 和 Storage
- 其次建造 Extension
- 然后建造 Container
- 最后建造其他建筑

#### **Upgrader (升级者)**

**生成条件：**
- RCL 1-3: 在非危险状态下生成
- RCL 4+: 当存储能量充足（>100000）或控制器即将降级时生成
- RCL 7: 有特殊的 `upgrade_creep_spend` 版本，用于大量消耗能量升级

**特殊逻辑：**
- 当存储空间不足时（<200），额外生成升级者消耗能量
- 当控制器降级时间过短时，优先生成升级者

#### **Filler (填充者)**

**生成条件：**
- 所有 RCL: 根据远程房间数量动态调整
  - 1个远程房间: 基础数量
  - 2个远程房间: 基础数量 + 1
  - 3个远程房间: 基础数量 + 2
- RCL 6+: 在危险状态下额外生成
- RCL 8: 根据维修者数量动态调整

**特殊逻辑：**
- 在危险状态且危险计时器 > 35 时，额外生成填充者
- 填充者在生命结束前会自动生成替代者

#### **Repair (维修者)**

**生成条件：**
- RCL 2+: 当搬运工和能量矿工充足时生成
- RCL 4+: 根据存储能量和城墙血量动态生成
  - 存储能量 > 50000 且城墙血量 < 60000
  - 或危险计时器 > 50
- RCL 6+: 根据存储能量和 CPU bucket 动态调整数量
- RCL 8: 支持强化版本（使用实验室强化）

**特殊逻辑：**
- 核弹威胁时生成额外维修者
- 可以使用实验室强化（Catalyzed Lemergium Acid）

#### **EnergyMiner (能量矿工)**

**生成条件：**
- 通过 `spawn_energy_miner()` 函数生成
- 根据能量源位置和房间状态生成
- RCL 6+: 支持强化版本（使用 Utrium Oxide）

**特殊逻辑：**
- 根据房间能量容量动态调整身体配置
- 支持危险模式（在危险状态下生成带防御的矿工）
- 远程矿工在危险状态下不生成

#### **Carry (搬运工)**

**生成条件：**
- 通过 `spawn_carrier()` 函数生成
- 根据能量源到存储的距离计算所需搬运能力
- RCL 5+: 远程搬运工身体更大

**特殊逻辑：**
- 身体配置根据路径长度动态计算
- 使用 `getCarrierBody()` 函数计算最优身体配置

#### **EnergyManager (能量管理器)**

**生成条件：**
- RCL 5+: 生成1个基础版本
- RCL 6+: 当有 Link 或 Terminal 时生成
- RCL 7+: 根据实验室状态生成
- RCL 8: 根据CPU bucket和电池状态动态调整

**特殊逻辑：**
- 紧急模式：当房间能量不足时，清空生成队列优先生成
- 支持从 Link、Terminal、Factory、Bin 等多个结构管理能量

#### **Maintainer (维护者)**

**生成条件：**
- RCL 3+: 当有需要维护的道路或城墙时生成
- 根据房间状态和存储能量决定是否生成

**特殊逻辑：**
- 维护注册的道路（keepTheseRoads）
- 维护 Container
- 维护低血量城墙（<500000 且距离存储 >= 9）

#### **Reserve (保留者)**

**生成条件：**
- 通过 `spawn_reserver()` 函数生成
- 当远程房间需要保留时生成
- 根据房间 RCL 等级调整身体配置

**特殊逻辑：**
- RCL 5: [CLAIM,MOVE,CLAIM,MOVE]
- RCL 6: [CLAIM,MOVE,CLAIM,MOVE,CLAIM,MOVE]
- RCL 7: 7个 CLAIM+MOVE 对
- RCL 8: 8个 CLAIM+MOVE 对

#### **RemoteRepair (远程维修者)**

**生成条件：**
- RCL 2+: 通过 `spawn_remote_repairer()` 函数生成
- 当远程房间有建造工地时生成

**特殊逻辑：**
- 根据房间能量容量调整身体配置
- 在危险状态下不生成

### 1.4 战斗 Role 生成逻辑

#### **Defender (防御者)**

**生成条件：**
- 目前代码中被注释掉，主要使用 RampartDefender 替代

#### **RampartDefender (城墙防御者)**

**生成条件：**
- 当房间处于危险状态且危险计时器 > 35
- 敌对爬虫在存储 14 格范围内
- 根据敌对爬虫数量和类型决定是否强化

**特殊逻辑：**
- 支持实验室强化（Catalyzed Utrium Acid）
- 根据敌对爬虫是否有 ATTACK 部分调整身体配置
- RCL 7 和 RCL 8 有不同的身体配置

#### **RRD (RangedRampartDefender - 远程城墙防御者)**

**生成条件：**
- 敌对爬虫数量 > 4
- 存储充足强化资源
- RCL 7: < 3个，RCL 8: < 2个

**特殊逻辑：**
- 使用双重强化（Catalyzed Zynthium Alkalide + Catalyzed Keanium Alkaliide）
- 高远程攻击能力

#### **Attacker (攻击者)**

**生成条件：**
- 当远程房间有敌对结构时生成
- 根据房间 RCL 调整身体配置

**特殊逻辑：**
- RCL 4-5: 中等配置
- RCL 7+: 高配置
- 用于清除敌对结构

#### **RangedAttacker (远程攻击者)**

**生成条件：**
- 当远程房间有敌对爬虫（非入侵者）时生成
- 根据敌对爬虫的身体配置计算所需治疗和远程攻击能力

**特殊逻辑：**
- 动态计算身体配置
- 支持实验室强化（Catalyzed Keanium Alkaliide）

### 1.5 特殊 Role 生成逻辑

#### **SneakyControllerUpgrader (潜行控制器升级者)**

**生成条件：**
- RCL 5+
- 存储能量 > 180000
- CPU bucket > 7000
- 有需要保持浮动的房间（Memory.keepAfloat）

**特殊逻辑：**
- 根据目标房间是否有敌对爬虫调整身体配置
- 一次生成多个（无危险时生成4个）

#### **SpecialRepair/SpecialCarry (特殊维修/搬运)**

**生成条件：**
- 房间处于危险状态
- 城墙血量过低
- RCL 6-7

**特殊逻辑：**
- 支持实验室强化
- 用于紧急维修城墙

#### **Clearer (清除者)**

**生成条件：**
- RCL 8
- 危险状态且危险计时器 > 300
- 有敌对爬虫且有 ATTACK 或 RANGED_ATTACK 部分

**特殊逻辑：**
- 支持三重强化
- 高攻击力配置

#### **MineralMiner (矿物矿工)**

**生成条件：**
- RCL 6+
- 有 Extractor
- 矿物数量 > 0
- 存储能量 > 50000

#### **Sweeper (清扫者)**

**生成条件：**
- RCL 4+
- 地面掉落资源和墓碑数量较多

#### **Signer (签名者)**

**生成条件：**
- RCL 5+
- 控制器签名不是指定文本

#### **Priest (牧师)**

**生成条件：**
- RCL 6+
- CPU bucket > 7000
- 定期生成（DOB % 125000 < 400）

---

## 二、各 Role 运行逻辑分析

### 2.1 Builder (建造者)

**文件位置**: `src/Roles/builder.ts`

**运行逻辑：**
1. **目标锁定机制**:
   - 使用 `findLocked()` 函数查找建造目标
   - 优先级：Link/Storage > Extension > Container > 其他
   - 支持新布局系统和传统系统混合使用

2. **能量获取**:
   - 优先从 Storage 获取能量
   - 如果没有 Storage，从 Container 或地面获取

3. **建造流程**:
   - 携带能量时移动到目标位置
   - 执行建造操作
   - 建造完成后寻找下一个目标

4. **特殊功能**:
   - 支持撤离模式（evacuate）
   - 支持危险状态下的逃跑逻辑
   - 无任务时自动回收

### 2.2 Upgrader (升级者)

**文件位置**: `src/Roles/upgrader.ts`

**运行逻辑：**
1. **能量获取**:
   - 优先从 Controller Link 获取能量
   - 其次从 Storage 获取
   - 最后从 Container 或地面获取

2. **升级流程**:
   - 携带能量时移动到控制器
   - 执行升级操作
   - 从 Controller Link 补充能量

3. **特殊功能**:
   - RCL 2 时有建造工地时转换为 Builder
   - 生命结束时自动回收
   - 支持从 Link 转移剩余能量

### 2.3 Filler (填充者)

**文件位置**: `src/Roles/filler.ts`

**运行逻辑：**
1. **能量获取**:
   - 优先从 Bin 获取能量
   - 其次从 Storage 获取
   - 最后从 Container 或地面获取

2. **填充流程**:
   - 携带能量时寻找需要填充的结构
   - 优先填充 Spawn、Extension、Tower
   - 使用 `findFillerTarget()` 查找目标

3. **特殊功能**:
   - 生命结束前自动生成替代者
   - 支持危险状态下的逃跑逻辑
   - 根据房间 RCL 调整最小携带量

### 2.4 Repair (维修者)

**文件位置**: `src/Roles/repair.ts`

**运行逻辑：**
1. **目标选择**:
   - 使用 `findLocked()` 函数查找维修目标
   - 优先级：核弹威胁 > 低血量建筑 > 其他建筑
   - 排除道路和容器（除非特殊情况）

2. **能量获取**:
   - 优先从 Tower 获取能量
   - 其次从 Controller Link 获取
   - 最后从 Storage 获取

3. **维修流程**:
   - 携带能量时移动到目标
   - 执行维修操作
   - 支持强化模式下的移动逻辑

4. **特殊功能**:
   - 核弹威胁时优先维修重要结构的城墙
   - 支持实验室强化
   - 危险状态下使用不同的移动策略

### 2.5 EnergyMiner (能量矿工)

**文件位置**: `src/Roles/energyMiner.ts`

**运行逻辑：**
1. **基础模式** (RCL < 5 或无 Link):
   - 直接采集能量源
   - 将能量放入 Container
   - 简单高效

2. **高级模式** (RCL >= 5 且有 Link):
   - 采集能量并放入 Source Link
   - 管理 Link 能量传输
   - 维护附近的城墙和建造工地
   - 补充 Extension 能量

3. **强化模式**:
   - 使用 Utrium Oxide 强化
   - 提高采集效率

4. **特殊功能**:
   - 检查并维护 Source Link 附近的城墙
   - 管理能量传输（Source Link → Controller Link/Storage Link）
   - 支持危险状态下的逃跑逻辑

### 2.6 Carry (搬运工)

**文件位置**: `src/Roles/carry.ts`

**运行逻辑：**
1. **能量收集**:
   - 从 Container 或地面收集能量
   - 支持远程房间采集

2. **能量运输**:
   - 携带能量返回主房间
   - 优先放入 Storage
   - 其次放入 Bin
   - 最后放入 Spawn/Extension/Tower

3. **目标锁定**:
   - 使用 `findLocked()` 查找目标
   - 优先级：Terminal（能量不足）> Tower（能量不足）> Spawn/Extension > 其他

4. **特殊功能**:
   - 生命结束时自动回收
   - 支持危险状态下的逃跑逻辑
   - 无 Storage 时转换为 FakeFiller

### 2.7 EnergyManager (能量管理器)

**文件位置**: `src/Roles/energyManager.ts`

**运行逻辑：**
1. **实验室管理**:
   - 清理输入实验室的错误矿物
   - 为输出实验室提供强化资源
   - 管理实验室强化状态

2. **能量管理**:
   - 从 Storage 获取能量
   - 分配给各个结构
   - 管理 Terminal 能量

3. **特殊功能**:
   - 生命结束前自动生成替代者
   - 支持多种资源管理
   - 根据房间状态调整身体配置

### 2.8 Maintainer (维护者)

**文件位置**: `src/Roles/maintainer.ts`

**运行逻辑：**
1. **目标选择**:
   - 维护注册的道路（keepTheseRoads）
   - 维护 Container
   - 维护低血量城墙（距离存储 >= 9）

2. **紧急维修**:
   - RCL 6+ 支持紧急维修未注册的严重损坏道路
   - 道路血量 < 30% 时触发

3. **能量获取**:
   - 优先从 Storage 获取
   - 其次从 Container 获取
   - 无能量源时转换为 Repair

4. **特殊功能**:
   - 危险状态下只维修存储附近的建筑
   - 无任务时自动回收

### 2.9 Reserve (保留者)

**文件位置**: `src/Roles/reserve.ts`

**运行逻辑：**
1. **移动到目标房间**:
   - 使用 `moveToRoom()` 移动到目标房间

2. **占领/保留**:
   - 如果需要占领（claim=true），执行占领操作
   - 否则执行保留操作
   - 保留完成后自杀

3. **特殊功能**:
   - 支持攻击控制器（降低预留等级）
   - 保留时间达到最大值时自杀

### 2.10 Defender (防御者)

**文件位置**: `src/Roles/defender.ts`

**运行逻辑：**
1. **战斗逻辑**:
   - 寻找最近的敌对爬虫
   - 使用远程攻击
   - 多个敌人时使用范围攻击

2. **位置管理**:
   - 移动到指定城墙位置
   - 在城墙上进行战斗
   - 无城墙时移动到 Terminal

3. **特殊功能**:
   - 无危险时自动回收
   - 配合 RampartDefender 使用

---

## 三、生成优先级总结

### 3.1 高优先级 Role（使用 unshift 添加到队列前面）

1. **Filler**: 能量填充是基础
2. **EnergyManager**: 能量管理是核心
3. **EnergyMiner**: 能量采集是基础
4. **Emergency scenarios**: 紧急情况下的特殊角色

### 3.2 中优先级 Role（使用 push 添加到队列后面）

1. **Builder**: 建造重要但不紧急
2. **Upgrader**: 升级重要但不紧急
3. **Repair**: 维修重要但不紧急
4. **Carry**: 搬运重要但不紧急

### 3.3 条件触发 Role

1. **战斗 Role**: 仅在危险状态下生成
2. **特殊 Role**: 仅在特定条件下生成（如 Signer, Priest）
3. **远程 Role**: 根据远程房间状态生成

---

## 四、身体配置策略

### 4.1 动态身体配置

系统使用 `getBody()` 函数根据可用能量动态配置爬虫身体：

```typescript
function getBody(segment, room, bodyMaxLength=50) {
    const segmentCost = _.sum(segment, s => BODYPART_COST[s]);
    const energyAvailable = room.energyAvailable;
    const maxSegments = Math.floor(energyAvailable / segmentCost);
    // 重复 segment 直到达到最大长度或能量限制
}
```

### 4.2 强化配置

高等级房间（RCL 7-8）支持实验室强化：

- **WORK 强化**: Catalyzed Lemergium Acid（提高维修效率）
- **ATTACK 强化**: Catalyzed Utrium Acid（提高攻击力）
- **RANGED_ATTACK 强化**: Catalyzed Keanium Alkaliide（提高远程攻击）
- **TOUGH 强化**: Catalyzed Zynthium Alkaliide（提高防御）

### 4.3 紧急配置

当房间能量不足时，系统会生成小型紧急版本：

- **Emergency Filler**: 小型填充者
- **Emergency EnergyManager**: 小型能量管理器
- **小型 Builder/Upgrader**: 基础配置

---

## 五、总结

Pacifist-Bot 的生成系统具有以下特点：

1. **层次化**: 根据 RCL 等级逐步解锁更高级的 role
2. **动态性**: 根据房间状态、能量、危险等级动态调整
3. **优先级**: 使用 unshift/push 区分优先级
4. **智能化**: 支持强化、紧急模式、自动回收等高级功能
5. **战斗导向**: 完整的战斗 role 体系，支持多种战斗场景

该系统能够根据房间状态自动调整爬虫配置，确保房间在各种情况下都能正常运行。
