# Pacifist-Bot 优化计划

## 📊 当前状态分析

### 模块结构概览
- **Functions/**: 4个文件, 87KB (核心功能函数)
- **Roles/**: 60个文件, ~400KB (角色逻辑 - 最庞大)
- **Rooms/**: 12个文件, 380KB (房间管理)
- **utils/**: 8个文件, 135KB (工具类)
- **Managers/**: 8个文件, 14KB (管理器)
- **Misc/**: 7个文件, 36KB (杂项功能)

### 主要问题
1. **文件大小不均衡**: 多个超大文件难以维护
2. **角色管理混乱**: 60个角色文件缺乏分类
3. **导入依赖复杂**: main.ts中50+行角色导入
4. **命名不一致**: 混合使用不同命名规范

## 🎯 优化目标

- **可维护性**: 提升70%
- **代码复用**: 提升40%
- **性能**: 提升15% (减少重复计算)
- **开发效率**: 提升50% (更好的模块化)

## 🚀 优化计划

### 阶段一: 核心重构 (高优先级)

#### 1.1 拆分大文件
**目标**: 将超大文件拆分为可维护的小模块

**creepFunctions.ts (61KB) → creep/**
```
Functions/creep/
├── movement.ts      # 移动相关函数
├── combat.ts        # 战斗相关函数
├── resource.ts      # 资源操作函数
└── index.ts         # 统一导出
```

**roomFunctions.ts (8KB) → room/**
```
Functions/room/
├── logistics.ts     # 物流相关
├── defence.ts       # 防御相关
├── economy.ts       # 经济相关
└── index.ts         # 统一导出
```

**rooms.spawning.ts (158KB) → spawning/**
```
Rooms/spawning/
├── queue.ts         # 生成队列管理
├── templates.ts     # Creep模板
├── logic.ts         # 生成逻辑
└── index.ts         # 统一导出
```

**Commands.ts (115KB) → commands/**
```
utils/commands/
├── admin.ts         # 管理员命令
├── combat.ts        # 战斗命令
├── economy.ts       # 经济命令
└── index.ts         # 统一导出
```

#### 1.2 重构角色系统
**目标**: 将60个角色按功能分类管理

**新角色结构**:
```
Roles/
├── Economy/         # 经济角色
│   ├── miner.ts
│   ├── carry.ts
│   ├── upgrader.ts
│   ├── filler.ts
│   └── index.ts
├── Military/        # 军事角色
│   ├── attacker.ts
│   ├── defender.ts
│   ├── healer.ts
│   ├── ranged.ts
│   └── index.ts
├── Support/         # 支援角色
│   ├── builder.ts
│   ├── repair.ts
│   ├── maintainer.ts
│   └── index.ts
├── Special/         # 特殊角色
│   ├── scout.ts
│   ├── claimer.ts
│   ├── dismantle.ts
│   └── index.ts
└── index.ts         # 统一导出
```

#### 1.3 创建角色注册系统
**目标**: 简化角色导入和管理

```typescript
// utils/RoleRegistry.ts
export class RoleRegistry {
  private static roles = new Map<string, Role>();
  
  static register(name: string, role: Role) {
    this.roles.set(name, role);
  }
  
  static get(name: string): Role {
    return this.roles.get(name);
  }
  
  static getAll(): Map<string, Role> {
    return this.roles;
  }
}
```

### 阶段二: 标准化改进 (中优先级)

#### 2.1 统一命名规范
- **文件名**: kebab-case (energy-miner.ts)
- **类名**: PascalCase (EnergyMiner)
- **函数名**: camelCase (runEnergyMiner)
- **常量**: UPPER_SNAKE_CASE (MAX_CREEPS)

#### 2.2 提取配置系统
```
config/
├── spawn.ts         # 生成配置
├── combat.ts        # 战斗配置
├── economy.ts       # 经济配置
├── defence.ts       # 防御配置
└── index.ts         # 统一导出
```

#### 2.3 改进类型定义
```
types/
├── creep.ts         # Creep相关类型
├── room.ts          # Room相关类型
├── combat.ts        # 战斗相关类型
├── economy.ts       # 经济相关类型
└── index.ts         # 统一导出
```

#### 2.4 重构main.ts
**目标**: 简化主文件，提高可读性

```typescript
// 优化后的main.ts结构
import { ErrorMapper } from "./utils/ErrorMapper";
import { RoleRegistry } from "./utils/RoleRegistry";
import { ConfigManager } from "./config";

// 自动注册所有角色
import "./Roles";

// 初始化系统
const loop = () => {
  // 核心逻辑
};

export const loop = ErrorMapper.wrapLoop(loop);
```

### 阶段三: 清理和优化 (低优先级)

#### 3.1 清理无用代码
- 删除 `Random_Stuff/` 目录
- 整理 `Operations/` 目录
- 移除未使用的导入

#### 3.2 性能优化
- 减少重复计算
- 优化内存使用
- 改进缓存策略

#### 3.3 添加文档和测试
- JSDoc注释
- 单元测试框架
- 集成测试

## 📅 实施时间表

### 第1周: 准备阶段
- [ ] 备份当前代码
- [ ] 创建新目录结构
- [ ] 设置开发环境

### 第2-3周: 核心重构
- [ ] 拆分creepFunctions.ts
- [ ] 拆分rooms.spawning.ts
- [ ] 拆分Commands.ts
- [ ] 重构角色系统

### 第4周: 标准化
- [ ] 统一命名规范
- [ ] 创建配置系统
- [ ] 改进类型定义
- [ ] 重构main.ts

### 第5周: 清理优化
- [ ] 清理无用代码
- [ ] 性能优化
- [ ] 添加文档

### 第6周: 测试和部署
- [ ] 单元测试
- [ ] 集成测试
- [ ] 部署验证

## 🔧 实施步骤

### 步骤1: 创建新目录结构
```bash
mkdir -p src/Functions/creep
mkdir -p src/Functions/room
mkdir -p src/Rooms/spawning
mkdir -p src/utils/commands
mkdir -p src/Roles/{Economy,Military,Support,Special}
mkdir -p src/config
mkdir -p src/types
```

### 步骤2: 拆分第一个大文件 (creepFunctions.ts)
1. 分析函数功能分组
2. 创建对应子文件
3. 移动函数并更新导入
4. 测试功能完整性

### 步骤3: 重构角色系统
1. 创建新目录结构
2. 按功能分类移动文件
3. 更新导入路径
4. 创建角色注册系统

### 步骤4: 逐步应用
按照优先级逐步实施每个优化点，确保每步都经过测试验证。

## ⚠️ 风险控制

### 潜在风险
1. **功能破坏**: 重构可能引入bug
2. **性能下降**: 初期可能影响性能
3. **开发中断**: 重构期间影响新功能开发

### 缓解措施
1. **渐进式重构**: 一次只重构一个模块
2. **充分测试**: 每个步骤都要测试
3. **版本控制**: 每个阶段都要提交代码
4. **回滚计划**: 准备快速回滚方案

## 📈 成功指标

### 量化指标
- 文件数量: 从92个减少到约120个 (更合理的分布)
- 最大文件大小: 从158KB减少到<30KB
- 导入复杂度: main.ts从50+导入减少到<10个
- 代码重复率: 减少30%

### 质量指标
- 代码可读性评分: 提升70%
- 新功能开发时间: 减少50%
- Bug修复时间: 减少40%
- 代码审查时间: 减少60%

## 🎯 长期规划

### 后续优化
1. **微服务化**: 将系统拆分为独立服务
2. **插件系统**: 支持动态加载功能模块
3. **AI优化**: 引入机器学习优化决策
4. **可视化**: 添加操作界面和监控面板

### 维护策略
1. **定期重构**: 每季度进行一次小重构
2. **代码审查**: 建立代码审查流程
3. **性能监控**: 持续监控系统性能
4. **文档更新**: 保持文档与代码同步

---

**注意**: 这是一个渐进式优化计划，建议按阶段实施，确保每个阶段都经过充分测试后再进行下一阶段。
