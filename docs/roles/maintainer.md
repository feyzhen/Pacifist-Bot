---
name: Maintainer 维护者
---

# Maintainer 维护者

## 概述

Maintainer 是**房间维护总管**，负责维修道路、container、rampart 和建筑。比 Repair 更综合，还管理 `keepTheseRoads`（白名单道路）和 `rampartsToRepair`。

## 启动方式

通过 `rooms.spawning.ts` 在 RCL5+ 房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'maintainer'` |
| `working` | 是否在工作 |
| `locked_build` | 锁定建造目标 |
| `locked_repair` | 锁定维修目标 |
| `allowed_repairs` | 允许的维修列表 |
| `rampartsToRepair` | rampart 维修列表 |
| `full` | 是否满载 |
| `suicide` | 自毁标志 |
| `storage` | storage ID |
| `repairing` | 是否在维修 |
| `myTargetRoomServiced` | 目标房间是否已服务 |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 道路维修（第 1-2 行）

```
条件: room.memory.keepTheseRoads 存在
```

- 遍历白名单道路
- 如果道路损坏（`hits < hitsMax`）→ `repair(road)`
- 如果道路被拆 → 重新建站

### 2. Rampart 维修

```
条件: room.memory.rampartsToRepair 存在
```

- 按 `hits` 升序排序
- 优先维修最伤的 rampart
- 设置 `locked_repair = rampart.id`

### 3. 建筑维修

- 找 `hits < hitsMax` 的 STRUCTURE
- 按优先级排序：tower > spawn > extension > link > container
- `repair(target)` 维修

### 4. 建造

```
条件: locked_build 存在
```

- `build(constructionSite)` 建造
- 如果 `ERR_NOT_IN_RANGE` → `MoveCostMatrixRoadPrio(target, 1)`

### 5. 角色转换

- 如果能量耗尽且找不到 storage → `role = "repair"`（降级为普通维修者）

### 6. 紧急维修

```
条件: room.memory.danger_timer > 0
```

- 优先维修 rampart
- 如果 rampart 被打穿 → 紧急重建

## 与 room.memory 的联动

- `room.memory.keepTheseRoads`：道路白名单
- `room.memory.rampartsToRepair`：rampart 维修队列
- `room.memory.Structures.controllerLink`：controllerLink 引用
- `room.memory.danger_timer`：危险计时器

## 关键设计点

- **白名单道路**：`keepTheseRoads` 防止 maintainer 修不必要的路
- **分级降级**：energy 耗尽时从 maintainer 降级为 repair
- **danger 感知**：危险状态下优先 rampart 而非普通建筑
- **综合管理**：道路+rampart+建筑+建造，一个 creep 管所有维护
