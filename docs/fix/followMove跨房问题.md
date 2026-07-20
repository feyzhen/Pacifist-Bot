# followMove 跟随移动 Bug 分析文档

## 问题概述

基于 `超级移动优化` 的 `squadMove` 封装的 `followMove` 跟随移动功能，在跨房移动时出现两个核心 Bug：

1. **同房间落后不等待**：leader 离 followers 较远时，leader 不会停下来等 followers
2. **跨房来回横跳**：leader 在 x/y=0/49 时被传送到相邻房间，此时 0 和 49 会置换，并且不会接着走，导致来回传送（0/49 位置待 1 tick 就会被动传送），followers 跑回集合点

---

## Bug 1：同房间落后太多，leader 不停等待

### 现象

当 leader 与 follower 在同房间时，如果 follower 落后 leader 超过 3 格，leader 会继续前进，不会停下来等 follower。

### 根因

原代码 `computeFollowTargets` 只负责计算 follower 的目标位置，没有任何"同房间 follower 落后太多则 leader 等待"的逻辑。

### 修复方案

在 `computeFollowTargets` 中增加检查：

```ts
// 使用正式坐标计算相对偏移
const prevFormal = toFormal(prevCreep.pos);
const currentFormal = toFormal(currentCreep.pos);
let dx = currentFormal.x - prevFormal.x;
let dy = currentFormal.y - prevFormal.y;

// 检查同房间落后太多 → leader 等待
if (prevCreep.room.name === currentCreep.room.name) {
    if (Math.abs(dx) > 3 && dx < 0) { shouldWait = true; break; }
    if (Math.abs(dy) > 3 && dy < 0) { shouldWait = true; break; }
}
```

返回 `{ targets, wait }`，调用方检测到 `wait=true` 时调用 `squadMove(squad)` 注册不动的小队。

---

## Bug 2：跨房时 0/49 置换导致来回横跳

### 现象

1. leader 到达房间边界（x=0 或 x=49）后，下一 tick 被自动传送到相邻房间的对应位置（x=49 或 x=0）
2. 但 `computeFollowTargets` 用**局部坐标**计算偏移，导致跨房瞬间偏移量从 -1 突变为 -50（或 +49）
3. follower 被发到错误房间/方向，leader 在 0/49 之间反复横跳
4. follower 以为 leader "丢失"了，跑回集合点

### 根因分析

Screeps 的房间坐标系是局部的（0~49），但大地图是连续的。相邻房间的 formal 坐标相差 50：

| 场景 | leader 房间 | follower 房间 | formal 差 | 实际偏移 |
|------|------------|--------------|-----------|----------|
| 同房间 | W1N1 | W1N1 | x=48-49=-1 | -1 |
| 跨房 | E1N1 | W1N1 | x=0-49=-49 | -1（follower 在 leader 后方 1 格） |

原代码用 `currentCreep.pos.x - prevCreep.pos.x` 计算偏移，跨房时得到 -49 而非 -1，导致方向判断完全错误。

### 修复方案

#### 方案 A：使用正式坐标 + 房间索引修正

1. 将 RoomPosition 转为大地图正式坐标（formal coordinates）
2. 根据 follower 所在房间与 leader 当前房间的索引关系，对偏移做 ±49 修正
3. 目标位置基于正式坐标计算后再转回 RoomPosition

```ts
// 跨房偏移修正
const prevRoomIdxX = roomIndexX(prevCreep.room.name);
const leaderCurrentRoomIdxX = roomIndexX(leaderCurrentRoomName);

if (Math.abs(prevRoomIdxX - leaderCurrentRoomIdxX) === 1) {
    if (prevRoomIdxX < leaderCurrentRoomIdxX) {
        dx += 49;  // follower 在上一房间，原始 -50 → 修正为 -1
    } else {
        dx -= 49;  // follower 在下一房间，原始 +50 → 修正为 +1
    }
}
```

#### 方案 B：路径缓存失效检测（防止传送回旧房间）

当 leader 跨房后被传送回旧房间时，path.start 记录的正式坐标与实际位置不匹配，必须重建路径。

```ts
// 验证路径缓存是否仍然有效
const leaderCurrentFormal = toFormal(leader.pos);
if (cache.startFormal && (
    Math.abs(leaderCurrentFormal.x - cache.startFormal.x) > 5 ||
    Math.abs(leaderCurrentFormal.y - cache.startFormal.y) > 5
)) {
    console.log(`[followMove] path cache invalid, rebuilding`);
    cache = createCache(leader, target, squad, opts);
    path = cache.path;
    idx = cache.idx;
}
```

### 关键修正量说明

修正量是 **49** 而非 50，因为：
- 相邻房间的 baseX/baseY 相差 50
- 但同方向相邻格子的偏移只有 1
- 例如 W1N1 x=49 和 E1N1 x=0 的 formal 差是 -50，但 follower 在 leader 后方 1 格，所以修正后应为 -1（-50 + 49 = -1）

---

## 实现文件

- 主文件：`src/utils/followMove.ts`
- 依赖模块：`src/超级移动优化.js` 中的 `squadMove`

## 测试建议

1. **同房间测试**：leader 在 W1N1 x=25，follower 在 x=20，确认 leader 等待
2. **跨房测试**：leader 从 W1N1 x=49 跨入 E1N1 x=0，follower 应在 W1N1 x=48 保持队形
3. **传送恢复测试**：leader 被传送到旧房间后，确认路径缓存重建并继续正确移动
