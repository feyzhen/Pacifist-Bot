---
name: Miner 矿工
---

# Miner 矿工

## 概述

Miner 是**矿物采集者**，负责从 mineral deposit 采集矿物并运送到 storage/terminal。

## 启动方式

通过 `rooms.spawning.ts` 在有 mineral deposit 的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'mineralMiner'` |
| `deposit` | deposit ID |
| `container` | container ID |
| `full` | 是否满载 |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `locked_repair` | 锁定维修目标 |
| `rampartPositions` | rampart 位置列表 |
| `path` | 缓存路径 |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 采集矿物（第 1-2 行）

- 找到 `deposit`（通过 `creep.memory.deposit`）
- `harvest(deposit)` 采集矿物

### 2. 转移矿物（第 3-4 行）

- 如果附近有 container → `transfer(container, mineralType)`
- 如果 container 满了或不存在 → 找 storage → `transfer(storage, mineralType)`
- 如果 storage 不存在 → `findStorage()` 搜索

### 3. 路径缓存

- 使用 `MoveCostMatrixRoadPrio` 导航
- `path` 字段缓存路径提高效率

### 4. 建造与维修

- 如果 deposit 周围没有 container → `createConstructionSite(STRUCTURE_CONTAINER)`
- `build()` 建造 container
- `repair()` 维修损坏的 container

## 关键设计点

- **Container 优先**：先传到 container，再由 filler/energyManager 从 container 提取
- **自动建 container**：没有 container 时自动创建
- **简单直接**：只管理矿物，不负责能量
