---
name: Sweeper 清扫者
---

# Sweeper 清扫者

## 概述

Sweeper 是**战场清扫者**，负责 sweep tombstones、ruins 和 dropped resources 中的能量和矿物。是资源回收的重要角色。

## 启动方式

通过 `rooms.spawning.ts` 在需要清扫的房间创建（line 1238, 2607），body 以 CARRY 为主。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'sweeper'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `storage` | storage ID |
| `MaxStorage` | 最大载量 |
| `locked` | 锁定目标 |
| `target` | 当前目标 |
| `suicide` | 自毁标志 |
| `deposit` | deposit ID |

## 运行逻辑

### 1. 扫掠（第 1 行）

```
条件: !full
```

- `Sweep()` 找 tombstones/ruins/dropped resources
- 按优先级：tombstone > ruin > dropped
- 提取 ENERGY 和 MINERAL

### 2. 转移矿物

```
条件: full && mineral 存在
```

- 找 container → `transfer(container, mineral)`
- 找 storage → `transfer(storage, mineral)`
- `findStorage()` 搜索

### 3. 回收

```
条件: deposit depleted || ticksToLive 耗尽
```

- `recycle()`

## 与 Convoy 的联动

- Convoy 在血量不足时设置 `Memory.delayConvoy[homeRoom] = 8000`
- Sweeper 在 `recycle()` 中被 Convoy 的 `Boost()` lab 逻辑 spawn（第 1353-1363 行 creepFunctions2.ts）

## 关键设计点

- **Sweep 方法**：`creep.Sweep()` 是自定义方法，自动找最佳扫掠目标
- **Deposit 管理**：`memory.deposit` 跟踪 mineral deposit 是否枯竭
- **Mineral 优先**：先处理矿物再处理能量
- **MoveCostMatrixIgnoreRoads**：扫掠时使用 ignoreRoads 成本矩阵
