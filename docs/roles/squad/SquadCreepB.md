---
name: squad-squad-creep-b
title: SquadCreepB
---

# SquadCreepB

## 概述

SquadCreepB 是小队的**右侧成员**，初始阵型中位于 SquadCreepA 的右侧 `(x+1, y)`。负责近战掩护、侧翼攻击和辅助治疗。

## 启动方式

通过 spawn 配置指定 `role: "SquadCreepB"`。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"SquadCreepB"` |
| `squad` | `{a, b, y, z}` | 小队成员 ID 引用 |
| `go` | boolean | 小队集结完成标志 |
| `direction` | number \| string | 移动方向（1-8 或 `"join"`） |
| `bodyType` | string | 主体部件类型 |
| `target` | string | 当前攻击目标结构体 ID |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 与 SquadCreepA 的关系

SquadCreepB 的逻辑与 SquadCreepA **高度相似但有关键差异**：

1. **集结位置** — B 等待 A 就位后移动到 `(a.pos.x + 1, a.pos.y)`（A 的右侧）
2. **集结判定** — 不主动发起角色交换，只跟随 A 的指令移动
3. **移动指令** — 当 `direction` 有值时，B 执行对应的 `creep.move(direction)`
4. **汇合模式** — `direction = "join"` 时移动到 A 的右侧位置

### 战斗行为

与 A 相同的战斗逻辑：

1. **强化** — 优先完成 lab 强化
2. **敌 creep 攻击** — 3 格范围内发现敌方 creep 时判断是否可攻击
3. **建筑攻击** — 对敌方建筑执行 rangedAttack / attack / dismantle
4. **目标结构体** — 如果 `a.memory.target` 存在，对其执行对应操作

### 治疗逻辑

1. 找到存活队员中血量最低者进行治疗
2. 如果没有队友需要治疗，自己受伤则自疗
3. 否则尝试治疗 A 上次标记的队友（`a.memory.lastHeal`）

### 队形保持

B 的核心职责是保持与 A 的 2x2 阵型：
- 正常情况下跟随 A 的方向移动
- 如果碰撞检测失败，等待 A 的角色交换指令
- 自身不主动发起阵型变换

## 联动关系

| 联动 | 说明 |
|------|------|
| SquadCreepA | 队长，B 跟随 A 的移动和方向指令 |
| SquadCreepY | 队友，Y 在 B 的正下方 |
| SquadCreepZ | 队友，Z 在 Y 的右侧 / B 的下方 |

## 关键设计点

- B 的战斗逻辑比 A 简单，主要负责执行而非决策
- 角色交换时 B 的记忆会被重新分配，可能变成其他角色
- 与 A 共享同一套 `squad` 内存结构来追踪队友
