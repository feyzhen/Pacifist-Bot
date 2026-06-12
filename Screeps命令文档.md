# Screeps 命令文档

## 概述
本文档包含了 Pacifist-Bot 项目中所有可用的全局命令，可以通过游戏控制台直接调用。

---

## 🎯 军事攻击命令

### 小队攻击命令

#### `SQR(roomName, targetRoomName, boost)`
**生成远程攻击小队 (Squad Ranged)**
- **参数**:
  - `roomName`: 出发房间名称
  - `targetRoomName`: 目标房间名称
  - `boost`: 是否使用增强剂 (可选，默认: false)
- **功能**: 生成由 4 个角色组成的远程攻击小队
  - SquadCreepA: 领导者，负责路径规划和战术决策 (HEAL 为主)
  - SquadCreepB: 后排治疗单位 (HEAL 为主)
  - SquadCreepY/Z: 前排远程攻击单位 (RANGED_ATTACK 为主)
- **要求**:
  - 房间控制器等级 ≥ 6
  - 房间内存活的 SquadCreepA/B/Y/Z 均为 0
  - `Memory.CanClaimRemote >= 1` 时额外生成 WallClearer
  - 自动生成最多 3 个 filler (根据 fillers < 3/4/5 阈值)
- **身体配置**:

| 角色 | RCL 6 | RCL 7 | RCL 8 (未增强) | RCL 8 (增强) |
|------|-------|-------|----------------|-------------|
| A/B (HEAL) | 7 MOVE + 7 HEAL + 1 MOVE = **14** | 18 MOVE + 18 HEAL + 1 MOVE = **37** | 24 MOVE + 25 HEAL + 1 MOVE = **50** | 5 HEAL + 9 MOVE + 32 HEAL + 1 MOVE = **47** |
| Y/Z (RA) | 6 MOVE + 7 RANGED_ATTACK + 1 MOVE = **14** | 17 MOVE + 19 RANGED_ATTACK + 1 MOVE = **37** | 24 MOVE + 26 RANGED_ATTACK + 1 MOVE = **51** | 5 RA + 10 MOVE + 30 RA + 1 MOVE = **46** |

- **增强剂需求** (RCL 8 + boost):
  - Zyn Alkalide ≥ 1200 + Lab2/4/5
  - Keanium Alkalide ≥ 2400
  - Lmer Alkalide ≥ 2400

---

#### `SQM(roomName, targetRoomName, boost)`
**生成近战小队 (Squad Melee)**
- **参数**:
  - `roomName`: 出发房间名称
  - `targetRoomName`: 目标房间名称
  - `boost`: 是否使用增强剂 (可选，默认: false)
- **功能**: 生成近战小队，使用 ATTACK 部件而非 RANGED_ATTACK
- **要求**: 与 SQR 相同 (RCL ≥ 6，所有 4 个 SquadCreep 为 0)
- **身体配置**:

| 角色 | RCL 6 | RCL 7 | RCL 8 (未增强) | RCL 8 (增强) |
|------|-------|-------|----------------|-------------|
| A/B (HEAL) | 7 MOVE + 7 HEAL + 1 MOVE = **14** | 18 MOVE + 18 HEAL + 1 MOVE = **37** | 24 MOVE + 25 HEAL + 1 MOVE = **50** | 5 HEAL + 9 MOVE + 32 HEAL + 1 MOVE = **47** |
| Y/Z (ATTACK) | 6 MOVE + 7 ATTACK + 1 MOVE = **14** | 17 MOVE + 19 ATTACK + 1 MOVE = **37** | 24 MOVE + 25 ATTACK + 1 MOVE = **50** | 5 ATTACK + 10 MOVE + 25 ATTACK + 1 MOVE = **41** |

- **增强剂需求** (RCL 8 + boost):
  - Zyn Alkalide ≥ 1200
  - Utrium Acid ≥ 2400
  - Lmer Alkalide ≥ 2400

---

#### `SQD(roomName, targetRoomName, boost)`
**生成工作小队 (Squad Work)**
- **参数**:
  - `roomName`: 出发房间名称
  - `targetRoomName`: 目标房间名称
  - `boost`: 是否使用增强剂 (可选，默认: false)
- **功能**: 生成专门用于拆解和建设工作的小队，使用 WORK 部件
- **要求**: 与 SQR 相同 (RCL ≥ 6，所有 4 个 SquadCreep 为 0)
- **身体配置**:

| 角色 | RCL 6 | RCL 7 | RCL 8 (未增强) | RCL 8 (增强) |
|------|-------|-------|----------------|-------------|
| A/B (HEAL) | 7 MOVE + 7 HEAL + 1 MOVE = **14** | 18 MOVE + 18 HEAL + 1 MOVE = **37** | 24 MOVE + 25 HEAL + 1 MOVE = **50** | 5 HEAL + 9 MOVE + 32 HEAL + 1 MOVE = **47** |
| Y/Z (WORK) | 6 MOVE + 7 WORK + 1 MOVE = **14** | 17 MOVE + 19 WORK + 1 MOVE = **37** | 24 MOVE + 25 WORK + 1 MOVE = **50** | 5 WORK + 10 MOVE + 25 WORK + 1 MOVE = **41** |

- **增强剂需求** (RCL 8 + boost):
  - Zyn Alkalide ≥ 1200
  - Zynithium Acid ≥ 2400
  - Lmer Alkalide ≥ 2400

---

### 单位攻击命令

#### `SD(roomName, targetRoomName, boost)`
**生成攻城组合 (Ram + Signifer)**
- **参数**:
  - `roomName`: 出发房间
  - `targetRoomName`: 目标房间
  - `boost`: 是否增强 (可选，默认: false)
- **功能**: 生成攻城槌(Ram)和旗手(Signifer)组合
  - Ram: 重型攻城单位，专门破坏建筑和墙壁
  - Signifer: 治疗单位，为 Ram 提供支援
- **自动辅助**: 若 fillers < 2 生成 12 部件 filler，< 3 生成 6 部件 filler
- **身体配置**:

| 单位 | RCL 6 | RCL 7 | RCL 8 (未增强) | RCL 8 (增强) |
|------|-------|-------|----------------|-------------|
| Ram | 10 MOVE + 10 ATTACK = **20** | 12 MOVE + 12 ATTACK = **24** | 24 MOVE + 26 ATTACK = **50** | 5 TOUGH + 45 ATTACK + 10 MOVE = **60** |
| Signifer | 7 MOVE + 7 HEAL = **14** | 19 MOVE + 19 HEAL = **38** | 25 MOVE + 25 HEAL = **50** | 5 TOUGH + 45 HEAL + 10 MOVE = **60** |

- **增强剂需求** (RCL 8 + boost):
  - Zyn Alkalide ≥ 600 + Lab2/3/5/7
  - Utrium Acid ≥ 1050
  - Lmer Alkalide ≥ 1050
  - Ghodium Alkalide ≥ 300

---

#### `SDB(roomName, targetRoomName, boost, defendController)`
**生成防御型攻城组合**
- **参数**:
  - `roomName`: 出发房间
  - `targetRoomName`: 目标房间
  - `boost`: 是否增强 (可选，默认: false)
  - `defendController`: 是否防御控制器 (可选，默认: false)
- **功能**: 生成具有防御能力的攻城组合 (Ram + Signifer)
- **身体配置** (与 SD 相同，但 RCL 8 增强版 Ram 有 10 TOUGH 和 defendController: true):

| 单位 | RCL 6 | RCL 7 | RCL 8 (未增强) | RCL 8 (增强) |
|------|-------|-------|----------------|-------------|
| Ram | 10 MOVE + 10 ATTACK = **20** | 12 MOVE + 12 ATTACK = **24** | 24 MOVE + 26 ATTACK = **50** | 10 TOUGH + 40 ATTACK + 10 MOVE = **60** |
| Signifer | 7 MOVE + 7 HEAL = **14** | 19 MOVE + 19 HEAL = **38** | 25 MOVE + 25 HEAL = **50** | 10 TOUGH + 40 HEAL + 10 MOVE = **60** |

- **增强剂需求** (RCL 8 + boost):
  - Zyn Alkalide ≥ 600
  - Utrium Acid ≥ 870 (低于 SD 的 1050)
  - Lmer Alkalide ≥ 870 (低于 SD 的 1050)
  - Ghodium Alkalide ≥ 660 (高于 SD 的 300)

---

#### `spawn_hunting_party(homeRoom, targetRoomName, amount)`
**生成狩猎小队**
- **参数**:
  - `homeRoom`: 出发房间
  - `targetRoomName`: 目标房间
  - `amount`: 生成数量 (最大5个)
- **要求**: 房间等级 8
- **功能**: 生成专门用于狩猎的混合小队
- **生成单位** (按 amount 数量变化):
  1. **FreedomFighter** × 2 (line 1 和 line amount+2):
     - 身体配置: 5 TOUGH + 10 MOVE + 5 ATTACK + 20 RANGED_ATTACK + 8 HEAL = **48部件**
     - 角色: 前排战斗单位
  2. **Filler** × 1:
     - 身体配置: 12 CARRY + 12 MOVE = **24部件**
     - 角色: 资源运输单位
  3. **CCKparty** × amount (line 2-6):
     - line 2: 1 TOUGH + 14 CLAIM + 4 MOVE = **19部件**
     - line 3-5 (normalBody): 1 TOUGH + 12 CLAIM + 3 MOVE = **16部件**
     - line 6 (lastBody): 1 TOUGH + 8 CLAIM + 2 MOVE = **11部件**
     - 角色: 控制器攻击单位

- **增强剂需求** (根据数量动态计算):
  - ZYNTHIUM_ALKALIDE: 90×amount + 600 + 30 (amount≥2 时 -30)
  - GHODIUM_ALKALIDE: 30×amount + 300
  - 固定需求: LAB3 300 + LAB4 1200 + LAB5 600

---

## 🏗️ 控制器相关命令

### 控制器攻击命令

#### `SCCK(homeRoom, targetRoom)`
**生成控制器杀手 (Controller Killer)**
- **功能**: 生成专门破坏敌方控制器的单位
- **要求**: 房间等级 8
- **身体配置**: 7 MOVE + 15 CLAIM + 1 ATTACK + 8 MOVE = **31部件**
- **无增强剂需求**

#### `SCCK2(homeRoom, targetRoom)`
**生成增强型控制器杀手**
- **功能**: 使用增强剂的控制器杀手
- **要求**:
  - 房间等级 8
  - Storage: Ghodium Alkalide ≥ 50, Lmer Alkalide ≥ 100
- **身体配置**: 1 TOUGH + 2 HEAL + 6 MOVE + 14 CLAIM + 6 MOVE = **29部件**
- **增强剂**: Lab5 60 + Lab7 30

#### `SC(targetRoom, x?, y?)`
**设置殖民目标**
- **参数**:
  - `targetRoom`: 目标房间名称
  - `x, y`: 生成坐标 (可选，0-49)
- **功能**: 设置殖民目标房间，自动生成布局
- **注意**: 此命令不生成任何单位，仅修改 `Memory.target_colonise` 状态
- **x, y 参数**: 为向后兼容保留

#### `SCK(homeRoom, targetRoom)`
**生成 Creep 杀手**
- **功能**: 生成专门攻击敌方 creep 的单位
- **角色**: CreepKiller
- **要求**: 房间等级 > 4 (5+)
- **身体配置**: 4 MOVE + 5 ATTACK + 1 MOVE = **10部件**

---

## 🚚 支援和后勤命令

#### `spawn_mosquito(homeRoom, roomName)`
**生成蚊子侦察兵**
- **功能**: 重型增强侦察单位
- **要求**:
  - CPU bucket ≥ 1500 (或像素管理器启用)
  - 房间等级 8
  - 能量 ≥ 9000
  - 信用点 > 5,000,000
  - Terminal: 能量 ≥ 1000，无 cooldown
  - Storage + Terminal 合计: Ghodium Alkalide ≥ 5000, Keanium Alkalide ≥ 5000, Lmer Alkalide ≥ 5000, Zyn Alkalide ≥ 3600
- **身体配置**: 9 TOUGH + 12 RANGED_ATTACK + 8 MOVE + 14 HEAL = **43部件**
- **增强剂**:
  - Lab4 (Keanium Alkalide): 450 单位
  - Lab5 (Lmer Alkalide): 480 单位
  - Lab2 (Zyn Alkalide): 300 单位
  - Lab7 (Ghodium Alkalide): 270 单位
- **特点**:
  - 高生存能力，适合深入敌方侦察
  - 自动购买不足的增强剂资源

#### `spawnConvoy(roomName, targetRoomName)`
**生成运输队**
- **功能**: 资源运输单位
- **要求**: 房间存在
- **身体配置** (3 种变体，取决于 `Memory.delayConvoy[roomName]`):

| 条件 | MOVE | CARRY | ATTACK | 总部件 |
|------|------|-------|--------|--------|
| delayConvoy > 3000 | 24 | 20 | 5 + 1 = 5 | **50** |
| delayConvoy > 1000 | 24 | 23 | 2 + 1 = 3 | **50** |
| 默认 | 24 | 28 | 0 + 1 = 1 | **53** |

#### `spawnSafeModer(roomName, targetRoomName)`
**生成安全管理员**
- **功能**: 安全模式管理单位
- **要求**: 房间存在
- **身体配置**: 22 MOVE + 5 ATTACK + 23 CARRY + 6 MOVE = **56部件**
- **角色**: 从终端或存储提取 Ghodium，生成 safeMode
- **注意**: 代码中 `homeRoom` 被设为 `targetRoomName` (可能为 bug)

#### `SMDP(roomName, targetRoomName)`
**生成守护者 (Guard)**
- **功能**: 防御型单位，用于保护低等级房间
- **角色**: Guard
- **适用场景**: 目标房间等级 3-5 且无安全模式，控制器等级 ≥ 4
- **两种配置**:

**配置一** (高资源路径):
- **要求**:
  - Storage: Utrium Acid ≥ 1200, Zyn Alkalide ≥ 300
  - Labs: outputLab3, outputLab2, outputLab7
- **身体配置**: 40 ATTACK + 10 MOVE = **50部件**
- **增强剂**: Lab3 (Utrium Acid) 1200 + Lab2 (Zyn Alkalide) 300

**配置二** (通用配置):
- **要求**:
  - Storage: Ghodium Alkalide ≥ 300, Utrium Acid ≥ 900, Zyn Alkalide ≥ 300
  - Labs: outputLab3, outputLab2, outputLab7
- **身体配置**: 10 TOUGH + 4 MOVE + 40 ATTACK + 6 MOVE = **60部件**
- **增强剂**: Lab3 (Utrium Acid) 900 + Lab2 (Zyn Alkalide) 300 + Lab7 (Ghodium) 300

- **特点**:
  - `again: true` 参数，可重复生成
  - 专门用于保护发展中房间
  - 高攻击力，适合防御作战

#### `SS(roomName, targetRoomName, backupTR)`
**生成支援单位**
- **参数**:
  - `backupTR`: 备用目标房间 (可选)
- **功能**: 通用支援单位 (Solomon)
- **要求**:
  - Storage: Ghodium Alkalide ≥ 270, Keanium Alkalide ≥ 330, Zyn Alkalide ≥ 300, Lmer Alkalide ≥ 270
  - Labs: outputLab2, outputLab4, outputLab5, outputLab7
- **身体配置**: 9 TOUGH + 11 RANGED_ATTACK + 10 MOVE + 20 HEAL = **50部件**
- **增强剂**: Lab4 330 + Lab5 600 + Lab2 300 + Lab7 270

---

## 🛡️ 防御单位命令

#### `SG(homeHome, targetRoomName)`
**生成哥布林 (Goblin)**
- **功能**: 资源回收单位，专门从废墟、掉落物和建筑中提取资源
- **要求**: 房间等级 ≥ 4
- **角色**: Goblin
- **自动辅助**: 如果 fillers < 3，自动生成 filler (12 CARRY + 6 MOVE 或 8 CARRY + 4 MOVE + 4 CARRY + 2 MOVE)
- **身体配置** (根据RCL等级自动调整):

| RCL | 身体配置 | 总部件 |
|-----|---------|--------|
| 4 | 9 MOVE + 9 CARRY | **18** |
| 5 | 9 MOVE + 16 CARRY + 4 MOVE | **29** |
| 6 | 15 MOVE + 20 CARRY + 5 MOVE | **40** |
| 7-8 | 20 MOVE + 25 CARRY + 5 MOVE | **50** |

- **工作逻辑**:
  1. 优先处理废墟(FIND_RUINS)中的资源
  2. 收集非能量掉落物
  3. 从建筑中提取资源
  4. 装满后自动寻找最近的友方房间卸货
- **生命周期**: ticksToLive 到期后自动回收

#### `SGB(homeHome, targetRoomName)`
**生成增强哥布林**
- **功能**: 优化的资源回收单位，使用更高效的配置
- **要求**: 房间等级 > 4 (5+)
- **角色**: Goblin
- **自动辅助**: 如果 fillers < 3，自动生成 filler
- **身体配置** (根据RCL等级自动调整):

| RCL | 身体配置 | 总部件 |
|-----|---------|--------|
| 5 | 3 MOVE + 25 CARRY + 3 MOVE | **31** |
| 6 | 4 MOVE + 30 CARRY + 4 MOVE | **38** |
| 7-8 | 5 MOVE + 34 CARRY + 5 MOVE | **44** |

- **特点**: 相比 SG 版本有更高的 CARRY 部件比例，运输效率更高

#### `SGD(homeHome, targetRoomName, body)`
**生成自定义守护者 (Guard)**
- **参数**:
  - `body`: 自定义身体配置
- **功能**: 使用自定义配置的守护者单位
- **角色**: Guard
- **要求**: 房间等级 > 4 (5+), targetRoom != homeRoom
- **特点**: 包含 `coma: true` 参数

#### `SRDP(roomName, targetRoomName)`
**生成持久化远程拆解单位**
- **功能**: 远程拆解单位，具有持久化属性
- **角色**: RemoteDismantler
- **要求**: 房间等级 > 4 (5+), 控制器为我方
- **特点**: `persistent: true` 参数 — ticksToLive 为 1 时自动重新生成
- **身体配置**:

| RCL | 身体配置 | 总部件 |
|-----|---------|--------|
| 5 | 12 MOVE + 12 WORK | **24** |
| 6 | 15 MOVE + 15 WORK | **30** |
| 7 | 25 MOVE + 20 WORK | **45** |
| 8 | 25 MOVE + 20 WORK | **45** |

#### `SRD(roomName, targetRoomName)`
**生成远程拆解单位**
- **功能**: 基础远程拆解单位
- **角色**: RemoteDismantler
- **要求**: 与 SRDP 相同
- **身体配置**: 与 SRDP 完全相同
- **区别**: 无 `persistent` 参数

#### `SDM(homeHome, targetRoomName)`
**生成比通 (Billtong)**
- **功能**: Deposit 采集单位，专门开采稀有资源
- **要求**:
  - 房间无危险状态 (`!room.memory.danger`)
  - CPU 500 tick 平均值 < CPU 限制 + 2
  - CPU bucket > 9500 或像素管理器启用
  - 同 homeRoom 的 billtong 数量为 0 (去重)
- **身体配置**: `10 × (MOVE, WORK, CARRY, MOVE, MOVE)` = **10 MOVE + 5 WORK + 5 CARRY × 2 + 5 MOVE + 5 MOVE** = **50部件**
  - 实际: MOVE(10) + WORK(5) + CARRY(5) = **20部件**? 不，实际数组为 `[MOVE, WORK, CARRY, MOVE, MOVE]` 重复 10 次 = **50部件**
- **数量控制**: 每个 homeRoom 最多生成 1 个 Billtong
- **工作逻辑**:
  1. 优先从 `Memory.billtong_rooms` 列表选择目标房间
  2. 按距离排序，优先选择4格内房间
  3. 自动扫描7×7范围内的有效房间
  4. 寻找并开采 Deposit 结构
  5. 收集附近掉落的稀有资源 (METAL, BIOMASS, SILICON, MIST)
- **安全机制**:
  - 当房间标记 `has_hostile_creeps` 时返程
  - 计算返程时间 (`ticksToLive == memory.timeToGetHome`)
  - 到期时设置 `suicide: true` 触发回收
- **资源管理**: 优先卸载到终端，其次到存储

---

## ⚡ 特殊单位命令

#### `SPK(homeHome, targetRoomName)`
**生成能量小队 (PowerMelee + PowerHeal)**
- **功能**: 生成近战攻击和治疗组合单位
  - PowerMelee: 重型近战攻击单位
  - PowerHeal: 专门治疗单位
- **要求**:
  - 房间存在且无危险状态 (`!room.memory.danger`)
  - 目标房间已存在
  - 目标房间已存在的 PowerMelee ≤ 1
  - 若 energyAvailable < 9750，额外生成一个 filler (6 CARRY + 2 MOVE)
- **身体配置**:

| 单位 | 身体配置 | 总部件 |
|------|---------|--------|
| PowerMelee | 1 TOUGH + 22 MOVE + 15 ATTACK | **38** |
| PowerHeal | 45 MOVE + 20 HEAL | **65** |

---

## 🔧 实用工具命令

#### `showBoosts()`
**显示所有增强剂效果**
- **功能**: 诊断工具，扫描所有已拥有房间的 Storage 和 Terminal 中的增强剂数量
- **无生成逻辑**

#### `lock_room(homeHome, targetRoom)`
**锁定房间**
- **功能**: 使用特殊资源锁定敌方房间，生成控制小队
- **两种路径**:

**路径 A — 控制器等级 8 + Storage 资源**:
- **要求**:
  - 控制器等级 8
  - Storage: Ghodium Alkalide ≥ 1000, Lmer Alkalide ≥ 2000, Keanium Alkalide ≥ 2000, Zyn Alkalide ≥ 1000
- **生成 3 个单位**:
  1. **Escort** (line 1): 5 TOUGH + 8 MOVE + 20 RANGED_ATTACK + 8 HEAL = **41部件**? 实际数: `[TOUGH×5, MOVE×8, RANGED_ATTACK×20, HEAL×8]` = **41部件**
     - 等等，让我重新数: 代码中 `[TOUGH,TOUGH,TOUGH,TOUGH,TOUGH, MOVE×8, RANGED_ATTACK×20, HEAL×8]` = **41部件**
     - 实际上: 5 TOUGH + 8 MOVE + 20 RANGED_ATTACK + 8 HEAL = **41**
  2. **Claimer** (line 2): 1 CLAIM + 1 MOVE = **2部件**
  3. **RoomLocker** (line 3): `[MOVE, CARRY] × 8 + WORK + CARRY + MOVE` = 16 + 1 + 1 = **18部件**

- **增强剂**: Lab2 300 + Lab4 750 + Lab5 300 + Lab7 150

**路径 B — 控制器等级 4-7**:
- **要求**: 控制器等级 4-7, energy ≥ 1200
- **只生成 2 个单位**: RoomLocker + Claimer (同路径 A)
- **无增强剂需求**

---

## 📋 使用示例

### 基础攻击
```javascript
// 生成普通远程小队
SQR("E15S37", "E15S38");

// 生成增强近战小队
SQM("E15S37", "E15S38", true);

// 生成工作小队
SQD("E15S37", "E15S38");
```

### 防御部署
```javascript
// 生成哥布林单位
SG("E15S37", "E15S38");

// 生成增强哥布林
SGB("E15S37", "E15S38");

// 生成攻城组合
SD("E15S37", "E15S38");
```

### 控制器攻击
```javascript
// 破坏敌方控制器
SCCK("E15S37", "E15S38");

// 设置殖民目标
SC("E15S38");

// 生成 Creep 杀手
SCK("E15S37", "E15S38");
```

### 资源管理
```javascript
// 查看增强剂信息
showBoosts();

// 生成运输队
spawnConvoy("E15S37", "E15S38");
```

---

## 📝 注意事项

1. **房间等级要求**: 大部分命令有最低房间等级要求
2. **资源消耗**: 增强版本需要相应的增强剂资源
3. **能量要求**: 确保出发房间有足够能量
4. **CPU限制**: 某些命令会检查 CPU bucket 状态
5. **安全模式**: 部分命令在安全模式下无法使用

---

## 🔄 增强剂说明

当 `boost=true` 时，单位会获得以下增强：
- **HEAL**: 4倍治疗效果
- **ATTACK**: 攻击力提升
- **RANGED_ATTACK**: 远程攻击力提升
- **WORK**: 工作效率提升

增强单位需要：
- 房间等级 8
- 完整的实验室系统
- 相应的增强剂资源

---

## 🎯 高级使用技巧

### 资源管理策略
```javascript
// 检查增强剂状态
showBoosts();

// 批量生成资源回收单位
SG("E15S37", "E15S38");
SGB("E15S37", "E15S39");

// 生成稀有资源开采单位
SDM("E15S37", "E15S40");
```

### 军事行动组合
```javascript
// 大规模攻击组合
spawn_hunting_party("E15S37", "E15S38", 3);  // 狩猎小队
lock_room("E15S37", "E15S38");               // 锁定房间
SMDP("E15S37", "E15S38");                   // 防御单位

// 精确打击
SQR("E15S37", "E15S38", true);  // 增强远程小队
SCCK2("E15S37", "E15S38");      // 增强控制器杀手
```

### 侦察与探索
```javascript
// 重型侦察
spawn_mosquito("E15S37", "E15S38");

// 资源回收
SG("E15S37", "E15S38");  // 基础回收
SGB("E15S37", "E15S39"); // 增强回收
```

---

## ⚠️ 重要提醒

1. **增强剂消耗**: 使用增强剂会大量消耗资源，请确保存储充足
2. **CPU 管理**: 部分命令有 CPU 限制要求，注意监控 CPU 使用情况
3. **房间等级**: 高级单位需要 RCL 8 房间，请提前规划
4. **信用点**: spawn_mosquito 需要大量信用点，确保经济状况良好
5. **安全模式**: 部分攻击命令在目标房间安全模式下无效

---

*最后更新: 2026年6月12日 (代码版本校验)*
