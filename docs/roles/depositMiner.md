---
name: DepositMiner 采集者
---

# DepositMiner 采集者

## 概述

DepositMiner 是**专职 deposit 采集者**，负责从 deposit 采集矿物（mist/biomass/metal/silicon）并传递给 depositCarry。与 billtong 不同，它只专注采集，不负责跨房运输。

## 启动方式

通过 `global.SDMine(homeRoom, targetRoom, depositId, depositType)` 在 `rooms.observe.ts` 的资源侦察流水线中自动触发。

### Body 配比

通过 `getBodyByRatio()` 根据房间 RCL 动态计算：

| RCL | 配比 | 示例（RCL8） |
|-----|------|-------------|
| 8 | WORK:22, CARRY:6, MOVE:22 | 50 parts |
| 其他 | WORK:2, CARRY:1, MOVE:2 | 动态扩展 |

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'depositMiner'` |
| `homeRoom` | 所属房间 |
| `targetRoom` | deposit 所在房间 |
| `deposit` | deposit ID |
| `depositType` | deposit 类型（RESOURCE_MIST / BIOMASS / METAL / SILICON） |
| `transferTarget` | 最近 transfer 的 depositCarry ID（缓存优化） |
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

- `moveToRoomAvoidEnemyRooms(targetRoom)` — 跨房移动，自动避开敌方房间

### 3. 采集 Deposit（第 3 阶段）

```
条件: 在目标房间内，deposit 存在
```

1. 通过 `Game.getObjectById(memory.deposit)` 定位 deposit
2. 如果 deposit 不存在 → `suicide`
3. 如果 `deposit.cooldown > 0` → 移动到 deposit 旁等待
4. 如果距离 ≤ 1 → `harvest(deposit)`
5. 如果距离 > 1 → `moveTo(deposit)`

### 4. 满载 Transfer（第 4 阶段）

```
条件: store.getFreeCapacity() === 0
```

1. **优先 transfer 给缓存的 carrier**（`memory.transferTarget`）
2. 如果缓存无效 → `findClosestByRange` 查找附近 `depositCarry`
3. 找到 carrier → `transfer(carrier, depositType)`，更新缓存
4. 没找到 carrier → 继续采（存自己身上，等 carrier 来）
5. 实在找不到 → pickup 地面掉落 / transfer 给 container

> **关键设计**：即使没有 carrier，miner 也会继续采集并自己持有能量。carrier 到达后一次性 transfer，确保 carrier 快速装满返回。

### 5. 生命周期结束（第 5 阶段）

```
条件: ticksToLive <= 30
```

- `suicide = true` → `recycle()` 回收部件

## 联动关系

| 联动角色 | 说明 |
|----------|------|
| [depositCarry](depositCarry.md) | 接收 miner 的能量，负责跨房运输 |
| [rooms.observe](../rooms/rooms.observe.md) | 侦察 deposit 并触发 spawn |

## 关键设计点

- **持续采集优先**：没有 carrier 时不暂停，采了先存自己身上
- **Transfer 缓存**：缓存上次 transfer 的 carrier ID，避免每次全图扫描
- **RCL 自适应 body**：RCL8 最大化 WORK 产出，低 RCL 按比例缩减
- **Deposit type 传递**：spawn 时携带 `depositType`，确保 transfer 正确类型
