# Playwright 网站自动化测试与监管

对应分支：

```text
feature/playwright-site-monitoring
```

## 目标

用 Playwright 做网站合成监控，定时模拟真实浏览器访问关键页面，尽早发现：

- 页面 5xx
- 白屏或首屏内容为空
- `Application error` / client-side exception
- `pageerror`
- 关键 console exception
- 页面首屏超过阈值
- 移动端关键页面渲染异常

## 已接入内容

文件：

```text
apps/web/playwright.monitoring.config.ts
apps/web/e2e/monitoring/public-pages.spec.ts
apps/web/e2e/monitoring/mobile-pages.spec.ts
apps/web/e2e/monitoring/api-health.spec.ts
apps/web/e2e/monitoring/auth-pages.spec.ts
apps/web/e2e/utils/monitoringAssertions.ts
.github/workflows/site-monitoring.yml
```

新增脚本：

```text
npm run monitor:site --workspace=apps/web
npm run monitor:site
```

## 默认监管范围

公开页面：

```text
/zh-CN/home
/zh-CN/activities
/zh-CN/lobby
/zh-CN/search?q=paris
```

移动端页面：

```text
/zh-CN/lobby
/zh-CN/activities
/zh-CN/search?q=paris
```

接口：

```text
/api/health
```

可选登录态页面：

```text
/zh-CN/notifications
/zh-CN/messages
/zh-CN/profile
```

登录态监管默认跳过，只有设置 `PLAYWRIGHT_AUTH_STORAGE_STATE` 后才启用。

## 本地运行

不传目标地址时，Playwright 会自动启动本地 dev server：

```bash
npm run monitor:site --workspace=apps/web
```

默认本地端口是 `3100`，可以覆盖：

```bash
PLAYWRIGHT_MONITOR_PORT=3200 npm run monitor:site --workspace=apps/web
```

监管线上或 Preview：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url.example.com npm run monitor:site --workspace=apps/web
```

调整超时阈值：

```bash
PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 npm run monitor:site --workspace=apps/web
```

默认策略：

- 本地 dev：`30000ms`
- CI 监管真实站点：`10000ms`

## GitHub Actions

工作流：

```text
.github/workflows/site-monitoring.yml
```

触发方式：

- 每 30 分钟定时运行
- 手动 `workflow_dispatch`

需要配置 repository variable：

```text
PLAYWRIGHT_MONITOR_BASE_URL
```

可选配置：

```text
PLAYWRIGHT_MONITOR_MAX_LOAD_MS
PLAYWRIGHT_MONITOR_WORKERS
PLAYWRIGHT_AUTH_STORAGE_STATE
```

失败时会上传：

```text
apps/web/playwright-report
apps/web/test-results
```

## 判定规则

监控会失败：

- HTTP 状态码大于等于 500
- 页面 body 不可见
- 页面可见文本过少，疑似白屏
- body 中出现 `Application error`、`client-side exception` 等错误文案
- 浏览器触发 `pageerror`
- console error 中包含关键异常，例如 `ChunkLoadError`、`ReferenceError`、`TypeError`、`Hydration failed`
- 页面 DOMContentLoaded 超过阈值

默认不会因为普通资源 404 失败，避免头像、图片、favicon 等非核心资源造成高误报。如果需要严格检查所有 console error，可以设置：

```text
PLAYWRIGHT_MONITOR_FAIL_ON_ANY_CONSOLE_ERROR=1
```

## 并发策略

监管默认最多 2 个 worker，并关闭 fully parallel。这样更接近真实用户巡检，也能减少 Next.js dev server 在页面快速跳转、浏览器关闭时出现的请求取消日志。

可覆盖：

```text
PLAYWRIGHT_MONITOR_WORKERS=1
```

说明：

- `ECONNRESET aborted` 通常表示浏览器或 Playwright 关闭页面时取消了尚未完成的 RSC / fetch 请求。
- 如果测试通过、页面没有 `Application error`，这类日志一般不是业务崩溃。
- 如果同时看到页面超时或 5xx，才需要结合 `[perf]` 日志继续排查。

## 后续增强

- 接入 Slack / Discord / Telegram webhook，把 GitHub Actions 失败结果推送出来。
- 为 Preview 和 Production 分别配置不同 workflow 或不同 base URL。
- 增加真实登录态 storage state 的生成流程，用专门的监控账号覆盖通知、消息、报名等用户路径。
- 对关键路径记录性能历史，后续接 Grafana 或 Better Stack 做趋势图。
