---
name: party-freedomfighter
title: FreedomFighter
---

# FreedomFighter

## 概述

FreedomFighter 是 **Party 编队中的战斗/治疗核心**，在 CCKparty 编队体系中承担主要的战斗和医疗职责。它与 CCKparty 成员一起组成多行编队，由队长统一调度。

## 启动方式

通过 spawn 配置指定 `role: "FreedomFighter"`，并由 `line === 1` 的队长统一管理。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"FreedomFighter"` |
| `line` | number | 在 party 中的行号（从 1 开始） |
| `lineLength` | number | party 总行数 |
| `party` | Array<string> | 队长管理的 party 成员 ID 列表 |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `targetRoom` | string | 目标攻击房间 |
| `homeRoom` | string | 所属房间 |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 第一阶段：强化

1. 如果 `boostlabs` 有配置，调用 `creep.Boost()` 完成强化后返回
2. 强化完成后才能加入 party 编队

### 第二阶段：编队跟随（由队长统一调度）

队长（`line === 1`）会遍历 party 中所有成员并控制它们的移动：

| 行号 | 跟随目标 |
|------|---------|
| 最大行 | 跟随 party[1]（第二个成员） |
| 中间行 | 跟随 `party[lineLength - (line - 1)]` |

使用 `MoveCostMatrixRoadPrio` 公路优先路径向目标移动。

### 第三阶段：战斗行为（FreedomFighter 自主决策）

当 FreedomFighter 被队长调度到可行动位置时，自主执行以下逻辑：

#### 3.1 敌方 creep 攻击

```
if 3 格内有 hostile creep:
    找到最近的敌方 creep
    if 已贴身:
        rangedMassAttack() + attack()
    else:
        rangedAttack(closestHostile)
```

#### 3.2 未占领房间的远程攻击

```
if 不在 homeRoom 且 controller 不存在/不属于自己:
    找到最近的敌方结构体
    rangedAttack(closestStructure)
```

#### 3.3 治疗逻辑

```
if 血量充足 (hits > hitsMax - 250) 且距离最低血量队友 ≤ 3 格:
    if 距离 ≤ 1:
        heal(最低血量队友)
    else:
        rangedHeal(最低血量队友)
elif 受伤 或 有敌方 creep 在场 或 已到达目标房间:
    heal(self)
```

最低血量成员由队长每帧计算：`party.reduce((lowest, c) => c.hits < lowest.hits && c.hits !== c.hitsMax ? c : lowest)`

### 第四阶段：控制器攻击

当所有 party 成员就位（`readyToAttackController = true`）时：

1. 所有 CCKparty 成员对 controller 执行 `attackController()`
2. FreedomFighter 本身不直接攻击 controller，但负责保护编队和维持战力

## 队长调度细节

队长（`line === 1`）的调度逻辑分三种情况：

### 情况 A：最后一名成员（`line === lineLength`）

```
if 在同一房间但未贴身:
    moveTo(前一个成员)
else:
    MoveCostMatrixRoadPrio(前一个成员, 1)
    allGood = false
```

### 情况 B：中间成员

```
if 在同一房间但未贴身:
    moveTo(应跟随的目标成员)
else:
    MoveCostMatrixRoadPrio(...)
    allGood = false
```

### 情况 C：最前成员（接近 controller）

```
if 在 targetRoom 且 controller 在 4 格外:
    GoToController(creep, controller.pos, 3)  // 自定义成本矩阵路径
elif 未在目标房间:
    moveToRoomAvoidEnemyRooms(targetRoom)
elif 在 homeRoom 且位置安全:
    moveToRoomAvoidEnemyRooms(targetRoom)
```

## 辅助函数

### `GoToController(creep, target, range)`

使用 `GoToTheController` 成本矩阵向 controller 附近移动：

1. 检查路径缓存是否失效（位置变化 / 目标改变 / 房间变化）
2. 使用 `PathFinder.search` 搜索路径（maxOps: 1000, maxRooms: 1）
3. 逐步执行路径，每步后 `shift()` 掉已走过的节点

### `GoToTheController(roomName)` — 成本矩阵

构建 controller 附近的专用成本矩阵：

| 地形/对象 | 成本 |
|----------|------|
| 墙壁 | 255 |
| 沼泽 | 10 |
| 空地（无结构） | 2 |
| 敌方 creep | 255 |
| 建设工地（非 road/container/rampart） | 255 |
| DismantleControllerWalls creep | 140 |
| Road | 1 |
| 己方 rampart / container | 0（跳过） |
| 建筑（按 HP 分级） | ≥5M→175, ≥2.5M→150, ≥1M→100, ≥500K→75, <500K→50 |

## 联动关系

| 联动 | 说明 |
|------|------|
| CCKparty | party 中的攻击成员，自毁后 Solomon 接替 |
| 队长（line===1） | 统一调度 party 中所有成员的移动和攻击 |
| Solomon | CCKparty 自毁后的替补角色 |
| `Memory.commandsToExecute` | 接收新编队命令 |

## 关键设计点

- **战斗/治疗平衡** — FreedomFighter 同时具备远程攻击和治疗能力，在战斗中维持自身和队友血量
- **血量阈值** — `hits > hitsMax - 250` 时优先治疗队友，否则自疗
- **编队弹性** — 队长通过 `allGood` 标志判断队形是否完整，不完整时推进队形
- **controller 接近** — 使用专用成本矩阵避开 DismantleControllerWalls 和其他障碍，安全接近 controller
- **self-heal 触发条件** — 受伤、有敌人在场、或到达目标房间时都会触发自疗
