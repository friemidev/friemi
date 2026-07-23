# v2.4 游客入口开放 Checklist

> 目标：把游客可以先看的页面打开，把登录要求下沉到真正需要身份的动作。

## 1. 本次优化范围

- [x] 已切换并确认工作分支：`feature/v2-4-guest-access-entrypoints`。
- [x] `/[locale]/profile` 对未登录用户开放，未登录时展示游客占位主页。
- [x] `/[locale]/account/settings` 对未登录用户开放，语言设置始终可用。
- [x] 账号资料、账号安全、退出登录等账号类操作仅在已登录时展示。
- [x] `/[locale]/footprints` 未登录且未指定 tab 时默认进入星球 tab。
- [x] `/[locale]/activities/new` 对未登录用户开放，可浏览创建入口、活动预览和创建表单。
- [x] `/[locale]/public-events/[publicEventId]/teams/new` 对未登录用户开放，可从活动详情进入并查看组局表单。
- [x] `/[locale]/activities/[activityId]/teams/new` 不再页面级强登录，保留跳转到公开活动组局页的兼容逻辑。

## 2. 登录触发边界

- [x] 创建组局表单提交发布时，如果未登录，再跳转登录。
- [x] 创建组局表单上传封面时，如果未登录，再跳转登录。
- [x] 复制已有组局创建仍要求登录，因为复制内容需要按当前用户校验权限。
- [x] 编辑组局、好友、消息、通知、个人组局子页和人脉子页继续保持登录保护。

## 3. 验收项

- [x] 游客访问 `/zh-CN/profile` 不跳登录，看到游客占位主页和语言设置入口。
- [x] 游客访问 `/zh-CN/account/settings` 不跳登录，可以切换语言。
- [x] 游客访问 `/zh-CN/footprints` 默认打开星球 tab。
- [x] 游客访问 `/zh-CN/activities/new` 可以看到创建入口、活动预览和表单。
- [x] 游客从公开活动详情进入 `/zh-CN/public-events/[publicEventId]/teams/new` 不再被 middleware 或页面级登录拦截。
- [ ] 游客在创建组局表单点击发布或上传封面时，才进入登录流程。
- [ ] 登录用户访问上述页面仍保留原来的个人数据、账号操作和发布能力。

## 4. 本地验证记录

- [x] `npm run typecheck --workspace=apps/web`
- [x] `npm run test --workspace=apps/web`
- [x] 无 Cookie `HEAD /zh-CN/profile` 返回 200，Clerk 状态为 `signed-out`。
- [x] 无 Cookie `HEAD /zh-CN/account/settings` 返回 200，Clerk 状态为 `signed-out`。
- [x] 无 Cookie `HEAD /zh-CN/footprints` 返回 200，服务端日志显示 `initialTab=planet`。
- [x] 无 Cookie `HEAD /zh-CN/activities/new` 返回 200，Clerk 状态为 `signed-out`。
- [x] 无 Cookie `HEAD /zh-CN/public-events/not-a-real-id/teams/new` 返回 200，Clerk 状态为 `signed-out`，未跳登录。
