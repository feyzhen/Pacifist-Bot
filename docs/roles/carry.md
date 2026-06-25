---
name: Carry 搬运工
---

# Carry 搬运工

## 概述

Carry 是**本地能量搬运工**，负责从 storage/bin 装货后送到需要能量的结构（spawn/extension/tower）。比 Filler 更简单，主要用于中短途能量配送。

## 启动方式

通过 `rooms.spawning.ts` 根据房间配置动态创建，body 随房间需求变化。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'carry'` |
| `full` | 是否满载 |
| `targetRoom` | 目标房间（跨房时用） |
| `homeRoom` | 家房间 |
| `storage` | storage ID |
| `spawn` | spawn ID |
| `locked` | 锁定目标 ID |
| `fleeing` / `danger` | 逃生状态 |
| `pathLength` | 路径长度（用于寿命计算） |

## 运行状态机

```
┌──────────────────────────────────────────────────────────────┐
│ 空载阶段                                                     │
│ 条件: !full                                                   │
│                                                              │
│  1. 如果 targetRoom != room → moveToRoomAvoidEnemyRooms      │
│  2. acquireEnergyWithContainersAndOrDroppedEnergy()          │
│  3. 如果 storage 存在 → transfer(storage, ENERGY)            │
│  4. 如果 storage 不存在 → findLocked() → 送能量到目标        │
│  5. 如果全都没资源 → drop(ENERGY) 到 spawn 附近              │
└──────────────┬───────────────────────────────────────────────┘
               │ 装完/找到了
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 满载阶段                                                     │
│ 条件: full                                                    │
│                                                              │
│  1. 如果 homeRoom != room → moveToRoomAvoidEnemyRooms(homeRoom)│
│  2. 找 storage → transfer(storage, ENERGY)                   │
│  3. 如果 storage 满了 → 找 bin → transfer(bin, ENERGY)       │
│  4. 如果 bin 也满了 → findLocked() → 送能量到 target         │
│  5. 如果 target 为空 → drop(ENERGY)                          │
│  6. 如果 storage 不存在 → 角色变为 "FakeFiller"              │
└──────────────┬───────────────────────────────────────────────┘
               │ 送完/满了
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 回收阶段                                                     │
│                                                              │
│  - ticksToLive <= 30 (同房间) 或 <= 75 (跨房间) → suicide    │
│  - ticksToLive + 3 == pathLength * 2 → suicide (超时)       │
│  - suicide = true → recycle()                                │
└──────────────────────────────────────────────────────────────┘
```

## findLocked() 逻辑

当 storage/bin 都满了，需要找其他接收方：

1. **Terminal**：如果 terminal 能量 < 10000，优先送 terminal
2. **低能 Tower**：如果房间过载（`capacity/1.5 < available`），找 tower 能量 < 200
3. **Spawn/Extension/Tower**：找有容量的 spawn/extension/tower
4. **Tower 兜底**：找有容量的 tower

## 与 Filler 的区别

| | Carry | Filler |
|---|---|---|
| **复杂度** | 简单直接 | 有 reserveFill 管理 |
| **跨房** | 支持 | 不支持 |
| **生命周期** | 短（寿命到即回收） | 长（持续工作） |
| **角色转换** | 满后可变 FakeFiller | 不变 |
| **能量阈值** | 固定 | 按 RCL 分级 |

## 关键设计点

- **角色转换**：满载但 storage 不存在时，`role = "FakeFiller"`（直接找最近结构送能量）
- **寿命计算**：`ticksToLive + 3 == pathLength * 2` 用于判断是否在路上花太多时间
- **跨房回程**：如果 homeRoom 不等于当前房，先跨房回去再送能量
