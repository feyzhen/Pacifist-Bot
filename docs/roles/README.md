# Roles 角色文档

本目录包含 Pacifist Bot 中所有 creep role 的运行逻辑文档。

每个角色文档涵盖：

- **概述** — 一句话说明角色用途
- **启动方式** — 如何 spawn（命令或自动）
- **内存字段** — 所有 `creep.memory.XXX` 字段说明
- **运行逻辑** — 按代码块分段解析
- **联动关系** — 与其他角色 / 系统的交互
- **关键设计点** — 特殊机制和注意事项

## 角色分类

### 能源管理

| 角色 | 文件 | 用途 |
|------|------|------|
| [Convoy](convoy.md) | `Convoy.ts` | 房间间专职能量运输 |
| [Goblin](goblin.md) | `goblin.ts` | 战场拾荒者，回收 ruins/dropped/structures 资源 |
| [Filler](filler.md) | `filler.ts` | 房间能量分发核心，从 storage 送到各结构 |
| [Carry](carry.md) | `carry.ts` | 本地/跨房能量搬运工 |
| [FakeFiller](fakeFiller.md) | `FakeFiller.ts` | 简化版 filler，无 reserveFill 管理 |
| [ControllerLinkFiller](controllerLinkFiller.md) | `ControllerLinkFiller.ts` | 专精 controller link 填充 |
| [ResourceHauler](resourceHauler.md) | `resourceHauler.ts` | 跨房搬运所有资源类型（不限能量） |
| [Billtong](billtong.md) | `billtong.ts` | 跨房采集 deposit 矿物并运回 |
| [Sweeper](sweeper.md) | `sweeper.md` | 战场清扫者，扫 tombstones/ruins/dropped |
| [EnergyMiner](energyMiner.md) | `energyMiner.ts` | energy source 采集者，管理 sourceLink 网络 |
| [MineralMiner](mineralMiner.md) | `mineralMiner.ts` | 矿物 deposit 采集者 |
| [EnergyManager](energyManager.md) | `energyManager.ts` | 房间能源总调度，管理所有能源流动 |

### 建造维修

| 角色 | 文件 | 用途 |
|------|------|------|
| [Builder](builder.md) | `builder.ts` | 施工现场建造者，完成 ConstructionSite |
| [Repair](repair.md) | `repair.ts` | 通用维修者，修复损坏建筑 |
| [Maintainer](maintainer.md) | `maintainer.ts` | 房间维护总管，道路+rampart+建筑 |
| [SpecialRepair](specialRepair.md) | `SpecialRepair.ts` | 危险房间高优先级维修者 |
| [SpecialCarry](specialCarry.md) | `SpecialCarry.ts` | 为 SpecialRepair 专属送能量的搬运工 |
| [RampartErector](rampartErector.md) | `RampartErector.ts` | rampart 建造者，按 layout 预设坐标建造 |
| [RampartUpgrader](rampartUpgrader.md) | `RampartUpgrader.ts` | rampart 升级者，拆旧建新提高上限 |
| [RampartDefender](rampartDefender.md) | `RampartDefender.ts` | rampart 防守者，维修 rampart 并攻击靠近的敌人 |
| [RemoteBuilder](remoteBuilder.md) | `remoteBuilder.ts` | remote 房间建造者，带能量过去建结构 |
| [RemoteRepair](remoteRepair.md) | `remoteRepair.ts` | remote 房间维修者 |

### 升级占领

| 角色 | 文件 | 用途 |
|------|------|------|
| [Claimer](claimer.md) | `claimer.ts` | 房间占领者，claim controller 后触发自动建造 |
| [Upgrader](upgrader.md) | `upgrader.ts` | controller 升级者，持续 upgradeController |
| [Reserve](reserve.md) | `reserve.ts` | controller 驻留者，reserveController 防被占 |
| [SneakyControllerUpgrader](sneakyControllerUpgrader.md) | `SneakyControllerUpgrader.ts` | 隐秘升级者，遇敌逃跑 |
| [RoomLocker](roomLocker.md) | `RoomLocker.ts` | 房间封锁者，出口建墙+升级 controller |
| [DismantleControllerWalls](dismantleControllerWalls.md) | `DismantleControllerWalls.ts` | 控制器围墙拆除者，claim 后清理围墙 |

### 战斗进攻

| 角色 | 文件 | 用途 |
|------|------|------|
| [Attacker](attacker.md) | `attacker.ts` | 全能攻击者，消灭 creep+建筑+围墙 |
| [Clearer](clearer.md) | `clearer.ts` | 战斗清理者，击杀 hostile creep 并呼叫 tower |
| [Defender](defender.md) | `defender.md` | 房间防守者，配合 RampartDefender 防守 |
| [RangedAttacker](rangedAttacker.md) | `RangedAttacker.md` | 远程攻击者，边打边退 |
| [RangedRampartDefender](rangedRampartDefender.md) | `RangedRampartDefender.md` | 远程 rampart 防守者 |
| [Ram](ram.md) | `ram.ts` | 突击者，正面冲锋，自定义成本矩阵避开 hostile |
| [Guard](guard.md) | `Guard.ts` | 战斗守卫，boosted 前线单位 |
| [CreepKiller](creepKiller.md) | `CreepKiller.ts` | 蠕虫杀手，spawn CCK 后继力量 |
| [ContinuousControllerKiller](continuousControllerKiller.md) | `ContinuousControllerKiller.ts` | CCK，持续攻击 controller 消耗 bucket |
| [Annoy](annoy.md) | `annoy.ts` | 骚扰者，制造混乱逼迫敌人分散 |
| [DrainTower](drainTower.md) | `DrainTower.ts` | drain tower 特化 creep |
| [Dismantler](dismantler.md) | `Dismantler.ts` | 通用拆解者，拆 hostile walls |
| [WallClearer](wallClearer.md) | `WallClearer.ts` | 围墙清除者，从 contested room 清墙开路 |
| [Mosquito](mosquito.md) | `mosquito.ts` | 高功率进攻治疗者，boost→travel→attack |
| [RemoteDismantler](remoteDismantler.md) | `remoteDismantler.ts` | remote 房间拆解者 |

### 治疗辅助

| 角色 | 文件 | 用途 |
|------|------|------|
| [Healer](healer.md) | `healer.ts` | 房间治疗者，治疗自己和队友 |
| [Escort](escort.md) | `Escort.ts` | 护航队长，管理 claimer+roomLocker 编队 |
| [Signifer](signifer.md) | `signifer.ts` | 传令兵/医疗兵，专属治疗 ram |
| [Solomon](solomon.md) | `Solomon.ts` | 进攻型治疗者，heal+attack 双修 |
| [PowerHeal](powerHeal.md) | `PowerHeal.ts` | 力量战斗治疗者，专治 PowerMelee |
| [Priest](priest.md) | `Priest.ts` | 巡回牧师，各房间 controller 签名 |

### 力量作战

| 角色 | 文件 | 用途 |
|------|------|------|
| [PowerMelee](powerMelee.md) | `PowerMelee.ts` | 攻击 power bank，≤180000 HP 时 spawn Goblin |

### 侦察

| 角色 | 文件 | 用途 |
|------|------|------|
| [Scout](scout.md) | `scout.ts` | 房间侦察兵，判断可占领性并自动 spawn 占领部队 |

### 签名

| 角色 | 文件 | 用途 |
|------|------|------|
| [Sign](sign.md) | `Sign.ts` | 控制器签名者，领地声明 |

### 安全

| 角色 | 文件 | 用途 |
|------|------|------|
| [SafeModer](safeModer.md) | `SafeModer.ts` | 安全模式生成者，用 GHODIUM 生成 safe mode |

## 跨角色联动

### 共享内存结构

| 内存字段 | 使用者 |
|----------|--------|
| `Memory.target_colonise` | remoteBuilder, scout, RoomLocker |
| `Memory.AvoidRooms` | WallClearer, ram, moveToRoomAvoidEnemyRooms |
| `Memory.delayConvoy` | Convoy, rooms.supportOtherRooms |
| `Memory.billtong_rooms` | billtong |
| `Memory.layoutConfig` | claimer, remoteBuilder, RampartErector |
| `Memory.roomPlanner` | RampartErector, remoteBuilder, rooms.construction |
| `Memory.CanClaimRemote` | WallClearer, scout |
| `Memory.commandsToExecute` | ContinuousControllerKiller, Escort, FreedomFighter |
| `creep.room.memory.danger` | 几乎所有战斗/防守角色 |
| `creep.room.memory.reserveFill` | Filler, ControllerLinkFiller |
| `creep.room.memory.Structures` | 几乎所有资源管理角色 |

### 角色配对

| 配对 | 说明 |
|------|------|
| Escort ↔ Claimer ↔ RoomLocker | 占领编队，line 字段协调队形 |
| PowerHeal ↔ PowerMelee | 力量战斗配对 |
| Signifer ↔ Ram | 突击+医疗配对 |
| SpecialCarry ↔ SpecialRepair | 高优先级维修+专属供能 |
| RampartDefender ↔ Defender | 防守配对 |
| CreepKiller → CCK | 到达后 spawn 后继力量 |
| PowerMelee → Goblin | power bank ≤180000 时 spawn goblin 回收 |
| Claimer → DismantleControllerWalls | 占领成功后 spawn 清理兵 |

### 自动触发链

```
scout 侦察 → 可占领 → spawn claimer + annoy
claimer claim 成功 → 触发 layoutConfig → spawn DismantleControllerWalls
  → 自动建造 (rooms.construction) → spawn filler/upgrader/repair/maintainer
  → energyMiner 采集 → energyManager 调度 → filler 分发
rooms.supportOtherRooms → spawnConvoy → Convoy 跨房运输
rooms.supportOtherRooms → spawnSafeModer → SafeModer 生成 safe mode
PowerMelee 攻击 power bank → spawn goblin → Goblin 回收战利品
```

## 自定义 Creep 方法速查

所有方法定义在 `src/Functions/creepFunctions2.ts`，类型声明在 `src/types/global.d.ts`。

| 方法 | 作用 | 核心角色 |
|------|------|----------|
| `moveToRoomAvoidEnemyRooms(room)` | 跨房移动，避开敌方房间 | Convoy, Goblin, Claimer, Ram... |
| `MoveCostMatrixRoadPrio(target, range)` | 公路优先路径 | 绝大多数 |
| `MoveCostMatrixSwampPrio(target, range)` | 沼泽优先路径 | Convoy(空载), Priest |
| `MoveCostMatrixIgnoreRoads(target, range)` | 忽略公路 | SpecialRepair, RampartDefender |
| `MoveCostMatrixRoadPrioAvoidEnemyCreepsMuch(target, range)` | 极大避开敌方 creep | WallClearer, Guard |
| `findStorage()` | 查找 storage | 所有资源管理角色 |
| `recycle()` | 自毁回收 | 所有角色 |
| `Boost()` | lab 强化 | Claimer, Ram, Guard, Solomon... |
| `evacuate()` | 紧急撤离 | Builder, Carry, EnergyMiner... |
| `withdrawStorage(storage)` | 从 storage 取能 | Filler, Upgrader, Reserve |
| `acquireEnergyWithContainersAndOrDroppedEnergy()` | 收集 container/dropped 能量 | Carry, Upgrader, Filler |
| `roomCallbackRoadPrioUpgraderInPosition(controller, range)` | 升级者最优位置 | Upgrader |
| `moveToSafePositionToRepairRampart(rampart, range)` | 安全位置修 rampart | RampartDefender, SpecialRepair |
| `Sweep()` | 扫掠 tombstone/ruin/dropped | Sweeper |
| `harvestEnergy()` | 采集 energy source | EnergyMiner |
| `reserveController()` | 驻留 controller | Reserve |
| `attackController()` | 攻击 controller | Claimer, CCK |
| `generateSafeMode()` | 生成 safe mode | SafeModer |
| `signController(text)` | 签名 controller | Claimer, Priest, Sign |
| `roomTowersAttackEnemy(target)` | 呼叫 tower 集火 | Clearer, Ram, Solomon |
| `roomTowersRepairTarget(target)` | 呼叫 tower 维修 | Builder |
