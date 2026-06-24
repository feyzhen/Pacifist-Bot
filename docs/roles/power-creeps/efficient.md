---
name: power-creeps-efficient
title: Efficient (PowerCreep)
---

# Efficient

## 概述

Efficient 是一个 **PowerCreep（力量蠕虫）**，专注于高效利用 power 技能来增强房间基础设施（extension、observer、source）。它是唯一的力量战斗支持型 creep，通过 powers 系统维持房间运转。

## 启动方式

通过 spawn PowerCreep 并指定 `role: "efficient"`。PowerCreep 是永久性的，不会死亡消失。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"efficient"` |
| `full` | boolean | store 是否已满 |
| `sources` | Array<{id, lastBuff}> | 能量源列表及上次 buff 时间 |
| `observer` | `{id, lastBuff}` | 观察者 ID 及上次 buff 时间 |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 优先级 1：生成 OPS

```
if room.danger && 有 PWR_GENERATE_OPS 且 cooldown==0 && store 有空位:
    使用 PWR_GENERATE_OPS
    return
```

在危险房间中优先用 power 生成运营资源（ops），保证后续 power 技能的能源供应。

### 优先级 2：启用房间

```
if controller 存在且 !isPowerEnabled:
    移动到 controller 附近
    使用 enableRoom(controller)
    return
```

首次进入房间时激活 power 功能。

### 优先级 3：再生（renew）

```
if ticksToLive < 120:
    找到 powerSpawn
    移动到 powerSpawn 附近
    renew(powerSpawn)
    return
```

生命不足 120 ticks 时回到 powerSpawn 进行再生。

### 优先级 4：能量存储

```
if store 满了:
    移动到 storage
    逐个 transfer 各种资源（留 50 单位 ops）
    全部转完 → full = false
    return

if store 空了:
    full = false
```

满载时自动将资源存入 storage。

### 优先级 5：Power 技能循环

按以下顺序管理各项 power 技能：

#### PWR_GENERATE_OPS（生成 OPS）
```
if cooldown == 0:
    使用 power
    return
```

#### PWR_OPERATE_EXTENSION（扩展运营）
```
条件:
    - cooldown == 0
    - storage 存在且 energy > 15000
    - store.ops >= 3
    - 房间未达能量上限
行动:
    usePowerInRange(creep, power, 3, storage)
    return
```

在房间能量充足时对 storage 使用 extension 运营 power，提升房间能量容量。

#### PWR_REGEN_SOURCE（源再生）
```
条件:
    - cooldown == 0
    - !danger
    - 距离上次 buff > 300 ticks
行动:
    遍历 memory.sources 中的每个 source
    usePowerInRange(creep, power, 3, source)
    记录 lastBuff = Game.time
    return
```

在无危险的房间中，定期对所有能量源使用再生 power（每 300 ticks = 5 分钟一次）。

#### PWR_OPERATE_OBSERVER（观察者运营）
```
条件:
    - cooldown == 0
    - 距离上次 buff > powerLevel * 200 ticks
行动:
    找到房间中的 observer
    usePowerInRange(creep, power, 3, observer)
    记录 lastBuff = Game.time
    return
```

对 observer 使用运营 power 延长其视野范围。

## 辅助函数

### `usePowerInRange(creep, power, range, target)`

```
if creep 到 target 的距离 <= range:
    if usePower(power, target) == 0 (成功):
        return "success"
else:
    MoveCostMatrixRoadPrio(target, range)
    return undefined
```

自动处理 power 技能的范围检查和移动。

## 联动关系

| 联动 | 说明 |
|------|------|
| powerSpawn | 依赖 `room.memory.Structures.powerSpawn` 定位 |
| storage | 存储能量和资源 |
| terminal | 读取引用但未直接使用 |
| room.memory.danger | 决定是否使用 PWR_REGEN_SOURCE |

## 关键设计点

- **PowerCreep 特性** — 作为 PowerCreep，它拥有 power 技能树，可以学习并使用多种 power
- **自动资源管理** — 自动在 storage 和自身之间转移资源，保持高效运作
- **定时维护** — 对 source 和 observer 进行周期性 buff，维持房间基础设施
- **危险感知** — 在 danger 房间优先生产 ops 而非维护基础设施
- **`MoveCostMatrixRoadPrio`** — 所有移动都使用公路优先路径，确保最快到达目标
- **cooldown 管理** — 每个 power 技能独立管理 cooldown，不会冲突使用
