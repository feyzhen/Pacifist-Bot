# Observe Manager

房间观察器（Observer）的子功能管理器，提供细粒度的开关控制。

## 概览

| 开关 | 作用 | 默认值 |
|---|---|---|
| `enabled` | 总开关，关闭后所有观察功能停止 | `true` |
| `enemyScout` | 敌方房间侦察与响应（L0 接管、L2 SK 攻击、L3-8 侦察攻击） | `true` |
| `mineScout` | 矿点侦查（发现 deposit 后调用 `SDM` 发起攻击） | `true` |
| `powerScout` | Power Bank 侦查（预留，当前未启用） | `true` |
| `debug` | 调试日志开关，开启后输出侦察和 spawn 信息 | `false` |

## 存储位置

所有配置保存在 `Memory.observeManager` 中，游戏重启后持久化。

## Console 命令

### 总开关

```javascript
// 开启所有功能
global.observeManager.enable()

// 关闭所有功能
global.observeManager.disable()
```

### 子开关

```javascript
// 开启调试日志
global.observeManager.enableDebug()

// 关闭调试日志
global.observeManager.disableDebug()

// 开启/关闭特定子功能
global.observeManager.enableScout('enemy')   // 敌方侦察
global.observeManager.enableScout('mine')    // 矿点侦查
global.observeManager.enableScout('power')   // Power Bank 侦查

global.observeManager.disableScout('enemy')  // 关闭敌方侦察
global.observeManager.disableScout('mine')   // 关闭矿点侦查
global.observeManager.disableScout('power')  // 关闭 Power Bank 侦查
```

### 调试日志

```javascript
// 开启调试日志
global.observeManager.enableDebug()

// 关闭调试日志
global.observeManager.disableDebug()
```

### 状态查看

```javascript
global.observeManager.status()
```

输出示例：

```
=== Observe Manager Status ===
Enabled:      true
Enemy Scout:  true
Mine Scout:   false
Power Scout:  true
Debug:        false
```

## 使用场景

### 场景 1：专注种田，关闭所有侦察

```javascript
global.observeManager.disable()
```

### 场景 2：只想保留矿点侦查，关闭敌方攻击

```javascript
global.observeManager.disableScout('enemy')
```

### 场景 3：关闭矿点侦查（避免误判），保留敌方侦察

```javascript
global.observeManager.disableScout('mine')
```

### 场景 4：临时关闭，之后恢复

```javascript
// 关闭
global.observeManager.disableScout('enemy')
// ... 做别的事 ...
// 恢复
global.observeManager.enableScout('enemy')
```

## 架构说明

```
observeManager (总开关)
├── enemyScout      → 敌方房间侦察与响应
│   ├── L0: WallClearer / DismantleControllerWalls
│   ├── L2: SK 房间攻击波
│   ├── L3-4: 侦察 + 攻击命令
│   ├── L5: 侦察 + 攻击命令
│   └── L6-8: 高级阵型攻击 (SDB/SQR/SS/SQM)
├── mineScout       → 矿点侦查 (SDM)
└── powerScout      → Power Bank 侦查 (预留)
```

## 文件位置

| 文件 | 作用 |
|---|---|
| `src/Misc/observeManager.ts` | 管理器核心逻辑 + Console 命令 |
| `src/Rooms/rooms.observe.ts` | 观察者主逻辑，使用守卫变量 |
| `src/utils/Global.ts` | TypeScript 类型声明 |
