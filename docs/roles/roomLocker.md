---
name: RoomLocker 房间锁
---

# RoomLocker 房间锁

## 概述

RoomLocker 是**房间封锁者**，负责占领房间后建立防线：在出口处建墙、升级 controller、收集能量填充 storage。

## 启动方式

通过 `Commands.ts` 的 `global.lock_room()` 创建，参数 `{role: 'RoomLocker', targetRoom, homeRoom, line:3}`。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RoomLocker'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `full` | 是否满载 |
| `walled` | 是否已建墙 |
| `storage` | storage ID |

## 运行逻辑

### 1. 采集能量（第 1-2 行）

```
条件: !full
```

- `harvest(source)` 采集 energy source
- `acquireEnergyWithContainersAndOrDroppedEnergy()` 收集地面能量
- `withdraw(container/storage, ENERGY)` 从建筑取能

### 2. 升级控制器

```
条件: full && controller 存在
```

- `upgradeController(controller)` 升级

### 3. 建墙封锁

```
条件: !walled
```

- 在房间出口处按固定偏移模式放置 walls
- 使用 `build()` 建造
- 建完后 `walled = true`

### 4. 填充 storage

```
条件: full && storage 存在
```

- `transfer(storage, ENERGY)` 存入能量

### 5. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往目标房间

## 与 Escort 的联动

`global.lock_room()` 同时 spawn 三种 creep：
1. **Escort**：保护队形
2. **RoomLocker**：建墙封锁
3. **claimer**：占领 controller

三者通过 `line` 字段协调队形。

## 关键设计点

- **出口封锁**：wall 放在房间出口位置，防止敌人进入
- **多任务并行**：采集+升级+建墙+存能量，一个 creep 干多份活
- **Memory.target_colonise.spawn_pos**：从殖民目标配置中获取 spawn 位置
