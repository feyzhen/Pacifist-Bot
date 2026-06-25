---
name: Healer 治疗者
---

# Healer 治疗者

## 概述

Healer 是**房间治疗者**，负责治疗受伤的自己和其他 creep。在危险房间中提供持续的医疗支持。

## 启动方式

通过 `rooms.spawning.ts` 在需要医疗支持的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'healer'` |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 自我治疗（第 8-10 行）

```
条件: hits < hitsMax
```

- `creep.heal(creep)` 自我恢复

### 2. 逃生检测（第 12-32 行）

```
条件: fleeing == true
```

- 找远程敌人（RANGED_ATTACK > 0）：距离 ≤ 5 格时停止移动
- 找近战敌人（ATTACK > 0）：距离 ≤ 3 格时停止移动
- 如果 danger 为 false → `fleeing = false`

### 3. 治疗队友（第 34-44 行）

```
条件: 房间内有受伤 creep
```

- 过滤 `Game.creeps` 找出同房间且 `hits < hitsMax` 的 creep
- 如果距离够近 → `heal(damagedCreep[0])`
- 如果不在范围 → `moveTo(damagedCreep[0])` + `rangedHeal(damagedCreep[0])`

## 关键设计点

- **自我优先**：先给自己治疗，再治疗队友
- **范围治疗**：同时使用 melee heal 和 ranged heal
- **简单有效**：逻辑极简，专注于治疗一件事
- **不主动攻击**：Healer 不参与战斗，只治疗和逃生
