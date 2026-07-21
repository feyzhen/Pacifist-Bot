# followMove 问题分析与修复计划

## 背景

`followMove` 基于 `squadMove` 封装，实现 leader 规划路径、follower 跟随的移动效果。当前实现存在 4 个核心问题，会导致跨房时队形错乱、路径穿建筑、到达检测失效。

---

## 问题 A：寻路未使用 squad CostMatrix

### 现象

Leader 的路径可能穿过建筑，或规划到摆不下 2x2 小队的位置。

### 原因

`findSquadLikePath` (src/utils/followMove.ts:218-236) 自己构建普通 `CostMatrix`，只处理了墙体和道路，没有像超级移动的 `squadRoomCallback` 那样检查 2x2 区域是否可放下小队。

### 修复思路

复用超级移动已生成的 `costMatrixCache[roomName]['squad'][ignoreDestructibleStructures]`，或至少引入相同的 2x2 可达性检查逻辑。

---

## 问题 B：寻路不避开我方 creep

### 现象

PathFinder 可能把 leader 直接规划到 follower 脸上，导致每 tick 都需要解算推挤。

### 原因

```ts
// src/utils/followMove.ts:322-325
room.find(FIND_CREEPS).forEach((c: Creep) => {
    if (!c.my) costs.set(c.pos.x, c.pos.y, 255);
});
```

只堵敌方 creep，自己的 follower 当不存在。

### 修复

新增 `applyFollowerAvoidance(costs, followerPositions, rName)`，在 squad 寻路时把 `squad.slice(1)`（所有 follower）的当前坐标在对应房间的 CostMatrix 中标为 255。这样 leader 的路径天然绕开 follower。

```ts
const followerPositions = squad.slice(1).map(c => c.pos); // 排除 leader
// ...
pfOpts.roomCallback = (rName: string): boolean | CostMatrix => {
    const room = Game.rooms[rName];
    if (room) {
        const costs = buildSimpleCostMatrix(room, ignoreStructures, costCallback);
        applyFollowerAvoidance(costs, followerPositions, rName);
        return costs;
    }
    return false;
};
```

---

## 问题 C：路径结束时 idx 越界

### 现象

路径走完但 `getRangeTo(target) > 1` 时，所有成员被指向 W0N0 原点。

### 原因

```ts
// src/utils/followMove.ts:96-106
idx++;
cache.idx = idx;
const leaderNextPos = path.posArray[idx];
if (!leaderNextPos) {
    squadMove(squad);
    return OK; // 这里返回 OK，但上面的 idx++ 已越界，下一 tick 会继续越界
}
```

当 `leaderNextPos` 为 `undefined` 后，`computeFollowTargets` 的 `formalize(undefined)` 返回 `{x:0,y:0}`。

### 修复思路

- 在 `idx++` 前检查是否已到达目标范围；
- 到达后直接 `squadMove(squad)` 锁住，不要修改 idx 后再返回；
- 或者检测到 `!leaderNextPos` 时立即返回，不等后续逻辑。

---

## 问题 D：Leader 变更导致队形翻转

### 现象

如果 follower 初始 formal 坐标比 leader 大（如 follower 在东北方向），`squadMove` 会自动选 formal x/y 最大的 creep 作为 leader，导致 followMove 记录的 offset 基准与实际 leader 不一致。

### 原因

`squadMove` 第 2367 行用 `target[0]` 注册意图，但 `endTickResolve` 解算时按 `cachedMoveIntents` 中的 name→idx 映射处理，不强制要求某个固定 creep 是 leader。而 `computeOffsets` 以传入的 `leader` 参数为基准，两者可能不同。

### 修复思路

方案一：在 `followMove` 中强制规定哪个 creep 是 squad 的「名义 leader」，并在调用 `squadMove` 时确保它始终是第一个参数。

方案二：不依赖 squadMove 的内部选择，改为用 `squadMove(squad, targets)` 显式传每个 creep 的目标位置，offset 始终以用户传入的 leader 计算。当前代码已经是方案二，但需要确认 `squadMove` 不会忽略 target 数组顺序。

检查 `squadMove`：第 2367 行 `registerMoveIntent(squad[0], target[0].pos || target[0])`，确实按数组顺序注册。所以 follower 的 target[i] 必须对应 squad[i]。当前 `computeFollowTargets` 返回的 targets 与 squad 一一对应，**只要 computeOffsets 以传入的 leader 为基准就没问题**。

真正的问题在于：`squadMove` 的 `registerMoveIntent` 只记录单个 target tile，解算时多个 creep 的意图会被统一处理。如果 follower 的 formal 坐标比 leader 大，解算后 follower 会变成「右下角」，但 followMove 仍按原 leader 计算下一 tick 的 target，导致队形偏移。**需要在 followMove 层面保证：传给 squad 的 leader 始终是 formal 坐标最小的那个，或者在 computeOffsets 里动态调整。**

最简单的修复：在 `followMove` 入口处校验并可能 swap leader 和 follower 的角色；或在文档中约定用户必须先排列好队形（leader 在右下角）。

---

## Leader/Follower 测试阻塞项

| 阻塞项 | 文件 | 影响 |
|---|---|---|
| `preTickBetterMove` / `endTickResolve` 必须在主循环调用 | `src/main.ts` | 否则 squadMove 注册的意图永不执行 |
| follower 需在 leader formal 坐标的西南方初始化 | `Roles/Party/Follower.ts` | 否则 squadMove 选 leader 规则与 followMove offset 基准冲突 |
| 双方 body 必须包含 MOVE | spawn 配置 | 无 MOVE 的 creep 无法被推动 |

---

## 建议修复顺序

1. **修复 C**（路径结束越界）— 最小改动，优先保证基础移动不崩溃。
2. **修复 B**（避开我方 creep）— 防止 PathFinder 把 leader 规划到 follower 脸上。
3. **修复 A**（使用 squad CostMatrix）— 确保路径不穿墙、不穿建筑。
4. **验证 D**（leader 选择一致性）— 先通过初始队形约束解决，再考虑代码层面的强制。
5. **补测试** — 在同房间 2 人移动到同房间目标，验证基础路径 + 队形保持；再测跨房间移动。
