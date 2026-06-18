---
name: RemoteBuilder 远程建造者
---

# RemoteBuilder 远程建造者

## 概述

RemoteBuilder 是**远程建造者**，从 home room 带能量到 remote room 建造结构。是殖民扩张的核心角色之一。

## 启动方式

通过 `rooms.spawning.ts` 在需要殖民建造的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'remoteBuilder'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `building` | 是否在建造 |
| `full` | 是否满载 |
| `locked_build` | 锁定建造目标 |
| `source` | source ID |
| `storage` | storage ID |
| `ticksToGetHere` | 到达时间 |
| `myTargetRoomServiced` | 目标房间是否已服务 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往目标房间

### 2. 建造

```
条件: building && full
```

- 优先级：spawn → storage → extension → container → road → rampart
- `build(constructionSite)` 建造
- `MoveCostMatrixRoadPrio(site, 1)` 移动

### 3. 维修

```
条件: 有损坏建筑
```

- `repair(damaged)` 维修
- `MoveCostMatrixIgnoreRoads(target, 1)` 移动

### 4. 能量补给

```
条件: !full
```

- `acquireEnergyWithContainersAndOrDroppedEnergy()` 收集地面能量
- `transfer(target, ENERGY)` 存到目标结构

### 5. 自动 spawn RampartErector

```
条件: 殖民中 && 需要 rampart
```

- 在 spawn_list 中添加 RampartErector

### 6. 能量源管理

```
条件: source 存在
```

- 避免与其他 remoteBuilder 争用同一 source
- `pickUp(dropped)` 捡起掉落物

## 与 Memory 系统的联动

- `Memory.target_colonise`：殖民目标房间和 spawn_pos
- `Memory.roomPlanner`：自动布局的 spawn/road/rampart 位置
- `room.memory.danger`：危险状态

## 关键设计点

- **单向不返**：带能量过去后留在 remote room 建造，不回来
- **auto-layout**：从 roomPlanner 读取预设布局
- **source 防冲突**：检查其他 remoteBuilder 是否在用同一 source
- **RCL1 应急**：RCL1 时自动升级 controller
