---
name: RampartErector 城墙建造者
---

# RampartErector 城墙建造者

## 概述

RampartErector 是**城墙建造者**，根据 `roomPlanner` 布局系统在房间中建造 rampart。与 RampartDefender 不同，Erector 只负责建，Defender 只负责修。

## 启动方式

通常由 Guard 角色在需要建防线的房间中转换而来。

## 内存字段

与 RampartDefender 相同：

| 字段 | 说明 |
|------|------|
| `role` | `'RampartErector'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `rampart_to_repair` | 待修 rampart ID |
| `locked` / `locked_repair` | 锁定目标 |
| `rampartPositions` | rampart 位置 |
| `storage` | storage ID |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 建站

```
条件: rampartPositions 中有位置且无 rampart
```

- 遍历预设位置
- `createConstructionSite(STRUCTURE_RAMPART)` 建站

### 2. 建造

```
条件: 有 ConstructionSite
```

- `build(site)` 建造 rampart
- `MoveCostMatrixRoadPrio(site, 1)` 移动

### 3. 维修

```
条件: rampart_to_repair 存在
```

- `repair(rampart)` 维修
- `moveToSafePositionToRepairRampart(rampart, 1)` 安全位置

### 4. 完成检测

```
条件: room.memory.rampartsCompleted == true
```

- 所有 rampart 建完 → `suicide = true` → `recycle()`

## 与 roomPlanner 的联动

- 读取 `Memory.roomPlanner[room.name].layout.rampart`
- 按预设坐标逐个建造
- 完成后设置 `room.memory.rampartsCompleted = true`

## 关键设计点

- **预设位置**：从 layoutManager 生成的布局中读取 rampart 坐标
- **建完即回收**：所有 rampart 完成后自动回收
- **边建边修**：优先建新的，有空档时修旧的
