---
name: Repair 维修者
---

# Repair 维修者

## 概述

Repair 是**通用维修者**，负责修复房间内损坏的建筑和 rampart。与 `maintainer` 不同，Repair 专注于维修，maintainer 还负责建造道路。

## 启动方式

通过 `rooms.spawning.ts` 的 `repair_creep` 规则创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'repair'` |
| `repairing` | 是否在维修中 |
| `full` | 是否满载（有能量） |
| `storage` | storage ID |
| `locked` | 锁定维修目标 ID |
| `suicide` | 自毁标志 |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 寻找维修目标

```
条件: !repairing || 当前目标已修好
```

- 找 `hits < hitsMax` 的 STRUCTURE（排除 road）
- 按 `hits` 升序排序，优先修最伤的
- 设置 `locked = target.id`

### 2. 获取能量

```
条件: !full
```

- `findStorage()` → `withdraw(storage, ENERGY)`
- 能量装满 → `full = true`

### 3. 执行维修

```
条件: full && locked 存在
```

- `repair(target)` 维修
- 如果 `ERR_NOT_IN_RANGE` → `MoveCostMatrixRoadPrio(target, 1)`
- 维修完成后 `full = false`

### 4. 特殊处理

- 如果 `locked` 指向的结构已不存在 → `locked = false`
- 如果 `suicide = true` → `recycle()`

## 与 SpecialRepair 的联动

Repair 处理普通维修，SpecialRepair 处理危险房间中的高优先级维修。
- SpecialRepair 使用 `MoveCostMatrixIgnoreRoads` 避免经过 hostile ranged attacker 区域
- Repair 使用标准的 `MoveCostMatrixRoadPrio`

## 关键设计点

- **锁定机制**：`locked` 字段防止多个 repair creep 抢同一个目标
- **能量优先**：先装够能量再维修（`repair()` 消耗能量）
- **简单可靠**：逻辑简单，专注于修东西
