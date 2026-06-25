---
name: Solomon 所罗门
---

# Solomon 所罗门

## 概述

Solomon 是**进攻型治疗者**，在 hostile room 中治疗友军 creep 并攻击敌人。结合了 healer 和 attacker 的能力。

## 启动方式

通过 `Commands.ts` 的 `global.SS(homeRoom, targetRoomName, backupTR)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Solomon'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `boostlabs` | 强化 lab 列表 |
| `backupTR` | 备用目标房间 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 治疗友军

```
条件: FIND_MY_CREEPS 中有受伤 creep
```

- `heal(damaged)` 治疗
- `rangedHeal(damaged)` 远程治疗

### 3. 攻击敌人

```
条件: FIND_HOSTILE_CREEPS 存在
```

- `attack(enemy)` 近战攻击
- `rangedAttack(enemy)` 远程攻击

### 4. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

## 与 signifer 的联动

- Solomon 找 `role == "signifer"` 的 creep 协同
- signifer 治疗 Solomon，Solomon 治疗其他 creep

## 与 tower 的联动

- `roomTowersAttackEnemy(enemy)` 呼叫 tower 集火
- `calc_incoming_damage()` 计算 incoming damage 做战术决策

## 关键设计点

- **双重角色**：既是 healer 又是 attacker
- **custom path**：使用 `MoveCostMatrixIgnoreRoads` 避开 hostile structures
- **backupTR**：`backupTR` 字段提供备用目标房间
