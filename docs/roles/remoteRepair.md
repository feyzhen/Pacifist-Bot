---
name: RemoteRepair 远程维修者
---

# RemoteRepair 远程维修者

## 概述

RemoteRepair 是**远程维修者**，在 remote room 中维修和建造结构。与 SpecialRepair 类似，但专为 remote 房间设计。

## 启动方式

通过 `rooms.spawning.ts` 在 remote 房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'remoteRepair'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `repairing` | 是否在维修 |
| `full` | 是否满载 |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `repairTarget` | 维修目标 |
| `MyTargetRoomServiced` | 是否已服务 |

## 运行逻辑

### 1. 维修

```
条件: repairing && locked 存在
```

- `repair(target)` 维修
- `MoveCostMatrixRoadPrio(target, 1)` 移动
- `MoveCostMatrixIgnoreRoads(target, 1)` 避开 hostile structures

### 2. 建造

```
条件: 有 ConstructionSite
```

- `build(site)` 建造

### 3. 能量补给

```
条件: !full
```

- `withdraw(storage, ENERGY)` 从 storage 取能
- `findStorage()` 搜索 storage

### 4. 送能量给 SpecialRepair

```
条件: SpecialRepair creep 存在
```

- 找到 SpecialRepair → `transfer(SpecialRepair, ENERGY)`

## 与 room.memory 的联动

- `room.memory.danger`：危险状态
- `room.roomTowersAttackEnemy()`：tower 协同
- `room.memory.rampartToMan`：rampart 管理
- `room.memory.defence.nuke`：nuke 防御

## 关键设计点

- **ignoreRoads**：使用 `MoveCostMatrixIgnoreRoads` 避免经过 hostile ranged attacker
- **SpecialRepair 配合**：为 SpecialRepair 送能量
- **remote 专用**：专为 remote room 设计，不处理 home room 的事务
