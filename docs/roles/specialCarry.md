---
name: SpecialCarry 特殊搬运工
---

# SpecialCarry 特殊搬运工

## 概述

SpecialCarry 是**特殊搬运工**，专门为 SpecialRepair creep 运送能量。找到 SpecialRepair 后 transfer 能量，如果 SpecialRepair 能量 < 72 就送货上门。

## 启动方式

通过 `rooms.spawning.ts` 在需要特殊维修的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'SpecialCarry'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `storage` | storage ID |
| `creep_target` | 目标 creep ID |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 找 SpecialRepair

```
条件: creep_target 不存在
```

- `findClosestByRange(FIND_MY_CREEPS)` 找 `role == "SpecialRepair"`
- 选 `ticksToLive` 最长的（最耐用的）
- 设置 `creep_target = specialRepair.id`

### 2. 送能量

```
条件: full && creep_target 存在
```

- 如果 `specialRepair.store[RESOURCE_ENERGY] < 72`：
  - `transfer(specialRepair, ENERGY)` 送能量
- 否则：
  - `drop(RESOURCE_ENERGY)` 放下能量

### 3. 装货

```
条件: !full
```

- `findStorage()` → `withdraw(storage, ENERGY)`
- `MoveCostMatrixRoadPrio(storage, 1)` 移动

### 4. 回收

```
条件: ticksToLive 耗尽
```

- `recycle()`

## 与 SpecialRepair 的联动

- SpecialCarry 是 SpecialRepair 的专属能量供应
- 只在 SpecialRepair 能量 < 72 时才送货（避免浪费）
- 选 `ticksToLive` 最长的 SpecialRepair，保证效率

## 关键设计点

- **一对一配对**：每个 SpecialCarry 只服务一个 SpecialRepair
- **能量阈值**：72 能量的阈值确保 SpecialRepair 有足够的能量维修
- **evacuate 优先**：紧急情况先撤离
