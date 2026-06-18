---
name: Escort 护航者
---

# Escort 护航者

## 概述

Escort 是**护航队长**，负责管理 claimer + roomLocker 的护航编队。协调 3 人小队（escort + claimer + roomLocker）以线形队形行动，提供保护和治疗。

## 启动方式

通过 `Commands.ts` 的 `global.lock_room()` 创建，参数 `{role: 'Escort', targetRoom, homeRoom, line:1, boostlabs: [...]}`。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Escort'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `boostlabs` | 强化 lab 列表 |
| `party` | 队员 ID 数组 |
| `line` | 队形行号 |
| `full` | 是否满载 |
| `coma` | 昏迷状态 |
| `again` | 是否重试 |
| `ttgh` | 到达时间 |

## 运行逻辑

### 1. 强化（第 1-2 行）

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 组队（第 3-4 行）

```
条件: party 为空
```

- 找同 `targetRoom` 且 `line` 不为空的 claimer 和 roomLocker
- 过滤条件：`role in ["RoomLocker", "claimer", "Escort"] && !boostlabs`
- 组成 party 数组

### 3. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)`
- 保持队形：队员跟在 escort 后面

### 4. 战斗中（第 5-6 行）

```
条件: room == targetRoom && 有敌人
```

- `rangedMassAttack()` 范围攻击
- `rangedAttack(enemy)` 单体攻击
- `heal(party)` 治疗队友
- `rangedHeal(party)` 远程治疗

### 5. 占领辅助

- 如果 claimer 受伤 → `heal(claimer)`
- 如果 claimer 死亡 → 等待新 claimer spawn
- 到达 controller 附近 → 等待 claimer 执行 claim

## 关键设计点

- **线形队形**：`line` 字段控制 3 人排成一条线
- **Party 管理**：`party` 数组跟踪队员，动态组队
- **多角色协同**：escort(保护) + claimer(占领) + roomLocker(建墙)
- **global.SMDP()**：死亡后通过此命令重生整个护航队
