# Friemi v2.5 全局开发 Checklist

## 0. 版本目标

v2.5 是 Friemi 从“活动/组局工具”向“轻社交社区”过渡的版本。核心不是堆功能，而是补齐用户关系、局内互动、Profile 资产展示和社交回访路径。

本版本围绕三个结果推进：

- 活动后有沉淀：局内群聊、晒晒互动、访客、成就。
- 用户之间能连接：好友、陌生人私聊、邀请、通知。
- Profile 有展示价值：信用、魅力、成就、背包、商城、访客、邀请。

v2.5 不做完整商业化，不做复杂等级系统，不做实时大系统。所有实现优先选择稳定、轻量、可迁移、可后续扩展的方案。

## 1. 优先级定义

- P0：地基。数据模型、权限、middleware、服务层。没有 P0，后续 UI 都不能安全上线。
- P1：核心用户功能。用户能看见、能使用、能形成闭环的页面和交互。
- P2：自动触发和体验补齐。依赖 P0/P1 后做，但属于 v2.5 正式上线必要范围。
- P3：上线收尾。迁移、测试、公告、版本号、生产验证。
- Pn：明确暂缓。不进入 v2.5，除非后续单独改范围。

后续每个 v2.5 子 PR 都应该在对应任务里更新 checkbox，不再只在文档末尾汇总。

## 2. 当前基础

- [x] `UserProfile.role` 支持 `USER / ADMIN`
- [x] `UserProfile.isCoCreator` 支持共创主理人展示
- [x] `TrustScoreEvent` 已作为信用值事件账本
- [x] `features/trust` 已有信用分计算、等级、低信用判断
- [x] `UserCharmBalance` 已作为魅力值余额
- [x] `CharmGiftEvent` 已作为魅力值送礼账本
- [x] `FriemiCheck` 已支持欢迎支票和盲盒支票
- [x] `UserBlindBoxFragmentBalance` 已支持盲盒碎片余额
- [x] `BlindBoxFragmentEvent` 已支持盲盒碎片账本
- [x] `Conversation / DirectMessage` 已支持 1 对 1 私聊
- [x] 私聊服务层已有非好友“两条消息，对方回复后解锁”的雏形
- [x] `Notification` 已支持活动、报名、好友、举报等通知
- [x] v2.4 已清理私聊和晒晒互动通知，不再计入通知红点
- [x] `Moment / MomentLike / MomentComment` 已支持晒晒、点赞、评论
- [x] Profile 九宫格已有成就、邀请、访客、背包、商城入口占位
- [x] 已有 `FriemiAlertProvider`，后续新弹窗不使用浏览器 `alert`

## 3. 全局原则

### 3.1 产品原则

- [ ] 所有新功能优先服务移动端真实使用场景
- [ ] Profile 功能从占位变成最小可用，不做复杂装饰
- [ ] 聊天和通知保持清晰分工：通知管事件，消息管聊天
- [ ] 游客可以浏览，但不能产生社交资产
- [ ] 非好友聊天允许破冰，但必须有限制
- [ ] 信用值代表可靠，不代表人气
- [ ] 魅力值代表被喜欢，不代表可靠
- [ ] 贡献值代表平台价值，v2.5 先设计和少量记录，不强展示
- [ ] 成就是展示层，不直接等于信用、魅力或贡献

### 3.2 工程原则

- [ ] 新功能优先放在 `apps/web/features/*`
- [ ] Server action 只返回页面需要的最小字段
- [ ] 权限判断放服务层，页面和组件不重复实现
- [ ] 账本类数据只追加，不直接改历史记录
- [ ] 统计类数据可以维护 balance/cache，但必须能从账本重算
- [ ] 所有新表加必要索引，避免上线后列表页慢
- [ ] 所有用户输入必须有长度限制和服务端校验
- [ ] 新页面必须有空状态、加载态、错误态
- [ ] 多语言按钮默认不换行，必要时用图标或短词
- [ ] 新增受保护页面或 auth API 时同步更新 `apps/web/middleware.ts`
- [ ] 新增用户私有页面时明确 owner-only、public 或 admin-only
- [ ] 新增私有页面不进 sitemap，保持 noindex 或被 robots 阻止索引

## 4. P0-PR01 数据模型与权限地基

- PR：`PR 01`
- Priority：`P0`
- Branch：`feature/v2-5-data-foundation`
- 目标：一次性打好 v2.5 社交资产的数据和权限地基，不改用户可见 UI 行为。

### 4.1 Prisma 模型

#### ActivityRoomMessage

用途：活动/组局内群聊消息。

- [x] 新增模型 `ActivityRoomMessage`
- [x] `id String @id @default(cuid())`
- [x] `activityId String`
- [x] `senderId String`
- [x] `body String @db.Text`
- [x] `deletedAt DateTime?`
- [x] `deletedById String?`
- [x] `createdAt DateTime @default(now())`
- [x] `updatedAt DateTime @updatedAt`
- [x] 关联 `Activity`
- [x] 关联 `UserProfile`，relation name 建议 `ActivityRoomMessageSender`
- [x] 在 `Activity` 上补 `roomMessages ActivityRoomMessage[]`
- [x] 在 `UserProfile` 上补 `activityRoomMessages ActivityRoomMessage[]`
- [x] 索引 `@@index([activityId, createdAt])`
- [x] 索引 `@@index([senderId, createdAt])`

边界：

- [ ] 只给 Friemi 用户创建的组局/活动开放
- [ ] 纯采集的 `PUBLIC_EVENT` 不直接开放群聊
- [ ] 公共活动下创建的用户组局可以有群聊，群聊归属用户组局
- [x] v2.5 不加图片、回复、reaction、在线状态、已读回执、群聊未读红点

#### UserAchievement

用途：用户已解锁成就账本。

- [x] 新增模型 `UserAchievement`
- [x] `id String @id @default(cuid())`
- [x] `profileId String`
- [x] `achievementKey String`
- [x] `sourceType String?`
- [x] `sourceId String?`
- [x] `unlockedAt DateTime @default(now())`
- [x] `createdAt DateTime @default(now())`
- [x] 关联 `UserProfile`
- [x] 在 `UserProfile` 上补 `achievements UserAchievement[]`
- [x] 唯一键 `@@unique([profileId, achievementKey])`
- [x] 索引 `@@index([profileId, unlockedAt])`
- [x] 索引 `@@index([achievementKey, unlockedAt])`

边界：

- [ ] 成就定义先放代码常量，不建后台配置表
- [x] 同一用户同一成就只记录第一次解锁
- [ ] source 只记录第一次解锁来源，重复触发不更新时间

#### UserReferral

用途：邀请归因。

- [x] 新增模型 `UserReferral`
- [x] `id String @id @default(cuid())`
- [x] `inviterId String`
- [x] `inviteeId String @unique`
- [x] `inviteCode String`
- [x] `source String?`
- [x] `registeredAt DateTime @default(now())`
- [x] `friendshipAcceptedAt DateTime?`
- [x] `firstParticipationAt DateTime?`
- [x] `createdAt DateTime @default(now())`
- [x] `updatedAt DateTime @updatedAt`
- [x] 关联邀请者 `UserProfile`，relation name 建议 `UserReferralInviter`
- [x] 关联被邀请者 `UserProfile`，relation name 建议 `UserReferralInvitee`
- [x] 在 `UserProfile` 上补 sent/received referral relations
- [x] 索引 `@@index([inviterId, createdAt])`
- [x] 索引 `@@index([inviteCode, createdAt])`

边界：

- [x] 一个新用户只能归因给一个邀请者
- [ ] 用户不能邀请自己
- [ ] 邀请归因不自动创建好友关系
- [ ] 成为好友时再补 `friendshipAcceptedAt`
- [ ] 如果邀请码无效，静默忽略，不阻塞注册

#### ProfileVisit

用途：Profile 访客记录。

- [x] 新增模型 `ProfileVisit`
- [x] `id String @id @default(cuid())`
- [x] `profileId String`
- [x] `visitorId String`
- [x] `visitDate DateTime @db.Date`
- [x] `viewCount Int @default(1)`
- [x] `lastVisitedAt DateTime @default(now())`
- [x] `createdAt DateTime @default(now())`
- [x] `updatedAt DateTime @updatedAt`
- [x] 关联被访问者 `UserProfile`，relation name 建议 `ProfileVisitTarget`
- [x] 关联访问者 `UserProfile`，relation name 建议 `ProfileVisitVisitor`
- [x] 在 `UserProfile` 上补 target/visitor visit relations
- [x] 唯一键 `@@unique([profileId, visitorId, visitDate])`
- [x] 索引 `@@index([profileId, lastVisitedAt])`
- [x] 索引 `@@index([visitorId, lastVisitedAt])`

边界：

- [ ] 不记录自己访问自己
- [ ] 不记录游客具体身份
- [ ] 同一个用户同一天访问同一主页只累计 `viewCount`
- [ ] `visitDate` 统一归一到 UTC 日期或产品主时区日期，不能直接用带时分秒的当前时间

### 4.2 Middleware 与路由保护

受保护页面：

- [x] `/:locale/profile/achievements(.*)`
- [x] `/:locale/profile/bag(.*)`
- [x] `/:locale/profile/shop(.*)`
- [x] `/:locale/profile/invite(.*)`
- [x] `/:locale/profile/visitors(.*)`
- [x] `/:locale/lobby/:activityId/room(.*)`

需要 matcher 覆盖的 API：

- [x] `/api/profile-visits(.*)`
- [x] `/api/referrals(.*)`，如果实现为 route handler
- [x] `/api/activity-room-chat(.*)`，如果实现为 route handler

规则：

- [x] matcher 覆盖是为了让 `auth()` 正常工作，不等于所有 API 都强制跳登录
- [ ] `/api/profile-visits` 未登录时可以 no-op 返回 204
- [ ] `/api/referrals` 写 cookie 可以允许游客，绑定归因必须登录
- [ ] `/api/activity-room-chat` 读取和发送都必须登录并通过活动成员权限
- [ ] 新 API 不返回 HTML redirect，未授权统一返回 JSON 错误或 204 no-op
- [x] `achievements / bag / shop / invite / visitors / hangouts / network` 不能被当作公开 profileId

### 4.3 本 PR 验收标准

- [x] Prisma migration 可在已有数据的本地库执行
- [x] Prisma Client 已重新生成
- [x] `ActivityRoomMessage / UserAchievement / UserReferral / ProfileVisit` 表存在
- [x] 四张新表的唯一键和索引存在
- [x] middleware matcher 覆盖新增页面/API
- [x] 私有 Profile 子页不会被 `[profileId]` 捕获
- [x] 本 PR 不改用户可见 UI 行为
- [x] `npm run typecheck --workspace=apps/web` 通过
- [x] `npm test --workspace=apps/web` 通过或明确记录尚未新增测试原因
- [x] `git diff --check` 通过

记录：

- 本地库已用非破坏性的 `prisma migrate deploy` 应用 `20260724100000_add_v2_5_data_foundation`。
- 预览 target 库已用 `migration-backups/preview-db.env` 的 `TARGET_DIRECT_URL` 执行 `prisma migrate deploy`，当前无 pending migration。
- 本地配置库和预览 target 库当前指向同一个 Supabase direct host；只读验证结果一致。
- `prisma migrate dev` 当前被既有 drift 拦截：`20260717140000_add_planet_likes` 与库内索引/外键状态不一致；没有执行 reset。

## 5. P0-PR02 服务层与权限策略

- PR：`PR 02`
- Priority：`P0`
- Branch：`feature/v2-5-social-services`
- 目标：把 v2.5 的核心权限、幂等、查询和写入规则沉到服务层，后续 UI 只调用统一能力。

### 5.1 局内群聊服务

建议目录：

- [x] `apps/web/features/activity-room-chat/services/activityRoomChat.ts`
- [x] `apps/web/features/activity-room-chat/actions/activityRoomChatActions.ts`
- [x] `apps/web/features/activity-room-chat/queries/getActivityRoomMessages.ts`
- [x] `apps/web/features/activity-room-chat/copy.ts`

服务函数：

- [x] `canViewActivityRoomChat(profileId, activityId)`
- [x] `canSendActivityRoomMessage(profileId, activityId)`
- [x] `getActivityRoomMessages(activityId, viewerProfileId, limit = 50)`
- [x] `sendActivityRoomMessage({ activityId, senderId, body })`
- [x] `deleteActivityRoomMessage({ messageId, actorId })`

权限规则：

- [x] Organizer 可查看和发送
- [x] Co-manager 可查看和发送
- [x] `JOINED / APPROVED` 参与者可查看和发送
- [x] `PENDING / REJECTED / CANCELLED` 不可查看消息内容
- [x] 游客不可查看消息内容
- [x] 纯公共采集活动不可查看和发送，除非进入的是其下用户组局
- [x] 活动取消后默认只读
- [x] 活动结束后 v2.5 默认只读，后续可调整
- [x] 删除消息：本人、Organizer、Co-manager 可删除

消息规则：

- [x] 文本 trim 后不能为空
- [x] 最大长度 500
- [x] 连续发送失败时保留输入框
- [x] 成功发送后只 revalidate 当前活动详情或当前群聊区域
- [x] 返回最小消息字段：id、body、sender、createdAt、isMine

### 5.2 陌生人私聊策略

现有基础在 `apps/web/features/direct-messages/services/directMessages.ts`，本 PR 只补统一策略输出。

- [x] 新增或扩展 `getDirectMessageSendPolicy(currentUserProfileId, peerProfileId)`
- [x] 返回 `canSend`
- [x] 返回 `reason`
- [x] 返回 `remainingNonFriendMessages`
- [x] 返回 `isFriend`
- [x] 返回 `hasPeerReplied`
- [x] 返回 `trustScore`
- [x] 图片消息和文字消息都计入非好友两条限制

错误码建议：

- [x] `AUTH_REQUIRED`
- [x] `SELF_CONVERSATION`
- [x] `LOW_TRUST`
- [x] `NOT_FRIENDS`
- [x] `NON_FRIEND_LIMIT_REACHED`
- [x] `CONVERSATION_UNAVAILABLE`
- [x] `EMPTY_BODY`
- [x] `BODY_TOO_LONG`
- [x] `TOO_MANY_IMAGES`
- [x] `INVALID_IMAGE_URL`

### 5.3 成就服务

建议目录：

- [x] `apps/web/features/achievements/achievementCatalog.ts`
- [x] `apps/web/features/achievements/services/achievements.ts`
- [x] `apps/web/features/achievements/queries/getUserAchievements.ts`

服务函数：

- [x] `grantAchievement(profileId, achievementKey, source)`
- [x] `syncProfileAchievements(profileId)`
- [x] `getAchievementProgress(profileId)`
- [x] `getPublicAchievementWall(profileId)`

v2.5 首批成就：

- [x] `hello_world`：第一次参加活动
- [x] `open_minded`：第一次组织活动
- [x] `active_guest_20`：参加 20 次
- [x] `host_20`：举办 20 场
- [x] `co_creator`：共创主理人
- [x] `trusted_profile`：达到 Trusted

### 5.4 邀请服务

建议目录：

- [x] `apps/web/features/referrals/services/referrals.ts`
- [x] `apps/web/features/referrals/actions/referralActions.ts`
- [x] `apps/web/features/referrals/queries/getReferralDashboard.ts`

服务函数：

- [x] `buildReferralLink(locale, friendCode)`
- [x] `captureReferralCodeFromRequest(ref)`
- [x] `consumeReferralCodeOnProfileCreate(profileId, ref)`
- [x] `getReferralStats(inviterId)`
- [x] `markReferralFirstParticipation(inviteeId)`
- [x] `markReferralFriendshipAccepted(inviterId, inviteeId)`

奖励边界：

- [x] 单纯打开邀请链接不奖励
- [x] 单纯注册是否奖励贡献值后续再定，v2.5 不公开
- [x] 信用值 `INVITE_FRIEND` 建议在成为好友或首次真实参加活动后触发，避免刷号
- [x] 同一个 invitee 只能给 inviter 触发一次奖励

### 5.5 访客服务

建议目录：

- [x] `apps/web/features/profile-visits/services/profileVisits.ts`
- [x] `apps/web/features/profile-visits/queries/getProfileVisitors.ts`

服务函数：

- [x] `recordProfileVisit({ profileId, visitorId })`
- [x] `getRecentProfileVisitors(profileId, limit = 30)`
- [x] `getProfileVisitSummary(profileId)`

写入策略：

- [ ] Public Profile 页面后续挂载轻量 tracker
- [x] tracker 调用 `POST /api/profile-visits`
- [x] API 通过 Clerk 当前用户识别 visitor
- [x] 写入失败只记录日志，不阻塞页面
- [x] 未登录、访问自己、目标用户不存在时返回 204 或成功空响应，避免前端报错

### 5.6 本 PR 验收标准

- [x] 群聊权限服务覆盖 Organizer、Co-manager、joined、approved、pending、rejected、cancelled、guest
- [x] 纯公共采集活动被群聊服务拒绝
- [x] 陌生人私聊策略能返回剩余次数和具体原因
- [x] 非好友第 3 条消息在对方未回复前被服务端拦截
- [x] 对方回复后服务端解除非好友两条限制
- [x] 成就 grant 重复调用不重复写入，不更新时间
- [x] 邀请归因不能被第二个邀请码覆盖
- [x] 访客记录不记录自己和游客
- [x] `npm run typecheck --workspace=apps/web` 通过
- [x] `npm test --workspace=apps/web` 通过
- [x] `git diff --check` 通过

## 6. P1-PR03 Profile 子页面骨架

- PR：`PR 03`
- Priority：`P1`
- Branch：`feature/v2-5-profile-hub-pages`
- 目标：把 Profile 里的成就、背包、商城、邀请、访客从“敬请期待”改成可进入的真实页面骨架。

### 6.1 新增路由

- [x] `apps/web/app/[locale]/profile/achievements/page.tsx`
- [x] `apps/web/app/[locale]/profile/bag/page.tsx`
- [x] `apps/web/app/[locale]/profile/shop/page.tsx`
- [x] `apps/web/app/[locale]/profile/invite/page.tsx`
- [x] `apps/web/app/[locale]/profile/visitors/page.tsx`

### 6.2 入口调整

- [x] `ProfileDashboardView` 九宫格占位改为真实 Link
- [x] 每个入口显示一个小计数或状态
- [x] 没有数据时仍可进入页面，不弹“敬请期待”
- [x] 所有页面使用同一套移动端头部：返回、标题、必要操作
- [x] 五个子页都是 owner-only，只展示当前登录用户自己的数据
- [x] 他人公开 Profile 只展示公开成就墙、魅力值和必要社交入口
- [x] 他人公开 Profile 不展示背包、邀请、访客列表

### 6.3 页面骨架要求

- [x] 每页都有 loading、empty、error 的基础状态
- [x] 移动端底部留出 bottom nav 安全距离
- [x] 390px 宽度无横向滚动
- [x] 中英法按钮不换行
- [x] 新页面不使用浏览器 `alert`
- [x] 私有页面不进入 sitemap

### 6.4 本 PR 验收标准

- [x] Profile 五个占位入口全部能进入真实页面
- [x] 未登录访问五个私有页面会跳登录，并保留 redirect
- [x] 登录后回到原本要打开的子页面
- [x] 不能通过 URL 查看其他人的背包、邀请统计、访客记录
- [x] 公开 Profile 不暴露私有数据
- [x] 新页面空状态视觉统一且不拥挤
- [x] `npm run typecheck --workspace=apps/web` 通过
- [x] `git diff --check` 通过

## 7. P1-PR04 邀请与访客闭环

- PR：`PR 04`
- Priority：`P1`
- Branch：`feature/v2-5-referrals-visitors`
- 目标：完成用户拉新和回访路径，让邀请、归因、访客记录形成最小闭环。

### 7.1 邀请好友页

页面：`/profile/invite`

- [x] 展示我的邀请码
- [x] 展示邀请链接
- [x] 支持复制邀请链接
- [x] 支持系统分享
- [x] 展示邀请统计：注册人数、成为好友人数、首次参加人数
- [x] 复制成功使用自定义 Friemi alert/toast

链接格式：

- [x] 主链接：`/${locale}/home?ref={friendCode}`
- [x] 兼容：`/${locale}/sign-up?ref={friendCode}`
- [x] 登录/注册后必须保留 `ref`
- [x] 邀请链接不自动加好友，只完成平台邀请归因

### 7.2 邀请捕获与归因

- [x] middleware 看到格式有效的 `?ref=` 时写入 `friemi_referral_code` cookie
- [x] cookie 建议保留 30 天
- [x] 已有有效 referral cookie 不被后续不同 ref 覆盖
- [x] 无效格式 ref 不写 cookie
- [x] DB 校验放在消费阶段，不在 middleware 查数据库
- [x] 注册/首次创建 Profile 时消费 cookie 并创建 `UserReferral`
- [x] 用户不能邀请自己
- [x] 同一个 invitee 只能归因一次
- [x] 好友关系建立后补 `friendshipAcceptedAt`
- [x] 被邀请者第一次真实参加活动后补 `firstParticipationAt`

### 7.3 访客记录

页面：`/profile/visitors`

- [x] Public Profile 页面挂载轻量 tracker
- [x] tracker 调用 `POST /api/profile-visits`
- [x] 只记录登录用户访问
- [x] 不记录自己访问自己
- [x] 游客访问 no-op，不暴露身份
- [x] 同一天同一访客 upsert 累计 `viewCount`
- [x] 访客页展示最近访客列表
- [x] 展示头像、昵称、访问时间、是否好友、近期访问次数
- [x] 点击访客可进入访客 Profile
- [x] 可从访客列表发起私聊，非好友仍受两条限制
- [x] 不展示过细访问轨迹

### 7.4 本 PR 验收标准

- [x] 游客打开邀请链接后 `ref` 不丢
- [x] 注册完成后 `UserReferral` 归因成功
- [x] 重复打开不同邀请链接不会覆盖已绑定归因
- [x] 邀请归因不会自动创建好友关系
- [x] 自己访问自己不写 `ProfileVisit`
- [x] 游客访问不写具体访客记录
- [x] 同一天同一访客重复访问只累计同一条记录
- [x] 访客页只能本人查看
- [x] 访客列表的私聊入口复用陌生人私聊策略
- [x] `npm run typecheck --workspace=apps/web` 通过
- [x] `npm test --workspace=apps/web` 通过
- [x] `git diff --check` 通过

## 8. P1-PR05 成就、背包与商城展示

- PR：`PR 05`
- Priority：`P1`
- Branch：`feature/v2-5-profile-assets`
- 目标：让 Profile 资产入口具备实际展示价值，但不引入真实支付和复杂商业化。

### 8.1 成就页

页面：`/profile/achievements`

- [ ] 顶部显示已解锁数量
- [ ] 最近解锁放第一屏
- [ ] 成就墙按分组展示：开始、参与、组织、身份、特殊
- [ ] 未解锁成就低调展示
- [ ] 每个成就包含图标、名称、短说明、解锁时间或进度
- [ ] 读取 `UserAchievement`
- [ ] 读取活动参与数、举办数、信用值、身份字段计算进度
- [ ] 他人公开 Profile 只读取已解锁成就，不读取未解锁进度

### 8.2 背包页

页面：`/profile/bag`

- [ ] 展示 Friemi 支票列表
- [ ] 展示盲盒支票列表
- [ ] 展示盲盒碎片进度
- [ ] 展示可用、已使用、已过期状态
- [ ] 10 个碎片可兑换盲盒支票
- [ ] 兑换按钮必须有服务端保护
- [ ] 暂不做转赠
- [ ] 暂不做真实钱包余额

### 8.3 商城页

页面：`/profile/shop`

- [ ] 展示礼物目录
- [ ] 礼物卡片显示 emoji、名称、魅力值、价格占位
- [ ] 节日礼物显示暂未开放
- [ ] 负分礼物不展示
- [ ] 点击礼物可查看详情
- [ ] 暂不购买
- [ ] 可以引导到送礼入口，但最终送礼仍使用现有 `CharmGiftDialog`
- [ ] 页面不出现真实支付入口

### 8.4 本 PR 验收标准

- [ ] 新用户能看到成就初始状态
- [ ] 已参加过活动的用户能看到对应成就或进度
- [ ] 共创主理人能看到特殊身份成就
- [ ] 新用户能看到欢迎支票
- [ ] 没有道具时展示简洁空状态
- [ ] 已使用或过期的支票不会显示为可用
- [ ] 碎片不足 10 个时不能兑换盲盒支票
- [ ] 三语言礼物名称正常
- [ ] 未开放礼物不能送出
- [ ] 商城没有真实支付入口
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 9. P1-PR06 局内群聊

- PR：`PR 06`
- Priority：`P1`
- Branch：`feature/v2-5-activity-room-chat`
- 目标：让已加入同一活动/组局的用户可以在局内沟通，沉淀活动关系。

### 9.1 路由与入口

- [ ] 新增 canonical 路由 `app/[locale]/lobby/[activityId]/room/page.tsx`
- [ ] 活动详情页 CTA 区或参与者区增加“群聊”按钮
- [ ] 移动端优先打开独立路由，便于返回和加载
- [ ] 桌面端可在详情页新增紧凑入口，空间不足时进入同一路由
- [ ] 顶部显示活动标题和参与状态
- [ ] 中间展示最近 50 条消息
- [ ] 底部固定输入栏
- [ ] 键盘弹起时输入栏不被遮挡

### 9.2 状态

- [ ] 未登录：显示登录按钮，并保留 redirect
- [ ] 非参与者：显示加入活动提示，不显示消息
- [ ] 纯公共采集活动：显示创建/加入用户组局提示，不显示公共活动群聊
- [ ] 待审核：显示等待审核提示
- [ ] 已取消/已拒绝：显示不可访问提示
- [ ] 活动取消：历史消息只读
- [ ] 活动结束：历史消息只读
- [ ] 空消息：显示发起第一条消息的轻提示

### 9.3 交互

- [ ] 文本发送后乐观展示或快速刷新当前群聊
- [ ] 发送失败保留输入框
- [ ] 本人、Organizer、Co-manager 可删除消息
- [ ] 删除后显示“消息已删除”状态，不硬删除 UI 记录
- [ ] v2.5 不做全局未读红点

### 9.4 本 PR 验收标准

- [ ] Organizer 可看可发
- [ ] Co-manager 可看可发
- [ ] `JOINED / APPROVED` 参与者可看可发
- [ ] `PENDING / REJECTED / CANCELLED` 不可看消息内容
- [ ] 游客不可看消息内容
- [ ] 纯公共采集活动没有群聊
- [ ] 活动结束后不能继续发送
- [ ] 删除权限只能由本人、Organizer、Co-manager 使用
- [ ] 移动端输入栏不被 bottom nav 或键盘遮挡
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 10. P1-PR07 陌生人私聊体验

- PR：`PR 07`
- Priority：`P1`
- Branch：`feature/v2-5-stranger-direct-messages`
- 目标：把全局 1 对 1 私聊从“好友私聊”扩展为受控陌生人破冰聊天。

### 10.1 入口

- [ ] 他人 Profile Header 增加消息按钮
- [ ] Profile 访客列表增加消息入口
- [ ] 活动主理人区复用消息入口
- [ ] 活动参与者列表复用消息入口
- [ ] Moment 作者头像或更多操作可进入消息
- [ ] 所有入口调用同一套服务层策略

### 10.2 会话页提示

- [ ] 非好友且对方未回复：顶部显示剩余次数
- [ ] 剩余 2 条：提示语轻
- [ ] 剩余 1 条：提示更明确
- [ ] 剩余 0 条：禁用输入，显示等待对方回复
- [ ] 对方回复后隐藏限制提示
- [ ] 好友会话不展示限制提示

### 10.3 错误态

- [ ] 未登录：跳登录并保留 redirect
- [ ] 低信用：解释当前不能主动私聊陌生人
- [ ] 非好友无上下文：引导先加好友
- [ ] 两条已满：提示等待对方回复
- [ ] 服务端错误不只显示通用失败

### 10.4 本 PR 验收标准

- [ ] 非好友第 1 条消息可发送
- [ ] 非好友第 2 条消息可发送
- [ ] 非好友第 3 条消息在对方未回复前被拦截
- [ ] 对方回复后双方可继续聊天
- [ ] 好友不受两条限制
- [ ] 低信用用户不能主动给非好友发消息
- [ ] 图片消息不能绕过两条限制
- [ ] 所有新入口未登录回跳不丢失意图
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 11. P2-PR08 通知页面 UI

- PR：`PR 08`
- Priority：`P2`
- Branch：`feature/v2-5-notifications-redesign`
- 目标：重做通知页面移动端信息架构，让通知只承担事件提醒，不和消息系统混淆。

### 11.1 页面结构

- [ ] 顶部：标题、未读数、全部已读
- [ ] 二级：横向分类 tabs
- [ ] 列表：轻卡片或分割线列表
- [ ] 底部：移动端避开 bottom nav
- [ ] 支持空状态、加载态、错误态

### 11.2 分类映射

- [ ] 全部：所有可展示通知
- [ ] 报名：`PARTICIPATION_*`
- [ ] 活动：`ACTIVITY_UPDATED / ACTIVITY_CANCELLED / ACTIVITY_ANNOUNCEMENT / ACTIVITY_COMMENTED / COMMENT_REPLY`
- [ ] 好友：`FRIEND_REQUEST`
- [ ] 系统：`REPORT_CREATED` 和未来系统消息

### 11.3 红点边界

- [ ] 通知红点只代表通知中心未读事件
- [ ] 私信未读不进入通知红点
- [ ] Moment 点赞不进入通知红点
- [ ] Moment 评论不进入通知红点
- [ ] Moment 回复不进入通知红点
- [ ] Moment 转发不进入通知红点

### 11.4 交互

- [ ] 点击通知即标记已读
- [ ] 可单条删除
- [ ] 可删除已读
- [ ] 好友请求支持卡片内接受/拒绝
- [ ] 活动报名审核通知直达审核区域
- [ ] 活动评论通知直达评论区域

### 11.5 本 PR 验收标准

- [ ] 移动端通知页面少框、轻量、清晰
- [ ] 中英法分类 tabs 不换行挤压
- [ ] 通知未读和消息未读完全分离
- [ ] 历史私聊/Moment 互动通知不计入通知红点
- [ ] 好友请求可在通知卡片内处理
- [ ] 活动类通知能跳到正确锚点
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 12. P2-PR09 Moment 晒晒底边栏

- PR：`PR 09`
- Priority：`P2`
- Branch：`feature/v2-5-moment-action-bar`
- 目标：优化晒晒动态底部点赞、评论、转发操作，让互动清楚但不抢内容。

### 12.1 列表页

- [ ] 操作区固定为一行
- [ ] 按钮顺序：点赞、评论、转发/分享、更多
- [ ] 数字和图标不换行
- [ ] 点赞后乐观更新
- [ ] 评论按钮进入详情或展开评论
- [ ] 多语言使用短词，不在按钮里放长句

### 12.2 详情页

- [ ] 保持同一操作逻辑
- [ ] 评论输入区和底边操作区不要冲突
- [ ] 删除/举报等次级操作放更多菜单

### 12.3 视觉

- [ ] 默认文字不用绿色
- [ ] 已点赞可用珊瑚/粉色轻强调
- [ ] 不使用厚重胶囊按钮堆满底部
- [ ] 不遮挡正文、图片和评论输入区

### 12.4 本 PR 验收标准

- [ ] Moments 列表和详情页操作状态一致
- [ ] 点赞乐观更新正确
- [ ] 评论入口和评论数量靠近，不误触
- [ ] 多语言下按钮不换行、不挤压
- [ ] 390px 移动宽度无横向滚动
- [ ] 底边栏不遮挡内容
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 13. P2-PR10 自动触发与奖励闭环

- PR：`PR 10`
- Priority：`P2`
- Branch：`feature/v2-5-social-rewards-automation`
- 目标：把成就、邀请、背包奖励接入真实业务触发点，形成可用闭环。

### 13.1 成就触发

- [ ] 用户签到后触发“真实参加”活动成就
- [ ] 如果活动没有启用签到，使用活动已结束且参与状态为 `JOINED / APPROVED` 作为兜底
- [ ] 活动创建后触发“第一次组织活动”
- [ ] 活动状态变更为完成/结束后同步参与/举办次数成就
- [ ] 用户身份更新后同步共创主理人和 Trusted 成就
- [ ] Profile 成就页打开时可做轻量兜底同步
- [ ] 兜底同步失败不阻塞页面展示

### 13.2 邀请触发

- [ ] 首次访问含 `ref` 的页面时记录 referral cookie
- [ ] 注册/首次创建 Profile 时绑定邀请关系
- [ ] 好友请求接受后补 `friendshipAcceptedAt`
- [ ] 被邀请者第一次真实参加活动后写 `firstParticipationAt`
- [ ] 好友邀请成功继续触发信用值 `INVITE_FRIEND`
- [ ] 不因单纯打开邀请链接发奖励
- [ ] 不因同一 invitee 重复建立/解除好友关系重复奖励

### 13.3 背包触发

- [ ] 新注册用户继续发放欢迎 Friemi 支票
- [ ] 成功组局后发放盲盒碎片
- [ ] 碎片满 10 时允许兑换盲盒支票
- [ ] 活动不是 `PUBLIC_EVENT`
- [ ] 活动未取消
- [ ] 活动结束时间已过
- [ ] 有至少 2 个有效真人参与，包括 organizer
- [ ] 有效真人包括 organizer、`JOINED / APPROVED` 注册参与者、已 linked 的游客报名
- [ ] 不计入 `PENDING / REJECTED / CANCELLED` 参与者
- [ ] 同一组织者同一活动只发一次碎片
- [ ] 同一活动对应的碎片事件必须有稳定 `sourceKey`

### 13.4 本 PR 验收标准

- [ ] 成就重复触发不重复写入
- [ ] 成就兜底同步不覆盖首次解锁时间
- [ ] 邀请奖励不能被重复触发
- [ ] 打开邀请链接不产生奖励
- [ ] 单个活动只能发一次盲盒碎片
- [ ] 碎片不足 10 个时服务端拒绝兑换
- [ ] 兑换成功后碎片余额和支票记录正确
- [ ] 新注册用户欢迎支票仍只发一次
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 14. P3-PR11 上线收尾与验证

- PR：`PR 11`
- Priority：`P3`
- Branch：`chore/v2-5-release-hardening`
- 目标：完成 v2.5 上线前稳定性、迁移、文案和版本公告收尾。

### 14.1 本地验证

- [ ] 本地数据库执行全部 v2.5 migration
- [ ] Prisma Client 为最新生成结果
- [ ] `npm run typecheck --workspace=apps/web`
- [ ] `npm test --workspace=apps/web`
- [ ] `git diff --check`

### 14.2 预览环境验证

- [ ] 使用预览库 direct URL 执行 Prisma migration deploy
- [ ] 验证新表存在
- [ ] 验证索引存在
- [ ] 验证 Profile 新页面能加载
- [ ] 验证旧数据不受影响
- [ ] iPhone 14 Pro Max smoke test
- [ ] iPhone SE smoke test
- [ ] Android WebView smoke test
- [ ] 中英法主要按钮不换行

### 14.3 生产迁移准备

- [ ] 只使用生产 direct URL 执行迁移
- [ ] 迁移前确认当前分支已部署到预览且测试通过
- [ ] 准备生产迁移命令
- [ ] 准备生产检查 SQL
- [ ] 生产迁移后执行 smoke test

表检查 SQL：

```sql
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ActivityRoomMessage'
  ) AS has_activity_room_message,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserAchievement'
  ) AS has_user_achievement,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserReferral'
  ) AS has_user_referral,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ProfileVisit'
  ) AS has_profile_visit;
```

索引检查 SQL：

```sql
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'ActivityRoomMessage',
    'UserAchievement',
    'UserReferral',
    'ProfileVisit'
  )
ORDER BY tablename, indexname;
```

### 14.4 公告与版本

- [ ] `apps/web/app/[locale]/updates` 写入 v2.5 更新公告
- [ ] Footer 版本号更新为 v2.5
- [ ] 检查 sitemap 不包含私有 Profile 子页
- [ ] 检查 robots/noindex 不阻挡公开可索引页面
- [ ] 检查登录回跳不丢 `redirect_url`
- [ ] 检查邀请回跳不丢 `ref`

### 14.5 本 PR 验收标准

- [ ] 本地迁移成功
- [ ] 预览迁移成功
- [ ] 生产迁移 SQL 已准备
- [ ] v2.5 更新公告已上线
- [ ] Footer 显示 v2.5
- [ ] 新私有页面不进入 sitemap
- [ ] 公开 Profile 和公开活动页面仍可被索引
- [ ] 移动端没有中间滚动条遮挡底部导航
- [ ] 所有新弹窗不用浏览器 `alert`
- [ ] 未登录回跳不丢用户意图
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过

## 15. Pn 暂缓项

- Priority：`Pn`
- Branch：`none`
- 目标：明确不进入 v2.5 的内容，避免开发过程扩大范围。

- [ ] 真实支付和 Coins 充值
- [ ] 礼物购买结算
- [ ] 负分礼物
- [ ] 公开贡献值排行榜
- [ ] 公开信用扣分明细
- [ ] 主理人商业分成
- [ ] 主理人申请后台
- [ ] 复杂成就动画
- [ ] 礼物墙特效
- [ ] WebSocket 实时群聊
- [ ] 群聊图片和表情
- [ ] 群聊 @ 人、撤回、置顶
- [ ] 访客隐身模式
- [ ] 复杂隐私设置
- [ ] 公开 Experience/Level 系统

Pn 验收标准：

- [ ] v2.5 PR 中不引入上述范围
- [ ] 如果必须引入，先更新本文档并单独确认范围

## 16. 最小上线标准

v2.5 可以拆多次 PR，但正式打 v2.5 时至少满足：

- [ ] Profile 五个占位入口全部变成真实页面
- [ ] 邀请链接可以复制并完成新用户归因
- [ ] 邀请归因不会自动创建好友关系
- [ ] 访客记录可写入和展示
- [ ] 成就可解锁并展示
- [ ] 背包能展示欢迎支票和盲盒碎片
- [ ] 商城能展示礼物目录但不接支付
- [ ] 已加入活动的用户可以使用局内群聊
- [ ] 陌生人私聊两条限制有清晰 UI
- [ ] 通知页面移动端完成视觉优化
- [ ] Moment 底边栏完成移动端调整
- [ ] 本地、预览数据库迁移完成
- [ ] typecheck、test、diff check 通过

## 17. 逻辑一致性约束

后续实现时，如果代码和本节冲突，优先回到本节重新判断。

### 17.1 通知与消息

- [ ] 通知红点只代表通知中心未读事件
- [ ] 私聊未读只进入消息/足迹消息入口
- [ ] 晒晒互动不重新进入通知红点，除非后续补足足迹内独立互动入口
- [ ] 局内群聊 v2.5 不做全局红点，避免和私聊/通知混淆

### 17.2 Profile 隐私

- [ ] 自己的背包、邀请统计、访客记录只能自己看
- [ ] 他人 Profile 只能展示公开信息：头像、昵称、简介、信用等级、魅力、公开成就、社交入口
- [ ] 访客记录不记录自己，不暴露游客，不展示过细访问轨迹
- [ ] 邀请归因不是好友关系，不自动建立 friendship

### 17.3 活动关系

- [ ] 局内群聊只属于用户创建的活动/组局
- [ ] 纯公共采集活动没有群聊
- [ ] 公共活动下的用户组局可以有群聊，但群聊归属用户组局
- [ ] 群聊权限必须由活动成员关系决定，不能只靠前端按钮隐藏

### 17.4 数值体系

- [ ] 信用值只代表可靠性
- [ ] 魅力值只代表被送礼带来的社交展示
- [ ] 贡献值只代表对平台产生的价值
- [ ] 成就是展示层，不直接等于信用、魅力或贡献
- [ ] Experience/Level 不在 v2.5 单独上线

### 17.5 奖励防刷

- [ ] 打开邀请链接不奖励
- [ ] 同一个被邀请者只归因一次
- [ ] 同一个被邀请者只触发一次邀请奖励
- [ ] 同一个活动只触发一次盲盒碎片奖励
- [ ] 成就只记录第一次解锁时间
- [ ] 所有奖励类写入必须有幂等 key

### 17.6 路由和回跳

- [ ] 用户登录后必须回到原本要去的功能页
- [ ] `ref`、`redirect_url` 和 locale 跳转不能互相覆盖
- [ ] canonical 活动详情使用 `/lobby/[activityId]`
- [ ] 新增活动群聊使用 `/lobby/[activityId]/room`
- [ ] Profile 私有子页使用静态路由，不能被 `[profileId]` 捕获
