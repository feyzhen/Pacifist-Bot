---
name: Ram 突击者
---

# Ram 突击者

## 概述

Ram 是**突击者**，正面冲锋攻击 hostile creep 和 structures。使用自定义成本矩阵 `roomCallbackRam` 避开 hostile structures 和 terrain。

## 启动方式

通过 `Commands.ts` 的 `global.SD()` / `global.SDB()` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'ram'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `healtarget` | 治疗目标 |
| `path` / `MoveTargetId` | 路径缓存 |
| `defendController` | 是否防守 controller |

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

- `attack(enemy)` 近战攻击
- `rangedAttack(enemy)` 远程攻击
- `rangedMassAttack()` 范围攻击

### 3. 治疗

```
条件: hits < hitsMax
```

- `heal(healtarget)` 治疗

### 4. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往
- 使用 `MoveCostMatrixRoadPrio` 和 `MoveCostMatrixIgnoreRoads`

### 5. 自定义成本矩阵

```
条件: roomCallbackRam(roomName)
```

- 避开 hostile structures（tower、spawn、observer）
- 避开 terrain walls
- 优先走 road

## 与 signifer 的联动

- Ram 和 signifer 配对行动
- signifer 负责治疗 ram

## 关键设计点

- **roomCallbackRam**：自定义路径回调，避开 hostile structures
- **path 缓存**：`memory.path` 和 `memory.MoveTargetId` 加速重复路径
- **defendController**：可以防守 controller 位置
