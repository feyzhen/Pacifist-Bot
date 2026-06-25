---
name: SpecialRepair 特殊维修者
---

# SpecialRepair 特殊维修者

## 概述

SpecialRepair 是**高优先级维修者**，在危险房间中处理 critical structure repairs。与普通 Repair 不同，SpecialRepair 使用特殊成本矩阵避免 hostile ranged attacker 区域。

## 启动方式

通过 `rooms.spawning.ts` 在危险房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'SpecialRepair'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `repairing` | 是否在维修 |
| `suicide` | 自毁标志 |
| `myRampartToMan` | 负责的 rampart |
| `rampart_to_repair` | 待修 rampart |

## 运行逻辑

### 1. 寻找维修目标

```
条件: !repairing || 当前目标已修好
```

- 找 `hits < hitsMax` 的 STRUCTURE（排除 road）
- 优先级：rampart > tower > spawn > container > link
- 设置 `locked = target.id`

### 2. 获取能量

```
条件: !full
```

- `findStorage()` → `withdraw(storage, ENERGY)`
- `MoveCostMatrixRoadPrio(storage, 1)` 移动

### 3. 执行维修

```
条件: full && locked 存在
```

- `repair(target)` 维修
- 如果 `ERR_NOT_IN_RANGE`：
  - `MoveCostMatrixRoadPrio(target, 1)` 常规移动
  - `MoveCostMatrixIgnoreRoads(target, 1)` 避开 hostile ranged attacker
- 维修完成 → `full = false`

### 4. Rampart 管理

```
条件: myRampartToMan 存在
```

- `moveToSafePositionToRepairRampart(rampart, 1)` 安全维修

### 5. 回收

```
条件: suicide = true
```

- `recycle()`

## 与 SpecialCarry 的联动

- SpecialCarry 专门给 SpecialRepair 送能量
- SpecialRepair 是 SpecialCarry 的 `creep_target`

## 与 room.memory 的联动

- `room.memory.danger`：危险状态
- `room.roomTowersAttackEnemy()`：tower 协同
- `room.memory.rampartToMan`：rampart 管理
- `room.memory.keepTheseRoads`：道路白名单

## 关键设计点

- **ignoreRoads**：使用 `MoveCostMatrixIgnoreRoads` 避免经过 hostile ranged attacker
- **safe positioning**：维修 rampart 时使用 `moveToSafePositionToRepairRampart`
- **evacuate 优先**：紧急情况先撤离
- **高优先级**：处理普通 Repair 不处理的 critical 维修
