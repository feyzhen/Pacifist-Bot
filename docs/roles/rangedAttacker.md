---
name: RangedAttacker 远程攻击者
---

# RangedAttacker 远程攻击者

## 概述

RangedAttacker 是**远程攻击者**，与敌方 creep 保持距离进行 ranged attack，同时 flee 近战敌人。与 defender 类似但更主动出击。

## 启动方式

通过 `rooms.spawning.ts` 在进攻作战中创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RangedAttacker'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `healtarget` | 治疗目标 |
| `path` / `MoveTargetId` | 路径缓存 |
| `sticky` | 粘着目标 |
| `suicide` | 自毁标志 |
| `ignore` | 忽略目标列表 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 战斗

```
条件: FIND_HOSTILE_CREEPS 存在
```

- 找远程敌人 → `rangedAttack(enemy)`
- 找近战敌人 → `RangedAttackFleeFromMelee(enemy)` 边打边退
- `rangedMassAttack()` 范围攻击
- `heal(healtarget)` 治疗队友

### 3. 逃生

```
条件: meleeHostile 距离 ≤ 3 格
```

- `RangedAttackFleeFromMelee()` 边打边退

### 4. 回收

```
条件: ticksToLive <= 50
```

- `recycle()`

## 生成条件

### 场景 1：殖民目标进攻（手动 @colonise 触发）

**入口**：`RemoteDefenseGenerator.generateRangedAttacker()` (`rooms.spawning.ts:2737`)

```
条件:
  - Memory.target_colonise.room 已设置（手动 @colonise 命令）
  - 当前房间是最近且能量最充足的 RCL ≥ 3 房间
  - 目标房间 controller level 1-3
  - 目标房间无你的 spawn
  - 目标房间无 tower（或非己方且无 tower）
  - 目标房间不在 safeMode
  - 距离 ≤ 7 房
  - RangedAttackers < 2
  - storage 能量 > 180000
  - 上次生成间隔 > 1500 tick
```

- 生成 `[MOVE×5-25, RANGED_ATTACK×4, HEAL×1-5]` 按比例分配的 body
- 如果有催化化合物（`RESOURCE_CATALYZED_KEANIUM_ALKALIDE` ≥ 45000 且目标 RCL < 3）：
  - 注入 lab4 boost，设置 `boostlabs: [outputLab4]`
  - 更新 `room.memory.labs.status.boost.lab4`
- 设置 `sticky: true`（粘着目标不被新目标打断）
- 更新 `Memory.target_colonise.lastSpawnRanger`

### 场景 2：远程房间防御 — 非 NPC 玩家 creep

**入口**：`RemoteDefenseGenerator.generateRemoteRoomDefense()` (`rooms.spawning.ts:2864`)

```
条件:
  - 目标房间在 activeRemotes 中
  - roomData.has_hostile_creeps = true
  - roomData.has_only_invader = false（有玩家 creep）
  - roomData.hostile_body_type 存在
  - roomData.has_attacker = false
  - RangedAttackers < 1
  - 当前房间无 danger
  - storage 能量 > 10000
```

- 根据敌方 body 分析结果计算需求：
  - `healAmount = data.heal * 12`（敌方治疗能力折算）
  - `attackAmount = data.attack * 30`（敌方近战攻击折算）
  - `rangedAttackAmount = data.ranged_attack * 10`（敌方远程攻击折算）
  - `myNeededHeal = floor((attackAmount + rangedAttackAmount) / 12) - 2`
  - `myNeededRangedAttack = floor(healAmount / 10) + 5`
- 生成 `[HEAL×n, RANGED_ATTACK×m, MOVE×(n+m)]`
- body 长度 ≤ 50 时才生成
- 设置 `has_hostile_creeps = false`，`has_attacker = true`

## 与 RangedRampartDefender 的区别

| | RangedAttacker | RangedRampartDefender |
|---|---|---|
| **角色** | 主动进攻 | 被动防守 |
| **target** | 敌方 creep | rampartToMan |
| **逃跑** | flee melee | 不逃 |
| **tower 协同** | 无 | roomTowersAttackEnemy |

## 关键设计点

- **RangedAttackFleeFromMelee**：独特的边打边退机制
- **sticky 目标**：`sticky` 字段锁定当前目标，不被新目标打断
- **ignore 列表**：`ignore` 字段跳过特定目标
- **动态 body 生成**：根据敌方 body 分析（`hostile_body_type`）计算所需 HEAL/RANGED_ATTACK/MOVE 比例
- **boost 集成**：殖民场景中优先使用催化化合物强化
