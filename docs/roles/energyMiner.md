---
name: EnergyMiner 能量矿工
---

# EnergyMiner 能量矿工

## 概述

EnergyMiner 是**能量源采集者**，负责从 energy source 采集能量并通过 sourceLink 传送到 storageLink/controllerLink。是房间能源链路的起点。

## 启动方式

通过 `rooms.spawning.ts` 在 RCL5+ 且有 energy source 的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'energyMiner'` |
| `sourceId` | source ID |
| `sourceLink` | sourceLink ID |
| `homeRoom` / `targetRoom` | 房间信息 |
| `boostlabs` | 强化 lab 列表 |
| `potential` | 预期产能（WORK × 6 或 × 2） |
| `NearbyExtensions` | 附近 extension ID 列表 |
| `constructionSites` | 待建造的 site ID 列表 |
| `myRampart` | 需要维修的 rampart ID |
| `source` | source ID |
| `deposit` | deposit ID |
| `checkAmIOnRampart` | 是否在 rampart 上的标记 |
| `allGood` | 容器位置是否合理的标记 |
| `harvested` | 是否已采集 |
| `checkedForRampartToRepair` | 是否已检查 rampart |
| `checkedForSites` | 是否已检查工地 |
| `fu` | 未知标记 |

## 运行逻辑

### 阶段 1：基础模式（任一条件满足）

```
RCL < 5 || targetRoom != homeRoom || links < 2 || CARRY == 0 || sourceLink == null
```

1. **撤离**：`evacuate()`
2. **采集能量**：`harvestEnergy()`
3. **检查容器**：如果 `!allGood`，找 2 格内的 container
4. **移动到 container**：如果 container 位置合理且 source 在 2 格内 → `MoveCostMatrixRoadPrio(container, 0)`

### 阶段 2：高级模式（所有条件都不满足）

1. **强化**：`Boost()`（如果有 boostlabs）
2. **计算产能**：`potential = WORK × 6`（已强化）或 `WORK × 2`
3. **寿命 <= 2**：transfer(sourceLink, ENERGY)
4. **清理空 source**：如果 source.energy == 0 → pickup dropped energy / withdraw container
5. **能量不足时**：
   - 转移到 NearbyExtensions
   - 维修 rampart（storage >= 300000 时修到 100050000，否则修到 50050000）
   - 建造 constructionSites
6. **SourceLink 管理**：
   - 缓存 sourceLink 到 `room.memory.sourceLinks[sourceId]`
   - sourceLink 能量 < 800 → transfer(sourceLink, ENERGY)
7. **Link 间能量传递**：
   - sourceLink → controllerLink（sourceLink >= 400, controllerLink <= 400）
   - sourceLink → extraLink（sourceLink >= 200, extraLink <= 200）
   - sourceLink → storageLink（sourceLink == 800, targetLink == 0）
8. **Rampart 建设**：如果 storageLink 距离 storage > 7 格 → 在 storageLink 旁建 rampart

### 关键逻辑

- **container 检查**：确保 source 附近有 container 可以接 dropped energy
- **rampart 维修**：优先维修 link 附近的 rampart（`myRampart`）
- **link 缓存**：避免每次重新搜索 sourceLink
- **能量传递链**：source → sourceLink → controllerLink/storageLink → 其他结构

## 与 energyManager 的联动

EnergyMiner 通过 sourceLink 管理为 energyManager 提供稳定的能量输入。energyManager 则负责将能量从 storage 分发到各结构。

## 关键设计点

- **双模式**：基础模式下只做采集，高级模式额外管理 link 网络和建造
- **RCL 门控**：RCL < 5 时不进入高级模式（还没建好基础设施）
- **Link 缓存**：`room.memory.sourceLinks[sourceId]` 持久化 link 映射
- **Bucket 保护**：`Game.cpu.bucket < 1000 && !pixelManager` 时不执行（节省 CPU）
