# rooms.market.ts 执行逻辑

## 概述

`rooms.market.ts` 是一个房间级别的市场交易模块，负责自动买卖资源、跨房间调货、能量调度等功能。主入口为 `market(room)` 函数，在 `rooms.ts` 中被每 tick 调用。

整个逻辑分为 **两个主要分支**：
- **分支 A**（第 17~824 行）：当 `terminal.cooldown == 0` 且满足条件时执行的**市场交易逻辑**
- **分支 B**（第 825~1016 行）：无论分支 A 是否执行都运行的**后期市场逻辑**

---

## 前置条件（分支 A 入口守卫）

```
terminal.cooldown == 0
AND terminal 存在
AND storage 存在
AND memory.Structures.spawn 指向有效建造物
AND Game.time % 10 == 0
AND (Game.cpu.bucket > 1000 || Memory.pixelManager?.enabled)
```

只有以上全部满足，才进入分支 A。

---

## 分支 A：市场交易逻辑

### 1. 矿物自动直售（第 18~64 行）

**触发条件：**
- `terminal.store` 已用容量 > 300,000
- terminal 中矿物量 > 100,000

**逻辑：**
1. 确定要卖的矿物（优先使用 `room.memory.mineral` 指向的矿物类型）
2. 查找市场上该矿物的最高价买单（`ORDER_BUY`）
3. 直接以 500 单位的数量成交（`Game.market.deal`）
4. 成功后打印日志并 return，**后续逻辑不再执行**

> 这是一个"抢单"机制——终端有空闲时，优先把大量库存矿物直接卖给市场上的买家，省去了挂单的步骤。

---

### 2. 矿物挂单销售（第 66~176 行）

**触发条件：**
- terminal 中矿物量 >= 30,000

**子流程 2a：已有卖单时的维护**

如果 `room.memory.market.sellOrders.roomMineral.ID` 指向一个有效的卖单：
- 当剩余量 <= 1,000 时，自动补充 4,000 单位
- 每 400 tick，重新计算合理价格，若偏离超过 ±2 则更新价格

**子流程 2b：没有卖单时的创建**

1. 在 `Game.market.orders` 中搜索是否已有本房间的同矿物卖单
2. 若找到，记录 ID 到 memory
3. 若没找到，调用 `CalcPriceForOrder()` 计算价格并创建卖单（总量 5,000）

#### `CalcPriceForOrder()` 定价算法

基于 `Game.market.getHistory(resource)` 的历史价格数据：
- 加权平均近 105 天的均价（权重递增）
- 根据当前库存量调整售价：
  - 库存 >= 100,000：均价 - 6（若均价 > 6）
  - 库存 >= 80,000：均价 - 4
  - 库存 >= 60,000：均价 - 2
  - 库存 < 60,000：均价 + 标准差
  - 无历史数据：返回 0.009

---

### 3. 资源归属登记（第 234~251 行）

**触发条件：**
- `Memory.my_goods` 初始化（首次运行）
- 或矿物类型不在已登记房间列表中

**逻辑：**
将本房间名注册到 `Memory.my_goods[矿物类型]` 数组中，标记"这个房间产这种矿物"。

每 10,000 tick 会重置 `Memory.my_goods = false`，强制重新扫描登记。

---

### 4. 跨房间资源调配（第 253~273 行）

**触发条件：**
- terminal 中能量 >= 2,000
- 有有效的 spawn 和 storage

**逻辑：**
遍历所有基础资源（H, O, U, K, L, Z, Catalyst），对于每种资源：
- 若 terminal 中存量 < 8,000 且不是本房矿物
- 查找 `Memory.my_goods[资源]` 中登记了该资源的房间
- 从那些房间的 terminal 发送 1,000 单位过来

> 这是一个内部资源共享网络，让产矿物/资源的房间互相补给。

---

### 5. 基础资源购买（第 288~318 行）

**触发条件：**
- 信用点足够（shard3: >= 1,000,000；其他分片: >= 10,000）
- terminal 空闲容量 > 1,000

**逻辑：**
1. 按四层价格阶梯（2、50、100、500）遍历
2. 对每种基础资源：
   - 非矿物类型：terminal 存量 < 8,000 时购买
   - 矿物类型：terminal 存量 < 1,000 时购买
3. 调用 `buy_resource()` 函数——查找市场上最便宜的卖单，能量损耗 <= 配额时成交

4. 若信用点 > 1 亿，检查 Power 总库存（terminal + storage）< 5,000，不足则购买

#### `buy_resource()` 函数

```typescript
buy_resource(resource, OrderPrice=5, OrderAmount=1000)
```
- 查找 `ORDER_SELL` 类型的卖单
- 过滤条件：能量损耗 <= OrderAmount × 4 且 单价 <= OrderPrice
- 按价格升序排序，买最便宜的一单
- 返回 0 表示成功，非 0 表示失败

---

### 6. 通用资源销售（第 333~361 行）

**触发条件：**
- terminal 能量 >= 2,000

**逻辑：**
遍历 `SELL_RESOURCES` 列表（约 20 种中间产物），对每种资源：
- 跳过 OPS 且 terminal 中 OPS >= 35,000
- 获取该资源的销售阈值（普通资源 1,000；特殊资源 3,500）
- 若 terminal 存量 >= 阈值，调用 `sell_resource()`

#### `sell_resource()` 函数

```typescript
sell_resource(resource, minPrice=null, OrderAmount=1000, sellThreshold=1000)
```

**核心流程：**

1. **动态定价**：若 `minPrice === null`，调用 `CalcPriceForSale()` 计算
2. **检查自有卖单**：
   - 若存在且未过期（400 tick 内），则补充数量 + 定期调价
   - 若过期 ≤ 1 次，复活卖单（更新价格）
   - 若过期 > 1 次，取消卖单
3. **无有效卖单时**：
   - 查找市场上符合条件的买单（数量 >= 1000、能量损耗合理、价格 >= 动态价）
   - 若有匹配买单 → 直接 `deal` 卖出
   - 若无 → 创建 sell order 挂单

#### `CalcPriceForSale()` 动态定价算法

```typescript
CalcPriceForSale(resource, resourceStored)
```

1. 获取历史数据，用 IQR 法过滤标准差异常日
2. 对过滤后的数据做加权平均（权重递增）
3. 根据库存量选择策略：
   - 库存 >= 5,000：`max(2, 均价)` — 积极销售
   - 库存 >= 2,000：`max(2, 均价 + 标准差)` — 正常销售
   - 库存 >= 100：`max(2, 均价 + 2×标准差, 均价×1.2)` — 保守销售
   - 库存 < 100：`max(2, 均价 + 5×标准差)` — 极度保守
4. 无历史数据时返回 2

---

### 7. 能量购买（第 555~585 行）

**触发条件：**
- terminal 能量在 2,000~10,000 之间
- storage 中能量 < 100,000

**逻辑：**
- 查找市场上能量卖单，单价 <= 20，能量损耗 <= 5,000 × 0.5
- 买最便宜的一单（5,000 单位）

---

### 8. Boost 资源调配（第 589~650 行）

**触发条件：**
- 当前房间是 boost 资源的生产方（terminal > 500 且 storage > 阈值）

**逻辑：**
1. 遍历 8 种 boost 资源（各种催化酸/碱）
2. 若某房间 storage/terminal 中 boost 资源不足，将其加入 `Memory.resource_requests[资源]`
3. 生产方房间查找请求列表中的房间，通过 terminal 发送 500 单位

---

### 9. 特殊资源销售（第 656~715 行）

**9a. 分级销售**

遍历硬编码的特殊资源列表（Condensate → Machine 共 27 种）：
- 若 terminal 存量 >= 阈值，使用预设固定价格调用 `sell_resource()`

**9b. 清空库存销售**

对 8 种资源（Condensate, Concentrate, Wire, Switch, Cell, Phlegm, Alloy, Tube）：
- 只要 terminal 中有存量，就以固定价格全部卖出

---

### 10. Pixel 交易（第 746~823 行）

**触发条件：**
- `Memory.pixelManager.tradingEnabled` 为 true
- 全局拥有 Pixel（`Game.resources[PIXEL] > 0`）
- `Game.time % 100 == 0`

**逻辑：**

1. 保留 500 个 Pixel，其余用于出售
2. 优先找市场上现有的买单直接 deal（每次最多 1 个）
3. 若无合适买单，每 500 tick：
   - 检查是否有本房间的 Pixel 卖单
   - 有则调价/补量
   - 无则创建新卖单

#### `calcPixelPrice()` 定价

- 基于历史均价加权平均，售价 = `floor(均价 × 0.95)`（略低以加快售出）
- 无历史数据时返回 8,000

---

## 分支 B：后期市场逻辑

### 11. 市场爬虫（Market Crawler）（第 825~878 行）

**触发条件：**
- storage 能量 > 430,000
- `Game.time % 110 == 0`
- `Game.cpu.bucket > 9,000` 或 pixelManager 启用
- terminal 冷却为 0 且空闲容量 > 50,000

**逻辑：**
- 遍历 80+ 种资源列表（可随机打乱顺序）
- 对每种资源调用 `buy_resource_crawler()`，预算上限 3 信用点/单位
- 统计未找到的资源数量并打印

#### `buy_resource_crawler()`

类似 `buy_resource()`，但：
- 订单量固定 50
- 能量损耗上限 = 50 × 8 = 400
- 单价上限 = 3
- 找不到时返回 `false`

---

### 12. 目标房间能量支援（第 880~900 行）

**触发条件：**
- `Memory.targetRampRoom` 设置了目标房间
- 目标房间未达成 Controller 8 + Storage 400,000 能量
- `Game.time % 20 == 0`
- 目标房间 Terminal 能量 < 80,000 且有空位

**逻辑：**
- 若本房间 storage 能量充足（> 200,000 或 > 290,000 视 CPU 状态）
- 向目标房间 terminal 发送 10,000 能量

---

### 13. 能量挂单销售（第 904~965 行）

**触发条件：**
- `Game.time % 1000 == 0`
- storage 能量 > 430,000 且 terminal 能量 > 30,000

**逻辑：**
1. 检查是否有本房间的能量卖单
2. 有则补充量 + 涨价时更新价格
3. 无则创建新的能量卖单（20,000 单位）

#### `CalcPriceForOrder(RESOURCE_ENERGY)`

- 加权平均历史价格 / 105
- 返回 `均价 + 1`
- 无数据时返回 5.889

---

### 14. 能量挂单购买（第 967~1016 行）

**触发条件：**
- `Game.time % 50 == 0`
- storage 能量 < 100,000 且 terminal 能量 < 50,000
- 信用点 > 1,000,000

**逻辑：**
1. 查找本房间的能量买单
2. 若买单量 < 1,000 且 storage 能量 < 100,000，补充到 20,000
3. 若无买单，创建能量买单（20,000 单位，价格 = 均价 + 1）

---

### 15. 价格校验工具函数（第 1021~1027 行）

```typescript
price_checker(price, resource)
```
- 若资源有特殊价格设定，检查 `price >= 特殊价格`
- 否则返回 true

> 此函数导出但未在当前文件中被调用，可能供外部使用。

---

## 执行流程图

```
market(room)
│
├─ [分支A] terminal空闲且每10tick
│   ├─ 1. 矿物直售（终端容量>30万 → deal买单）
│   ├─ 2. 矿物挂单销售（>=3万 → create/extend sell order）
│   ├─ 3. 资源归属登记
│   ├─ 4. 跨房间资源调配（<8千 → 从产地方拉1千）
│   ├─ 5. 基础资源购买（分层购买 H/O/U/K/L/Z）
│   ├─ 6. 通用资源销售（20种中间产物 → sell_resource）
│   ├─ 7. 能量购买（terminal 2k~10k → 买能量）
│   ├─ 8. Boost 资源调配（生产方 → 消费方发500）
│   ├─ 9. 特殊资源销售（27种 + 8种清空）
│   ├─ 10. Pixel 交易（保留500，其余卖出）
│   └─ (矿物直售成功则 return，跳过后面的)
│
├─ [分支B] 无条件执行
│   ├─ 11. 市场爬虫（80+种资源，每110tick，预算3）
│   ├─ 12. 目标房间能量支援（每20tick）
│   ├─ 13. 能量挂单销售（每1000tick）
│   └─ 14. 能量挂单购买（每50tick）
│
└─ 15. price_checker 工具函数（独立导出）
```

---

## 关键常量参考

| 常量 | 值 | 用途 |
|------|------|------|
| `BASE_RESOURCES` | 7种 | 基础购买资源列表 |
| `SELL_RESOURCES` | 20种 | 通用销售资源列表 |
| `CRAWLER_RESOURCES` | 80+种 | 市场爬虫扫描列表 |
| `TERMINAL_CAPACITY` | 300,000 | 矿物直售触发阈值 |
| `ROOM_MINERAL` | 30,000 | 矿物挂单触发阈值 |
| `BASE_MAX` | 8,000 | 基础资源购买阈值 |
| `DEFAULT_SELL` | 1,000 | 通用资源销售阈值 |
| `SPECIAL_SELL` | 3,500 | 特殊资源销售阈值 |
| `POWER_PURCHASE` | 1亿信用点 | Power 购买门槛 |
| `MARKET_CRAWLER_PRICE` | 3 | 爬虫预算上限 |
| `MARKET_CRAWLER_AMOUNT` | 50 | 爬虫每次购买量 |

---

## 定价策略总结

| 场景 | 策略 |
|------|------|
| 矿物直售 | 抢最高价买单 |
| 矿物挂单 | 历史加权均价 - 库存折扣 |
| 通用资源销售 | IQR过滤 + 加权均价 + 库存分级调整 |
| 特殊资源销售 | 固定预设价格 |
| Pixel 交易 | 历史均价 × 0.95 |
| 能量销售 | 历史均价 + 1 |
| 能量购买 | 历史均价 + 1 |
