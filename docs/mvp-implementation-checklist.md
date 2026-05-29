# MVP 功能实现清单

## 当前地基状态

已完成：

- Supabase PostgreSQL 连接
- Prisma schema 基础模型
- Clerk 登录接入
- Clerk webhook 路由预留
- Clerk 用户资料同步到 `UserProfile`
- npm workspace 工程结构
- Vercel 项目绑定和 Preview 基础准备

接下来目标是完成 MVP 核心闭环：

```text
用户登录 → 浏览活动 → 查看详情 → 发起活动 → 报名参加 → 个人空间管理
```

## 分支建议

所有功能从 `dev` 拉 feature 分支：

```bash
git switch dev
git pull origin dev
git switch -c feature/功能名
```

完成后 PR 到：

```text
feature/* → dev
```

不要直接在 `main` 或 `dev` 上开发。

## P0：必须完成的 MVP 闭环

### 1. 活动列表接入数据库

建议分支：

```text
feature/activity-list-db
```

小功能：

- [x] 新建活动查询函数 `getActivities`
- [x] 从 Prisma 读取 `Activity`
- [x] 按 `status = RECRUITING / CONFIRMED` 展示活动
- [x] 按 `startAt` 从近到远排序
- [x] 计算参与人数 `participants.count`
- [x] 替换当前 mock 数据
- [x] 空状态展示
- [x] 加载失败兜底

验收标准：

- 首页或活动页显示 Supabase 中真实活动
- 数据库新增活动后，刷新页面可见
- `npm run typecheck` 通过

### 2. 活动详情页接入数据库

建议分支：

```text
feature/activity-detail-db
```

小功能：

- [x] 新建 `getActivityById`
- [x] 查询活动基础信息
- [x] 查询发起人 `UserProfile`
- [x] 查询报名人数
- [x] 展示活动标题、描述、行程、时间、地点、人数、费用
- [x] 展示活动状态
- [x] 活动不存在时返回 404
- [x] 保留移动端可读布局

验收标准：

- 点击活动卡片进入真实详情页
- 不存在的活动 ID 不崩溃
- 详情页能看到发起人信息

### 3. 创建活动写入数据库

建议分支：

```text
feature/activity-create-db
```

小功能：

- [x] 创建活动表单改为真实提交
- [x] 使用 zod 校验字段
- [x] 使用 `ensureCurrentUserProfile` 获取当前用户
- [x] 创建 `Activity`
- [x] 支持 `LOCAL / TRIP`
- [x] 支持标题、描述、行程、城市、目的地、地址、开始时间、结束时间
- [x] 支持人数上限 `capacity`
- [x] 支持最少成团人数 `minParticipants`
- [x] 支持是否需要审核 `requiresApproval`
- [x] 支持费用说明 `priceText`
- [x] 创建成功后跳转详情页
- [x] 创建失败显示错误提示

验收标准：

- 登录用户可以创建活动
- 新活动写入 Supabase
- 创建后跳转到新活动详情页
- 未登录用户不能创建活动

### 4. 报名参加活动

建议分支：

```text
feature/join-activity
```

小功能：

- [x] 增加报名 server action
- [x] 使用当前登录用户的 `UserProfile`
- [x] 判断活动是否存在
- [x] 判断活动是否已结束或取消
- [x] 判断是否已经报名
- [x] 判断是否满员
- [x] 免审核活动创建 `APPROVED` 参与记录
- [x] 需审核活动创建 `PENDING` 参与记录
- [x] 支持报名留言 `message`
- [x] 报名后刷新详情页人数

验收标准：

- 登录用户可以报名
- 同一用户不能重复报名同一活动
- 满员活动不能继续报名
- 需审核活动显示待审核状态

### 5. 取消报名

建议分支：

```text
feature/cancel-participation
```

小功能：

- [x] 增加取消报名 action
- [x] 只允许本人取消自己的报名
- [x] 把状态改为 `CANCELLED`
- [x] 写入 `cancelledAt`
- [x] 活动人数统计排除已取消报名
- [x] 取消后详情页按钮状态更新

验收标准：

- 用户可以取消自己的报名
- 取消后人数减少
- 不能取消别人的报名

### 6. 个人空间接入真实数据

建议分支：

```text
feature/profile-dashboard
```

小功能：

- [x] 查询当前用户资料
- [x] 展示昵称、邮箱、头像
- [x] 查询我发起的活动
- [x] 查询我参与的活动
- [x] 区分 `PENDING / APPROVED / CANCELLED`
- [x] 空状态展示
- [x] 卡片链接到活动详情页

验收标准：

- 登录后进入 `/zh-CN/profile`
- 能看到自己创建的活动
- 能看到自己报名的活动

## P1：提升可用性的核心功能

### 7. 活动编辑

建议分支：

```text
feature/activity-edit
```

小功能：

- [x] 增加编辑活动页面
- [x] 只允许发起人编辑
- [x] 预填已有活动信息
- [x] 更新标题、描述、行程、时间、地点、人数、费用
- [x] 保存成功后跳转详情页
- [x] 非发起人访问返回无权限

验收标准：

- 发起人可以编辑自己的活动
- 非发起人不能编辑

### 8. 活动取消 / 状态管理

建议分支：

```text
feature/activity-status
```

小功能：

- [x] 发起人可以取消活动
- [x] 状态改为 `CANCELLED`
- [x] 已取消活动不能报名
- [x] 已结束活动不能报名
- [x] 根据 `endAt` 判断是否过期
- [x] 列表默认隐藏已结束和已取消活动

验收标准：

- 已取消活动显示取消状态
- 已取消活动无法报名

### 9. 报名审核

建议分支：

```text
feature/participation-approval
```

小功能：

- [x] 发起人在活动详情页看到待审核列表
- [x] 发起人可以通过报名
- [x] 发起人可以拒绝报名
- [x] `PENDING → APPROVED`
- [x] `PENDING → REJECTED`
- [x] 非发起人不能审核
- [x] 人数统计只计算 `APPROVED`

验收标准：

- 需审核活动可以完成审核流程
- 审核权限正确

### 10. 搜索和筛选

建议分支：

```text
feature/activity-filters
```

小功能：

- [ ] 关键词搜索标题和描述
- [ ] 按分类筛选
- [ ] 按城市筛选
- [ ] 按活动类型 `LOCAL / TRIP` 筛选
- [ ] 按日期排序
- [ ] URL query 可分享

验收标准：

- 用户可以按关键词和分类找到活动
- 刷新页面后筛选条件保留

### 11. 基础评论 / 提问区

建议分支：

```text
feature/activity-comments
```

需要先扩展 Prisma：

```text
Comment
```

小功能：

- [x] 新增评论模型
- [x] 登录用户可以评论
- [x] 活动详情页显示评论
- [x] 支持提问 / 建议 / 评价类型
- [x] 发起人可以置顶回复，后续可做

验收标准：

- 活动详情页能写评论
- 评论写入数据库

## P2：运营和增长功能

### 12. 收藏活动

建议分支：

```text
feature/favorite-activity
```

需要先扩展 Prisma：

```text
Favorite
```

小功能：

- [ ] 用户可以收藏活动
- [ ] 用户可以取消收藏
- [ ] 个人空间显示我的收藏
- [ ] 同一用户不能重复收藏同一活动

### 13. 关注用户

建议分支：

```text
feature/follow-users
```

当前 Prisma 已有 `UserFollow`。

小功能：

- [ ] 用户可以关注活动发起人
- [ ] 用户可以取消关注
- [ ] 显示关注数 / 粉丝数
- [ ] 个人空间显示关注列表
- [ ] 后续可用于熟人高亮

### 14. 活动推荐位 / 置顶预留

建议分支：

```text
feature/promoted-activities
```

小功能：

- [x] Prisma 增加 `isPromoted`
- [x] 列表优先展示置顶活动
- [x] 后台暂时手动改数据库
- [x] 为后续商家推广预留

### 15. 商家主页 MVP

建议分支：

```text
feature/merchant-profile
```

需要先扩展 Prisma：

```text
Merchant
```

小功能：

- [x] 商家基础信息
- [x] 商家活动列表
- [x] 活动关联商家
- [x] 先不做支付和套餐

## P3：后续增强

### 16. 图片上传

建议分支：

```text
feature/activity-images
```

小功能：

- [x] 活动封面上传
- [x] Cloudinary 或 Supabase Storage
- [x] 图片 URL 写入 `coverImageUrl`
- [x] 默认占位图

### 17. 地图和地点

建议分支：

```text
feature/activity-map
```

小功能：

- [x] 活动记录经纬度
- [x] 地图选点（OSM/Nominatim，暂不依赖 Mapbox token）
- [x] 地图展示活动位置
- [x] 后续支持附近活动

### 18. 通知中心

建议分支：

```text
feature/notifications
```

小功能：

- [x] 报名成功通知
- [x] 审核结果通知
- [x] 活动取消通知
- [x] 未读状态

### 19. 智能链接导入

建议分支：

```text
feature/activity-link-import
```

小功能：

- [x] 粘贴外部活动链接
- [x] 解析标题、时间、地点、封面
- [x] 预填创建活动表单
- [x] MVP 阶段可先做手动解析或白名单站点

## P4：好友系统和熟人参与信号

目标：

```text
用户可以建立好友关系 → 活动页看到熟人报名信号 → 好友列表看到对方近期参加的活动
```

产品边界：

- 不做实时在线状态
- 不做“正在输入”
- 不做 Discord / Steam 式实时 presence
- 活动开始前显示“已报名 / 已确认”，活动时间段内可显示“正在参加”
- 好友活动信号优先使用活动开始时间，而不是报名提交时间
- 默认只展示好友相关信息，不公开陌生人的完整报名列表

### 20. 好友关系基础

建议分支：

```text
feature/friends-foundation
```

需要先扩展 Prisma：

```text
FriendRequest
Friendship
```

小功能：

- [ ] 新增好友申请模型，记录申请人、接收人、状态、留言
- [ ] 新增好友关系模型，保存双向好友关系
- [ ] 同一用户之间不能重复发送待处理好友申请
- [ ] 用户不能添加自己为好友
- [ ] 支持发送好友申请
- [ ] 支持接受好友申请
- [ ] 支持拒绝好友申请
- [ ] 支持取消或删除好友关系
- [ ] 个人空间增加好友入口
- [ ] 好友列表只展示已接受的好友
- [ ] 移动端好友入口和列表布局可用

验收标准：

- 登录用户可以向另一个用户发送好友申请
- 接收方可以接受或拒绝申请
- 接受后双方互为好友
- 重复申请会被阻止
- 非登录用户不能操作好友关系
- `npm run typecheck` 通过

### 21. 活动页好友报名信号

建议分支：

```text
feature/activity-friend-signals
```

依赖：

```text
feature/friends-foundation
```

小功能：

- [ ] 活动详情查询当前用户好友列表
- [ ] 活动详情查询好友中已报名或已确认参加的人
- [ ] 活动详情显示 `Haotian、Yiming 等 5 位好友已报名`
- [ ] 超过默认展示人数时显示“查看更多”
- [ ] 点击“查看更多”展开完整好友报名列表
- [ ] 活动卡片显示简短好友信号，例如 `2 位好友已报名`
- [ ] 只统计 `APPROVED / JOINED` 等有效报名状态
- [ ] 排除 `CANCELLED / REJECTED`
- [ ] 未登录用户不显示好友信号
- [ ] 没有好友报名时不占用明显空间
- [ ] 移动端文字不能换行挤压主按钮

验收标准：

- 当前用户有好友报名活动时，活动卡片和详情页能看到好友信号
- 好友人数超过展示上限时可以展开查看
- 取消报名或被拒绝后，不再计入好友信号
- 陌生报名用户不会被完整展示
- 页面在桌面端和移动端布局稳定

### 22. 好友近期活动摘要

建议分支：

```text
feature/friend-activity-summary
```

依赖：

```text
feature/friends-foundation
feature/activity-friend-signals
```

小功能：

- [ ] 查询好友未来 30 天内已报名或已确认的活动
- [ ] 按活动开始时间从近到远排序
- [ ] 好友列表默认展示最近一条活动摘要
- [ ] 摘要格式：`6月14日参加了「巴黎 City Walk」`
- [ ] 同一好友还有更多活动时显示 `+N`
- [ ] 点击 `+N` 展开该好友后续参加活动列表
- [ ] 活动列表项可跳转活动详情页
- [ ] 已取消、已拒绝、已结束太久的活动不展示
- [ ] 没有近期活动时显示普通好友信息，不制造空状态噪音
- [ ] 移动端列表压缩，避免聊天 / 好友入口过高

验收标准：

- 好友列表能看到好友最近参加的活动
- 点击 `+N` 可以看到后续活动
- 活动按开始时间排序
- 只有当前用户的好友活动会显示
- 不依赖实时在线状态

## P5：轻量点对点聊天

目标：

```text
好友之间可以围绕活动进行简单沟通，但不做复杂即时通讯系统
```

产品边界：

- 只做点对点聊天
- 不做群聊
- 不做已读回执
- 不做正在输入
- 不做实时在线状态
- 不做语音、图片、文件消息
- 不做复杂聊天搜索
- 聊天入口优先服务“活动前沟通”和“好友关系维护”

### 23. 点对点聊天数据模型

建议分支：

```text
feature/direct-message-foundation
```

需要先扩展 Prisma：

```text
Conversation
DirectMessage
```

小功能：

- [ ] 新增会话模型，保存两个参与用户
- [ ] 新增消息模型，保存发送人、正文、创建时间、读取时间预留
- [ ] 同一对用户只能有一个点对点会话
- [ ] 只有好友之间可以创建会话
- [ ] 后续可扩展为“同活动已确认报名用户可临时私聊”
- [ ] 消息正文长度限制
- [ ] 空消息不能发送
- [ ] 删除好友后是否保留历史会话需要产品确认，默认保留只读

验收标准：

- 好友之间可以创建唯一会话
- 非好友不能主动创建私聊
- 消息可以写入数据库
- 重复创建会话会复用已有会话

### 24. 聊天列表和消息页

建议分支：

```text
feature/direct-message-ui
```

依赖：

```text
feature/direct-message-foundation
```

小功能：

- [ ] 新增聊天列表页
- [ ] 聊天列表展示好友头像、昵称、最后一条消息
- [ ] 聊天列表展示最后消息时间
- [ ] 聊天详情页展示双方消息气泡
- [ ] 支持发送文本消息
- [ ] 发送后刷新当前会话
- [ ] 空会话显示轻量提示
- [ ] 移动端输入框固定在底部安全区域上方
- [ ] 桌面端聊天页保持可读宽度，不做复杂三栏布局

验收标准：

- 用户可以进入某个好友的聊天页
- 可以发送和查看历史消息
- 移动端键盘弹出时主要操作不被底部导航遮挡
- 未登录用户不能访问聊天页

### 25. 聊天列表中的好友活动信号

建议分支：

```text
feature/chat-activity-context
```

依赖：

```text
feature/friend-activity-summary
feature/direct-message-ui
```

小功能：

- [ ] 聊天列表中显示好友最近参加活动摘要
- [ ] 摘要格式：`6月14日参加了「巴黎 City Walk」`
- [ ] 同一好友还有更多近期活动时显示 `+N`
- [ ] 点击 `+N` 展开后续活动列表
- [ ] 活动标题可跳转详情页
- [ ] 聊天最后消息和活动摘要视觉层级区分
- [ ] 没有近期活动时只显示最后消息
- [ ] 不显示实时在线状态

验收标准：

- 聊天列表能作为“好友最近要去哪玩”的入口
- 有近期活动的好友更容易被用户发现
- `+N` 展开后不会破坏移动端布局
- 活动摘要不影响正常收发消息

## 推荐开发顺序

第一轮建议：

```text
1. feature/activity-list-db
2. feature/activity-detail-db
3. feature/activity-create-db
4. feature/join-activity
5. feature/profile-dashboard
```

第二轮建议：

```text
6. feature/cancel-participation
7. feature/activity-status
8. feature/participation-approval
9. feature/activity-filters
```

第三轮建议：

```text
10. feature/activity-comments
11. feature/favorite-activity
12. feature/follow-users
```

第四轮建议：

```text
13. feature/friends-foundation
14. feature/activity-friend-signals
15. feature/friend-activity-summary
```

第五轮建议：

```text
16. feature/direct-message-foundation
17. feature/direct-message-ui
18. feature/chat-activity-context
```

## 每个 PR 的最低要求

每个 PR 至少说明：

- 做了什么
- 涉及哪些页面
- 是否改了 Prisma schema
- 是否需要运行 `npm run db:push`
- 如何测试

提交前必须运行：

```bash
npm run typecheck
npm run build
```

## 当前最适合分配的任务

前三轮完成后，建议团队从 P4 的好友系统开始，并保持依赖顺序：

```text
负责人 A：feature/friends-foundation
负责人 B：feature/activity-friend-signals，等好友基础合并后开始
负责人 C：feature/friend-activity-summary，等好友信号查询稳定后开始
负责人 D：整理 P5 聊天数据模型方案，暂不直接实现 UI
```

`feature/direct-message-foundation` 建议等好友关系模型稳定后再开，避免聊天权限和好友权限重复返工。
