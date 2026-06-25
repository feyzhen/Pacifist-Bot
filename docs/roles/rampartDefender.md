---
name: RampartDefender 城墙防守者
---

# RampartDefender 城墙防守者

## 概述

RampartDefender 是**城墙防守者**，在危险房间中专门负责维修 rampart 并攻击靠近的敌人。使用自定义成本矩阵避免经过 hostile structures。

## 启动方式

通常由 Guard 角色在危险房间中转换而来（`role = "RampartDefender"`）。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RampartDefender'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `rampart_to_repair` | 待修 rampart ID |
| `locked_repair` / `locked` | 锁定目标 |
| `targets` | 目标列表 |
| `storage` | storage ID |
| `suicide` | 自毁标志 |
| `rampartPositions` | rampart 位置 |
| `myRampartToMan` | 负责的 rampart |

## 运行逻辑

### 1. 维修 Rampart

```
条件: rampart_to_repair 存在
```

- `repair(rampart)` 维修
- 如果 `ERR_NOT_IN_RANGE` → `moveToSafePositionToRepairRampart(rampart, 1)`
- 使用 `MoveCostMatrixRoadPrio` 导航

### 2. 采集能量

```
条件: !full
```

- `harvest(source)` 采集 energy
- `withdraw(storage, ENERGY)` 从 storage 取能

### 3. 建造 Rampart

```
条件: rampartPositions 存在且无 rampart
```

- `createConstructionSite(STRUCTURE_RAMPART)` 建站
- `build(site)` 建造

### 4. 攻击敌人

```
条件: FIND_HOSTILE_CREEPS 存在
```

- `attack(enemy)` 或 `rangedAttack(enemy)`
- 优先攻击靠近 rampart 的敌人

## 与 Memory.roomPlanner 的联动

- 读取 `Memory.roomPlanner[room.name].layout.rampart` 获取预设 rampart 位置
- 在危险房间中自动部署 rampart

## 关键设计点

- **safe positioning**：使用 `moveToSafePositionToRepairRampart` 在安全位置维修
- **危险感知**：只在 `room.memory.danger` 时激活
- **auto-repair**：持续监控 rampart 血量，自动修复
