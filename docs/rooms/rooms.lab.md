# rooms.labs.ts — 实验室反应链自动调度模块

## 概述

`rooms.labs.ts` 管理房间（Room）中所有实验室（Lab）的自动反应生产。核心功能包括：

- **动态 Lab 发现**：从自动规划器布局数据中映射 Lab 物理位置到逻辑角色（Input / Output）
- **配方决策**：基于 Storage + Terminal 库存，按优先级自动选择当前应生产的反应链
- **Output Lab 调度**：在满足 CPU Bucket、原料充足、无 Boost 冲突的前提下，驱动 Output Lab 执行 `runReaction`

---

## 前置条件

```typescript
observer && isObserveEnabled() && (Game.time % interval == 0 || 1) && (Game.cpu.bucket > 8000 || Memory.pixelManager?.enabled)
```

- 房间内必须有可用的 Observer（从 `room.memory.Structures.observer` 或 `room.findObserver()` 获取）
- `Memory.observeManager.enabled !== false`
- 当前 tick 落在间隔窗口内
- CPU 桶剩余 > 8000 **或** Pixel Manager 已启用（绕过 CPU 限制）

资源侦察的 CPU 桶阈值略低（> 7000），因为矿藏侦察优先级稍低。

---

## 一、Lab 动态发现（`discoverLabs`）

### 1.1 读取布局数据

从 `Memory.roomPlanner[room.name].layout[STRUCTURE_LAB]` 获取自动规划器记录的 Lab 位置列表。

```typescript
// 示例布局数据结构
Memory.roomPlanner[room.name].layout[STRUCTURE_LAB] = [
    { x: 10, y: 10 },  // Lab 1
    { x: 11, y: 10 },  // Lab 2
    { x: 10, y: 11 },  // Lab 3
    // ...
];
```

### 1.2 验证与分配

1. 检查规划数量 ≥ 2
2. 遍历所有规划位置，通过 `RoomPosition.lookFor(LOOK_STRUCTURES)` 找到实际建成的 Lab
3. **分配规则**：
   - 前 2 个建成 → Input Lab（`inputLab1`, `inputLab2`）
   - 其余 → Output Lab（`outputLab1` ~ `outputLab8`，最多 8 个）
4. 将 Lab ID 写入 `room.memory.labs.*`

```
规划 10 个 Lab
  → 实际建成 8 个
  → inputLab1 = 建成[0], inputLab2 = 建成[1]
  → outputLab1~8 = 建成[2]~建成[9]（取前 8 个）
```

### 1.3 触发时机

| 条件 | 说明 |
|------|------|
| `!room.memory.labs` | 首次运行 |
| `Game.time % 2000 == 0` | 每 2000 tick 重新发现（应对 Lab 被摧毁后重建） |

---

## 二、主循环（`labs` 函数）

每 tick 调用，流程如下：

```
labs(room)
  ├── discoverLabs()          // 周期性动态发现
  ├── 清理过期 boost 状态      // 每 100 tick
  ├── 清除战斗 boost（如无战斗单位） // 每 21000 tick
  ├── pickRecipe()            // 配方选择
  └── runOutputLabs()         // 运行 Output Lab
```

### 2.1 过期 Boost 清理（每 100 tick）

```
遍历 lab1~lab8 的 boost 记录
  → 如果 timestamp > 1000 ticks 前，删除（约 17 分钟超时）
  → 全部清空后，重置 status.boost = {}
```

防止 boost 状态死锁——即使 Lab 被标记为 boost 用途，超时后也会自动释放回生产池。

### 2.2 战斗 Creep 归零时清除 boost（每 21000 tick）

```
检查房间是否有 Spawn 正在孵化 + spawn_list 为空
  → 检查 lab1~lab8 是否全清
    → 查找 ram / SquadCreep / Solomon 类型战斗 Creep
      → 如果没有战斗单位，清空 labMem.status.boost
```

### 2.3 配方选择（`pickRecipe`，每 500 tick 或输入未设定时）

调用 `pickRecipe(room, currentOutput)` 决定当前应生产的反应类型。

#### 2.3.1 库存计算

```typescript
// 辅助函数：Storage + Terminal 联合库存
const stock = (res: string) => (storage.store[res] ?? 0) + (terminal.store[res] ?? 0);
const has   = (res: string, min = 1000) => stock(res) >= min;
```

#### 2.3.2 配方优先级

配方按**从上到下**的顺序依次检查，第一个满足条件的被选中。

##### 第一优先级：基础原料生产（阈值由 `constants.labs` 控制）

| 步骤 | 反应 | 原料 | 产物 | 触发条件 |
|------|------|------|------|----------|
| 0 | 氢氧化物 | O + H | **OH** | `shouldResumeProduction(OH)` && O≥1K && H≥1K |
| 1a | Lemergium 氢化物 | L + H | **LH** | `shouldResumeProduction(LH)` && L≥1K && H≥1K |
| 1b | Lemergium 酸 | OH + LH | **LH2O** | `shouldResumeProduction(LH2O)` && OH≥1K && LH≥1K |
| 1c | 催化 Lemergium 酸 | X + LH2O | **XLH2O** | `shouldResumeProduction(XLH2O)` && X≥1K && LH2O≥1K |
| 2a | Utrium 氢化物 | U + H | **UH** | `shouldResumeProduction(UH)` && U≥1K && H≥1K |
| 2b | Utrium 酸 | OH + UH | **UH2O** | `shouldResumeProduction(UH2O)` && OH≥1K && UH≥1K |
| 2c | 催化 Utrium 酸 | X + UH2O | **XUH2O** | `shouldResumeProduction(XUH2O)` && X≥1K && UH2O≥1K |
| 3a | Zynthium 氧化物 | O + Z | **ZO** | `shouldResumeProduction(ZO)` && O≥1K && Z≥1K |
| 3b | Zynthium 碱性化物 | OH + ZO | **ZHO2** | `shouldResumeProduction(ZHO2)` && OH≥1K && ZO≥1K |
| 3c | 催化 Zynthium 碱性 | X + ZHO2 | **XZHO2** | `shouldResumeProduction(XZHO2)` && X≥1K && ZHO2≥1K |
| 4a | Lemergium 氧化物 | L + O | **LO** | `shouldResumeProduction(LO)` && L≥1K && O≥1K |
| 4b | Lemergium 碱性化物 | OH + LO | **LHO2** | `shouldResumeProduction(LHO2)` && OH≥1K && LO≥1K |
| 4c | 催化 Lemergium 碱性 | X + LHO2 | **XLHO2** | `shouldResumeProduction(XLHO2)` && X≥1K && LHO2≥1K |
| 5a | Zynthium Keanite | Z + K | **ZK** | `shouldResumeProduction(ZK)` && Z≥1K && K≥1K |
| 5b | Utrium Lergite | U + L | **UL** | `shouldResumeProduction(UL)` && U≥1K && L≥1K |
| 5c | Ghodium | ZK + UL | **G** | `shouldResumeProduction(G)` && ZK≥1K && UL≥1K |
| 5d | Ghodium 氧化物 | G + O | **GO** | `shouldResumeProduction(GO)` && G≥1K && O≥1K |
| 5e | Ghodium 碱性化物 | OH + GO | **GHO2** | `shouldResumeProduction(GHO2)` && OH≥1K && GO≥1K |
| 5f | 催化 Ghodium 碱性 | X + GHO2 | **XGHO2** | `shouldResumeProduction(XGHO2)` && X≥1K && GHO2≥1K |
| 6a | Keanium 氧化物 | K + O | **KO** | `shouldResumeProduction(KO)` && K≥1K && O≥1K |
| 6b | Keanium 碱性化物 | OH + KO | **KHO2** | `shouldResumeProduction(KHO2)` && OH≥1K && KO≥1K |
| 6c | 催化 Keanium 碱性 | X + KHO2 | **XKHO2** | `shouldResumeProduction(XKHO2)` && X≥1K && KHO2≥1K |
| 7a | Keanium 氢化物 | H + K | **KH** | `shouldResumeProduction(KH)` && H≥1K && K≥1K |
| 7b | Keanium 酸 | OH + KH | **KH2O** | `shouldResumeProduction(KH2O)` && OH≥1K && KH≥1K |
| 7c | 催化 Keanium 酸 | X + KH2O | **XKH2O** | `shouldResumeProduction(XKH2O)` && X≥1K && KH2O≥1K |
| 8a | Zynthium 氢化物 | H + Z | **ZH** | `shouldResumeProduction(ZH)` && H≥1K && Z≥1K |
| 8b | Zynthium 酸 | OH + ZH | **ZH2O** | `shouldResumeProduction(ZH2O)` && OH≥1K && ZH≥1K |
| 8c | 催化 Zynthium 酸 | X + ZH2O | **XZH2O** | `shouldResumeProduction(XZH2O)` && X≥1K && ZH2O≥1K |
| 9 | Utrium 氧化物（矿工效率） | O + U | **UO** | `st[UO] < 40K (当前产出) || 1K (其他)` && O≥1K && U≥1K |

> `shouldResumeProduction(resource, stock)` 的定义见 `constants.labs`，通常意味着库存低于某个阈值时恢复生产。

##### 第二优先级：40K 补货

| 反应 | 触发条件 |
|------|----------|
| X + LH2O → XLH2O | `st[XLH2O] < 40K` && X≥1K && LH2O≥1K |
| X + UH2O → XUH2O | `st[XUH2O] < 40K` && X≥1K && UH2O≥1K |
| X + ZHO2 → XZHO2 | `st[XZHO2] < 40K` && X≥1K && ZHO2≥1K |
| X + LHO2 → XLHO2 | `st[XLHO2] < 40K` && X≥1K && LHO2≥1K |
| X + KHO2 → XKHO2 | `st[XKHO2] < 40K` && X≥1K && KHO2≥1K |
| X + ZH2O → XZH2O | `st[XZH2O] < 40K` && X≥1K && ZH2O≥1K |
| X + GHO2 → XGHO2 | `st[XGHO2] < 40K` && X≥1K && GHO2≥1K |

##### 第三优先级：50-75K 囤积

| 反应 | 产物阈值 |
|------|----------|
| X + LH2O → XLH2O | `< 75K` |
| X + UH2O → XUH2O | `< 55K` |
| X + ZHO2 → XZHO2 | `< 50K` |
| X + LHO2 → XLHO2 | `< 55K` |
| X + KHO2 → XKHO2 | `< 55K` |
| X + ZH2O → XZH2O | `< 35K` |
| X + GHO2 → XGHO2 | `< 35K` |
| X + KH2O → XKH2O | `< 25K` |

#### 2.3.3 返回值

```
[r1, r2, output]  // [原料1, 原料2, 产物类型]
```

例如：`["O", "H", "OH"]` 表示两个 Input Lab 分别注入 O 和 H，Output Lab 将生产 OH。

### 2.4 Output Lab 运行（`runOutputLabs`）

#### 2.4.1 前置条件

| 条件 | 说明 |
|------|------|
| `Game.cpu.bucket > 4500` | CPU 桶充足（或 PixelManager 启用） |
| `inputLab1` 和 `inputLab2` 存在 | 两个 Input Lab 必须可用 |
| `lab1Input` 和 `lab2Input` 已设置 | 配方已选定 |
| `inputLab1.store[lab1Input] ≥ 5` | 原料充足（每次反应消耗 5） |
| `inputLab2.store[lab2Input] ≥ 5` | 原料充足 |

#### 2.4.2 逐个 Output Lab 调度

```
for (lab1 ~ lab8):
  1. 跳过 cooldown > 0 或无空闲容量的 Lab
  2. 检查 boost 预留：
     if (boostSlot.use > 0 && boostSlot.amount > 0) → 跳过（此 Lab 专用于 boost）
  3. 检查暂停计时器：
     if (paused && paused.timer > 0) → paused.timer--, 跳过本轮
  4. lab.runReaction(inputLab1, inputLab2)
```

#### 2.4.3 Boost 预留机制

Output Lab 可能被保留用于蠕虫 Boost（为战斗 Creep 注入矿物）。预留判断：

```typescript
const boost = room.memory.labs?.status?.boost;
const boostSlot = boost?.[labNum];
const reserved = boostSlot && boostSlot.use !== 0 && boostSlot.amount > 0;
```

被预留的 Output Lab 不会执行 `runReaction`，确保 Boost 所需的 Lab 容量不被生产占用。

---

## 三、资源缩写速查表

### 基础元素

| 常量 | 缩写 | 说明 |
|------|------|------|
| `RESOURCE_UTRIUM` | **U** | Utrium |
| `RESOURCE_LEMERGIUM` | **L** | Legermium |
| `RESOURCE_KEANIUM` | **K** | Keanium |
| `RESOURCE_ZYNTHIUM` | **Z** | Zynthium |
| `RESOURCE_OXYGEN` | **O** | Oxygen |
| `RESOURCE_HYDROGEN` | **H** | Hydrogen |
| `RESOURCE_CATALYST` | **X** | Catalyst |

### 中间产物

| 常量 | 缩写 | 来源反应 |
|------|------|----------|
| `RESOURCE_HYDROXIDE` | **OH** | O + H |
| `RESOURCE_ZYNTHIUM_KEANITE` | **ZK** | Z + K |
| `RESOURCE_UTRIUM_LEMERGITE` | **UL** | U + L |
| `RESOURCE_GHODIUM` | **G** | ZK + UL |

### 初级化合物

| 常量 | 缩写 | 来源反应 |
|------|------|----------|
| `RESOURCE_UTRIUM_HYDRIDE` | **UH** | U + H |
| `RESOURCE_UTRIUM_OXIDE` | **UO** | U + O |
| `RESOURCE_KEANIUM_HYDRIDE` | **KH** | K + H |
| `RESOURCE_KEANIUM_OXIDE` | **KO** | K + O |
| `RESOURCE_LEMERGIUM_HYDRIDE` | **LH** | L + H |
| `RESOURCE_LEMERGIUM_OXIDE` | **LO** | L + O |
| `RESOURCE_ZYNTHIUM_HYDRIDE` | **ZH** | Z + H |
| `RESOURCE_ZYNTHIUM_OXIDE` | **ZO** | Z + O |
| `RESOURCE_GHODIUM_HYDRIDE` | **GH** | G + H |
| `RESOURCE_GHODIUM_OXIDE` | **GO** | G + O |

### 次级化合物（酸 / 碱）

| 类型 | 酸（+ OH） | 碱（+ OH） |
|------|-----------|-----------|
| Utrium | **UH2O** | **UHO2** |
| Keanium | **KH2O** | **KHO2** |
| Legermium | **LH2O** | **LHO2** |
| Zynthium | **ZH2O** | **ZHO2** |
| Ghodium | **GH2O** | **GHO2** |

### 催化产物（+ X）

| 类型 | 催化酸 | 催化碱 |
|------|--------|--------|
| Utrium | **XUH2O** | **XUHO2** |
| Keanium | **XKH2O** | **XKHO2** |
| Legermium | **XLH2O** | **XLHO2** |
| Zynthium | **XZH2O** | **XZHO2** |
| Ghodium | **XGH2O** | **XGHO2** |

---

## 四、关键数据结构

### room.memory.labs

```
room.memory.labs
├── inputLab1       // string — Input Lab 1 ID
├── inputLab2       // string — Input Lab 2 ID
├── outputLab1~8    // string — Output Lab 1~8 ID
├── status
│   ├── lab1Input   // string | false — 当前配方的原料1（如 "O"）
│   ├── lab2Input   // string | false — 当前配方的原料2（如 "H"）
│   ├── currentOutput // string | false — 当前产物类型（如 "OH"）
│   └── boost       // { lab1?: {use, amount, timestamp}, ... } — Boost 预留状态
└── paused          // Array<{ id: string, timer: number }> — 暂停队列
```

### 配方三元组

```
[r1, r2, output]
  │   │    │
  │   │    └─ 产物（写入 Output Lab）
  │   └───── 原料2（注入 inputLab2）
  └───────── 原料1（注入 inputLab1）
```

---

## 五、时间线总结

```
Tick 0~499:    使用上一轮选定的配方运行 Output Lab
Tick 500:      重新 pickRecipe（检查库存，可能切换配方）
Tick 500~999:  运行新配方...
...
Tick 100:      清理过期 boost 状态
Tick 2000:     重新发现 Lab（校验布局数据）
Tick 21000:    清除战斗 boost（如无战斗单位）
```

---

## 六、与 constants.labs 的集成

| 配置项 | 影响范围 |
|--------|----------|
| `getLabThreshold(resource)` | 各产物的库存阈值，决定何时恢复/停止生产 |
| `shouldPauseProduction(resource, stock)` | 库存超过阈值时暂停生产 |
| `shouldResumeProduction(resource, stock)` | 库存低于阈值时恢复生产 |

阈值通过 `constants.labs` 集中管理，便于调优而不修改调度逻辑。

---

## 七、数据流图

```
                    Storage + Terminal 库存
                          │
                          ▼
                    ┌─────────────┐
                    │  pickRecipe │ ← 每 500 tick 刷新
                    └──────┬──────┘
                           │ [r1, r2, output]
                    ┌──────▼──────┐
                    │ Input Labs  │ ← 检查原料 ≥ 5
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Output Lab 1  Output Lab 2  ... Output Lab 8
              │            │            │
              ▼            ▼            ▼
          runReaction()  runReaction()  runReaction()
              │            │            │
              ▼            ▼            ▼
          产物存入 Lab   产物存入 Lab   产物存入 Lab
```

---

## 八、设计要点

| 特性 | 说明 |
|------|------|
| **动态发现** | 不硬编码 Lab ID，从自动规划器布局中实时映射 |
| **优先级配方链** | 先产中间产物（OH、酸、碱），再产催化产物 |
| **分层囤货** | 1K → 40K → 50-75K 三档阈值，逐步满足需求 |
| **Boost 隔离** | Output Lab 中的 boost 槽位在反应期间被预留，不参与生产 |
| **超时清理** | 1000 tick (≈17min) 自动释放 boost 状态，防止死锁 |
| **CPU 保护** | CPU Bucket < 4500 时停止生产（除非 PixelManager 启用） |
| **周期性重选** | 每 500 tick 重新评估配方，跟随库存变化动态调整 |

整体而言，这是一个**基于库存驱动的反应链自动调度系统**，核心思想是"缺什么产什么，有原料就跑反应"。
