---
name: squad-squad-creep-z
title: SquadCreepZ
---

# SquadCreepZ

## 概述

SquadCreepZ 是小队的**右下角成员**，初始阵型中位于 SquadCreepA 的右下方 `(x+1, y+1)`。承担侧翼掩护和后方支援职责。

## 启动方式

通过 spawn 配置指定 `role: "SquadCreepZ"`。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"SquadCreepZ"` |
| `squad` | `{a, b, y, z}` | 小队成员 ID 引用 |
| `go` | boolean | 小队集结完成标志 |
| `direction` | number \| string | 移动方向（1-8 或 `"join"`） |
| `bodyType` | string | 主体部件类型 |
| `target` | string | 当前攻击目标结构体 ID |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 与 SquadCreepA 的关系

SquadCreepZ 的逻辑框架与其他三名队员相同，关键差异：

1. **集结位置** — Z 等待 A 就位后移动到 `(a.pos.x + 1, a.pos.y + 1)`（A 的右下角）
2. **汇合模式** — `direction = "join"` 时移动到 A 的右下位置
3. **战斗/治疗** — 与 A 完全相同的逻辑

### 战斗行为

三层战斗逻辑：

1. **强化优先** — boostlabs 强化
2. **敌方 creep 打击** — 3 格范围内 hostile creep，排除 heal 类型
3. **敌方建筑打击** — rangedAttack / attack / dismantle

### 队形保持

Z 是 2x2 阵型的右下角：
- 跟随 A 的方向指令移动
- 与 B、Y 互相配合维持阵型
- 不主动发起角色交换

## 联动关系

| 联动 | 说明 |
|------|------|
| SquadCreepA | 队长，Z 在 A 右下方 |
| SquadCreepB | 队友，B 在 Z 的正上方 |
| SquadCreepY | 队友，Y 在 Z 的左侧 |

## 关键设计点

- Z 是 2x2 阵型的右下角，承担右下方防线
- 与 A/B/Y 共享相同的战斗和记忆管理逻辑
- 角色交换时可能被分配到其他位置
