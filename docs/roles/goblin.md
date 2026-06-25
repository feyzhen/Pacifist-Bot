---
name: Goblin 拾荒者
---

# Goblin 拾荒者

## 概述

Goblin 是**资源回收船**，负责从废墟、掉落物和建筑中 scavenging 资源，然后集中存储到指定的 `dropRoom`。相比 Convoy 只搬运能量，Goblin 可以回收**所有类型的资源**（矿物、GHODIUM、合金等）。

## 启动方式

通过 `Commands.ts:1844` 的 `global.SG(homeRoom, targetRoomName)` 命令创建：

- 要求 homeRoom 被你拥有且 controller level ≥ 4
- 需要该房间至少有一个 `filler` 角色（防冲突检查）

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'goblin'` |
| `homeRoom` | 出生房间 |
| `targetRoom` | 找资源的房间 |
| `dropRoom` | 存资源的房间（默认=homeRoom，可自动升级为主城） |
| `full` | 是否满载 |
| `MaxStorage` | 最大载量（CARRY 部件数 × 50） |
| `storage` | 目标 storage ID（可选） |
| `suicide` | 自毁标志 |

## 运行状态机

```
┌──────────────────────────────────────────────────────────────┐
│ 初始化 & 自检                                                 │
│                                                              │
│  1. 计算 MaxStorage = CARRY 部件数 × 50                       │
│  2. 如果 !dropRoom → dropRoom = homeRoom                     │
│  3. 自毁判定:                                                │
│     - full 但还有容量 → suicide                               │
│     - ticksToLive <= 250 → suicide                            │
│  4. 满载时自动寻找更远的 owned room 作为 dropRoom (RCL4+)     │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 满载阶段 (full = true)                                        │
│                                                              │
│  1. 如果 room != dropRoom → moveToRoomAvoidEnemyRooms(dropRoom)│
│  2. 找到 storage 后:                                         │
│     - 遍历 creep.store 所有资源 → transfer(storage, ...)     │
│     - MoveCostMatrixRoadPrio(storage, 1)                     │
│  3. 存满 (freeCapacity < MaxStorage) → full = false          │
└──────────────┬───────────────────────────────────────────────┘
               │ 存完/满了
               ▼
┌──────────────────────────────────────────────────────────────┐
│ 找资源阶段 (!full)                                            │
│ 条件: room != targetRoom → 先跨房移动到 targetRoom            │
│                                                              │
│ 到达后按以下优先级查找资源:                                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 优先级 1: Ruins (废墟)                                  │  │
│  │ - 找所有有 store 的 ruins                               │  │
│  │ - 遍历每个 ruin 的每种 resource → withdraw             │  │
│  │ - MoveCostMatrixRoadPrio(ruin, 1)                      │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                          │ 没废墟                           │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 优先级 2: Dropped Resources (掉落物)                    │  │
│  │ - 过滤掉 RESOURCE_ENERGY                                │  │
│  │ - 按 amount 降序排序                                    │  │
│  │ - pickup(dropped[0])                                    │  │
│  │ - MoveCostMatrixRoadPrio(dropped[0], 1)                │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                          │ 没掉落物                           │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 优先级 3: Structures (建筑)                             │  │
│  │ - 从 container/spawn/storage/terminal/tower/lab/        │  │
│  │   factory/power_spawn 中 withdraw                       │  │
│  │                                                         │  │
│  │   子优先级:                                             │  │
│  │   a) specialTarget: 含非能量资源 (lab/factory/          │  │
│  │      terminal/power_bank) → ⚠️ 只 log 不 withdraw！     │  │
│  │   b) target: 只有能量的建筑 → withdraw                 │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                          │ 没建筑                            │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 兜底: 无任何资源 → suicide = true → recycle             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 与 MoveCostMatrix 系列方法的联动

Goblin 全程使用 `creepFunctions2.ts` 中的自定义移动方法：

| 方法 | 使用场景 |
|------|----------|
| `MoveCostMatrixRoadPrio(target, 1)` | 跨房移动、向目标移动（ruins/dropped/storage/structures） |
| `moveToRoomAvoidEnemyRooms(roomName)` | 跨房运输（满载去 dropRoom，空载去 targetRoom） |

路径偏好：**始终走公路**（RoadPrio），因为 scavenging 不需要像 Convoy 那样穿越沼泽。

## 与 rooms.supportOtherRooms.ts 的联动

无直接联动。Goblin 是手动通过 `SG` 命令创建的独立角色。

## 资源回收优先级详解

```
Ruins (有能量的废墟)
  ↓ 无
Dropped (非能量掉落物，按量大的优先)
  ↓ 无
Structures:
  ├─ specialTarget (含非能量资源的 lab/factory/terminal) → ⚠️ 只 log
  └─ target (只有能量的 container/spawn/storage/tower)
```

## 已知问题

1. **specialTarget 只 log 不 withdraw**（第 163 行）：
   ```typescript
   // 第 163 行只有 console.log，没有实际的 withdraw 调用
   console.log(`[Withdraw From Special Target] - ${creep.name} withdrawing ${resource}.`);
   ```
   这意味着 Goblin 永远不会真正从 lab/factory/terminal 中取走高价值资源。

2. **specialTarget 和 target 互斥**（第 159-179 行）：
   如果有 specialTarget 存在，Goblin 会完全跳过 target。但由于 specialTarget 不 withdraw，Goblin 可能卡住不动。

3. **suicide 条件冗余**（第 181-185 行）：
   ```typescript
   if(targets && targets.length == 0 && !creep.memory.full) { ... }
   else if (!targets && !creep.memory.full) { ... }
   ```
   两个分支逻辑等价，`targets` 总是 truthy（数组）。

## 关键设计点

- **自动升级 dropRoom**：首次满载时，如果 `dropRoom == homeRoom`，会自动搜索距离最近的一个 owned + RCL4+ 房间作为 dropRoom，实现资源集中管理。
- **寿命管理**：`ticksToLive <= 250` 时触发 suicide，避免老 creep 浪费 CPU。
- **全资源支持**：不同于 Convoy 只搬运能量，Goblin 的 `for (const resource in creep.store)` 模式支持任意资源类型。
