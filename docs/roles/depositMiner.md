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
| `suicide` | 自毁标志 |
| `potential` | 单次 harvest 产出（WORK 数量或 WORK*3，取决于是否 boosted） |

## 运行逻辑

### 1. 安全检查

```
条件: 每次 tick 开头
```

- `evacuate()` — 核弹/危险时紧急撤离
- `fleeHomeIfInDanger()` — 检测到敌对爬时逃生

### 2. Suicide 回收

```
条件: creep.memory.suicide == true
```

- `recycle()` 回收部件
- 必须 `return`，否则继续执行阶段 1 会被拉回 targetRoom，与 homeRoom 方向冲突，导致 creep 在边界"横跳"

### 3. 新 spawn 补人检查

```
条件: ticksToLive == body.length * 3 + 5
```

- 定位 deposit，如果 `lastCooldown <= 100` 且在 targetRoom → 调用 `global.SDM(homeRoom, targetRoom)` 通知源房间生成补充 miner
- 之后 `return`，不进入后续流程

### 4. 前往目标房间

```
条件: creep.room.name !== targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` — 跨房移动，自动避开敌方房间

### 5. 采集 Deposit

```
条件: 在目标房间内，deposit 存在
```

1. 通过 `Game.getObjectById(memory.deposit)` 或 `findDeposit()` 定位 deposit
2. 如果 deposit 不存在 → `suicide = true`
3. 初始化 `potential`（首次：boosted 时为 WORK*3，否则为 WORK）

#### 5a. 距离 ≤ 1（在 deposit 旁边）

- **cooldown == 0（可采集）：**
  - 如果 `store.getFreeCapacity() < potential * 3` → `harvest(deposit)`
  - 否则（已接近满载）：每 30 tick 检查一次，如果没有 depositCarry → `global.SDCarry()` 补一个 carry

- **cooldown > 0（冷却中）：**
  - 如果 `store.getUsedCapacity() > 0`：
    - 附近有 depositCarry → `transfer(target, depositType)`，本 tick 结束
    - 无 depositCarry：每 30 tick 检查
      - 如果 `ticksToLive <= 距离 * 50`（快撑不到家） → `suicide = true`
      - 否则 → `global.SDCarry()` 补 carry
  - 如果 `store.getUsedCapacity() == 0`：
    - 地上有 deposit 资源 → `pickup()`
  - 否则 → 等待冷却结束

#### 5b. 距离 > 1

- `moveTo(deposit)`

## 联动关系

| 联动角色 | 说明 |
|----------|------|
| [depositCarry](depositCarry.md) | 接收 miner 的能量，负责跨房运输 |
| [rooms.observe](../rooms/rooms.observe.md) | 侦察 deposit 并触发 spawn，提供 `countAliveMinersCarries()` |

## 关键设计点

- **cooldown 期间利用空闲时间**：沉积物冷却时 miner 不会 idle，而是转移能量或 pickup 掉落
- **按需补 carry**：满载或无 carry 时通过 `SDCarry()` 自动补充，避免 carry 短缺阻塞
- **死亡预判**：当距离 home 太远且无 carry 来接应时，标记 suicide 就地回收，避免白死在路上
- **新 spawn 补人**：出生时若沉积物即将恢复，通知源房间提前准备替代者
- **Potential 自适应**：boosted miner 单次 harvest 产出更高，按 WORK*3 计算
