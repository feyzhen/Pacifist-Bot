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
  - SquadCreepA: 领导者，负责路径规划和战术决策
  - SquadCreepB: 后排治疗单位
  - SquadCreepY/Z: 前排远程攻击单位
- **要求**: 房间等级 ≥ 6
- **阵型**: 2×2 方阵布局

#### `SQM(roomName, targetRoomName, boost)`
**生成近战小队 (Squad Melee)**
- **参数**: 
  - `roomName`: 出发房间名称
  - `targetRoomName`: 目标房间名称  
  - `boost`: 是否使用增强剂 (可选，默认: false)
- **功能**: 生成近战小队，使用 ATTACK 部件而非 RANGED_ATTACK
- **适用场景**: 对抗高防御目标或近距离战斗

#### `SQD(roomName, targetRoomName, boost)`
**生成工作小队 (Squad Work)**
- **参数**: 
  - `roomName`: 出发房间名称
  - `targetRoomName`: 目标房间名称  
  - `boost`: 是否使用增强剂 (可选，默认: false)
- **功能**: 生成专门用于拆解和建设工作的小队，使用 WORK 部件
- **适用场景**: 拆除敌方建筑或建设工作

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
- **身体配置**: 根据房间等级自动调整

#### `SDB(roomName, targetRoomName, boost, defendController)`
**生成防御型攻城组合**
- **参数**:
  - `roomName`: 出发房间
  - `targetRoomName`: 目标房间
  - `boost`: 是否增强 (可选，默认: false)
  - `defendController`: 是否防御控制器 (可选，默认: false)
- **功能**: 生成具有防御能力的攻城组合 (Ram + Signifer)
- **特点**: 增强的 TOUGH 部件提供更好的防御

#### `spawn_hunting_party(homeRoom, targetRoom, amount)`
**生成狩猎小队**
- **参数**:
  - `amount`: 生成数量 (最大5个)
- **要求**: 房间等级 8
- **功能**: 生成专门用于狩猎的混合小队
- **生成单位**:
  1. **FreedomFighter** (自由战士) × 2:
     - 身体配置: 5 TOUGH + 15 ATTACK + 25 RANGED_ATTACK + 10 HEAL + 15 MOVE (70部件)
     - 角色: 前排战斗单位
  2. **ContinuousControllerKiller** (持续控制器杀手) × amount:
     - 身体配置: 1 TOUGH + 15 CLAIM + 4 MOVE (20部件)
     - 角色: 控制器攻击单位
  3. **Filler** (填充者) × 1:
     - 身体配置: 12 CARRY + 12 MOVE (24部件)
     - 角色: 资源运输单位
- **增强剂需求** (根据数量动态计算):
  - ZYNTHIUM_ALKALIDE: 90×amount + 600 + 30 (或 -30 当 amount≥2)
  - GHODIUM_ALKALIDE: 30×amount + 300
  - 固定需求: KEANIUM_ALKALIDE(1200) + LEMERGIUM_ALKALIDE(600)
- **增强剂分配**:
  - lab2(ZYNTHIUM_ALKALIDE): 动态计算
  - lab3: 300 单位
  - lab4(KEANIUM_ALKALIDE): 1200 单位
  - lab5(LEMERGIUM_ALKALIDE): 600 单位
  - lab7(GHODIUM_ALKALIDE): 动态计算
- **特点**: 
  - 混合战斗单位，适合复杂战斗场景
  - 自动调整最后一个 CCK 的身体配置以优化资源使用
  - 包含资源运输单位提供后勤支持

---

## 🏗️ 控制器相关命令

### 控制器攻击命令

#### `SCCK(homeRoom, targetRoom)`
**生成控制器杀手 (Controller Killer)**
- **功能**: 生成专门破坏敌方控制器的单位
- **要求**: 房间等级 8

#### `SCCK2(homeRoom, targetRoom)`
**生成增强型控制器杀手**
- **功能**: 使用增强剂的控制器杀手
- **要求**: 需要特定的增强剂资源

#### `SC(targetRoom, x?, y?)`
**设置殖民目标**
- **参数**:
  - `targetRoom`: 目标房间名称
  - `x, y`: 生成坐标 (可选，0-49)
- **功能**: 设置殖民目标房间，自动生成布局
- **注意**: x, y 参数为向后兼容保留

#### `SCK(homeRoom, targetRoom)`
**生成 Creep 杀手**
- **功能**: 生成专门攻击敌方 creep 的单位
- **角色**: CreepKiller
- **要求**: 房间等级 > 4

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
- **角色**: mosquito
- **身体配置**: 
  - 9 TOUGH + 15 RANGED_ATTACK + 15 HEAL + 17 MOVE (56部件)
- **增强剂需求**:
  - CATALYZED_GHODIUM_ALKALIDE ≥ 5000
  - CATALYZED_KEANIUM_ALKALIDE ≥ 5000
  - CATALYZED_LEMERGIUM_ALKALIDE ≥ 5000
  - CATALYZED_ZYNTHIUM_ALKALIDE ≥ 3600
- **增强剂分配**:
  - lab4(KEANIUM_ALKALIDE): 450 单位
  - lab5(LEMERGIUM_ALKALIDE): 480 单位
  - lab2(ZYNTHIUM_ALKALIDE): 300 单位
  - lab7(GHODIUM_ALKALIDE): 270 单位
- **特点**: 
  - 高生存能力，适合深入敌方侦察
  - 自动购买不足的增强剂资源
  - 重型配置，可应对战斗情况

#### `spawnConvoy(roomName, targetRoomName)`
**生成运输队**
- **功能**: 资源运输单位

#### `spawnSafeModer(roomName, targetRoomName)`
**生成安全管理员**
- **功能**: 安全模式管理单位

#### `SMDP(roomName, targetRoomName)`
**生成守护者 (Guard)**
- **功能**: 防御型单位，用于保护低等级房间
- **角色**: Guard
- **适用场景**: 目标房间等级 3-5 且无安全模式
- **两种配置**:

**配置一** (目标房间有存储):
- **要求**: 
  - CATALYZED_UTRIUM_ACID ≥ 1200
  - CATALYZED_ZYNTHIUM_ALKALIDE ≥ 300
- **身体配置**: 40 ATTACK + 10 MOVE (50部件)
- **增强剂**: lab3(UTRIUM_ACID) + lab2(ZYNTHIUM_ALKALIDE)

**配置二** (通用配置):
- **要求**: 
  - CATALYZED_GHODIUM_ALKALIDE ≥ 300
  - CATALYZED_UTRIUM_ACID ≥ 900
  - CATALYZED_ZYNTHIUM_ALKALIDE ≥ 300
- **身体配置**: 10 TOUGH + 40 ATTACK + 10 MOVE (60部件)
- **增强剂**: lab3(UTRIUM_ACID) + lab2(ZYNTHIUM_ALKALIDE) + lab7(GHODIUM_ALKALIDE)

- **特点**: 
  - `again: true` 参数，可重复生成
  - 专门用于保护发展中房间
  - 高攻击力，适合防御作战

#### `SS(roomName, targetRoomName, backupTR)`
**生成支援单位**
- **参数**:
  - `backupTR`: 备用目标房间 (可选)
- **功能**: 通用支援单位

---

## 🛡️ 防御单位命令

#### `SG(homeRoom, targetRoomName)`
**生成哥布林 (Goblin)**
- **功能**: 资源回收单位，专门从废墟、掉落物和建筑中提取资源
- **要求**: 房间等级 ≥ 4
- **角色**: Goblin
- **身体配置** (根据RCL等级自动调整):
  - **RCL 4**: 9 MOVE + 9 CARRY (18部件)
  - **RCL 5**: 15 MOVE + 16 CARRY + 5 MOVE (36部件)
  - **RCL 6**: 15 MOVE + 18 CARRY + 5 MOVE (38部件)
  - **RCL 7-8**: 20 MOVE + 26 CARRY + 5 MOVE (51部件)
- **自动辅助**: 如果房间内 filler < 3，会自动生成 filler 单位
- **工作逻辑**:
  1. 优先处理废墟(FIND_RUINS)中的资源
  2. 收集非能量掉落物
  3. 从建筑中提取资源
  4. 装满后自动寻找最近的友方房间卸货
- **生命周期**: 生命值≤250时自动回收

#### `SGB(homeRoom, targetRoomName)`
**生成增强哥布林**
- **功能**: 优化的资源回收单位，使用更高效的配置
- **要求**: 房间等级 > 4
- **角色**: Goblin
- **身体配置** (根据RCL等级自动调整):
  - **RCL 5**: 3 MOVE + 25 CARRY + 3 MOVE (31部件)
  - **RCL 6**: 4 MOVE + 30 CARRY + 4 MOVE (38部件)
  - **RCL 7-8**: 5 MOVE + 35 CARRY + 5 MOVE (45部件)
- **自动辅助**: 如果房间内 filler < 3，会自动生成 filler 单位
- **特点**: 相比 SG 版本有更高的 CARRY 部件比例，运输效率更高

#### `SGD(homeRoom, targetRoomName, body)`
**生成自定义守护者 (Guard)**
- **参数**:
  - `body`: 自定义身体配置
- **功能**: 使用自定义配置的守护者单位
- **角色**: Guard
- **特点**: 包含 `coma: true` 参数

#### `SRDP(homeRoom, targetRoomName)`
**生成持久化远程拆解单位**
- **功能**: 远程拆解单位，具有持久化属性
- **角色**: RemoteDismantler
- **特点**: `persistent: true` 参数

#### `SRD(homeRoom, targetRoomName)`
**生成远程拆解单位**
- **功能**: 基础远程拆解单位
- **角色**: RemoteDismantler

#### `SDM(homeRoom, targetRoomName)`
**生成比通 (Billtong)**
- **功能**: Deposit 采集单位，专门开采稀有资源
- **要求**: 
  - 房间无危险状态
  - CPU 500 tick 平均值 < CPU 限制 + 2
  - CPU bucket > 9500 或像素管理器启用
- **角色**: Billtong
- **身体配置**: 15 MOVE + 15 WORK + 15 CARRY (45部件)
- **数量控制**: 每个房间最多生成 1 个 Billtong
- **工作逻辑**:
  1. 优先从 `Memory.billtong_rooms` 列表选择目标房间
  2. 按距离排序，优先选择4格内房间
  3. 自动扫描7×7范围内的有效房间
  4. 寻找并开采 Deposit 结构
  5. 收集附近掉落的稀有资源 (METAL, BIOMASS, SILICON, MIST)
- **安全机制**:
  - 遇到敌对 creep 时立即返程
  - 计算返程时间，确保安全回家
  - 生命值不足时自动回收
- **资源管理**: 优先卸载到终端，其次到存储

---

## ⚡ 特殊单位命令

#### `SPK(homeRoom, targetRoomName)`
**生成能量小队 (PowerMelee + PowerHeal)**
- **功能**: 生成近战攻击和治疗组合单位
  - PowerMelee: 重型近战攻击单位
  - PowerHeal: 专门治疗单位
- **要求**: 房间无危险状态
- **角色**: PowerMelee, PowerHeal

---

## 🔧 实用工具命令

#### `showBoosts()`
**显示所有增强剂效果**
- **功能**: 查看游戏中所有增强剂的描述和效果

#### `lock_room(homeRoom, targetRoom)`
**锁定房间**
- **功能**: 使用特殊资源锁定敌方房间，生成控制小队
- **要求**: 
  - 房间等级 8
  - 大量特殊增强剂资源
- **资源需求**:
  - CATALYZED_GHODIUM_ALKALIDE ≥ 1000
  - CATALYZED_LEMERGIUM_ALKALIDE ≥ 2000
  - CATALYZED_KEANIUM_ALKALIDE ≥ 2000
  - CATALYZED_ZYNTHIUM_ALKALIDE ≥ 1000
- **生成单位**:
  1. **Escort** (护卫): 50 TOUGH + 30 RANGED_ATTACK + 10 HEAL + 10 MOVE (100部件)
     - 增强剂: lab2(750) + lab4(300) + lab5(300) + lab7(150)
  2. **Claimer** (声明者): CLAIM + MOVE (2部件)
  3. **RoomLocker** (房间锁定器): 8 MOVE + 8 CARRY + WORK + CARRY + MOVE (19部件)
- **低等级房间支持** (RCL 4-7):
  - 只生成 RoomLocker 和 Claimer
  - 无增强剂需求
- **增强剂分配**:
  - lab2(ZYNTHIUM_ALKALIDE): 300 单位
  - lab4(KEANIUM_ALKALIDE): 750 单位  
  - lab5(LEMERGIUM_ALKALIDE): 300 单位
  - lab7(GHODIUM_ALKALIDE): 150 单位

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

*最后更新: 2026年4月28日*
