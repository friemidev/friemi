# Playwright 网站测试使用教程

本文说明如何在 Next Fun Club 项目里运行 Playwright 自动化网站测试与监管。

## 1. 这套测试用来做什么

当前 Playwright 主要用于网站监管，也就是模拟真实浏览器访问关键页面，检查：

- 页面是否返回 500
- 是否白屏
- 是否出现 `Application error`
- 是否出现 `client-side exception`
- 浏览器是否抛出 `pageerror`
- console error 里是否有关键异常
- 页面加载是否超过阈值
- 移动端关键页面是否能正常渲染

相关文件：

```text
apps/web/playwright.monitoring.config.ts
apps/web/e2e/monitoring/
apps/web/e2e/utils/monitoringAssertions.ts
.github/workflows/site-monitoring.yml
```

## 2. 安装依赖

如果已经执行过 `npm install`，通常不需要额外操作。

首次在本机运行 Playwright 时，如果提示浏览器不存在，执行：

```bash
npx playwright install chromium
```

GitHub Actions 里已经配置了自动安装：

```bash
npx playwright install --with-deps chromium
```

## 3. 测试本地网站

### 方式 A：已有本地 dev server

先启动网站：

```bash
npm run dev --workspace=apps/web -- --port 3001
```

再开一个终端运行：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web
```

### 方式 B：让 Playwright 自动启动 dev server

不传 `PLAYWRIGHT_MONITOR_BASE_URL` 时，Playwright 会自动启动本地 dev server。

```bash
npm run monitor:site --workspace=apps/web
```

默认端口是：

```text
3100
```

如需改端口：

```bash
PLAYWRIGHT_MONITOR_PORT=3200 npm run monitor:site --workspace=apps/web
```

## 4. 测试 Preview 或线上网站

把地址换成实际 Preview / Production URL：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url.example.com npm run monitor:site --workspace=apps/web
```

如果页面偶尔因为 Preview 冷启动比较慢，可以临时提高阈值：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url.example.com PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 npm run monitor:site --workspace=apps/web
```

默认阈值：

```text
本地 dev：30000ms
CI / 线上监管：10000ms
```

## 5. 只跑桌面或移动端

只跑桌面 Chromium：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web -- --project=chromium-desktop
```

只跑移动端 Chromium：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web -- --project=chromium-mobile
```

移动端使用 Pixel 5 viewport。

## 5.1 控制并发

监管测试默认最多 2 个 worker，避免本地 dev server 或 Preview 被测试流量压慢，减少 `ECONNRESET aborted` 这类请求取消日志。

如果要进一步降低噪声，可以改成单 worker：

```bash
PLAYWRIGHT_MONITOR_WORKERS=1 PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web
```

如果只想快速做本地压力验证，可以临时调高：

```bash
PLAYWRIGHT_MONITOR_WORKERS=4 PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web
```

## 6. 当前覆盖页面

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

登录态页面默认跳过，需要配置 `PLAYWRIGHT_AUTH_STORAGE_STATE` 后才会运行。

## 7. 如何看测试结果

测试通过时会看到类似：

```text
13 passed
9 skipped
```

`skipped` 一般来自：

- 未配置登录态 storage state，所以登录态页面跳过
- desktop project 下跳过 mobile-only 用例

测试失败后打开报告：

```bash
npm run monitor:site:report --workspace=apps/web
```

或：

```bash
cd apps/web
npx playwright show-report playwright-report
```

失败产物通常在：

```text
apps/web/playwright-report
apps/web/test-results
```

里面会包含截图、trace、错误上下文。

## 8. 常见失败原因

### 8.1 页面出现 Application error

错误通常类似：

```text
Application error: a client-side exception has occurred
```

处理方式：

1. 打开 Playwright report。
2. 查看失败截图和 trace。
3. 看 `pageerror` 或 console error。
4. 本地用相同 URL 复现。

### 8.2 页面超过阈值

错误通常说明：

```text
exceeded 10000ms
```

处理方式：

1. 如果是 Preview 冷启动，可以先用 `PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000` 验证。
2. 如果 warm 状态仍慢，需要查看服务端 `[perf]` 日志。
3. 优先看 `/activities`、`/search`、`/lobby` 的数据查询耗时。

### 8.3 浏览器没有安装

错误类似：

```text
Executable doesn't exist
Please run: npx playwright install
```

执行：

```bash
npx playwright install chromium
```

### 8.4 普通 console error

默认只拦截关键异常，例如：

```text
ReferenceError
TypeError
ChunkLoadError
Hydration failed
Application error
client-side exception
```

如果想让任何 `console.error` 都导致测试失败：

```bash
PLAYWRIGHT_MONITOR_FAIL_ON_ANY_CONSOLE_ERROR=1 PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web
```

## 9. GitHub Actions 定时监管

工作流文件：

```text
.github/workflows/site-monitoring.yml
```

触发方式：

- 每 30 分钟自动运行
- 手动运行 workflow

需要在 GitHub repository variables 中配置：

```text
PLAYWRIGHT_MONITOR_BASE_URL
```

值示例：

```text
https://your-production-url.example.com
```

可选变量：

```text
PLAYWRIGHT_MONITOR_MAX_LOAD_MS
PLAYWRIGHT_AUTH_STORAGE_STATE
```

手动运行时也可以临时输入：

```text
base_url
max_load_ms
```

失败后 GitHub Actions 会上传：

```text
playwright-monitoring-report
```

里面包含：

```text
apps/web/playwright-report
apps/web/test-results
```

## 10. 登录态测试如何启用

当前登录态页面默认跳过，因为还没有固定的监控账号 storage state。

后续推荐流程：

1. 准备一个专门的监控账号。
2. 用 Playwright 登录一次。
3. 保存 storage state 到安全位置。
4. 在运行时设置：

```text
PLAYWRIGHT_AUTH_STORAGE_STATE=/path/to/storage-state.json
```

启用后会测试：

```text
/zh-CN/notifications
/zh-CN/messages
/zh-CN/profile
```

注意：不要把包含真实 cookie 的 storage state 提交到 git。

## 11. 日常推荐命令

本地开发后测一遍：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=http://localhost:3001 npm run monitor:site --workspace=apps/web
```

上线 Preview 前测一遍：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url.example.com npm run monitor:site --workspace=apps/web
```

只验证移动端：

```bash
PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url.example.com npm run monitor:site --workspace=apps/web -- --project=chromium-mobile
```

查看失败报告：

```bash
npm run monitor:site:report --workspace=apps/web
```
