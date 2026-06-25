---
name: ContinuousControllerKiller 持续控制器杀手
---

# ContinuousControllerKiller 持续控制器杀手

## 概述

CCK 是**持续控制器杀手**，在 hostile room 中反复攻击 controller 以消耗 reservation bucket。签名 controller 文本威慑攻击。与 CCK party 配合，管理观察队列。

## 启动方式

通过 `Commands.ts` 的 `global.SCCK(homeRoom, targetRoomName)` 或 `global.SCCK2(homeRoom, targetRoomName)` 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'CCK'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `boosted` / `boostlabs` | 强化状态 |
| `ticksToGetHere` | 到达时间 |
| `path` / `MoveTargetId` | 路径缓存 |

## 运行逻辑

### 1. 强化

```
条件: boostlabs 存在
```

- `Boost()` 强化

### 2. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 3. 攻击 Controller

```
条件: room == targetRoom
```

- `attackController(controller)` 攻击
- `signController("we come in peace")` 签名

### 4. 协同

```
条件: FIND_MY_CREEPS 中有其他 CCK
```

- 检查同房间的其他 CCK 数量
- 管理 observation queue

### 5. 回收

```
条件: ticksToLive 耗尽
```

- `suicide()` 自杀

## 与 Memory.commandsToExecute 的联动

- `Memory.commandsToExecute.push()` 排队延迟 SCK 命令
- 与 FreedomFighter 和 Escort 共享 command queue

## 关键设计点

- **持续攻击**：反复攻击 controller，不是一次性的
- **签名威慑**：签名 controller 文本展示领地声明
- **party 配合**：与 CCKparty 配合，CCKparty 负责攻击，FreedomFighter 负责治疗
