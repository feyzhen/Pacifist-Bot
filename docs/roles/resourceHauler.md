---
name: ResourceHauler 资源搬运者
---

# ResourceHauler 资源搬运者

## 概述

ResourceHauler 是**跨房资源搬运者**，负责从 remote room 的 storage/terminal 搬运各种资源到 home room。与 Convoy 不同，ResourceHauler 搬运**所有资源类型**而不仅是能量。

## 启动方式

通过 `rooms.spawning.ts` 在需要跨房资源转运的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'resourceHauler'` |
| `targetRoom` | 资源来源房间 |
| `homeRoom` | 资源目标房间 |
| `targetBuildingId` | 目标建筑 ID |
| `suicide` | 自毁标志 |
| `full` | 是否满载 |

## 运行逻辑

### 1. 跨房到来源

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往资源房间

### 2. 取资源

```
条件: !full && targetRoom 有资源
```

- 遍历 `FIND_STRUCTURES` 找 storage/terminal
- `withdraw(structure, resourceType)` 提取所有资源类型
- 设置 `full = true`

### 3. 跨房回家

```
条件: full
```

- `moveToRoomAvoidEnemyRooms(homeRoom)` 回家

### 4. 卸资源

```
条件: room == homeRoom && full
```

- `findStorage()` 找 storage
- `transfer(storage, resourceType)` 卸下所有资源
- 设置 `full = false`

### 5. 回收

```
条件: 无资源可取 || ticksToLive 耗尽
```

- `suicide = true` → `recycle()`

## 与 Convoy 的区别

| | Convoy | ResourceHauler |
|---|---|---|
| **资源类型** | 仅能量 | 所有资源 |
| **方向** | 固定双向 | 来源→目标 |
| **生命周期** | 持续运行 | 资源耗尽后回收 |
| **来源** | storage | storage/terminal |

## 关键设计点

- **全资源支持**：`for (resource in structure.store)` 遍历所有资源类型
- **单向不返**：取完资源回家卸货后回收，不继续往返
- **targetBuildingId**：可指定具体建筑 ID 作为目标
