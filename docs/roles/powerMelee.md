---
name: PowerMelee 力量近战
---

# PowerMelee 力量近战

## 概述

PowerMelee 是**力量近战者**，负责攻击 power bank。攻击到 power bank 血量 ≤ 180000 时 spawn 一个 Goblin 回收战利品。

## 启动方式

通过 `rooms.spawning.ts` 在需要攻击 power bank 的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'PowerMelee'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `target` | 目标 power bank ID |
| `spawnedGoblin` | 是否已 spawn goblin |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 找目标（第 18-27 行）

```
条件: !target
```

- `FIND_STRUCTURES` 找 `STRUCTURE_POWER_BANK`
- 设置 `target = powerBank.id`
- 如果没找到 → `suicide = true`

### 3. 攻击 Power Bank（第 29-50 行）

```
条件: target 存在
```

- `MoveCostMatrixRoadPrio(target, 1)` 移动
- `attack(target)` 攻击

### 4. Spawn Goblin（第 33-36 行）

```
条件: target.hits <= 180000 && !spawnedGoblin
```

- `global.SGB(homeRoom, targetRoom)` spawn goblin
- `spawnedGoblin = true` 标记（只 spawn 一次）

### 5. 回收

```
条件: target 不存在
```

- `target = false` → 下一 tick 触发 suicide

## 与 Goblin 的联动

- PowerMelee 攻击 power bank 到 180000 HP 时 spawn goblin
- Goblin 负责回收 power bank 掉落的战利品
- `global.SGB()` 是 spawn goblin 的命令

## 关键设计点

- **180000 阈值**：power bank 血量降到 180000 时 spawn goblin
- **一次性 spawn**：`spawnedGoblin` 标记防止重复 spawn
- **简单直接**：只攻击 power bank，不做其他事
