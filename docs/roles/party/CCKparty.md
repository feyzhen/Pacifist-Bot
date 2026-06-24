---
name: party-cckparty
title: CCKparty
---

# CCKparty

## 概述

CCKparty 是 **Continuous Controller Killer（持续控制器杀手）小队**的成员，属于 Party 编队体系中的"输出核心"。它本身几乎没有独立逻辑，完全由 CCKparty 队长（即 SquadCreepA 扮演 `line === 1` 时的角色）统一指挥。

## 启动方式

通过 spawn 配置指定 `role: "CCKparty"`，并由 CCKparty 队长（`line === 1` 的 creep）统一管理。通常在 `Memory.commandsToExecute` 中通过 `formation: "CCKparty"` 自动触发。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"CCKparty"` |
| `line` | number | 在 party 中的行号（从 1 开始） |
| `lineLength` | number | party 总行数 |
| `party` | Array<string> | 队长管理的 party 成员 ID 列表 |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `targetRoom` | string | 目标攻击房间 |
| `homeRoom` | string | 所属房间 |
| `moving` | boolean | 移动标志 |

## 运行逻辑

### 自身行为

CCKparty 的 `run()` 函数极其简单：

1. **强化** — 如果 `boostlabs` 有值，调用 `creep.Boost()` 完成强化后返回
2. 除此之外不做任何事

### 被指挥行为（由队长 CCKparty/FreedomFighter 控制）

CCKparty 的所有行为都由队长在 `line === 1` 分支中统一调度：

1. **向 controller 靠近** — 当到达 targetRoom 且 controller 在 8 格内时，移动到 controller 附近
2. **攻击 controller** — 当所有 party 成员就位（`readyToAttackController = true`）时，对 controller 执行 `attackController()`
3. **自毁循环** — 当 controller 升级被阻断（`upgradeBlocked > 0`）时：
   - `creep.suicide()` 自毁回收
   - 将 party[0] 和 party[last] 的角色改为 `"Solomon"`（进攻型治疗者）
   - 将新的命令推入 `Memory.commandsToExecute`（delay: 360 ticks, bucketNeeded: 5000）
   - 队长返回结束本轮

### 队形跟随

CCKparty 根据 `memory.line` 跟随 party 中前一个成员：

| line 值 | 跟随对象 |
|---------|---------|
| 最大行（`line === lineLength`） | 跟随 party[1]（第二个成员） |
| 中间行 | 跟随 `party[lineLength - (line - 1)]` |

移动时使用 `MoveCostMatrixRoadPrio(target, 1)` 公路优先路径。

## 联动关系

| 联动 | 说明 |
|------|------|
| CCKparty（队长） | `line === 1` 的 creep 担任指挥，统一管理整个 party |
| FreedomFighter | party 中的战斗成员，负责治疗和攻击敌方 creep |
| Solomon | CCKparty 自毁后替补角色，接替攻击任务 |
| `Memory.commandsToExecute` | 接收新的 CCKparty 编队命令 |

## 关键设计点

- **极简自主逻辑** — CCKparty 本身只做强化，其余全靠队长调度
- **自毁接力** — controller 升级被阻断时主动自毁，释放 bucket 后由 Solomon 接替
- **编队形成** — 队长通过 `FIND_MY_CREEPS` 筛选出所有 `CCKparty` 和 `FreedomFighter` 且 `boostlabs` 为空的 creep 组成 party
- **循环滚动** — 在目标房间内，party 成员按顺序轮换（`party.push(party.shift())`），保持攻击节奏
