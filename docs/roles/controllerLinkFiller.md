---
name: ControllerLinkFiller 链接填充者
---

# ControllerLinkFiller 链接填充者

## 概述

ControllerLinkFiller 是**controller link 填充者**，专门负责给 controller link 和 container 补充能量。与 Filler 逻辑几乎相同，但目标更聚焦。

## 启动方式

通过 `rooms.spawning.ts` 在需要维护 controllerLink 的房间创建。

## 内存字段

与 Filler 相同：

| 字段 | 说明 |
|------|------|
| `role` | `'ControllerLinkFiller'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `suicide` | 自毁标志 |
| `storage` | storage ID |
| `MaxStorage` | 最大载量 |
| `t` | 目标 ID |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

与 Filler 完全相同：
1. `withdrawStorage(storage)` 从 storage 装货
2. `findFillerTarget()` 找需要能量的目标
3. `transfer(target, ENERGY)` 送能量
4. `room.memory.reserveFill` 跟踪已完成目标

## 与 Filler 的区别

| | Filler | ControllerLinkFiller |
|---|---|---|
| **目标** | 所有结构 | 主要是 controller link |
| **reserveFill** | 管理 | 管理（相同） |
| **spawn 命令** | spawning.ts | spawning.ts |

## 关键设计点

- **几乎相同**：逻辑与 Filler 高度重合
- **write to reserveFill**：同样写入 `room.memory.reserveFill`
- **role 标记**：`role = "filler"` 在 creepFunctions2.ts 中有特殊判断
