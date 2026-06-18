---
name: Signifer 传令兵
---

# Signifer 传令兵

## 概述

Signifer 是**传令兵/医疗兵**，专门跟随和治愈 ram creep。找到 ram 后跟随其到目标房间，在战斗中提供治疗。

## 启动方式

通过 `Commands.ts` 的 `global.SD()` / `global.SDB()` 创建，与 ram 配对。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'signifer'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `boostlabs` | 强化 lab 列表 |
| `myhealer` | 治疗的 ram creep |
| `powerCreep` | 关联的 power creep |
| `defendController` | 是否防守 controller |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 找 ram

```
条件: myhealer 不存在
```

- `findClosestByRange(FIND_MY_CREEPS)` 找 `role == "ram"` 的 creep
- 设置 `myhealer = ram.id`

### 3. 跟随与治疗

```
条件: myhealer 存在
```

- 如果 myhealer 受伤 → `heal(myhealer)`
- 如果不在范围 → `moveTo(myhealer)` + `rangedHeal(myhealer)`
- 如果 myhealer 死亡 → 重新找 ram

### 4. 战斗

```
条件: FIND_HOSTILE_CREEPS 存在
```

- `attack(enemy)` 近战攻击
- `rangedAttack(enemy)` 远程攻击
- `roomTowersAttackEnemy(enemy)` 呼叫 tower

### 5. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 跟随 ram 跨房

## 与 ram 的联动

- Signifer 是 ram 的专属医疗兵
- ram 负责近战输出，signifer 负责治疗和辅助
- 两者通过 `myhealer` 字段绑定

## 关键设计点

- **一对一配对**：每个 signifer 只服务于一个 ram
- **动态重绑**：ram 死亡后自动找下一个 ram
- **powerCreep 支持**：`powerCreep` 字段支持 power creep 协同
