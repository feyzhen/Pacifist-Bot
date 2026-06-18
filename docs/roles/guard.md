---
name: Guard 守卫
---

# Guard 守卫

## 概述

Guard 是**战斗守卫**，在目标房间执行 boosted 操作，攻击敌方 creep 和结构。是进攻作战的前线单位。

## 启动方式

通过 `Commands.ts` 的 `global.SMDP(homeRoom, targetRoomName)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Guard'` |
| `targetRoom` | 目标房间 |
| `homeRoom` | 家房间 |
| `boostlabs` | 强化 lab 列表 |
| `full` | 是否满载 |
| `again` | 是否重试 |
| `ttgh` | 到达时间 |
| `path` / `MoveTargetId` | 路径缓存 |

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

- `attack(enemy)` 近战攻击
- `MoveCostMatrixRoadPrio(target, 1)` 向目标移动

### 3. 撤离

```
条件: evacuate() 返回 true
```

- 紧急撤离到安全位置

### 4. 重生

- 死亡后通过 `global.SMDP()` 重生整个 guard party

## 与 RampartDefender 的联动

Guard 进入危险房间后，部分 creep 会转为 RampartDefender 角色，专门负责 rampart 防御。

## 关键设计点

- **Boosted 优先**：先强化再战斗
- **多角色转换**：可转为 RampartDefender/RangedRampartDefender
- **path 缓存**：`memory.path` 和 `memory.MoveTargetId` 加速重复路径
