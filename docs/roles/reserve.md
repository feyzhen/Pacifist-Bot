---
name: Reserve 驻留者
---

# Reserve 驻留者

## 概述

Reserve 是**控制器驻留者**，负责在敌方房间持续对 controller 执行 `reserveController()`，阻止其他玩家占领。同时用 "we come in peace" 信息签名 controller。

## 启动方式

通过 `rooms.spawning.ts` 的 `reserve_creep` 规则创建，参数 `{role: 'reserve', targetRoom, homeRoom, claim: true/false}`。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'reserve'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `full` | 是否满载 |
| `boostlabs` | 强化 lab 列表 |
| `suicide` | 自毁标志 |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `repairing` | 是否在维修 |
| `claim` | 是否尝试 claim（true=claim，false=仅 reserve） |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往目标房间

### 2. 驻留控制器

```
条件: room == targetRoom
```

- 靠近 controller → `reserveController(controller)`
- 如果 `claim == true` 且有 WORK 部件 → `claimController(controller)`
- 签名 controller：`signController("we come in peace")`

### 3. 能量补给

```
条件: !full
```

- `findStorage()` → `withdrawStorage(storage, ENERGY)`
- 或 `acquireEnergyWithContainersAndOrDroppedEnergy()`

### 4. 回收判定

```
条件: reservation.ticksToEnd >= 4999
```

- 驻留即将过期 → `recycle()`（换另一个来续）

## 关键设计点

- **驻留 vs 占领**：`claim` 字段决定是仅驻留还是尝试占领
- **自动签名**：每次靠近 controller 就签名，展示领地声明
- **续期管理**：ticksToEnd >= 4999 时回收，让新的 reserve 来接替
- **RoadPrio 优先**：使用 `MoveCostMatrixRoadPrio` 导航，保证跨房效率
