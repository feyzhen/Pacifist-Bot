---
name: Upgrader 升级者
---

# Upgrader 升级者

## 概述

Upgrader 是**控制器升级者**，负责在房间内持续升级 Controller。通过 controllerLink 获取能量，在最优位置执行 `upgradeController()`。

## 启动方式

通过 `rooms.spawning.ts` 在 RCL3+ 房间自动创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'upgrader'` |
| `upgrading` | 是否在升级中（true=有能量，false=需装货） |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `suicide` | 自毁标志 |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 撤离（第 3-5 行）

- `creep.evacuate()` 优先处理紧急情况

### 2. 角色转换（第 9-12 行）

```
条件: RCL == 4 && !storage && creep 数量 < 9
```

- 转为 `role = "builder"`，开始建造而非升级

### 3. 能量管理（第 19-27 行）

```
条件: upgrading && energy == 0 → upgrading = false
条件: !upgrading && energy > 0 → upgrading = true
```

- controllerLink 作为主要能量源
- `MoveCostMatrixRoadPrio(controllerLink, 1)` 移动获取能量

### 4. 升级阶段（第 29-41 行）

```
条件: upgrading
```

- `upgradeController(controller)` 
- 如果 `ERR_NOT_IN_RANGE` → `roomCallbackRoadPrioUpgraderInPosition(controller, 3)` 或 `MoveCostMatrixRoadPrio(controller, 3)`
- 如果靠近 controllerLink 且能量 < WORK 部件数 → `withdraw(controllerLink, ENERGY)`

### 5. 装货阶段（第 42-79 行）

```
条件: !upgrading
```

- 如果 controllerLink 有能量 → `withdraw(controllerLink, ENERGY)`
- 如果 controllerLink 无能量且 RCL < 7：
  - 有 storage → `withdrawStorage(storage)`
  - 无 storage → `acquireEnergyWithContainersAndOrDroppedEnergy()`
  - 找不到 → `MoveCostMatrixRoadPrio(controller, 3)`

### 6. 特殊行为（第 86-107 行）

- `ticksToLive == 1` 时 → `transfer(controllerLink, ENERGY)`（把最后一点能量还给 link）
- `ticksToLive <= 50 && !controllerLink && !upgrading` → `suicide = true`（无 link 且快死了）
- `suicide = true` → `recycle()`

## 关键设计点

- **ControllerLink 优先**：优先从 controllerLink 获取能量，减少跨房传输
- **RCL 限制**：RCL >= 7 时不从 storage 装货（可能能量已足够）
- **角色转换**：RCL4 且无 storage 时转为 builder，适应房间发展阶段
- **精确位置**：使用 `roomCallbackRoadPrioUpgraderInPosition` 在最优位置升级
