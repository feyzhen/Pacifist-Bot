---
name: Sign 签名者
---

# Sign 签名者

## 概述

Sign 是**控制器签名者**，在 controller 上签名显示领地信息。最简单的角色之一，签完即回收。

## 启动方式

通过 `main.ts` 注册到 ROLES 映射表，由其他角色（如 WallClearer）触发创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'Sign'` |
| `suicide` | 自毁标志 |

## 运行逻辑

### 1. 签名

```
条件: controller 存在
```

- `signController("YT: @YourTerribleEmpire")` 签名

### 2. 回收

```
条件: 签名完成
```

- `recycle()` 或 `suicide()`

## 关键设计点

- **极简**：只做签名这一件事
- **一次性**：签完就回收
- **领地声明**：展示 "YT: @YourTerribleEmpire" 作为领地标识
