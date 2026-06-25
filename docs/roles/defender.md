---
name: Defender 防守者
---

# Defender 防守者

## 概述

Defender 是**房间防守者**，在危险房间中防御 rampart 并攻击入侵的敌方 creep。当 rampart 附近有多个敌人时会使用范围攻击。

## 启动方式

通过 `rooms.spawning.ts` 在标记为 `danger` 的房间自动创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'defender'` |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 危险检测（第 3-3 行）

```
条件: creep.room.memory.danger == true
```

- 只有标记为 danger 的房间才会执行防守逻辑

### 2. RampartDefender 存在性检查（第 13-46 行）

```
条件: body <= 3 或 body % 3 == 0
```

- 找房间内的 `RampartDefender` 数量
- 如果 RampartDefender 数量 >= 0（即存在）：
  - 1 格范围内敌人 > 1 且 (tick%20 在 10-20) → `rangedMassAttack()`
  - 1 格范围内有敌人且 (tick%20 在 0-10) → `rangedAttack(closestEnemyCreep)`
  - 否则 → `rangedAttack(closestEnemyCreep)`
  - 移动到 `rampartToMan` 附近
- 如果 RampartDefender 不存在：
  - 每 100 tick 设置 `suicide = true`
  - `recycle()`

### 3. 战斗逻辑（第 48-77 行）

- 如果靠近敌人 → `rangedMassAttack()`
- 如果房间 memory 有 `attack_target` → 攻击该目标
- 否则攻击最近的敌人
- 移动到 rampart 或 terminal

### 4. 非危险状态（第 82-90 行）

```
条件: danger == false
```

- 每 100 tick 设置 `suicide = true`
- `recycle()`

## 与 RampartDefender 的联动

- Defender 检查 RampartDefender 是否存在来决定是否继续防守
- 如果 RampartDefender 不存在，Defender 会自毁
- 两者形成**防守配对**：RampartDefender 负责修 rampart，Defender 负责打 creep

## 关键设计点

- **时间分片**：tick%20 控制 rangedMassAttack 和 rangedAttack 的交替，避免冲突
- **RCL 依赖**：body 结构为 3 的倍数（TOUGH+CLAIM+HEAL 或类似组合）
- **危险感知**：只在 `room.memory.danger` 时生效，房间安全后自动回收
- **注释掉的逻辑**：第 91-97 行注释显示曾经会转为 RangedAttacker 角色
