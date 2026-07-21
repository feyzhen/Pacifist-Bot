# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供此代码库的开发指导。

## 项目概述

Pacifist Bot 是一个用 TypeScript 编写的 Screeps MMO 编程策略游戏机器人。它管理自动化殖民地，具备战斗、扩张、间谍和资源管理系统。机器人表面和平，实则对玩家采用激进策略。

## 开发命令

### 构建与部署
```bash
npm run build              # 编译但不上传
npm run push-main          # 编译并推送到 Screeps 主服务器
npm run push-pserver       # 编译并推送到私有服务器
npm run watch-main         # 主服务器监听模式
```

### 测试
```bash
npm test                   # 运行单元测试（Mocha + Chai + Sinon）
npm run test-unit          # 仅运行单元测试
```

### 代码检查
```bash
npm run lint              # ESLint 检查 src/**/*.ts
```

## 架构设计

### 入口点与 Tick 流程
`src/main.ts` 导出 `loop()` 函数，由 `ErrorMapper` 包装。每个 tick 执行：
1. `preTickBetterMove()` — 初始化超级移动优化
2. `memHack.run()` — 通过替换全局 Memory 为 RawMemory._parsed 优化内存访问
3. `MemoryManager()` — 初始化默认内存结构
4. `rooms()` — 处理所有已占领房间
5. `PowerCreepManager()` — 处理力量蠕虫
6. `RunAllCreepsManager()` — 执行所有普通蠕虫角色
7. `ExecuteCommandsInNTicks()` — 处理队列命令
8. `endTickResolve()` — 解析所有队列移动

### 角色系统
每个蠕虫有 `memory.role`，被分发到 `global.ROLES[role].run(creep)`。角色在 `src/main.ts` 中注册，实现文件位于 `src/Roles/`。小队成员（SquadCreepA/B/Y/Z）被延迟到 `QuadSquadRunManager` 处理。

### 房间处理
`src/Rooms/rooms.ts` 遍历 `Game.rooms` 并调用各子系统：
- `rooms.spawning.ts` — 处理 spawn_list 生成实际蠕虫
- `rooms.construction2.ts` — 基于布局的建造和道路建设
- `rooms.defence.ts` — 防御结构和塔协调
- `rooms.market.ts` — 市场操作（RCL ≥ 6）
- `rooms.labs.ts` — 实验室管理和强化
- `rooms.factory.ts` — 工厂生产
- `rooms.observe.ts` — 观察者侦察（RCL 8）
- `rooms.layoutManager.ts` — 自动化房间布局管理
- `rooms.remotes.ts` — 远程房间资源跟踪
- `rooms.powerSpawning.ts` — 力量 spawn 操作
- `rooms.supportOtherRooms.ts` — 房间间支持

### 蠕虫移动
移动由 `src/超级移动优化.js` 中的超级移动优化系统处理，包装 `creep.moveTo()` 使用成本回调并协调多蠕虫移动防止死锁。自定义移动方法如 `MoveCostMatrixRoadPrio()`、`moveToRoomAvoidEnemyRooms()` 和 `fleeFromMelee()` 定义在 `src/Functions/creepFunctions3.ts`。

### 命令系统
`src/utils/Commands.ts`（约2600行）注册了约20+个 `global.*` 函数作为游戏内聊天命令（例如 `global.SS`、`global.SQR`、`global.lock_room`、`global.spawn_mosquito`）。这些命令通过将蠕虫信息推送到 `room.memory.spawn_list` 来生成蠕虫。

### 内存结构
所有持久状态存储在 `Memory` 和 `RoomMemory` 中。关键结构：
- `Memory.creeps` — 按名称索引的蠕虫元数据
- `Memory.rooms[roomName]` — 房间内存，包含 spawn_list、Structures、reserveFill 等
- `Memory.AvoidRooms` — 导航时要避免的房间
- `Memory.CPU` — CPU 使用平均值和减少标志
- `Memory.targetRampRoom` — 目标 rampart 防御房间
- `Memory.tasks.wipeRooms` — 敌方房间清理任务

类型定义集中在 `src/types/global.d.ts`，扩展了 Creep、CreepMemory、RoomMemory、Memory 和 Global 接口。

### CPU 管理
`CPUmanager` 跟踪每次 tick 的 CPU 使用情况，计算 100-tick 和 500-tick 平均值，并可在危险时触发 `Memory.CPU.reduce = true` 进入低 CPU 模式。昂贵操作通过 `Game.time % N === 0` 检查进行门控。

### CI/CD
GitHub Actions (`build-and-release.yml`) 在推送到 main/master 和标签时运行。使用 Node 18，安装依赖，构建，并在标签上创建带有变更日志的 GitHub Releases。

## 编码约定

- **添加新角色**：创建 `src/Roles/roleName.ts` 导出 `{ run: (creep) => void }`，在 `src/main.ts` 的 `global.ROLES` 下注册。
- **添加全局命令**：在 `src/utils/Commands.ts` 中定义为 `global.XXX = function(...) { ... }`。
- **扩展 Creep 方法**：在 `src/Functions/creepFunctions*.ts` 中添加实现，在 `src/types/global.d.ts` 中添加类型声明。
- **房间子系统**：每个关注点在 `src/Rooms/` 下一个文件，从 `rooms.ts` 调用并使用 tick 率门控。
- **混合 TS/JS**：一些遗留文件是纯 `.js`（`MinCut.js`、`moveMatch.js`、`planner-wrapper.js`、`RoomVisual.js`、`超级移动优化.js`）。
- **文档**：中文文档位于 `docs/roles/`、`docs/rooms/`、`docs/prd/`、`docs/issues/`。
- **测试**：仅单元测试；集成测试需要 Screeps 服务器，默认禁用。
- **TypeScript**：`strict: false`，`noImplicitReturns: true`，大量使用 `// @ts-ignore`。
- **格式化**：Prettier，4空格缩进，双引号，无尾逗号，打印宽度120。
