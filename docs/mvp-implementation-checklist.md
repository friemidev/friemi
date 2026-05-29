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

- [ ] 发起人在活动详情页看到待审核列表
- [ ] 发起人可以通过报名
- [ ] 发起人可以拒绝报名
- [ ] `PENDING → APPROVED`
- [ ] `PENDING → REJECTED`
- [ ] 非发起人不能审核
- [ ] 人数统计只计算 `APPROVED`

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

- [ ] 新增评论模型
- [ ] 登录用户可以评论
- [ ] 活动详情页显示评论
- [ ] 支持提问 / 建议 / 评价类型
- [ ] 发起人可以置顶回复，后续可做

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

- [ ] Prisma 增加 `isPromoted`
- [ ] 列表优先展示置顶活动
- [ ] 后台暂时手动改数据库
- [ ] 为后续商家推广预留

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

如果现在团队开始并行开发，建议这样分：

```text
负责人 A：feature/activity-list-db
负责人 B：feature/activity-detail-db
负责人 C：feature/activity-create-db
负责人 D：feature/profile-dashboard
```

`feature/join-activity` 建议等详情页接数据库后再做。
