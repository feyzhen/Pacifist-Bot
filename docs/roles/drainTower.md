---
name: DrainTower  draining塔
---

# DrainTower Draining塔

## 概述

DrainTower 是** draining 特化 creep**，在 drain tower 房间和治疗自己之间往返。在 controller 位置附近进行 ranged mass attack。

## 启动方式

通过 `rooms.spawning.ts` 在需要 drain tower 的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'DrainTower'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `draining` | 是否在 draining |

## 运行逻辑

### 1. 治疗

```
条件: hits < hitsMax
```

- `heal(creep)` 自我治疗

### 2. 跨房移动

```
条件: room != targetRoom
```

- `MoveCostMatrixRoadPrio(target, 1)` 移动到目标房间

### 3. 范围攻击

```
条件: 在 controller 位置附近
```

- `rangedMassAttack()` 范围攻击

## 关键设计点

- **drain 循环**：往返于 drain tower 房间和自我治疗之间
- **controller 附近**：在 controller 位置发动范围攻击
- **简单直接**：只有 heal → travel → attack 三个步骤
