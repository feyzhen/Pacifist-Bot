---
name: RemoteDismantler 远程拆解者
---

# RemoteDismantler 远程拆解者

## 概述

RemoteDismantler 是**远程拆解者**，负责在 remote room 中拆解敌方建筑（主要是 walls）。与 Dismantler 类似但针对 remote 房间。

## 启动方式

通过 `Commands.ts` 的 `global.SRDP(homeRoom, targetRoomName)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'remoteDismantler'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `locked` | 锁定拆解目标 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 拆解

```
条件: locked 存在
```

- 优先级：special structures → all structures → non-controller structures
- `dismantle(target)` 拆解
- `MoveCostMatrixRoadPrio(target, 1)` 移动

### 3. 回收

```
条件: ticksToLive <= 50
```

- `recycle()`

## 关键设计点

- **SRDP 命令**：通过 `global.SRDP()` 创建
- **ticksToLive == 1 时**：调用 `global.SRDP()` 重生
- **simple 逻辑**：只拆解，不建造
