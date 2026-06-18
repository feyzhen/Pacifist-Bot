---
name: Billtong 采集者
---

# Billtong 采集者

## 概述

Billtong 是**跨房资源采集者**，负责从 deposit 采集矿物并运回 home room 的 terminal/storage。管理 `Memory.billtong_rooms` 数组追踪已知 deposit 房间。

## 启动方式

通过 `rooms.spawning.ts` 在有 deposit 的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'billtong'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` / `fill` | 满载状态 |
| `MaxStorage` | 最大载量 |
| `deposit` | deposit ID |
| `searchedRooms` | 已搜索房间 |
| `timeToGetHome` | 回家时间 |
| `fleeing` / `danger` | 逃生状态 |
| `storage` | storage ID |

## 运行逻辑

### 1. 找 Deposit

```
条件: deposit 不存在
```

- 在 4 个房间范围内搜索 mineral deposit
- 记录到 `Memory.billtong_rooms[]`
- 设置 `searchedRooms` 避免重复搜索

### 2. 采集

```
条件: deposit 存在
```

- `harvest(deposit)` 采集矿物
- 如果 `full` → 回家送资源

### 3. 跨房运输

```
条件: full
```

- `moveToRoomAvoidEnemyRooms(homeRoom)` 回家
- `transfer(terminal/storage, mineral)` 卸下矿物

### 4. 逃生

```
条件: fleeing == true
```

- 检测 melee ≤ 6 格或 ranged ≤ 8 格时停止
- `room.memory.roomData.has_hostile_creeps` 检查

## 关键设计点

- **4-room 搜索半径**：只在 4 个房间范围内找 deposit
- **Memory.billtong_rooms**：全局数组追踪已知 deposit 位置
- **往返运输**：采集 → 回家 → 再采集，循环往复
- **danger 感知**：利用 `room.memory.roomData.has_hostile_creeps` 判断危险
