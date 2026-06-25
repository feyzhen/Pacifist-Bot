# RoomPosition 扩展函数

**文件路径**: `src/Functions/roomPositionFunctions.ts`

## 概述

本文件为 Screeps 原生 `RoomPosition` 对象扩展了四个便捷方法，用于获取目标位置周围的可行走/空闲位置。这些扩展方法封装了地形检测、生物体（蠕虫/结构）过滤等重复逻辑，使业务代码可以更简洁地表达意图。

所有扩展方法均遵循 Screeps 插件模式的惯例：在原型上定义函数，全局生效。

---

## 依赖

- **lodash** (`_`): 用于数组过滤
- **Screeps 原生 API**:
  - `Game.map.getRoomTerrain(roomName)` — 获取房间地形数据
  - `RoomPosition.lookFor(LOOK_*)` — 查询某位置的物体
  - `TERRAIN_MASK_WALL` — 墙壁的地形掩码常量
  - `STRUCTURE_ROAD` / `STRUCTURE_CONTAINER` — 结构体类型常量

---

## 接口定义

```ts
interface RoomPosition {
    getNearbyPositions: () => Array<RoomPosition>;
    getOpenPositions: () => Array<RoomPosition>;
    getOpenPositionsIgnoreCreeps: () => Array<RoomPosition>;
    getOpenPositionsIgnoreCreepsCheckStructs: () => Array<RoomPosition>;
}
```

---

## 方法详解

### 1. `getNearbyPositions()`

获取当前位置周围 8 个相邻位置的列表（上、下、左、右、四个对角线）。

**返回值**: `RoomPosition[]` — 最多 8 个相邻位置的数组

**边界处理**:
- 使用 `this.x - 1 || 1` 和 `this.y - 1 || 1` 确保起始坐标不小于 1（Screeps 房间有效坐标范围为 1~48）
- 循环上限通过 `x < 49` / `y < 49` 限制，防止越界到 49 及以上（Screeps 房间最大坐标为 48）
- 排除自身位置 (`x !== this.x || y !== this.y`)

**注意**: 此方法**不做地形或生物体检查**，仅基于坐标范围筛选。如果当前位置紧邻墙壁或房间边界，返回的位置中可能包含不可通行的墙内坐标。

---

### 2. `getOpenPositions()`

获取当前位置周围所有**可通行且无人无物**的空闲位置。

**过滤流程**:
1. 调用 `getNearbyPositions()` 获取候选位置
2. 通过地形数据过滤掉墙壁位置 (`terrain.get(x, y) === TERRAIN_MASK_WALL` 被排除)
3. 通过 `lookFor(LOOK_CREEPS)` 过滤掉有蠕虫占据的位置

**返回值**: `RoomPosition[]` — 既可通过行走又无蠕虫占据的相邻位置

**典型用途**: 蠕虫需要找到一个安全的空位进行移动或部署操作时使用。

---

### 3. `getOpenPositionsIgnoreCreeps()`

获取当前位置周围所有**可通行**的位置，**不检查是否有蠕虫**。

**过滤流程**:
1. 调用 `getNearbyPositions()` 获取候选位置
2. 通过地形数据过滤掉墙壁位置

**返回值**: `RoomPosition[]` — 所有可通过行走的相邻位置（可能有蠕虫）

**典型用途**: 场景如侦察（scout）需要评估周围所有可用地形，无论当前是否被占据。

---

### 4. `getOpenPositionsIgnoreCreepsCheckStructs()`

获取当前位置周围**可通行且无阻挡性建筑**的位置，**不检查蠕虫**，但会检查结构体。

**过滤流程**:
1. 在 `getNearbyPositions()` 基础上增加坐标边界检查 (`x >= 1 && x <= 48 && y >= 1 && y <= 48`)
2. 通过地形数据过滤掉墙壁位置
3. 检查结构体：仅当位置**没有任何结构体**，或**仅有 ROAD 或 CONTAINER** 时保留

**返回值**: `RoomPosition[]` — 可通过且无关键建筑的相邻位置

**允许的结构体**:
- `STRUCTURE_ROAD` — 道路不影响通行
- `STRUCTURE_CONTAINER` — 容器不影响通行

**排除的结构体**: 其他任何结构体（如 tower、lab、extension 等）都会导致该位置被过滤掉。

**典型用途**: 需要寻找空地放置新建筑，或蠕虫需要避开有障碍物的位置时使用。

---

## 方法对比

| 方法 | 地形检查 | 蠕虫检查 | 结构体检查 | 坐标边界 |
|------|---------|---------|-----------|---------|
| `getNearbyPositions` | ❌ | ❌ | ❌ | ✅ |
| `getOpenPositions` | ✅ | ✅ | ❌ | ❌ |
| `getOpenPositionsIgnoreCreeps` | ✅ | ❌ | ❌ | ❌ |
| `getOpenPositionsIgnoreCreepsCheckStructs` | ✅ | ❌ | ✅ (仅允许 Road/Container) | ✅ |

---

## 已知问题

1. **`getNearbyPositions` 的边界检查不完整**: 该方法没有显式限制 `x >= 1 && y >= 1`，而是依赖 `|| 1` 将负值修正为 1。但如果 `this.x === 0`（理论上不应发生），`this.x - 1 || 1` 会得到 `1`，可能导致从错误起点开始遍历。

2. **`getOpenPositions` 和 `getOpenPositionsIgnoreCreeps` 缺少坐标边界检查**: 这两个方法直接依赖 `getNearbyPositions` 的结果，而后者在边界情况下可能返回超出 1~48 范围的坐标。建议在这些方法的 terrain 过滤后增加显式坐标校验。

3. **`getNearbyPositions` 的 `|| 1` 技巧**: `this.x - 1 || 1` 在 `this.x === 1` 时会得到 `0 || 1 === 1`，在 `this.x === 0` 时也会得到 `1`，但在 `this.x === 2` 时得到 `1`（正确）。这个逻辑本身没有问题，但可读性较差，建议使用 `Math.max(1, this.x - 1)` 替代。
