---
name: Scout 侦察兵
---

# Scout 侦察兵

## 概述

Scout 是**房间侦察兵**，负责探索未知房间，判断是否可以占领。如果发现可占领的房间，会自动 spawn claimer 和 annoy  creep。

## 启动方式

通过 `rooms.spawning.ts` 在需要扩张的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'scout'` |
| `targetRoom` | 侦察目标房间 |
| `homeRoom` | 家房间 |
| `suicide` | 自毁标志 |
| `storage` | storage ID |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往目标房间

### 2. 侦察判定

到达目标房间后检查：
- `Game.map.getRoomStatus(targetRoom).status` 是否为 "normal"
- 是否有 energy source 可访问
- 是否有 mineral deposit
- 是否有 hostile creeps
- controller 等级和 reservation 状态

### 3. 自动 spawn 占领部队

```
条件: 房间可占领
```

- 在 `creep.room.memory.spawn_list` 中 push claimer 的 spawn 数据
- 如果 controller < 3，spawn annoy creep 作为干扰

### 4. 资源追踪

```
条件: 侦察完成
```

- 记录到 `Memory.rooms[homeRoom].resources[targetRoom].energy`
- 标记 `Memory.CanClaimRemote` 计数

### 5. 回收

```
条件: 侦察完成 || ticksToLive 耗尽
```

- `suicide = true` → `recycle()`

## 关键设计点

- **一次性任务**：侦察完成后自动回收，不长期驻留
- **自动化扩张**：发现可占领房间后自动 spawn 占领部队
- **资源地图**：维护 `Memory.rooms[].resources[]` 作为房间资源数据库
- **annoy 配合**：低 RCL 房间 spawn annoy 先骚扰
