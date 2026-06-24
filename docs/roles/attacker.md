---
name: Attacker 攻击者
---

# Attacker 攻击者

## 概述

Attacker 是**全能攻击者**，负责在目标房间消灭敌方 creep、摧毁敌方建筑和围墙。是进攻作战的主力单位。

## 启动方式

通过 `Commands.ts` 的 `global.SD()` / `global.SDB()` 等命令创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'attacker'` |
| `targetRoom` | 目标房间 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 跨房移动（第 9-25 行）

```
条件: targetRoom 存在且不等于当前房
```

- 如果当前房有敌人：先攻击 → 移动 → return
- 否则：`moveToRoom(targetRoom)` 前往目标房间

### 2. 攻击阶段（第 26-118 行）

**优先级 1：低血围墙（< 10000 hits）**
- `attack(closestLowHitWall)`

**优先级 2：敌方 Creep**
- `attack(closestEnemyCreep)`

**优先级 3：敌方建筑**
- 如果是己方房间：排除 controller，攻击所有 HOSTILE_STRUCTURES
- 如果不是己方房间：排除 controller 和 keeper_lair

### 3. 清理完成（第 96-117 行）

- 删除 `targetRoom` 记忆
- 注释掉的逻辑：扫描 danger 房间自动分配任务

### 4. 自毁回收（第 121-128 行）

```
条件: Game.time % 55 == 0 && !targetRoom
```

- 定期触发 `suicide = true` → `recycle()`

## 生成条件

### 场景 1：紧急防御（本地房间被入侵）

**入口**：`MilitaryRoleGenerator.generateEmergencyAttackers()` (`rooms.spawning.ts:1869`)

```
条件: 本地 RCL < 3 + safeMode 激活 + 有敌方 creep
```

- 生成 `[ATTACK, MOVE]` 的 DirtClearer
- 目标房间为本房间（清理入侵者）
- 插入 spawn_list 头部（unshift，最高优先级）

### 场景 2：远程房间防御 — 有敌方建筑

**入口**：`RemoteDefenseGenerator.generateRemoteRoomDefense()` (`rooms.spawning.ts:2835`)

```
条件:
  - 目标房间在 activeRemotes 中
  - roomData.has_hostile_structures = true
  - roomData.has_attacker = false
  - attackers < 1
  - 当前房间无 danger
  - storage 能量 > 10000
```

- 根据 RCL 生成不同体型的 attacker：
  - RCL ≥ 7: 24 个 ATTACK + 5 个 MOVE
  - RCL ≥ 5: 12 个 ATTACK + 4 个 MOVE
  - RCL = 4: 9 个 ATTACK + 3 个 MOVE
  - RCL < 4: 6 个 ATTACK + 2 个 MOVE
- 设置 `has_hostile_structures = false`，`has_attacker = true`

### 场景 3：远程房间防御 — 有敌方武装 creep（近战型）

**入口**：同上 (`rooms.spawning.ts:2835`)

```
条件:
  - 目标房间在 activeRemotes 中
  - roomData.has_hostile_creeps = true
  - roomData.has_only_invader = true（仅 NPC：Source Keeper / Invader）
  - roomData.has_attacker = false
  - attackers < 1
```

- 根据敌方 body 分析结果（`hostile_body_type`：attack/ranged_attack/heal 数量）动态生成
- 公式：`bodyPartsCount = heal + attack + ranged_attack`，循环添加 `[ATTACK, MOVE, ATTACK]`
- 设置 `has_attacker = true`，`has_hostile_creeps = false`

### 场景 4：远程房间防御 — 有敌方武装 creep（非 NPC）

**入口**：同上 (`rooms.spawning.ts:2864`)

```
条件:
  - 目标房间在 activeRemotes 中
  - roomData.has_hostile_creeps = true
  - roomData.has_only_invader = false（有玩家 creep）
  - roomData.hostile_body_type 存在
  - roomData.has_attacker = false
  - RangedAttackers < 1
```

- 根据敌方 healing/attack/ranged_attack 比例计算需求：
  - `myNeededHeal = floor((attack*30 + ranged_attack*10) / 12) - 2`
  - `myNeededRangedAttack = floor(heal / 10) + 5`
- 生成 `[HEAL×n, RANGED_ATTACK×m, MOVE×(n+m)]`
- 这是 **RangedAttacker** 的一种生成路径

### 场景 5：低 RCL 骚扰安全 creep

**入口**：同上 (`rooms.spawning.ts:2889`)

```
条件:
  - 当前 RCL ≤ 4
  - roomData.has_safe_creeps = true
  - roomData.has_attacker = false
  - 目标 controller 非己方且 RCL = 0
  - attackers < 1
  - 房间内有 ≥ 1 个敌方 creep
```

- 生成 `[MOVE, ATTACK]` 的小型 attacker 进行骚扰
- 设置 `has_safe_creeps = false`

## 关键数据来源

### has_hostile_creeps / has_hostile_structures

**入口**：`rooms.ts:436-470`，每 tick 对所有可见房间扫描

- **has_hostile_structures**：房间无你的 controller + 存在 `FIND_HOSTILE_STRUCTURES`
- **has_hostile_creeps**：房间无你的 controller + 存在武装敌方 creep（body 含 ATTACK 或 RANGED_ATTACK）
- **has_only_invader**：所有敌方 creep 均为 NPC（Source Keeper / Invader），不含玩家 creep
- **hostile_body_type**：统计敌方总攻击/远程/治疗部件数（考虑 boost 倍率）

### has_attacker 状态管理

**入口**：`rooms.ts:548-561`

- 遍历所有 creep，统计在目标房间内的 attacker/RangedAttacker 数量
- 数量为 0 → `has_attacker = false`（允许重新生成）
- 数量 > 0 → `has_attacker = true`（阻止重复生成）

### activeRemotes 来源

**入口**：`SpawnCache.getRoomStateImpl()` (`rooms.spawning.ts:945-948`)

```typescript
const roomsToRemote = Object.keys(room.memory.resources || {});
const activeRemotes = roomsToRemote.filter(remoteRoom =>
    remoteRoom === room.name || room.memory.resources[remoteRoom].active
);
```

- **初始化**：`identifySources()` → `remotes()` (`rooms.ts:576-592`, `rooms.remotes.ts`)
  - 通过 `Game.map.describeExits()` 获取走廊出口房间
  - 将不可达/非己方/异常状态的房间加入 `room.memory.resources`
- **active = true**：`scout.ts:44-48` — Scout 到达目标房间，确认 source 可达后设置
- **active = false**：`rooms.ts:131-143` — danger_timer > 125 时重置所有非本房间 remote

## 关键设计点

- **多层优先级**：围墙 → creep → 建筑，逐步推进
- **跨房+本房**：跨房途中遇敌先打，到达后专注攻击
- **定期回收**：55 tick 周期性的 suicide，防止无限运行
- **动态响应**：根据敌方 body 分析结果（hostile_body_type）动态调整 attacker 配置
- **防重复生成**：has_attacker 标志确保同一时间每个远程房间只有一个 attacker 在运作
