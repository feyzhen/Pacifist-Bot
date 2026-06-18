---
name: Convoy 运输船
---

# Convoy 运输船

## 概述

Convoy 是房间间的**专职能量运输车**，负责将 A 房的 storage 能量运到 B 房的 storage。与 `carry`/`filler` 等本地搬运不同，Convoy 的核心价值在于**跨房运输**。

## 启动方式

通过 `Commands.ts:632` 的 `global.spawnConvoy(roomName, targetRoomName)` 命令创建，或由 `rooms.supportOtherRooms.ts` 在满足条件时自动调用：

- 来源房 RCL8，目标房被占领且 controller 等级 2-5
- 两房间线性距离 ≤ 6
- 来源 storage 能量 ≥ 310000
- `Memory.delayConvoy[roomName]` 未处于冷却期

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Convoy'` |
| `homeRoom` | 能量来源房间 |
| `targetRoom` | 能量目标房间 |
| `full` | 是否满载（true=满载，false=空载） |

## 运行状态机

```
┌──────────────────────────────────────────────────────────────┐
│ 空载阶段                                                     │
│ 条件: !full && ticksToLive > 1480 && 当前房有 storage         │
│                                                              │
│  1. MoveCostMatrixSwampPrio(storage, 1)  ← 向 storage 移动    │
│  2. withdraw(storage, RESOURCE_ENERGY)                       │
│  3. full = true                                              │
│  4. return                                                   │
└──────────────┬───────────────────────────────────────────────┘
               │ 装完货
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 运输阶段                                                     │
│ 条件: full && room != targetRoom                              │
│                                                              │
│  1. 如果 hits < hitsMax/1.5 → Memory.delayConvoy[homeRoom]=8000 (延迟重生) │
│  2. moveToRoomAvoidEnemyRooms(targetRoom) ← 跨房移动          │
│  3. return                                                   │
└──────────────┬───────────────────────────────────────────────┘
               │ 到达目标房
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 卸货阶段                                                     │
│ 条件: room == targetRoom && 目标房有 storage                  │
│                                                              │
│  1. 如果 storage 空闲容量 > 100 且 creep 有能量:               │
│     - MoveCostMatrixRoadPrio(storage, 1)                     │
│     - transfer(storage, RESOURCE_ENERGY) → full=false        │
│     - homeRoom = targetRoom (交换角色，下次回程)              │
│  2. 否则 → recycle()                                         │
└──────────────┬───────────────────────────────────────────────┘
               │ 目标房无 storage
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 回收阶段                                                     │
│ 条件: 当前房无 Structures.storage                             │
│                                                              │
│  1. MoveCostMatrixRoadPrio(findClosestByRange(FIND_MY_SPAWN))│
│  2. spawn.recycle(creep) 或 creep.suicide()                  │
└──────────────────────────────────────────────────────────────┘
```

## 与 MoveCostMatrix 系列方法的联动

Convoy 使用 `creepFunctions2.ts` 中定义的自定义移动方法：

| 方法 | 用途 | 路径偏好 |
|------|------|----------|
| `MoveCostMatrixSwampPrio(target, 1)` | 空载去装货 | 沼泽优先（不走公路） |
| `MoveCostMatrixRoadPrio(target, 1)` | 卸货/回程 | 公路优先 |
| `moveToRoomAvoidEnemyRooms(targetRoom)` | 跨房移动 | 避开敌方房间，走 highway |

这些方法内部调用 `PathFinder.search`，通过 `roomCallbackRoadPrio` 等回调函数构建 CostMatrix。

## 与 rooms.supportOtherRooms.ts 的联动

`supportOtherRooms()` 每 tick 在每个房间执行：

1. **冷却管理**：如果 `Memory.delayConvoy[roomName] > 0`，递减计数器，期间不生成新 Convoy
2. **自动触发**：满足条件时调用 `global.spawnConvoy()` 创建新的运输船
3. **与 Convoy 的交互**：Convoy 在血量不足时写入 `Memory.delayConvoy[homeRoom] = 8000`，主动请求暂停生成

## CPU 配额

`creepFunctions2.ts:102` 中设置 Convoy 的 CPU 预算为 **41**。

## 关键设计点

- **单向不往返**：Convoy 到目标房卸货后，如果目标房也有 storage 就继续装货当"去程船"；否则回收。回程由另一艘 memory 方向相反的 Convoy 完成。
- **寿命门槛**：`ticksToLive > 1480` 才允许装货，接近死亡的运输船不会被派去搬能量。
- **血量保护**：血量低于 `hitsMax/1.5` 时触发 `delayConvoy`，防止连续损失运输船。
