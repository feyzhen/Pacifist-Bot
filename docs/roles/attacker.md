---
name: Attacker 攻击者
---

# Attacker 攻击者

## 概述

Attacker 是**全能攻击者**，负责在目标房间消灭敌方 creep、摧毁敌方建筑和围墙。是进攻作战的主力单位。

## 启动方式

通过 `Commands.ts` 的 `global.SD()` / `global.SDB()` 等命令创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'attacker'` |
| `targetRoom` | 目标房间 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 跨房移动（第 9-25 行）

```
条件: targetRoom 存在且不等于当前房
```

- 如果当前房有敌人：先攻击 → 移动 → return
- 否则：`moveToRoom(targetRoom)` 前往目标房间

### 2. 攻击阶段（第 26-118 行）

**优先级 1：低血围墙（< 10000 hits）**
- `attack(closestLowHitWall)`

**优先级 2：敌方 Creep**
- `attack(closestEnemyCreep)`

**优先级 3：敌方建筑**
- 如果是己方房间：排除 controller，攻击所有 HOSTILE_STRUCTURES
- 如果不是己方房间：排除 controller 和 keeper_lair

### 3. 清理完成（第 96-117 行）

- 删除 `targetRoom` 记忆
- 注释掉的逻辑：扫描 danger 房间自动分配任务

### 4. 自毁回收（第 121-128 行）

```
条件: Game.time % 55 == 0 && !targetRoom
```

- 定期触发 `suicide = true` → `recycle()`

## 关键设计点

- **多层优先级**：围墙 → creep → 建筑，逐步推进
- **跨房+本房**：跨房途中遇敌先打，到达后专注攻击
- **定期回收**：55 tick 周期性的 suicide，防止无限运行
