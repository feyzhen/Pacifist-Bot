---
name: RampartUpgrader 城墙升级者
---

# RampartUpgrader 城墙升级者

## 概述

RampartUpgrader 负责升级 rampart 的血量上限（通过 rebuild）。当 rampart 被摧毁或需要增强防御时，先拆掉旧的再建新的。

## 启动方式

通过 `main.ts` 注册到 ROLES 映射表，由 `rooms.spawning.ts` 在需要升级防御的房间创建。

## 内存字段

| 字段 | 说明 |
|------|------|
| `role` | `'RampartUpgrader'` |
| `targetRoom` / `homeRoom` | 房间信息 |
| `full` | 是否满载 |
| `locked` | 锁定 rampart ID |
| `storage` | storage ID |

## 运行逻辑

1. 找需要升级的 rampart（`hits < hitsMax` 但重建后上限更高）
2. `destroy(locked)` 拆除旧 rampart
3. `createConstructionSite(pos, STRUCTURE_RAMPART)` 建新站
4. `build(site)` 建造新 rampart
5. 完成后 `recycle()`

## 关键设计点

- **rebuild 而非 repair**：不是修而是拆了重盖，获得更高的血量上限
- **与 RampartErector 互补**：Erector 建第一波，Upgrader 升级已有 rampart
