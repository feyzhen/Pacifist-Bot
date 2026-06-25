---
name: Annoy 骚扰者
---

# Annoy 骚扰者

## 概述

Annoy 是**骚扰者**，在 hostile room 中制造混乱。攻击敌方 creep 和 construction sites，逼迫敌人分散注意力。

## 启动方式

通过 `rooms.spawning.ts` 在 controller < 3 的房间创建，或由 `scout.ts` 自动 spawn。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'annoy'` |
| `targetRoom` | 目标房间 |
| `full` / `fill` | 满载状态 |
| `fleeing` / `danger` | 逃生状态 |
| `storage` | storage ID |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoom(targetRoom)` 前往目标房间

### 2. 攻击

```
条件: FIND_HOSTILE_CREEPS 或 FIND_HOSTILE_CONSTRUCTION_SITES 存在
```

- `attack(enemy)` 攻击敌人
- `attack(constructionSite)` 攻击工地
- `moveTo(target)` 移动

### 3. 移动到 controller

```
条件: 无目标
```

- `moveTo(25, 25, targetRoom)` 移动到 controller 附近

## 关键设计点

- **制造混乱**：不追求击杀，只追求让敌人分心
- **攻击工地**：专门破坏敌方 construction sites
- **controller 附近**：无目标时在 controller 附近游荡
