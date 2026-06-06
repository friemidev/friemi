# 性能基线排查与页面流畅度优化

对应分支：

```text
feature/performance-baseline
```

## 本分支目标

先建立可复用的性能排查基线，再做低风险优化。

重点不是一次性把所有页面做成极限性能，而是先回答三个问题：

1. 页面慢主要慢在全局布局、页面数据，还是环境冷启动。
2. 哪些查询是串行等待或重复查询。
3. 用户等待时是否有稳定反馈，而不是空白页面。

## 已完成内容

- 增加服务端性能计时工具 `createPerformanceTracker`。
- 对全局布局、首页、活动发现、组队大厅、活动详情、公共活动详情、搜索、消息、通知增加分段耗时日志。
- 将活动发现、活动详情、公共活动详情、搜索页的页面浏览类埋点改为非阻塞队列写入。
- 优化组队大厅数据装饰逻辑：多个区域的活动卡片先合并去重，再统一补收藏、好友信号和参与状态，减少重复数据库查询。
- 增加活动发现、组队大厅、活动详情、公共活动详情、消息、通知的稳定 loading / shimmer 页面。

## 如何查看耗时

本地开发环境默认输出 `[perf]` 日志。

示例：

```text
[perf] route=/activities total=812ms env=development locale=zh-CN page=1 sort=recommended activity.data:690ms viewer.profile:58ms
```

字段含义：

- `route`：页面或布局
- `total`：该页面服务端渲染的总耗时
- `env`：运行环境
- `locale`：当前语言
- 后面的 `xxx:123ms`：具体数据步骤耗时

Preview / Production 默认不输出日志。需要临时排查时，在 Vercel 对应环境加：

```text
PERFORMANCE_DEBUG=1
```

排查结束后建议关闭，避免日志噪音过多。

## 当前初步判断

代码层面已经发现并处理两类问题：

- 页面浏览埋点不应阻塞页面渲染。
- 组队大厅多个列表不应重复执行同类装饰查询。

仍需要通过 Vercel Preview / Production 日志确认：

- 是否存在冷启动导致的首屏慢。
- Supabase 查询在 Preview 和 Production 的耗时是否一致。
- 首页、活动发现、组队大厅是否还有单个查询长期超过 1 秒。

## 后续建议

- 如果 `layout` 的 `viewer.identity` 或 `nav.badges` 长期偏慢，考虑拆分头部动态数据或用更轻量的接口刷新。
- 如果 `activity.data` 长期偏慢，继续压缩列表查询字段或拆分筛选项查询。
- 如果 `messages.roster` 长期偏慢，优先检查好友列表和最近消息是否可以合并查询。
- 如果 Production 明显快于 Preview，说明很大一部分体感慢来自 Preview 环境和冷启动，不应过度重构业务代码。

## 验证记录

```bash
npm run typecheck --workspace=apps/web
```

已通过。
