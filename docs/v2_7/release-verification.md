# Friemi v2.7 Release Verification

日期：2026-08-09

分支：`feature/v2-7-optimization`

## 本地自动验证

- `npm run typecheck --workspace=apps/web`：通过。
- `npm test --workspace=apps/web`：通过，187 tests pass。
- `npm run build --workspace=apps/web`：通过。
- `git diff --check`：通过。
- `/zh-CN/updates/v2_7`：本地 dev server 返回 200。

Build 仍有仓库既有 warning：`activities/[activityId]/edit` 未使用变量、`werewolf/card-preview` 和 `api/share/team-card` 中的 `<img>` 提示、`IntentPrefetchLink` hook dependency 提示。本次新增的 `MobileBottomSheet` hook warning 已修复。

## 移动端截图 Smoke Test

截图使用 Chromium，viewport `390x844`。因为本地 Playwright WebKit 浏览器缓存缺失，未使用真实 iPhone WebKit 设备配置；真机验收仍需补充。

已生成截图：

- `docs/v2_7/screenshots/updates-v2_7-mobile.png`
- `docs/v2_7/screenshots/mobile-home-mobile.png`
- `docs/v2_7/screenshots/lobby-mobile.png`
- `docs/v2_7/screenshots/activities-mobile.png`
- `docs/v2_7/screenshots/werewolf-entry-mobile.png`
- `docs/v2_7/screenshots/sign-in-mobile.png`
- `docs/v2_7/screenshots/activity-detail-sheet-loaded-mobile.png`

观察结果：

- 更新公告页可以打开，v2.7 为最新版本。
- `/mobile-home` 右侧横向内容不再留明显大空白。
- `/lobby` 列表可以渲染，活动行保持可读。
- `/activities` 活动卡片可以渲染，状态和底部导航没有明显遮挡。
- `/game-tools/werewolf` 模式选择页左侧角色图贴边效果正常。
- `/sign-in` 邮箱继续入口在 390px 宽度下没有明显错位。
- `/lobby` 活动详情 bottom sheet 可打开，约 85% 高度，不顶满屏幕，详情内容在弹窗内加载。

## 待人工/真机验收

- iPhone WebKit 截图：`/mobile-home`、`/lobby`、`/activities`、`/profile`、`/profile/[profileId]`、`/profile/shop`、`/profile/achievements`、搜索页、私聊详情、通知中心、聚吧详情、聚吧管理、群聊管理入口、`/game-tools/werewolf`、狼人杀房间页、登录页。
- Android WebView 安全区：顶部状态栏、底部导航、sheet、聊天室输入框、狼人杀房间页。
- 狼人杀 8 / 10 / 12 人房间录屏：入座、退座、发言、切换阶段、法官视角、普通玩家视角。
- 多人和高并发记录：需要预览或生产环境真实数据，观察同一时间请求堆积、聊天首发、狼人杀同步和通知推送。
- Auth-only 页面：Profile 私有子页、私聊详情、通知中心和管理页需要登录账号后补截图。

## 发布前命令建议

```bash
npm run db:generate --workspace=apps/web
npm run typecheck --workspace=apps/web
npm test --workspace=apps/web
npm run build --workspace=apps/web
git diff --check
```

如果生产库需要应用 v2.7 migration，使用 direct URL 执行：

```bash
DATABASE_URL='<PRODUCTION_POOLER_URL>' \
DIRECT_URL='<PRODUCTION_DIRECT_URL>' \
npx prisma migrate deploy --schema=apps/web/prisma/schema.prisma
```

本次新增迁移需要确认：

```sql
SELECT
  EXISTS (
    SELECT 1
    FROM "_prisma_migrations"
    WHERE migration_name = '20260809100000_add_user_profile_remarks'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  ) AS migration_applied,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'UserProfileRemark'
  ) AS has_user_profile_remark;
```
