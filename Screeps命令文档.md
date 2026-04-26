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
- **功能**: 生成专门用于狩猎的小队

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
- **功能**: 轻型侦察单位
- **要求**: CPU bucket ≥ 1500

#### `spawnConvoy(roomName, targetRoomName)`
**生成运输队**
- **功能**: 资源运输单位

#### `spawnSafeModer(roomName, targetRoomName)`
**生成安全管理员**
- **功能**: 安全模式管理单位

#### `SMDP(roomName, targetRoomName)`
**生成资源转移单位**
- **功能**: 房间间资源转移

#### `SS(roomName, targetRoomName, backupTR)`
**生成支援单位**
- **参数**:
  - `backupTR`: 备用目标房间 (可选)
- **功能**: 通用支援单位

---

## 🛡️ 防御单位命令

#### `SG(homeRoom, targetRoomName)`
**生成哥布林 (Goblin)**
- **功能**: 生成基础哥布林单位
- **要求**: 房间等级 ≥ 4
- **角色**: Goblin

#### `SGB(homeRoom, targetRoomName)`
**生成增强哥布林**
- **功能**: 使用增强配置的哥布林单位
- **要求**: 房间等级 > 4
- **角色**: Goblin

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
- **功能**: 通用工作单位
- **要求**: 检查 CPU 和能量状态
- **角色**: Billtong

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
- **功能**: 使用特殊资源锁定敌方房间
- **要求**: 
  - 房间等级 8
  - 需要大量特殊资源

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

*最后更新: 2026年4月*
