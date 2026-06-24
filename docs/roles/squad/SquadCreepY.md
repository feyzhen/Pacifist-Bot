---
name: squad-squad-creep-y
title: SquadCreepY
---

# SquadCreepY

## 概述

SquadCreepY 是小队的**下方成员**，初始阵型中位于 SquadCreepA 的正下方 `(x, y+1)`。承担侧翼掩护和下方防御职责。

## 启动方式

通过 spawn 配置指定 `role: "SquadCreepY"`。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"SquadCreepY"` |
| `squad` | `{a, b, y, z}` | 小队成员 ID 引用 |
| `go` | boolean | 小队集结完成标志 |
| `direction` | number \| string | 移动方向（1-8 或 `"join"`） |
| `bodyType` | string | 主体部件类型 |
| `target` | string | 当前攻击目标结构体 ID |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 与 SquadCreepA 的关系

SquadCreepY 的逻辑与 SquadCreepA/B 高度一致，关键差异在于：

1. **集结位置** — Y 等待 A 就位后移动到 `(a.pos.x, a.pos.y + 1)`（A 的正下方）
2. **汇合模式** — `direction = "join"` 时移动到 A 的正下方位置
3. **战斗/治疗** — 与 A 完全相同的逻辑

### 战斗行为

与 SquadCreepA 相同的三层战斗逻辑：

1. **强化优先** — 如果 `boostlabs` 有配置，先完成强化
2. **敌方 creep 打击** — 3 格范围内的 hostile creep，排除 heal 类型，判断是否可攻击
3. **敌方建筑打击** — rangedAttack / attack / dismantle 根据 bodyType 决定

### 队形保持

Y 的核心职责是保持 2x2 阵型的左下角位置：
- 跟随 A 的方向指令移动
- 与 B 互相配合维持阵型完整性
- 不主动发起角色交换

## 联动关系

| 联动 | 说明 |
|------|------|
| SquadCreepA | 队长，Y 在 A 正下方 |
| SquadCreepB | 队友，B 在 Y 的右上方 |
| SquadCreepZ | 队友，Z 在 Y 的右侧 |

## 关键设计点

- Y 是 2x2 阵型的左下角，承担下方防线
- 与 A/B/Z 共享相同的战斗和记忆管理逻辑
- 角色交换时可能被分配到其他位置
