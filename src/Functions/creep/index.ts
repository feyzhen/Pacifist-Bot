// ─────────────────────────────────────────────────────────────────────────────
// index.ts  –  Creep函数模块统一导出
//
// 这个文件重新导出所有拆分后的creep功能模块，保持向后兼容性
// 同时提供更好的模块化结构
// ─────────────────────────────────────────────────────────────────────────────

// 导入所有子模块
import "./movement";
import "./combat"; 
import "./resource";

// 为了向后兼容，重新导出所有内容
// 这样原有的 import "./Functions/creepFunctions" 语句仍然有效

export * from "./movement";
export * from "./combat";
export * from "./resource";

// 保持原有的导入方式可用
// 原有的creepFunctions.ts现在会导入这个index.ts文件
