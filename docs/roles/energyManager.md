---
name: EnergyManager 能量管理器
---

# EnergyManager 能量管理器

## 概述

EnergyManager 是**房间能源总调度**，负责管理 storage、terminal、lab、factory、container、link、bin、nuker、power_spawn 之间的所有能量和资源流动。是整个房间能源系统的核心。

## 启动方式

通过 `rooms.spawning.ts` 根据 RCL 等级和 danger 状态自动创建：
- RCL 6：基础 EnergyManager
- RCL 7：增强版
- RCL 8：完整版

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'energyManager'` |
| `full` | 是否满载 |
| `MaxStorage` | 最大载量 |
| `storage` | storage ID |
| `locked` | 锁定目标 |
| `suicide` | 自毁标志 |
| `fleeing` / `danger` | 逃生状态 |

## 运行逻辑

### 1. 能量路由（核心）

EnergyManager 按优先级处理能量流动：

**Storage → 各结构：**
- Storage → Bin（当 bin 有空闲时）
- Storage → Tower（tower 能量 < 200）
- Storage → Spawn/Extension（有容量时）
- Storage → Lab（lab 需要能量时）
- Storage → Factory（factory 需要能量时）
- Storage → Nuker（nuker 需要能量时）
- Storage → PowerSpawn（power_spawn 需要能量时）

**Terminal → 各结构：**
- Terminal → Tower/Spawn/Extension（当 terminal 能量富余时）

### 2. 矿物管理

- Storage → Lab（矿物合成）
- Storage → Factory（化合物生产）
- Terminal → Factory（高级化合物）

### 3. 资源平衡

```
条件: room.memory.labs.status.boost.* 存在
```

- 监控 lab 强化状态
- 当 lab 需要矿物时从 storage 提取
- 当 lab 产出强化矿物时转移到 outputLab

### 4. 能量阈值

- Tower 能量 < 200 → 补充
- Spawn/Extension 有容量 → 补充
- Lab 需要能量 → 补充
- Factory 需要能量 → 补充

## 与 room.memory 的联动

- `room.memory.labs`：lab 状态、boost 列表、inputLab/outputLab 数组
- `room.memory.Structures`：storage、bin、controllerLink、towers、extraLinks、factory、nuker、powerSpawn
- `room.memory.danger`：危险状态
- `Memory.targetRampRoom.urgent`：紧急 ramp room 标记
- `Memory.pixelManager?.enabled`：pixel manager 开关

## 关键设计点

- **全局调度**：一个 creep 管理整个房间的所有能源流动
- **优先级队列**：按结构重要性排序处理
- **矿物链路**：不仅管理能量，还管理矿物和化合物
- **RCL 分级**：不同 RCL 创建不同能力的 EnergyManager
- **危险感知**：danger 状态下可能调整行为
