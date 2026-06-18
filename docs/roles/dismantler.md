---
name: Dismantler 拆解者
---

# Dismantler 拆解者

## 概述

Dismantler 是**通用拆解者**，负责拆除 hostile walls。比 DismantleControllerWalls 更通用，不局限于 controller 附近。

## 启动方式

通过 `rooms.spawning.ts` 在需要拆除敌方建筑的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Dismantler'` |
| `locked` | 锁定拆解目标 |

## 运行逻辑

### 1. 找目标

```
条件: locked 不存在
```

- 找 `STRUCTURE_WALL`
- 按 `hits` 升序排序，优先拆最弱的
- 设置 `locked = wall.id`

### 2. 拆除

```
条件: locked 存在
```

- `dismantle(target)` 拆除
- `MoveCostMatrixRoadPrio(target, 1)` 移动
- `moveTo(target)` 移动

### 3. 回收

```
条件: 目标不存在 || 拆除完毕
```

- `recycle()`

## 关键设计点

- **通用拆解**：不限于 controller 附近
- **locked 机制**：防止多个 dismantler 抢同一个目标
- **简单直接**：只拆解，不建造
