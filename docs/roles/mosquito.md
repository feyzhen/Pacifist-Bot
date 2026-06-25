---
name: Mosquito 蚊子
---

# Mosquito 蚊子

## 概述

Mosquito 是**高功率进攻治疗者**，强化后移动到目标房间攻击敌人。逻辑极简：boost → heal → travel → attack。

## 启动方式

通过 `Commands.ts` 的 `global.spawn_mosquito(homeRoom, roomName)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'mosquito'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `healing` | 是否在治疗 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 治疗

```
条件: hits < hitsMax
```

- `heal(creep)` 自我治疗

### 3. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 4. 战斗

```
条件: FIND_HOSTILE_CREEPS 在范围 3 内
```

- `rangedAttack(enemy)` 远程攻击
- `rangedMassAttack()` 范围攻击
- `MoveCostMatrixRoadPrio(target, 1)` 移动

## 关键设计点

- **极简逻辑**：只有 boost → heal → travel → attack 四个步骤
- **高功率**：body 以 TOUGH + RANGED_ATTACK 为主
- **range 3 检测**：只在敌人距离 ≤ 3 时才攻击
