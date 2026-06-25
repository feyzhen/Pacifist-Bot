---
name: WallClearer 清墙者
---

# WallClearer 清墙者

## 概述

WallClearer 是**围墙清除者**，负责从 contested room 中清除围墙，为 claimer 开路。使用 `MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch` 导航，避开敌方 creep。

## 启动方式

通过 `Commands.ts` 的 `SQR` / `SQM` / `SQD` 命令创建，当 `Memory.CanClaimRemote >= 1` 时触发。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'WallClearer'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch(position, 0)` 移动
- 使用 `Game.map.findRoute()` 自定义路线回调
- 避开 `Memory.AvoidRooms` 中的房间

### 2. 清除围墙

```
条件: room == targetRoom && 有 WALL
```

- 找 `STRUCTURE_WALL` → `destroy(wall)` 拆除
- `claimController(controller)` 尝试占领
- `signController("YT: @YourTerribleEmpire")` 签名

### 3. 回收

```
条件: 围墙清除完毕
```

- `suicide()` 自杀

## 与 Memory.AvoidRooms 的联动

- `Memory.AvoidRooms`：需要避开的房间列表
- `Game.map.findRoute()` 中使用自定义 routeCallback
- 如果 `routeCallback` 返回 Infinity → 完全避开
- 如果返回 24 → 高度避免
- 如果返回 4 → 正常路径

## 关键设计点

- **AvoidEnemyCreepsMuch**：使用特殊的成本矩阵，极大避免敌方 creep
- **routeCallback**：`ex % 10 == 0 || ey % 10 == 0` 时成本 2（走 highway）
- **高走廊优先**：ex/ey 在 4-6 范围时成本 24（避开核心走廊的敌人）
- **claim + sign**：清墙后尝试占领并签名
