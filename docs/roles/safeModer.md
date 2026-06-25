---
name: SafeModer 安全模式生成者
---

# SafeModer 安全模式生成者

## 概述

SafeModer 是**安全模式生成者**，从 storage 中提取 GHODIUM 并在 controller 处生成 safe mode。用于在敌人进攻时保护 controller。

## 启动方式

通过 `Commands.ts` 的 `global.spawnSafeModer(roomName, targetRoomName)` 创建，或由 `rooms.supportOtherRooms.ts` 自动触发。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'SafeModer'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `suicide` | 自毁标志 |
| `storage` | storage ID |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 提取 GHODIUM

```
条件: !full && storage 有 GHOUDIUM
```

- `findStorage()` → `withdraw(storage, RESOURCE_GHODIUM)`
- `MoveCostMatrixRoadPrio(storage, 1)` 移动

### 3. 生成 Safe Mode

```
条件: full && controller.safeModeAvailable == 0
```

- `generateSafeMode(controller)` 生成 safe mode
- `suicide = true` → `recycle()`

## 与 rooms.supportOtherRooms.ts 的联动

```
条件: controller.level <= 7 && safeModeAvailable == 0 && storage.GHODIUM >= 1000
```

- `global.spawnSafeModer()` 自动生成

## 关键设计点

- **GHODIUM 专用**：只处理 GHOUDIUM，不碰能量
- **自动触发**：`rooms.supportOtherRooms.ts` 检测到条件时自动 spawn
- **一次性任务**：生成 safe mode 后即回收
