---
name: DismantleControllerWalls 拆控制器围墙
---

# DismantleControllerWalls 拆控制器围墙

## 概述

DismantleControllerWalls 是**控制器围墙拆除者**，专门拆除 controller 附近的围墙和 hostile structures。由 claimer 在占领成功后 spawn。

## 启动方式

通过 `claimer.ts` 在 `ticksToLive == 1` 时 spawn：
```typescript
Game.rooms[homeRoom].memory.spawn_list.push(getBody([MOVE, WORK], room, 50), newName, {memory: {role: 'DismantleControllerWalls', ...}});
```

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'DismantleControllerWalls'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `suicide` | 自毁标志 |
| `path` / `MoveTargetId` | 路径缓存 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 拆除围墙

```
条件: room == targetRoom
```

- 找 controller 附近的 STRUCTURE_WALL
- `dismantle(wall)` 拆除
- `MoveCostMatrixRoadPrio(target, 1)` 移动

### 3. 回收

```
条件: 围墙拆除完毕 || suicide = true
```

- `suicide()` 或 `recycle()`

## 与 Claimer 的联动

- Claimer 占领成功后，在 `ticksToLive == 1` 时 spawn 此 creep
- 拆除 controller 周围的围墙以便建造
- 是占领流程的下一步

## 关键设计点

- **claim 后清理**：专为 claimer 占领后的清理步骤设计
- **controller 附近**：只拆 controller 附近的围墙
- **一次性任务**：拆完即回收
