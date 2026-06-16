# rooms.observe.ts — 观察者侦察模块

## 概述

`rooms.observe.ts` 是 Pacifist Bot 的核心侦察模块，负责操控房间（Room）中的 Observer 结构体进行周期性地图扫描。它按时间片将侦察分为两个子流水线：

| 时间片 | 触发间隔 | 目标 |
|--------|----------|------|
| 敌情侦察 | `Game.time % 64 == 0~1` | 扫描附近房间，发现敌方建筑/单位后自动调度攻击或清墙蠕虫 |
| 资源侦察 | `Game.time % 128 == 2~3` | 扫描主干道房间，寻找能量矿藏（Deposit）或能量银行（Power Bank） |

所有侦察行为受 `observeManager` 全局开关和子模块开关控制。

---

## 前置条件

```typescript
observer && isObserveEnabled() && (Game.time % interval == 0 || 1) && (Game.cpu.bucket > 8000 || Memory.pixelManager?.enabled)
```

- 房间内必须有可用的 Observer（从 `room.memory.Structures.observer` 或 `room.findObserver()` 获取）
- `Memory.observeManager.enabled !== false`
- 当前 tick 落在间隔窗口内
- CPU 桶剩余 > 8000 **或** Pixel Manager 已启用（绕过 CPU 限制）

资源侦察的 CPU 桶阈值略低（> 7000），因为矿藏侦察优先级稍低。

---

## 一、敌情侦察流水线（interval = 64）

### 1.1 生成待观察房间列表

首次运行时，根据 home room 名称解析出坐标，生成 11×11（或跨区修正后的 9×9）范围内的所有非 home 房间列表 `RoomsToSee`。

**6 字母房间名**（如 `E10N10`）：
- 解析东/西方向符（`room.name[0]`）和北/南方向符（`room.name[3]`）
- 以自身为中心 ±5 格遍历
- 跳过坐标尾数为 0 的房间（主干道）
- 跳过自身周围 3×3 区域（4~6 范围）

**非 6 字母房间名**（如 `EN10`、`E10N1` 等短名）：
- 解析逻辑更复杂，需要处理不同长度
- 范围缩小为 ±4 格
- 包含跨区逻辑（x/y 跨越 E/W 或 N/S 边界时自动切换方向符）

### 1.2 逐轮观察

每 64 tick 在第 0 tick 执行一次 `observer.observeRoom(chosenRoom)`，按 `lastObserved` 索引循环遍历 `RoomsToSee`。观察结果存储在 `room.memory.observe.lastRoomObserved` 中，供第 1 tick 使用。

### 1.3 侦察后决策（第 1 tick）

对上一 tick 观察到的相邻房间 `adj`，调用 `areRoomsNormalToThisRoom(room.name, adj)` 验证路径畅通且均为 normal 状态后，进入分支决策：

#### 条件 A：敌方房间控制器等级 0（远程占领准备）

```
找到建筑物 → 找到空地 → 无预留占领 → Memory.CanClaimRemote >= 1
```

- **可达控制器**：检查从所有出口到控制器的路径是否畅通
  - 畅通 → 调度 `WallClearer`（纯 MOVE 蠕虫，用于快速占领）
  - 不畅通 → 调度 `DismantleControllerWalls`（25 MOVE + 25 WORK，用于拆墙）

- **控制器空地不可达**（`openControllerPositions.length == 0`）：
  - 直接调度 `DismantleControllerWalls`

同时从 `Memory.AvoidRooms` 中移除该房间名。

#### 条件 B：控制器等级 2（无 SafeMode）

根据敌方可用兵力组合调度不同编队：

| 敌方存在 | 编队 | CPU 需求 | 说明 |
|----------|------|----------|------|
|  spawns + creeps | SGD + 2×CCK | 8000 bucket | 重型进攻 + 两次 CCK 命令 |
|  spawns only | SGD | 8000 bucket | 轻量进攻 |
|  creeps only | SGD | 8000 bucket | 轻量进攻 |

#### 条件 C：控制器等级 3~4（无 SafeMode）

| 敌方存在 | 行动 |
|----------|------|
|  spawns + towers | 注释掉的 `spawn_hunting_party` / 直接推送 RangedQuad + CCK 命令 |
|  spawns + creeps | SGD 重型编队 + CCK |
|  spawns only | SGD 轻量编队 + CCK |
|  creeps only（ unarmed ） | SGD 轻量编队 |
|  creeps only（ armed ） | SD（防御性撤退） |

#### 条件 D：控制器等级 5（无 SafeMode）

与等级 3~4 类似，但使用 `global.SD(room.name, adj, true)` 作为高 CPU 时的主攻方案。

#### 条件 E：控制器等级 6~8（无 SafeMode）

| CPU 桶 | tower 存在 | 行动 |
|--------|-----------|------|
| ≥ 8000 | ✅ | 随机选择 SDB / SQR / SS / SQM（各 25%） |
| ≥ 5000 | ✅ | 随机选择 SDB / SS（各 50%） |
| — | spawns + creeps | SGD 重型 + CCK |
| — | spawns only | SGD 轻量 + CCK |

### 1.4 清理逻辑

如果房间不满足侦察条件（非正常状态、无控制器、盟友房间等），仅从 `Memory.AvoidRooms` 中移除该房间名。

---

## 二、资源侦察流水线（twoTimesInterval = 128）

### 2.1 生成主干道房间列表

每 128 tick 在第 2 tick 执行。扫描 home room ±4 格范围内所有 **坐标尾数为 0** 的房间（即主干道房间），过滤掉 non-normal 状态和 home room 自身。

### 2.2 逐轮观察

与敌情流水线类似，按 `lastRoomObservedForPowerIndex` 循环遍历 `listOfRoomsForPower`。

### 2.3 矿藏分析（第 3 tick）

对观察到的房间执行：

1. 验证路径正常（`areRoomsNormalToThisRoom`）
2. 检查 storage 能量 > 225000
3. 检查房间内无墙壁（`FIND_STRUCTURES` filter WALL == 0）
4. 查找 Deposit

如果 `mineScoutEnabled` 且 Deposit 存在且 `deposits[0].lastCooldown < 20` 且 CPU 桶 > 9750：
- 调度 `global.SDM(room.name, adj)` 矿藏攻击编队

> 注释掉的代码块曾用于检测 hostile creep 并动态创建 Deposit-Attacker，目前处于禁用状态。

---

## 三、关键数据结构

```
room.memory.observe
├── RoomsToSee            // string[] — 敌情侦察待观察房间列表
├── lastObserved          // number   — 敌情侦察当前索引
├── lastRoomObserved      // string   — 敌情侦察上一次观察的房间
├── listOfRoomsForPower   // string[] — 资源侦察待观察房间列表（主干道）
├── lastRoomObservedForPowerIndex  // number — 资源侦察当前索引
└── lastRoomObservedForPower       // string — 资源侦察上一次观察的房间
```

---

## 四、与 observeManager 的集成

| 配置项 | 影响范围 |
|--------|----------|
| `enabled` | 总开关，关闭则整个模块不执行 |
| `enemyScout` | 控制敌情侦察的分支决策（第 1 tick 后的 `if (enemyScoutEnabled && ...)`） |
| `mineScout` | 控制矿藏侦察分支（`if (mineScoutEnabled && deposits.length > 0 && ...)`） |
| `powerScout` | 当前代码中未直接使用（预留） |
| `debug` | 控制 `debugLog()` 输出 |
| `bucketNeeded` | 通过 `Game.cpu.bucket` 阈值 + `Memory.pixelManager?.enabled` 绕过 |

---

## 五、时间线总结

```
Tick 0:  observer.observeRoom(RoomsToSee[idx])          ← 敌情观察
Tick 1:  分析观察结果，调度攻击/清墙蠕虫                 ← 敌情决策
...
Tick 64: observer.observeRoom(RoomsToSee[(idx+1)%N])   ← 下一轮敌情
Tick 65: 敌情决策...

Tick 2:  observer.observeRoom(listOfRoomsForPower[pIdx]) ← 资源观察
Tick 3:  分析矿藏/能量银行，调度 SDM                     ← 资源决策
...
Tick 128: 下一轮资源观察
```

两个流水线共享同一个 Observer，但通过不同的时间窗口错开，避免冲突。
