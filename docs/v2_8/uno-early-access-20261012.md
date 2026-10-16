# UNO 抢先体验

开放 UNO 的生产环境代码开关，并添加「抢先体验」标记。实现与验证阶段仅保留本地；用户后续授权将这些改动与骰子修复一起推送 dev。生产部署由后续发布执行。

## 变更

- `isUnoEnabled` 在 Vercel production、preview、development 和自托管生产构建中返回可用。游戏列表、入口、加入页、房间页、API 和截止时间扫描共用此开关。
- 游戏列表中的 UNO 卡片及 UNO 入口标注「抢先体验」，英语为 `Early access`，法语为 `Accès anticipé`。列表标签放在卡片底部，不遮挡 logo。
- 开放后仍须登录并通过房间权限检查；写入 API 保留同源限制，截止时间扫描保留 cron 鉴权。生产入口不显示本地练习链接。

## 本地验证

- 环境开关测试：4 项通过，覆盖生产、预览、开发、自托管及未知部署类型。
- `test-uno-release-gate.ts`：63 项路由检查通过。身份服务模拟未登录访客，运行实际 UNO 鉴权和路由；Prisma 和网络访问设为失败哨兵，检查期间均未访问。
- `npm run typecheck` 与 `git diff --check` 通过。
- 实际 `GameToolCard`、`UnoEntryClient` 组件在 390 px 和 1280 px 浏览器宽度检查通过，覆盖中文和法文标签、入口链接、图片加载、按钮尺寸及横向溢出。
- 完整 Next 页面本地预览因此工作树缺少 `DATABASE_URL` 未能运行；组件验证未连接或写入业务数据库。本次未执行生产多人对局验证。

截图及组件验证夹具保存在 `output/playwright/uno-early-access/`，不进入源码提交。
