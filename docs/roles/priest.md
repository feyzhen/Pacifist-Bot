---
name: Priest 牧师
---

# Priest 牧师

## 概述

Priest 是**巡回牧师**，在各房间间游走，在每个 controller 上签名 "check out my YT channel - marlyman123"。是最简单的角色之一，只做签名这件事。

## 启动方式

通过 `rooms.spawning.ts` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Priest'` |
| `RoomToPreach` | 下一个布道房间 |
| `roomsVisited` | 已访问房间列表 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 选择下一个房间（第 13-27 行）

```
条件: !RoomToPreach || RoomToPreach == room.name
```

- 用 `Game.map.describeExits(room.name)` 找相邻房间
- 过滤出 `!roomsVisited` 且 `status == "normal"` 的房间
- 随机选择一个作为 `RoomToPreach`
- 如果没正常房间 → 随机选任意房间
- 如果没相邻房间 → `suicide = true`

### 2. 签名 Controller（第 31-39 行）

```
条件: controller 存在 && 签名不是 "marlyman123" && 有开放位置
```

- `signController(controller, "check out my YT channel - marlyman123")`
- 如果不在范围 → `MoveCostMatrixSwampPrio(controller, 1)`

### 3. 移动到目标房间（第 40-45 行）

```
条件: 签名完成或无需签名
```

- 记录 `roomsVisited.push(room.name)`
- `moveTo(new RoomPosition(25, 25, RoomToPreach), {range: 23, reusePath: 100, swampCost: 1})`

## 关键设计点

- **巡回签名**：走遍所有房间，每个 controller 都签 YT 频道名
- **SwampPrio**：使用沼泽优先的成本矩阵（不走公路）
- **visited 追踪**：`roomsVisited` 避免重复访问
- **range 23**：移动到目标房间的中心偏远处（range 23 覆盖整个房间）
