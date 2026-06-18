---
name: RangedRampartDefender 远程城墙防守者
---

# RangedRampartDefender 远程城墙防守者

## 概述

RangedRampartDefender 是**远程城墙防守者**，在危险房间中以远程方式防守 rampart。与 RampartDefender（近战维修）配合，形成远近搭配的防守体系。

## 启动方式

通常由 Guard 在危险房间中转换而来。

## 内存字段

与 RampartDefender 类似：

| 字段 | 说明 |
|------|------|
| `role` | `'RangedRampartDefender'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `rampart_to_repair` | 待修 rampart |
| `locked` / `locked_repair` | 锁定目标 |
| `storage` | storage ID |
| `suicide` | 自毁标志 |
| `myRampartToMan` | 负责的 rampart |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 远程攻击

```
条件: FIND_HOSTILE_CREEPS 存在
```

- `rangedAttack(enemy)` 远程攻击
- `rangedMassAttack()` 范围攻击

### 3. Rampart 管理

```
条件: room.memory.rampartToMan 存在
```

- `moveToSafePositionToRepairRampart(rampart, 1)` 安全维修
- `roomTowersAttackEnemy(enemy)` 呼叫 tower 集火

### 4. 治疗

```
条件: hits < hitsMax
```

- `heal(creep)` 自我治疗

### 5. 回收

```
条件: danger == false && ticksToLive < 50
```

- `recycle()`

## 与 RampartDefender 的联动

- RampartDefender（近战）：靠近 rampart 维修，打近战
- RangedRampartDefender（远程）：在 rampart 附近远程攻击，修 rampart 时用安全位置
- 两者共同防守 `room.memory.rampartToMan` 指定的 rampart

## 关键设计点

- **安全维修**：使用 `moveToSafePositionToRepairRampart` 而非直接靠近
- **tower 协同**：调用 `roomTowersAttackEnemy` 让 tower 帮忙打
- **danger 感知**：危险解除后自动回收
