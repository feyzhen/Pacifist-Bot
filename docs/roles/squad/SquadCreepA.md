---
name: squad-squad-creep-a
title: SquadCreepA
---

# SquadCreepA

## 概述

SquadCreepA 是四人战斗小队的**队长/指挥核心**，负责编队移动、战术协同、战斗决策和路线规划。它是最复杂的角色，包含完整的跨房行进、小队队形控制、动态角色交换和战斗AI。

## 启动方式

通过 spawn 配置指定 `role: "SquadCreepA"`，通常与 SquadCreepB、SquadCreepY、SquadCreepZ 一起组成完整小队。

## 内存字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `"SquadCreepA"` |
| `homeRoom` | string | 所属房间名 |
| `targetPosition` | RoomPosition | 最终目标位置 `{x, y, roomName}` |
| `route` | Array<{room, exit}> | 跨房路线，由 `Game.map.findRoute` 生成 |
| `squad` | `{a, b, y, z}` | 小队成员 ID 引用（指向当前各角色的 creep） |
| `go` | boolean | 小队集结完成后设为 `true`，激活战斗模式 |
| `direction` | number \| string | 当前移动方向（1-8 或 `"join"`） |
| `bodyType` | string | 主体部件类型 (`"heal"`, `"ranged_attack"`, `"attack"`, `"work"`) |
| `target` | string | 当前攻击目标结构体 ID |
| `lastHeal` | string | 上次治疗的 creep ID |
| `boostlabs` | Array | 强化实验室列表（可选） |
| `moving` | boolean | 移动标志 |
| `targetPosition.roomName` | string | 目标房间名，进入安全模式后重置回 homeRoom |

## 运行逻辑

### 第一阶段：强化与集结

1. **强化** — 如果 `boostlabs` 有值，调用 `creep.Boost()` 完成强化后返回
2. **检测身体部件** — 统计非 move 部件中数量最多的类型，记录到 `memory.bodyType`
3. **寻找队友** — 每帧扫描房间内所有 SquadCreepA/B/Y/Z，按 `ticksToLive` 降序排序，将存活时间最长的队友 ID 存入 `memory.squad.{a,b,y,z}`
4. **集结判定** — 当四个队员都在同一房间且形成 2x2 正方形队形时（B 在 A 右方，Y 在 A 下方，Z 在 A 右下角），设置 `go = true`

```
A  B
Y  Z
```

### 第二阶段：跨房行进（`go = false` 且未到达目标房间）

1. **路线规划** — 使用 `Game.map.findRoute` 动态计算从当前房到目标房的路线
   - 跳过非 normal 状态房间
   - 避开 `Memory.AvoidRooms` 中的房间
   - 沿房间网格主轴线（x%10==0 或 y%10==0）给予低权重 2，鼓励沿主干道行进
   - 进入未占领但 controller level > 4 的房间时自动加入 AvoidRooms
2. **出口选择** — 根据路线的连续两个出口的方位，选择最佳穿越点（角落 25,25 或边缘过渡位）
3. **路径搜索** — 使用 `PathFinder.search` + `roomCallbackSquadGetReady` 成本矩阵向出口移动
4. **到达目标房间** — 如果房间进入 safeMode 且未占领，立即撤退回 homeRoom

### 第三阶段：战斗模式（`go = true`）

#### 治疗逻辑

1. 遍历存活队员，找到血量最低的作为治疗目标
2. 如果有目标且受伤 → `creep.heal(target)`
3. 否则如果自己受伤 → `creep.heal(creep)`
4. 否则尝试治疗上次治疗的队友（`memory.lastHeal`）
5. 战斗房间额外计算 tower 伤害 vs heal 能力，如果 tower 伤害更大则计算逃离路径

#### 战斗行为

**对敌方 creep：**
- 3 格范围内发现敌方 creep 时优先攻击
- 排除 heal 类型的敌方 creep（除非自己是 ranged_attack）
- 边界位置（x/y 为 0 或 49）直接攻击
- 检查敌方脚下结构：仅 road/container 暴露时攻击；有 rampart 保护时放弃
- ranged_attack 类型执行 `rangedAttack` + `attack`，近距离额外 `rangedMassAttack`

**对敌方建筑：**
- 查找所有非己方建筑（排除 container/road/controller/keeperLair）
- 3 格范围内：ranged_attack → `rangedAttack`，attack → `attack`，work → `dismantle`
- 紧贴建筑时：ranged_attack → `rangedMassAttack`，attack → `attack`，work → `dismantle`

**目标结构体攻击** — 如果 `a.memory.target` 存在且有效，对其执行对应攻击动作

#### 队形移动（最核心逻辑）

当四名队员均无疲劳时，根据移动方向 `direction` 控制各自行动：

1. **正常移动** — 根据 `direction`（1-8 对应八个方向）让每个队员调用 `creep.move(对应方向)`
2. **汇合模式** — 如果方向受阻但空间允许，设置 `direction = "join"` 向 A 的位置靠拢
3. **碰撞检测** — 检查 A 右侧/右下/下方的格子是否有队友占据，有则避让
4. **障碍物检测** — 前方及斜方格有非 road/rampart/my 结构体时不允许前进
5. **动态角色交换** — 当队形无法维持时，根据敌人来袭方向重新分配角色：
   - 从上方来的敌人 → 交换 A↔Y（前后换位）
   - 从右方来的敌人 → 交换 A↔B、Y↔Z（左右换位）
   - 从下方来的敌人 → 交换 A↔Z、B↔Y（对角换位）
   - 多个战斗部件同方向 → 双人同时换位
   - 两个 heal 面对上方 → 四人整体前后翻转

#### Tower 伤害规避

到达目标房间后，如果存在敌方 tower：
1. 计算 tower 总伤害 vs heal 总量
2. 如果 tower 伤害 > heal 能力且有人受伤 → 计算远离 tower 的逃离路径
3. 如果敌方攻击部件 > 24 且有接近趋势 → 触发角色交换

#### 成本矩阵

使用三个预定义的成本矩阵回调（来自 `SquadHelperFunctions.ts`）：

| 回调 | 沼泽成本 | 边界成本 | 软阻非小队 | 惩罚敌方建筑 | 用途 |
|------|---------|---------|-----------|------------|------|
| `roomCallbackSquadA` | 5 | 5 | 是 | 是 | 标准攻击移动 |
| `roomCallbackSquadASwampCostSame` | 1 | 3 | 是 | 是 | 空载快速突进 |
| `roomCallbackSquadGetReady` | 5 | 15 | 否 | 否 | 集结/准备阶段 |

### TowerDamageCalculator

辅助函数，根据距离计算 tower 伤害：
- 距离 ≥ 20：150 伤害
- 距离 6-19：`450/distance * 8.4`
- 距离 ≤ 5：600 伤害

## 联动关系

| 联动 | 说明 |
|------|------|
| SquadCreepB | 队友，初始位于 A 的右侧 (x+1, y) |
| SquadCreepY | 队友，初始位于 A 的下方 (x, y+1) |
| SquadCreepZ | 队友，初始位于 A 的右下 (x+1, y+1) |
| `Memory.AvoidRooms` | 共享全局回避房间列表 |
| `SquadHelperFunctions` | 提供路径成本矩阵 |

## 关键设计点

- **动态角色系统** — 四个 creep 共享同一套逻辑框架，通过 `memory.role` 区分身份。角色可以动态交换（如 A 变成 B），但 `memory.role` 字段不会同步更新，可能导致后续查找偏差
- **2x2 队形** — 这是整个小队的核心阵型，所有战术都围绕这个正方形展开
- **集结判定** — 通过精确的相对坐标判断四人在 2x2 阵型中，然后统一设置 `go = true`
- **路线偏好** — 沿 10 的倍数网格线行进，减少跨房次数，降低被拦截概率
- **`console.log(path.incomplete)`** — 调试日志未移除，会在游戏控制台产生噪音
