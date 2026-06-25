---
name: Filler 填充者
---

# Filler 填充者

## 概述

Filler 是**能量分发核心**，负责将 energy 从 storage 或 bin 输送到需要能量的结构（tower/extension/spawn/link）。维护 `room.memory.reserveFill` 列表，跟踪每个目标已输送的能量。

## 启动方式

通过 `rooms.spawning.ts` 根据房间需求自动创建，或由 `claimer` 占领后 spawn。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'filler'` |
| `full` | 是否满载 |
| `MaxStorage` | 最大载量（CARRY × 50） |
| `t` | 当前目标 ID（transfer target） |
| `storage` | storage ID |
| `suicide` | 自毁标志 |
| `fleeing` / `danger` | 逃生状态 |

## 运行状态机

```
┌──────────────────────────────────────────────────────────────┐
│ 初始化 & 自检                                                 │
│                                                              │
│  1. MaxStorage = CARRY 部件数 × 50                           │
│  2. 每 tick 40 清空 reserveFill（防止内存泄漏）               │
│  3. ticksToLive == bodySize*3+6 时 spawn 1 个 filler         │
│  4. ticksToLive <= 14 && !full → suicide                     │
│  5. 逃生检测（melee ≤3, ranged ≤5）                          │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 空载阶段                                                     │
│ 条件: !full                                                   │
│                                                              │
│  1. 从 bin 装货（>= MaxStorage 时优先）                       │
│  2. 从 storage 装货（withdrawStorage）                        │
│  3. 都没有 → acquireEnergyWithContainersAndOrDroppedEnergy() │
└──────────────┬───────────────────────────────────────────────┘
               │ 装完
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 满载阶段                                                     │
│ 条件: full                                                    │
│                                                              │
│  1. findFillerTarget() → 找需要能量的目标                    │
│  2. 如果目标无效 → 重新 findFillerTarget()                   │
│  3. 在范围内 → transfer(target, ENERGY)                      │
│  4. 如果剩的比目标容量多 → 找下一个目标                      │
│  5. 否则 → full = false，回 storage 装货                     │
│  6. 不在范围内 → MoveCostMatrixRoadPrio(target, 1)           │
│  7. danger 时 → moveToSafePositionToRepairRampart()          │
└──────────────────────────────────────────────────────────────┘
```

## findFillerTarget() 返回的目标

`creepFunctions2.ts` 中定义的 findFillerTarget 会返回以下结构（按优先级）：
1. Tower（能量 < 200）
2. Spawn / Extension（有空的）
3. Link（能量 < 200）
4. Container（能量 < MaxStorage）

## 能量阈值

按 RCL 分级判断是否需要能量：

| RCL | 能量阈值 |
|-----|----------|
| ≤ 6 | < 50 |
| 7   | < 100 |
| 8   | < 200 |

## 自重生机制

```
条件: ticksToLive == bodySize * 3 + 6 && storage 存在 && filler 数量 == 1
```

- 自动在 spawn_list 中添加新的 filler
- 防止 filler 数量过少导致能量拥堵

## 关键设计点

- **reserveFill 管理**：通过 `room.memory.reserveFill` 跟踪已完成的目标，避免重复输送
- **智能目标切换**：满载时一次可以送给多个目标（`if(remaining > target.freeCapacity)` 时找新目标）
- **动态阈值**：RCL 越高，所需能量阈值越高，适应不同发展阶段
- **自重生**：确保房间里始终至少有 1 个 filler 在运行
