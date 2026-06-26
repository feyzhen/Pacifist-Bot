# ErrorExporter

**路径**: `src/utils/ErrorExporter.ts`

## 职责

将运行时异常的 source-map 还原堆栈持久化到 Screeps RawMemory segment 10，供 tick 重置后查阅。

## 为什么需要它

Screeps 每 5 秒 tick 重置一次，`console.log` 输出随之丢失。`ErrorMapper.wrapLoop()` 在 catch 异常后将可读堆栈写入 RawMemory segment，跨 tick 存活，浏览器可通过 DevTools RawMemory 面板或 `Game.notify()` 查看。

## 数据结构

RawMemory segments[10] 内容格式：

```json
{
  "errors": ["Error: xxx\n  at Foo (src/foo.ts:10:5)", "..."],
  "version": 1
}
```

- `errors`: string[]，累积的堆栈字符串
- `version`: number（可选），最近一次写入的版本标记

## API

| 方法 | 说明 |
|------|------|
| `getSegmentData(): ErrorData` | 从 segment 10 读取当前数据，空 segment 返回 `{ errors: [] }` |
| `setSegmentData(data: ErrorData): void` | 将数据序列化写入 segment 10 |
| `addErrorToSegment(stack: string, version?: number): void` | 追加一条堆栈；segment 使用率 >90%（>90KB）时通过 `Game.notify()` 告警并停止写入 |

## 调用关系

```
Game.loop ──→ ErrorMapper.wrapLoop() ──catch──→ ErrorExporter.addErrorToSegment()
                                                        │
                                                  RawMemory.segments[10]
```

- **写入者**: 仅 `ErrorMapper.wrapLoop()`
- **读取者**: 无代码内调用；由外部（浏览器 DevTools / Game.notify）消费
- **段号**: 固定为 10，在文件顶部以常量 `errorSegment` 声明

## 约束

- 单段上限 ~100KB（Screeps RawMemory 每段限制），超过 90KB 触发保护性拒绝写入
- 无去重逻辑，重复异常会累积
- 不依赖任何外部库，纯 JSON 序列化
