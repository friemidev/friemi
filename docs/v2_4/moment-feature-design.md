# Friemi Moment 功能设计与开发清单

> 文档版本：v0.1  
> 适用分支：`feature/v2-4-moment-design`  
> 适用阶段：v2.4 产品设计、移动端 UI 重做、数据库与通知拆解  
> 目标形态：移动端优先，Web 端可以先复用基础列表或延后精修

---

## 1. 产品定位

Moment 是 Friemi 的轻量社交动态流。它不是新的活动系统，也不是复杂社媒平台，第一版只解决一个问题：

用户可以在 Friemi 内发布日常照片和文字，让好友看到、点赞、评论、转发，并在互动发生时收到站内通知。

参考预览图，移动端底部导航中的“消息”将被替换为一个新的聚合页。页面名称定为“足迹”，避免 `Friend & Me` 这类英文标题在移动端过长：

```text
足迹
├── Moment
├── Message
└── Profile
```

也就是说，消息和个人主页仍然保留能力，但入口被收进同一个“足迹”页面中。用户进入后默认看到 Moment，顶部 tab 可以切换到 Message 和 Profile。

## 2. 第一版范围

### 2.1 做

- 用户发布 Moment：文字、图片，图片可 1-9 张。
- Moment 信息流：优先展示好友动态，自己的动态也展示。
- 点赞 / 取消点赞。
- 评论 / 删除自己的评论。
- 转发：第一版建议先做“分享链接 / 分享卡片”，不做站内二次发布。
- 举报 Moment 或评论。
- 点赞、评论产生站内通知。
- 移动端足迹页面：Moment / Message / Profile 三个 tab。
- 底部导航把原“消息”改成“足迹”。
- 多语言文案：中文、英文、法语。

### 2.2 暂不做

- 视频。
- 话题、标签、热门榜。
- 关注推荐算法。
- 陌生人公开广场。
- 定位打卡。
- 复杂转发链路。
- 私密分组可见。
- Moment 编辑。
- 图片滤镜、裁剪、贴纸。
- Web 端完整社媒布局。

## 3. 用户体验方向

视觉方向跟随 v2.4 移动端预览图：轻白底、圆角卡片、低密度文字、插画式图片占位、底部导航常驻。页面不做重运营信息流，不堆筛选和说明。

### 3.1 页面结构

```text
/{locale}/footprints
```

移动端首屏：

```text
足迹                                设置

Moment         Message         Profile
━━━━━━

[发布输入框]
分享此刻的心情或精彩瞬间...

好友动态

[Moment 卡片]
头像 昵称 时间 更多
正文
图片
♡ 数量    💬 数量    ↗
```

### 3.2 底部导航调整

当前移动端底部导航：

```text
大厅 / 组局 / + / 消息 / 主页
```

v2.4 调整为：

```text
大厅 / 组局 / + / 足迹 / 主页
```

建议第一版仍保留“主页”底部入口，避免用户找不到个人设置。但“足迹”内的 Profile tab 会展示同一套 Profile 内容的移动聚合版。后续如果确认用户更习惯聚合页，再考虑把底部“主页”移除或变成“我的”入口。

### 3.3 Message tab

Message tab 不重新实现聊天系统，直接复用现有消息能力：

- 会话列表复用 `features/direct-messages` 的查询与组件。
- 未读数继续来自 `Notification` / `DIRECT_MESSAGE` 体系。
- 点击会话进入原 `/messages/{conversationId}`，或在后续版本内嵌聊天面板。

### 3.4 Profile tab

Profile tab 不重新实现个人主页，第一版复用当前 `/profile` 数据：

- 头像、昵称、简介、好友号。
- 我发起的组局、我参加的组局、收藏。
- 账号与安全入口。

移动端可以先在 `足迹` 内做摘要卡，完整内容仍跳 `/profile`。

## 4. 信息架构

### 4.1 新路由建议

| 路由                           | 用途             | 首版策略                            |
| ------------------------------ | ---------------- | ----------------------------------- |
| `/{locale}/footprints`         | 移动端足迹聚合页 | 新增                                |
| `/{locale}/moments/{momentId}` | Moment 详情页    | 可选，评论弹层无法承载时再做        |
| `/{locale}/moments/new`        | 发布页           | 可做成 `footprints` 内 bottom sheet |

### 4.2 保留旧路由

| 旧路由                                | 处理                              |
| ------------------------------------- | --------------------------------- |
| `/{locale}/messages`                  | 保留，足迹里的 Message tab 可复用 |
| `/{locale}/messages/{conversationId}` | 保留                              |
| `/{locale}/profile`                   | 保留                              |
| `/{locale}/profile/{profileId}`       | 保留                              |

## 5. 数据模型建议

Moment 不建议复用 `Activity` 或 `Comment` 表。活动评论绑定活动，Moment 评论应独立建模。

### 5.1 Prisma 模型草案

```prisma
enum MomentVisibility {
  FRIENDS
  PUBLIC
}

model Moment {
  id          String           @id @default(cuid())
  authorId    String
  author      UserProfile      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  content     String?          @db.Text
  visibility  MomentVisibility @default(FRIENDS)
  deletedAt   DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  images      MomentImage[]
  likes       MomentLike[]
  comments    MomentComment[]

  @@index([authorId, createdAt])
  @@index([visibility, createdAt])
  @@index([deletedAt, createdAt])
}

model MomentImage {
  id        String   @id @default(cuid())
  momentId  String
  moment    Moment   @relation(fields: [momentId], references: [id], onDelete: Cascade)
  url       String
  width     Int?
  height    Int?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@index([momentId, sortOrder])
}

model MomentLike {
  id        String      @id @default(cuid())
  momentId  String
  moment    Moment      @relation(fields: [momentId], references: [id], onDelete: Cascade)
  userId    String
  user      UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())

  @@unique([momentId, userId])
  @@index([userId, createdAt])
  @@index([momentId, createdAt])
}

model MomentComment {
  id        String          @id @default(cuid())
  momentId  String
  moment    Moment          @relation(fields: [momentId], references: [id], onDelete: Cascade)
  authorId  String
  author    UserProfile     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parentId  String?
  parent    MomentComment?  @relation("MomentCommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   MomentComment[] @relation("MomentCommentReplies")
  content   String          @db.Text
  deletedAt DateTime?
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([momentId, parentId, createdAt])
  @@index([authorId, createdAt])
}
```

### 5.2 枚举扩展

`NotificationType` 建议新增：

```prisma
MOMENT_LIKED
MOMENT_COMMENTED
MOMENT_COMMENT_REPLY
```

`ReportTargetType` 建议新增：

```prisma
MOMENT
MOMENT_COMMENT
```

`Notification` 当前可关联 `activityId`，Moment 通知需要新增字段：

```prisma
momentId        String?
momentCommentId String?
```

并加索引：

```prisma
@@index([momentId])
@@index([momentCommentId])
```

## 6. 权限与可见性

### 6.1 首版可见范围

第一版建议默认：

```text
好友可见
```

原因：

- 降低内容治理压力。
- 符合预览图 “好友动态” 的语义。
- Friemi 当前核心是线下社交，好友动态比陌生人广场更稳。

可以保留 `PUBLIC` 枚举，但 UI 暂不开放。

### 6.2 信息流规则

Moment feed 查询范围：

- 当前用户发布的 Moment。
- 当前用户好友发布的 Moment。
- `deletedAt = null`。
- 按 `createdAt desc` 分页。

未来如开放公共 Moment，再将 `visibility = PUBLIC` 加入 feed。

### 6.3 操作权限

| 操作        | 权限                                      |
| ----------- | ----------------------------------------- |
| 发布 Moment | 登录用户                                  |
| 删除 Moment | 作者本人；管理员后续可补                  |
| 点赞        | 登录用户，可见该 Moment                   |
| 评论        | 登录用户，可见该 Moment                   |
| 删除评论    | 评论作者本人；Moment 作者可隐藏评论可延后 |
| 举报        | 登录用户，不能举报自己                    |

## 7. 通知设计

Moment 互动要进入现有站内通知和移动端推送体系。当前 `createNotification` 已能触发移动推送，Moment 只需扩展类型、文案和跳转。

### 7.1 触发规则

| 场景               | 通知接收人 | 类型                   |
| ------------------ | ---------- | ---------------------- |
| A 点赞 B 的 Moment | B          | `MOMENT_LIKED`         |
| A 评论 B 的 Moment | B          | `MOMENT_COMMENTED`     |
| A 回复 B 的评论    | B          | `MOMENT_COMMENT_REPLY` |

不发通知：

- 用户点赞自己的 Moment。
- 用户评论自己的 Moment。
- 同一用户短时间重复点赞取消再点赞，可按唯一约束避免刷通知。

### 7.2 跳转路径

```text
/{locale}/footprints?tab=moment&momentId={momentId}
```

如果后续做详情页，再改为：

```text
/{locale}/moments/{momentId}
```

## 8. 组件拆分建议

```text
features/moments/
├── actions/
│   ├── createMoment.ts
│   ├── toggleMomentLike.ts
│   ├── createMomentComment.ts
│   ├── deleteMoment.ts
│   └── deleteMomentComment.ts
├── components/
│   ├── FootprintsMobilePage.tsx
│   ├── FootprintsTabs.tsx
│   ├── MomentComposer.tsx
│   ├── MomentCard.tsx
│   ├── MomentImageGrid.tsx
│   ├── MomentActionsBar.tsx
│   ├── MomentCommentsSheet.tsx
│   └── MomentMoreMenu.tsx
├── queries/
│   ├── getMomentFeed.ts
│   └── getMomentById.ts
├── services/
│   ├── momentNotifications.ts
│   └── momentVisibility.ts
├── types.ts
└── copy.ts
```

## 9. 移动端 UI 细节

### 9.1 足迹顶部

- 标题：`足迹`
- 右上角：设置图标，跳 `/profile` 或账号设置。
- Tab：`Moment / Message / Profile`
- 当前 tab 下方绿色短线。
- 不显示大段说明。

### 9.2 发布入口

预览图里的发布入口应做成轻输入卡：

```text
[ 分享此刻的心情或精彩瞬间...          插画 ]
```

点击后打开发布 bottom sheet：

- 文本框。
- 图片选择按钮。
- 图片预览九宫格。
- 发布按钮。
- 关闭按钮。

### 9.3 Moment 卡片

卡片结构：

- 头像、昵称、时间、更多按钮。
- 正文最多先显示 4 行，超出展开。
- 图片：
  - 1 张：大圆角图。
  - 2 张：并排。
  - 3-9 张：九宫格。
- 操作区：心形、评论、分享。
- 数量只在大于 0 时显示，减少噪音。

### 9.4 空状态

Moment 空状态不写说明书式文字：

```text
还没有好友动态
发一条 Moment，或先添加朋友。
```

按钮：

- `发布 Moment`
- `添加朋友`

## 10. 与现有系统的关系

### 10.1 消息系统

Moment 不改 `DirectMessage` 的数据结构。Message tab 只是换入口。

后续如果要让 Moment 评论里点击作者私信，可以复用现有 conversation 创建逻辑。

### 10.2 个人主页

Profile tab 第一版展示摘要，完整资料仍走 `/profile`。

未来可在个人主页加入：

- TA 的 Moment。
- TA 的公开组局。
- 共同好友 / 共同参与。

### 10.3 举报系统

复用现有 `Report` 表，但需要扩展 `ReportTargetType`：

- `MOMENT`
- `MOMENT_COMMENT`

管理后台需要能打开目标内容预览。

### 10.4 图片上传

第一版可复用活动封面上传的存储能力，但需要独立路径：

```text
moments/{userId}/{momentId}/{imageId}.webp
```

上传限制建议：

- 最多 9 张。
- 单张最大 4MB。
- 格式：JPG、PNG、WebP。
- 服务端统一校验 MIME 和大小。

## 11. 开发 Checklist

### 11.1 数据库

- [ ] 新增 `MomentVisibility` enum。
- [ ] 新增 `Moment` model。
- [ ] 新增 `MomentImage` model。
- [ ] 新增 `MomentLike` model。
- [ ] 新增 `MomentComment` model。
- [ ] `NotificationType` 增加 `MOMENT_LIKED`、`MOMENT_COMMENTED`、`MOMENT_COMMENT_REPLY`。
- [ ] `ReportTargetType` 增加 `MOMENT`、`MOMENT_COMMENT`。
- [ ] `Notification` 增加 `momentId`、`momentCommentId` 可空字段和索引。
- [ ] 生成并迁移 Prisma migration。

### 11.2 查询与权限

- [ ] `getMomentFeed`：只返回自己和好友的未删除 Moment。
- [ ] `getMomentById`：校验可见性。
- [ ] `momentVisibility` 服务：集中判断是否可看、可互动、可举报。
- [ ] 分页使用 cursor，不一次性拉全量。
- [ ] 查询返回 likedByMe、likeCount、commentCount。

### 11.3 发布

- [ ] `createMoment` server action。
- [ ] 文本最大长度建议 500 字。
- [ ] 图片最多 9 张。
- [ ] 没文字且没图片时禁止发布。
- [ ] 图片上传失败时不创建空 Moment。
- [ ] 发布成功后 revalidate `footprints`。

### 11.4 点赞

- [ ] `toggleMomentLike` server action。
- [ ] 唯一约束防重复点赞。
- [ ] 给 Moment 作者发 `MOMENT_LIKED` 通知。
- [ ] 自己点赞自己不发通知。
- [ ] UI 乐观更新，失败回滚。

### 11.5 评论

- [ ] `createMomentComment` server action。
- [ ] 评论最大长度建议 300 字。
- [ ] 支持一级评论；回复评论可作为 v0.2。
- [ ] 给 Moment 作者发 `MOMENT_COMMENTED` 通知。
- [ ] 回复别人评论时发 `MOMENT_COMMENT_REPLY`。
- [ ] 自己评论自己不发通知。
- [ ] 评论 sheet 支持加载更多。

### 11.6 转发

- [ ] 分享按钮调用 Web Share API / Android bridge / iOS bridge。
- [ ] 不支持时复制链接。
- [ ] 分享卡片文案多语言。
- [ ] 不做站内转发动态。

### 11.7 举报

- [ ] ReportDialog 支持 `MOMENT`。
- [ ] ReportDialog 支持 `MOMENT_COMMENT`。
- [ ] Moment 卡片更多菜单接入举报。
- [ ] 评论更多菜单接入举报。
- [ ] 管理后台 Report 列表能显示 Moment 目标摘要。

### 11.8 通知

- [ ] `getNotificationCopy` 增加 Moment 文案。
- [ ] `getNotificationPath` 增加 Moment 跳转。
- [ ] 通知中心展示 Moment 互动。
- [ ] Android / iOS 推送文案覆盖点赞和评论。
- [ ] 未读角标计数复用现有 `Notification.readAt`。

### 11.9 UI

- [ ] 新增 `/{locale}/footprints` 页面。
- [ ] 移动端底部导航“消息”替换为“足迹”。
- [ ] 足迹顶部 tab：Moment / Message / Profile。
- [ ] Moment composer bottom sheet。
- [ ] Moment 卡片图片网格。
- [ ] Moment 评论 sheet。
- [ ] Moment 更多菜单。
- [ ] 空状态。
- [ ] 加载骨架屏。
- [ ] 390px、430px、768px 移动端截图验收。

### 11.10 多语言

- [ ] 中文文案。
- [ ] 英文文案。
- [ ] 法语文案。
- [ ] Moment 通知文案三语。
- [ ] 分享文案三语。
- [ ] 举报菜单文案三语。

### 11.11 安全与治理

- [ ] 发布、点赞、评论、举报全部服务端鉴权。
- [ ] 删除 Moment 使用软删除 `deletedAt`。
- [ ] 被删除 Moment 不再出现在 feed。
- [ ] 举报后不自动删除内容，由管理后台处理。
- [ ] 图片上传限制格式和大小。
- [ ] 防止用户查看非好友 Moment。

### 11.12 验收

- [ ] A 发布 Moment，B 作为好友可看到。
- [ ] 非好友看不到好友可见 Moment。
- [ ] B 点赞 A，A 收到站内通知。
- [ ] B 评论 A，A 收到站内通知。
- [ ] A 自己点赞 / 评论自己不发通知。
- [ ] 举报 Moment 后管理后台可见。
- [ ] 移动端底部导航进入足迹。
- [ ] Message tab 可以进入消息。
- [ ] Profile tab 可以进入或展示个人主页摘要。
- [ ] Android App 内点击通知能回到对应 Moment。

## 12. 推荐里程碑

```text
v0.1：数据库 + feed 查询 + 发布文字 / 图片
v0.2：点赞 + 评论 + 站内通知
v0.3：足迹移动端 UI + 底部导航替换
v0.4：举报 + 管理后台目标预览 + 安全校验
v0.5：分享、空状态、截图验收、移动端细节打磨
```

## 13. 风险与建议

| 风险               | 建议                                         |
| ------------------ | -------------------------------------------- |
| 内容治理压力上升   | 第一版仅好友可见，不做公开广场               |
| 和活动评论系统混淆 | Moment 评论独立建表，不复用 Activity Comment |
| 消息入口被隐藏     | 足迹 tab 里 Message 要有未读红点             |
| 个人主页入口重复   | 第一版保留底部主页，Profile tab 先做摘要     |
| 通知过多           | 点赞通知可后续聚合，第一版先单条通知         |
| 图片存储成本       | 限制 9 张、4MB、压缩 WebP                    |

结论：Moment 第一版应该做轻，不追求完整社媒，而是补足 Friemi 的“朋友近况”和“活动之外的社交氛围”。它的核心价值是让用户有理由回到 App，而不是只在发起组局时打开一次。
