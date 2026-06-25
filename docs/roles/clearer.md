---
name: Clearer 清道夫
---

# Clearer 清道夫

## 概述

Clearer 是**战斗清理者**，负责在危险房间击杀敌方 creep。找到最近敌人后攻击之，并在敌人附近呼叫 tower 支援。寿命低于 100 或房间无危险时自动回收。

## 启动方式

通过 `rooms.spawning.ts` 在危险房间自动创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'clearer'` |
| `boostlabs` | 强化 lab 列表（可选） |

## 运行逻辑

### 1. 强化（第 9-14 行）

```
条件: boostlabs 存在且非空
```

- 调用 `creep.Boost()` 强化

### 2. 寻找并攻击敌人（第 17-26 行）

```
条件: hostile = findClosestByRange(FIND_HOSTILE_CREEPS) 存在
```

- `attack(hostile)` 近战攻击
- 攻击成功（== 0）且 (每 25 tick 或敌人非满血) → `room.roomTowersAttackEnemy(hostile)` 呼叫 tower 集火
- `moveTo(hostile)` 向敌人移动

### 3. 回收判定（第 27-29 行）

```
条件: ticksToLive < 100 || (!danger && danger_timer === 0)
```

- 寿命低或房间安全 → `recycle()`

## 关键设计点

- **极简设计**：只有一个主循环，没有复杂的资源管理
- **Tower 协同**：攻击成功后呼叫 tower 集火同一目标
- **快速回收**：100 ticks 就回收，保持高周转率
