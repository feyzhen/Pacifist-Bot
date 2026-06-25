---
name: Builder 建造者
---

# Builder 建造者

## 概述

Builder 是**施工现场建造者**，负责读取 ConstructionSite 并完成建筑。与 `repair` 不同，Builder 只处理已创建的工地（ConstructionSite），不主动寻找损坏的建筑。

## 启动方式

通过 `rooms.spawning.ts` 在 RCL4+ 房间自动创建，或从 `filler` 角色转换（RCL4 且无 storage 时 `role = "builder"`）。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'builder'` |
| `building` | 是否携带能量（true=有能量要建，false=需去装货） |
| `locked` | 锁定目标 ID（ConstructionSite 或 Structure ID） |
| `suicide` | 自毁标志 |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 撤离与防御（第 78-103 行）

- 调用 `creep.evacuate()` 优先处理紧急情况
- 如果 `fleeing`，检测近战/远程敌人距离，≤8 格远程或 ≤6 格近战时原地停止

### 2. 能量补给（第 107-118 行）

- 找 storage，靠近时 `withdraw(RESOURCE_ENERGY)`
- 能量装完 → `building = true`
- 能量用完 → `building = false`

### 3. 建造阶段（第 120-139 行）

```
条件: building && locked
```

- 通过 `findLocked()` 锁定目标 ConstructionSite
- `build(target)`，如果 `ERR_NOT_IN_RANGE` → `MoveCostMatrixRoadPrio(target, 3)`

### 4. 找工地（第 128-130 行）

`findLocked()` 流程：
1. 从 `FIND_MY_CONSTRUCTION_SITES` 按优先级排序
2. 优先顺序：spawn → extension → storage → terminal → link → tower → container → road/rampart → power_spawn → extractor → lab → factory → nuket
3. 按 `progressTotal` 降序，优先完成进度高的
4. 兜底：`findClosestByRange`

### 5. 空载时找目标（第 142-166 行）

- 先尝试 `withdrawStorage(storage)`
- 如果失败（storage 没能量），调用 `findLocked()` 锁定目标
- 如果连 storage 都没有，调用 `acquireEnergyWithContainersAndOrDroppedEnergy()`

### 6. 自毁回收（第 173-182 行）

- 如果 `suicide = true`，优先修复低血 rampart（`roomTowersRepairTarget`）
- 否则 `recycle()`

## 与 Fill 角色的联动

Builder 和 Filler 共享 `locked` 机制：
- Filler 负责把能量从 storage 送到 tower/spawn/extension
- Builder 负责用这些能量完成 ConstructionSite

## 关键设计点

- **寿命保护**：`ticksToLive <= 30` 时不触发 suicide（注释掉了），避免过早死亡
- **RCL4 自动转换**：RCL4 且无 storage 时，filler 自动转为 builder
- **优先完成**：按进度排序，减少 CPU 浪费（不用反复 build 同一个工地）
