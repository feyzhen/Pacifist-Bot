---
name: RangedAttacker 远程攻击者
---

# RangedAttacker 远程攻击者

## 概述

RangedAttacker 是**远程攻击者**，与敌方 creep 保持距离进行 ranged attack，同时 flee 近战敌人。与 defender 类似但更主动出击。

## 启动方式

通过 `rooms.spawning.ts` 在进攻作战中创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RangedAttacker'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `healtarget` | 治疗目标 |
| `path` / `MoveTargetId` | 路径缓存 |
| `sticky` | 粘着目标 |
| `suicide` | 自毁标志 |
| `ignore` | 忽略目标列表 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 战斗

```
条件: FIND_HOSTILE_CREEPS 存在
```

- 找远程敌人 → `rangedAttack(enemy)`
- 找近战敌人 → `RangedAttackFleeFromMelee(enemy)` 边打边退
- `rangedMassAttack()` 范围攻击
- `heal(healtarget)` 治疗队友

### 3. 逃生

```
条件: meleeHostile 距离 ≤ 3 格
```

- `RangedAttackFleeFromMelee()` 边打边退

### 4. 回收

```
条件: ticksToLive <= 50
```

- `recycle()`

## 与 RangedRampartDefender 的区别

| | RangedAttacker | RangedRampartDefender |
|---|---|---|
| **角色** | 主动进攻 | 被动防守 |
| **target** | 敌方 creep | rampartToMan |
| **逃跑** | flee melee | 不逃 |
| **tower 协同** | 无 | roomTowersAttackEnemy |

## 关键设计点

- **RangedAttackFleeFromMelee**：独特的边打边退机制
- **sticky 目标**：`sticky` 字段锁定当前目标，不被新目标打断
- **ignore 列表**：`ignore` 字段跳过特定目标
