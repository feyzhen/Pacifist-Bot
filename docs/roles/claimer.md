---
name: Claimer 占领者
---

# Claimer 占领者

## 概述

Claimer 是**房间占领者**，负责前往目标房间并占领 Controller。占领成功后自动启用自动建造系统，并 spawn 一个 DismantleControllerWalls 清理围墙。

## 启动方式

通过 `Commands.ts` 的 `global.lock_room()` 创建，或由 `scout.ts` 侦察后自动 spawn。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'claimer'` |
| `targetRoom` | 目标占领房间 |
| `homeRoom` | 出生房间 |
| `boostlabs` | 强化 lab 列表 |
| `line` | 队伍行号（与 Escort/RoomLocker 配合） |

## 运行逻辑

### 1. 强化（第 10-14 行）

```
条件: boostlabs 存在且非空
```

- 调用 `creep.Boost()` 到 lab 进行强化
- 强化完成前不执行后续逻辑

### 2. 治疗（第 16 行）

- 调用 `creep.heal(creep)` 自我治疗

### 3. 跨房移动（第 18-24 行）

```
条件: room != targetRoom && !line
```

- 非队伍模式：`moveToRoomAvoidEnemyRooms(targetRoom)` 直接前往
- 队伍模式（line 存在）：等待 Escort 指令

### 4. 占领控制器（第 32-90 行）

**RCL 0 且无 reservation：**
- 靠近 controller → `claimController(controller)`
- 成功后：
  1. 初始化 `Memory.layoutConfig`（含 `enabledRooms`）
  2. 将当前房间加入 `enabledRooms`
  3. 设置 `room.memory.layoutEnabled = true`
  4. `suicide()` 自杀（完成任务）
- 失败（claim 中）：继续 claim

**RCL > 0 且非我方：**
- `attackController(controller)` 攻击控制器

**有 reservation：**
- `attackController(controller)` 维持控制权

### 5. 占领后 spawn DismantleControllerWalls（第 26-30 行）

```
条件: ticksToLive == 1 && room == targetRoom
```

- 调用 `getBody([MOVE, WORK], room, 50)` 获取 body
- 将 DismantleControllerWalls 加入 spawn_list

## 与 Rooms 系统的联动

- **Memory.layoutConfig**：占领后将房间加入自动建造列表
- **rooms.construction.ts**：layoutEnabled 房间会触发自动布局
- **rooms.spawning.ts**：占领成功后自动 spawn 清理兵

## 关键设计点

- **寿命触发**：在 `ticksToLive == 1` 时才 spawn DismantleControllerWalls，确保生命最后一刻仍在清理
- **自动建造**：claim 成功即触发 layout 系统，实现占领→自动布局→自动建造全自动流程
- **救援保护**：ticksToLive == 1 时不 claim，防止过早死亡
