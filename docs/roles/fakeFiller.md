---
name: FakeFiller 假填充者
---

# FakeFiller 假填充者

## 概述

FakeFiller 是**简化版 filler**，只负责从 storage 找能量送到最近的 spawn/extension。比 Filler 简单很多，没有 reserveFill 管理。

## 启动方式

通常由 Carry 角色在特定条件下转换而来（`creep.memory.role = "FakeFiller"`）。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'FakeFiller'`（运行时可能改为 "carry"） |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `storage` | storage ID |
| `locked` | 锁定目标 |

## 运行逻辑

### 1. 跨房

```
条件: targetRoom != room
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 装货

```
条件: !full
```

- `findStorage()` → `withdraw(storage, ENERGY)`

### 3. 卸货

```
条件: full
```

- `transfer(target, ENERGY)` 送到最近的需要能量的结构
- 如果 storage 不存在 → `role = "carry"` 转换为 carry

## 关键设计点

- **简化版**：没有 Filler 的 reserveFill 管理
- **角色转换**：无法找到 storage 时转为 carry
- **直接配送**：不经过 bin/container，直接从 storage 送
