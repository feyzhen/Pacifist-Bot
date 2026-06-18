---
name: CreepKiller 蠕虫杀手
---

# CreepKiller 蠕虫杀手

## 概述

CreepKiller 是**蠕虫杀手**，在 hostile room 中击杀敌方 creep。到达后优先 spawn CCK，然后攻击 exposed hostile structures 和 construction sites。

## 启动方式

通过 `Commands.ts` 的 `global.SCK(homeRoom, targetRoomName)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'CreepKiller'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `suicide` | 自毁标志 |
| `ticksToGetHere` | 到达时间 |
| `exposed_hostile_structs` | 暴露的敌方建筑 |
| `sites` | 目标 sites |
| `sticky` | 粘着目标 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 到达后 spawn CCK

```
条件: ticksToGetHere == 1
```

- `global.SCK()`  spawn backup CCKs

### 3. 攻击

```
条件: FIND_HOSTILE_CREEPS 或 FIND_HOSTILE_STRUCTURES 存在
```

- `attack(enemy)` 攻击敌人
- `MoveCostMatrixRoadPrio(target, 1)` 移动

### 4. 回收

```
条件: ticksToLive 耗尽
```

- `recycle()`

## 与 ContinuousControllerKiller 的联动

- CreepKiller 到达后 spawn CCK
- CCK 负责持续攻击 controller
- 两者配合完成 room takeover

## 关键设计点

- **spawn 后继**：到达后立即 spawn CCK 作为后继力量
- **exposed_hostile_structs**：优先攻击暴露的敌方建筑
- **sticky 目标**：锁定当前目标不被打断
