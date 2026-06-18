---
name: PowerHeal 力量治疗者
---

# PowerHeal 力量治疗者

## 概述

PowerHeal 是**力量战斗治疗者**，专门治疗 PowerMelee creep。跟随 PowerMelee 到目标房间，在其攻击 power bank 时提供治疗支持。

## 启动方式

通过 `rooms.spawning.ts` 在需要 power bank 作战的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'PowerHeal'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `targets` | 治疗目标 ID 数组 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 跨房移动

```
条件: room != targetRoom
```

- `moveToRoomAvoidEnemyRooms(targetRoom)` 前往

### 2. 找目标（第 18-29 行）

```
条件: !targets || Game.time % 30 == 0
```

- `FIND_MY_CREEPS` 找 `role == "PowerMelee"` 的 creep
- 将其 ID 加入 `targets` 数组
- 如果没找到 PowerMelee → `suicide = true`

### 3. 治疗（第 32-67 行）

```
条件: targets 存在且非空
```

- 过滤出仍存在的目标
- 1 格范围内 → `heal(target)` 近战治疗
- 不在范围 → `MoveCostMatrixRoadPrio(target, 1)` 移动
- 按 `hits` 升序排序，优先治疗最伤的

### 4. 回收

```
条件: Game.time % 30 == 0 && 无 PowerMelee
```

- `suicide = true` → `recycle()`

## 与 PowerMelee 的联动

- PowerMelee 负责攻击 power bank
- PowerHeal 负责治疗 PowerMelee
- 两者形成**攻防配对**

## 关键设计点

- **30-tick 刷新**：每 30 tick 重新扫描 PowerMelee 列表
- **按伤排序**：优先治疗 hits 最低的 creep
- **一对一配对**：每个 PowerHeal 服务于多个 PowerMelee
