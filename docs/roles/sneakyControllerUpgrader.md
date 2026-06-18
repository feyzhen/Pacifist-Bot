---
name: SneakyControllerUpgrader 隐秘升级者
---

# SneakyControllerUpgrader 隐秘升级者

## 概述

SneakyControllerUpgrader 是**隐秘升级者**，在危险房间中偷偷升级 controller。检测到敌人时丢弃能量并逃跑。

## 启动方式

通过 `rooms.spawning.ts` 在需要升级但存在危险的 remote room 创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'SneakyControllerUpgrader'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `source` | source ID |
| `in_danger` | 是否在危险中 |
| `exit` | 逃生出口 |
| `locked_away` | 隐藏位置 |

## 运行逻辑

### 1. 采集能量

```
条件: !full
```

- `harvestEnergy()` 从 source 采集
- `pickup(dropped)` 捡起掉落物
- `withdraw(container, ENERGY)` 从 container 取能
- `findSource()` 找 source

### 2. 升级控制器

```
条件: full && !in_danger
```

- `upgradeController(controller)` 升级

### 3. 逃跑

```
条件: in_danger || FIND_HOSTILE_CREEPS 距离 ≤ 15
```

- `drop(RESOURCE_ENERGY)` 丢弃能量
- `locked_away = true` 锁定逃跑位置
- 向 exit 移动

## 关键设计点

- **危险感知**：检测到敌人立即放弃升级逃跑
- **丢能量**：逃跑时 `drop(ENERGY)` 让后续 creep 能回收
- **隐秘升级**：适合在有少量敌人的房间偷偷升级
