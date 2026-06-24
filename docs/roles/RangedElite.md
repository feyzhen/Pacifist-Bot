---
name: RangedElite 远程精英
---

# RangedElite 远程精英

## 概述

RangedElite 是**deposit 房间驻防爬**，部署到目标房间后持续驻扎，自动攻击 hostile creeps，为 deposit 采集提供远程火力支援。

## 启动方式

通过 `global.SRE(homeRoom, targetRoom, boosted)` 在 `rooms.observe.ts` 的 hostile 状态机中自动触发。

### Body 配比

通过 `getBodyByRatio()` 动态计算：

| 配比 | 说明 |
|------|------|
| TOUGH:RANGED_ATTACK:HEAL:MOVE = 1:3:1:5 | 远程输出为主，兼顾治疗和机动 |

### Wave 类型

| Wave | boosted | 用途 |
|------|---------|------|
| drain（驱逐波） | false | 低成本，试探 hostile 是否为常驻型 |
| eliminate（消灭波） | true | 高成本，带 lab boost，确保能消灭常驻 hostile |

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RangedElite'` |
| `homeRoom` | 所属房间 |
| `targetRoom` | 驻防目标房间 |
| `wave` | `'drain'` 或 `'eliminate'` |
| `boostlabs` | boost 实验室 ID 列表（仅 eliminate 波） |
| `suicide` | 自毁标志（boosted creep 生命到期时触发） |

## 运行逻辑

### 1. Boost 补给（第 0 阶段）

```
条件: creep.room.name === homeRoom && boostlabs 存在
```

- 在离开 home room 前，调用 `creep.Boost()` 补充 boost 效果
- 补充完成后自动进入前往目标房间的移动阶段

### 2. 前往目标房间（第 1 阶段）

```
条件: creep.room.name !== targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` — 跨房移动

### 3. 驻扎战斗（第 2 阶段）

```
条件: 在目标房间内
```

1. 无 hostile → 巡逻到房间边缘保持视野
2. 有 hostile → 找到最近的 hostile 进行 `rangedAttack`
3. 自身血量 < 50% → 优先 `heal` 自己
4. 队友血量 < 60% → 优先 `heal` 队友
5. 近战范围内 → `attack` + `rangedAttack` 双打

### 4. 生命周期结束（第 5 阶段）

```
条件: wave === 'eliminate' && ticksToLive <= 300
```

- 将身上能量转移给附近队友
- `suicide = true` → `recycle()` 回收部件

## 联动关系

| 联动角色 | 说明 |
|----------|------|
| [rooms.observe](../rooms/rooms.observe.md) | 侦察 hostile 并触发 spawn |
| [depositMiner](depositMiner.md) | 被 RangedElite 保护的采集者 |
| [depositCarry](depositCarry.md) | 被 RangedElite 保护的搬运者 |

## 关键设计点

- **永久驻扎**：不主动撤退，持续战斗直到生命周期结束（仅 boosted creep）
- **分级响应**：先 spawn 低成本 drain 波试探，确认后升级为高能 eliminate 波
- **自动治疗**：优先治疗自己和受伤队友，保持持续作战能力
- **巡逻机制**：无 hostile 时巡逻房间边缘，避免长时间聚集在中心
- **Boost 时机**：仅在 home room 时执行 boost，跨房后无法补充 boost
