---
name: DepositCarry 搬运者
---

# DepositCarry 搬运者

## 概述

DepositCarry 是**专职 deposit 搬运者**，负责从 deposit 房间的 depositMiner 处收取矿物，运回 home room 存入 storage/terminal。与 billtong 不同，它只专注运输，不参与采集。

## 启动方式

通过 `global.SDCarry(homeRoom, targetRoom)` 在 `rooms.observe.ts` 的资源侦察流水线中自动触发（与 SDMine 配对调用）。

### Body 配比

通过 `getBodyByRatio()` 动态计算：

| 配比 | 说明 |
|------|------|
| CARRY:1, MOVE:1 | 1:1 比例，根据房间能量自动扩展 |

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'depositCarry'` |
| `homeRoom` | 所属房间 |
| `targetRoom` | deposit 所在房间 |
| `depositType` | deposit 类型（RESOURCE_MIST / BIOMASS / METAL / SILICON） |
| `full` | 是否满载 |
| `storage` | storage ID |
| `waitStart` | 等待开始时间（找不到 miner 时计时） |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 安全检查（第 1 阶段）

```
条件: 每次 tick 开头
```

- `evacuate()` — 核弹/危险时紧急撤离
- `fleeHomeIfInDanger()` — 检测到敌对爬时逃生

### 2. 前往目标房间（第 2 阶段）

```
条件: creep.room.name !== targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` — 跨房移动

### 3. 收取矿物（第 3 阶段）

```
条件: 在目标房间内，未满载
```

1. `FIND_MY_CREEPS` 筛选 `role == "depositMiner"` 且 `store[depositType] > 0`
2. 找到 miner → `moveTo(target)` → `withdraw(miner, depositType)`
3. 没找到 miner → 查找地面掉落 `FIND_DROPPED_RESOURCES` → `pickup`
4. 既没 miner 也没掉落 → 等待 100 ticks → 超时则 `suicide`

### 4. 返回 home 交付（第 4 阶段）

```
条件: full
```

1. `moveToRoomAvoidEnemyRooms(homeRoom)` — 跨房返回
2. 到家后优先交付给 **storage**（`transfer(storage, depositType)`）
3. storage 满了或不存在 → 交付给 **terminal**
4. 两者都没有空位 → 等待

### 5. 生命周期结束（第 5 阶段）

```
条件: suicide === true
```

- `recycle()` 回收部件

## 联动关系

| 联动角色 | 说明 |
|----------|------|
| [depositMiner](depositMiner.md) | 在 deposit 房间提供矿物 |
| [rooms.observe](../rooms/rooms.observe.md) | 侦察 deposit 并触发 spawn |

## 关键设计点

- **交付优先级**：storage → terminal，与 carry/energyManager 的交付逻辑一致
- **等待超时保护**：找不到 miner 时等待 100 ticks 后 suicide，避免无意义消耗
- **Deposit type 传递**：spawn 时携带 `depositType`，确保 withdraw/transfer 正确类型
- **与 depositMiner 互补**：miner 持续产出，carrier 批量运输，分工明确
