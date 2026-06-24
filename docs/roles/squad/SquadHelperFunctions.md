---
name: squad-helper-functions
title: SquadHelperFunctions
---

# SquadHelperFunctions

## 概述

SquadHelperFunctions 提供了小队移动所需的**路径成本矩阵生成器**，将四个几乎相同的 `roomCallback` 函数合并为一个参数化的构建器。

## 导出函数

| 函数 | 沼泽成本 | 边界成本 | 软阻非小队 | 惩罚敌方建筑 | 用途 |
|------|---------|---------|-----------|------------|------|
| `roomCallbackSquadA` | 5 | 5 | 是 | 是 | 标准攻击移动 |
| `roomCallbackSquadASwampCostSame` | 1 | 3 | 是 | 是 | 空载快速突进（沼泽成本降至 1） |
| `roomCallbackSquadGetReady` | 5 | 15 | 否 | 否 | 集结/准备阶段（边界成本高，不阻挡其他 creep） |

## 核心构建器

### `buildSquadCostMatrix(roomName, opts)`

参数化成本矩阵生成器，按以下顺序构建路径权重：

#### 1. 地形层（48x48 内部区域）

```
for y in 1..48, x in 1..48:
    - 墙壁 → 255（不可通行）
    - 沼泽 → opts.swampCost
    - 平原 → 0
    - 如果相邻三个方向有沼泽 → 提升到 swampCost
    - 如果相邻墙壁 → 提升到 255
```

#### 2. 建筑层

遍历房间内所有结构体：

| 建筑类型 | 处理方式 |
|---------|---------|
| road / container / 己方 rampart | 忽略（成本 0） |
| 己方建筑 | 四格全设为 255（不可通行，避免穿过自己的建筑） |
| 敌方 controller（<50000 HP） | 根据 `penaliseEnemyStructures` 设为 100 或 255 |
| 敌方 controller（≥50000 HP） | 设为 0 或 60 |
| 其他敌方建筑 | 根据 `penaliseEnemyStructures`：true→60，false→100（四格） |

#### 3. 非小队 Creep 层

```
遍历所有 creep:
    if (my && role 不是 carry/SquadCreep*) → 跳过
    if opts.softBlockNonSquadCreeps:
        - 如果四格成本都很低 (<5) → 设为 10
        - 否则 → 设为 255
    else:
        - 设为 255
```

#### 4. 边界层（x=0, x=49, y=0, y=49）

```
for 每条边界:
    - 墙壁 → 255
    - 相邻内部是墙壁 → 255（卡死检测）
    - 其他 → opts.borderCost
```

### `setQuadCost(costs, x, y, weight)`

将 2x2 方块的四格 `(x,y), (x-1,y), (x-1,y-1), (x,y-1)` 统一设置成本。

## 设计动机

原始代码中有四个几乎相同的 `roomCallback` 函数，每个都复制了完整的成本矩阵构建逻辑，仅在参数上不同。重构后：

- **614 行 → ~160 行**
- 行为完全一致
- 新增变体只需添加一个新的包装函数

## 关键设计点

- 成本矩阵影响 `PathFinder.search` 的路径选择，数值越高路径越不愿走
- 255 = 完全不可通行（等价于墙壁）
- 非小队 creep 的软阻塞（softBlock）让其他非小队 creep 绕行，但不完全禁止通行
- 边界成本控制 creep 在房间边缘的行为：低值允许贴边走，高值推离边缘
