# 公共活动与组队活动模型调整方案

## 背景

当前项目把所有内容都放在 `Activity` 里：

- 用户自己发起的活动
- API / 爬虫导入的公共活动
- 基于公共活动发起的组队活动

这会造成一个核心问题：公共活动本身不应该有 `0/100`、报名人数、报名审核、组队留言等字段。公共活动只是一个外部活动信息源，用户真正参与的是围绕这个公共活动发起的“组队”。

因此后续需要把概念拆开：

```text
公共活动 PublicEvent
  ↓ 可以发起多个组队
组队活动 Activity / Team
  ↓ 用户报名参加
ActivityParticipant
```

## 二次评估结论

这次改动适合 Next Fun Club，但需要控制边界。

推荐方向：

- 新增 `PublicEvent` 作为公共活动信息源。
- 继续复用现有 `Activity` 作为“可报名的组队活动”，不要第一版大规模重命名成 `Team`。
- 用户自发活动仍然保留在 `Activity`，它本质上也是一个可报名的队伍。
- API / 爬虫导入只写 `PublicEvent`，不再直接生成可报名活动。
- 公共活动页负责“看官方活动 + 发起组队 + 加入已有组队”。

不推荐第一版做：

- 不建议把公共活动也做成可报名对象。
- 不建议新增完整 `Team` 模型并同时保留 `Activity`，会导致报名、评论、通知、聊天全套逻辑重复。
- 不建议让一个组队继续派生另一个组队，这会让层级失控，用户也难理解。
- 不建议把公共活动和组队混在一个无差别列表里继续展示，否则 `0/100`、好友信号、报名按钮的语义仍然会混乱。

最终产品语言建议：

```text
公共活动：外部真实发生的活动
组队：用户围绕某个活动约人同行
```

代码语言建议：

```text
PublicEvent：公共活动信息源
Activity：可报名的组队活动
ActivityParticipant：组队报名记录
```

最终建议：

- 这是当前平台最合适的方向。
- 第一版不要重做全部活动系统，而是做“公共活动信息源 + 组队关联”的增量改造。
- 这次改造的核心价值不是多一个表，而是让用户路径从“看一个公共活动”自然变成“围绕它找人一起去”。
- 后续产品验证要重点看公共活动是否真的能带来组队创建和报名，而不是只看公共活动浏览量。

## 产品定义

### 公共活动

公共活动是平台从 API、开放数据、爬虫或管理员录入得到的活动信息。

公共活动只回答：

- 这个公开活动是什么
- 在哪里
- 什么时候
- 官方链接是什么
- 票价 / 费用信息是什么
- 这个公共活动下面有哪些用户组队

公共活动不直接承载：

- 报名人数
- 人数上限
- 报名审核
- 参与留言
- 好友报名信号
- 聊天

### 组队活动

组队活动是用户围绕一个公共活动或自己发起的活动创建的队伍。

组队活动承载：

- 发起人
- 人数上限
- 当前报名人数
- 报名 / 审核 / 取消
- 留言
- 好友报名信号
- 评论 / 提问
- 聊天前沟通

### 关键规则

1. 用户可以基于一个公共活动创建一个新的组队。
2. 一个公共活动可以有多个组队。
3. 用户不能基于一个已经存在的组队再创建另一个组队。
4. 组队详情页可以跳回对应公共活动页。
5. 公共活动页可以展示该公共活动下已有的组队。
6. 同一用户在同一个公共活动下默认只能创建一个未取消的组队，避免刷屏。
7. 用户可以加入别人基于该公共活动创建的组队，也可以自己另开一个组队。
8. 如果公共活动已经结束，不允许继续创建新组队，但可以保留历史组队展示。
9. 多日期 / 多场次公共活动，第一版按“具体场次”拆成多个 `PublicEvent`，不要让一个公共活动同时承载多个时间。

## 旧导入活动迁移策略

早期 API / 爬虫导入的公开活动可能仍然保存在 `Activity` 表里，因此会被误当作可报名组队，出现 `0/99 人`、`立即报名`、`名额状态` 等错误信息。

迁移目标：

- 把旧导入的活动信息复制成 `PublicEvent`，方便后续统一用公共活动信息创建组队。
- 原旧 `Activity` 不删除，也不默认隐藏；前端会兼容识别为活动信息，不再按“报名车队”展示人数和报名按钮。
- 已经有人报名或评论的旧 `Activity` 不自动迁移，避免误伤真实组队。
- 只有手动执行脚本才会作用数据库，代码合并和 Vercel 部署不会自动执行迁移。

脚本：

```text
apps/web/prisma/migrate-legacy-activity-info-to-public-events.ts
```

默认 dry-run：

```bash
npm run db:migrate-legacy-public-events
```

确认输出后正式写入：

```bash
npm run db:migrate-legacy-public-events -- --write
```

正式写入只会创建或更新 `PublicEvent`，不会隐藏旧 `Activity`。如果迁移后需要主动清理重复展示，才显式追加：

```bash
npm run db:migrate-legacy-public-events -- --write --hide-legacy-activities
```

如果 dry-run 里提示很多 `sourceUrlOnlyRequiresFlag`，说明这些旧活动只有 `source/sourceUrl`，没有 `externalSource/importedAt/sourcePayload` 等强导入标记。确认它们确实是旧导入活动信息后，再执行：

```bash
npm run db:migrate-legacy-public-events -- --write --include-source-url-only
```

## 推荐数据模型

建议给公共活动单独状态，不复用 `ActivityStatus`。

原因：

- `ActivityStatus` 里有报名语义，例如 `RECRUITING / FULL / CONFIRMED`。
- 公共活动没有“招募中 / 满员 / 已成团”。
- 公共活动只需要表达来源信息是否仍可展示，以及官方活动是否取消。

建议新增：

```prisma
enum PublicEventStatus {
  SCHEDULED
  CANCELLED
}
```

是否“进行中 / 已结束”建议由 `startAt / endAt` 计算，不必写入数据库状态。

### 新增 `PublicEvent`

建议新增独立模型保存公共活动信息：

```prisma
model PublicEvent {
  id             String   @id @default(cuid())
  title          String
  description    String
  category       ActivityCategory @default(OTHER)
  city           String   @default("Paris")
  address        String
  latitude       Float?
  longitude      Float?
  startAt        DateTime
  endAt          DateTime?
  priceText      String?
  coverImageUrl  String?
  officialUrl    String?
  status         PublicEventStatus @default(SCHEDULED)
  visibility     ActivityVisibility @default(PUBLIC)

  source         String?
  sourceUrl      String?  @unique
  externalSource String?
  externalId     String?
  externalUrl    String?
  sourcePayload  Json?
  importedAt     DateTime?
  lastSyncedAt   DateTime?

  teams          Activity[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([city, startAt])
  @@index([status, startAt])
  @@index([visibility, startAt])
  @@index([externalSource, externalId])
  @@index([externalUrl])
  @@index([importedAt])
}
```

字段说明：

- `officialUrl`：给用户跳转外部官网或票务页，不参与平台报名。
- `status`：记录官方活动是否取消；进行中和已结束用时间计算。
- `visibility`：支持隐藏低质量、重复或过期但不想删除的公共活动。
- `sourcePayload`：保留原始 API / 爬虫数据，便于后续字段补充和排错。
- `lastSyncedAt`：记录最后一次从 API / 爬虫同步的时间，方便判断数据新鲜度。

不建议给 `PublicEvent` 加：

- `capacity`
- `requiresApproval`
- `participants`
- `comments`
- `conversation`

这些都属于组队，不属于公共活动。

如果外部活动本身有票务状态或余票信息，建议先保存成普通文本字段，不要接入平台报名逻辑：

```text
ticketInfoText
```

例如：

```text
官方页面显示需预约
官方页面显示售罄
以官方链接为准
```

### 调整 `Activity`

`Activity` 后续只表示“可报名的组队活动”。

建议新增 nullable 关联：

```prisma
model Activity {
  publicEventId String?
  publicEvent   PublicEvent? @relation(fields: [publicEventId], references: [id], onDelete: SetNull)

  // 现有字段继续保留：
  // title / description / city / address / startAt / capacity / participants ...

  @@index([publicEventId])
}
```

含义：

- `publicEventId = null`：用户完全自发的活动。
- `publicEventId != null`：基于某个公共活动创建的组队。

组队创建时，`Activity` 应保存一份公共活动的快照字段：

- `title`
- `description`
- `city`
- `address`
- `latitude / longitude`
- `startAt / endAt`
- `coverImageUrl`
- `priceText`

原因：

- 组队发起人可能会改写标题、集合说明、人数限制和费用说明。
- 外部 API 后续更新公共活动时，不应该自动覆盖用户已经发布的组队内容。
- 组队详情页需要在公共活动被隐藏、下架或取消后仍然保留基本可读信息。

因此 `publicEventId` 是来源关系，不是唯一信息来源。

建议增加约束：

```prisma
@@index([publicEventId, status, startAt])
```

如果要限制同一用户在同一公共活动下只创建一个有效组队，Prisma 不能直接做“只约束未取消状态”的 partial unique。建议先在 server action 层判断：

```text
同一 organizerId + publicEventId 下存在非 CANCELLED / ENDED 的 Activity 时，禁止继续创建。
```

### 迁移现有字段

当前 `Activity` 中这些字段更适合迁移到 `PublicEvent`：

- `source`
- `sourceUrl`
- `externalSource`
- `externalId`
- `externalUrl`
- `sourcePayload`
- `importedAt`

第一阶段可以先保留这些字段，避免大迁移风险；后续再逐步从 `Activity` 中移除或停止使用。

## 页面与用户路径

### 公共活动列表

建议产品入口不要新增太多顶部导航。更适合当前平台的是：

```text
/[locale]/activities?tab=public-events
```

或者保留独立路由，但顶部仍然只叫“活动 / 发现”：

```text
/[locale]/public-events
```

展示公共活动卡片，卡片不显示 `0/100`、报名人数、好友已报名。

卡片主要展示：

- 标题
- 时间
- 地点
- 来源 / 官方链接
- 已有几个组队
- CTA：查看活动

如果已有组队，可以显示：

```text
已有 3 个组队
```

如果没有组队，可以显示：

```text
暂无组队，发起一个
```

### 公共活动详情页

建议路由：

```text
/[locale]/public-events/[publicEventId]
```

页面展示：

- 公共活动基础信息
- 官方链接
- 时间地点费用
- 地图
- 该公共活动下已有组队
- CTA：发起组队

这里不出现“报名公共活动”的按钮。

推荐页面主次：

1. 公共活动信息，帮助用户判断这个活动是否值得去。
2. 已有组队列表，优先让用户加入已经存在的队伍。
3. 如果没有合适队伍，再创建自己的组队。

这样比直接让用户创建组队更好，因为平台需要优先提高组队成功率，而不是制造很多分散的小队。

### 基于公共活动发起组队

建议入口：

```text
/[locale]/public-events/[publicEventId]/teams/new
```

表单预填：

- 标题
- 时间
- 地点
- 封面
- 费用说明

用户需要补充：

- 组队说明
- 人数上限
- 是否需要审核
- 集合说明 / 留言

建议把字段命名从“活动描述”改成更贴近场景的文案：

```text
这队怎么约
集合说明
想找什么样的同行人
```

这样用户能理解自己创建的是“队伍”，不是在复制一个官方活动。

提交后创建 `Activity`，并写入：

```text
Activity.publicEventId = PublicEvent.id
```

### 组队活动详情页

继续使用现有路由：

```text
/[locale]/activities/[activityId]
```

如果该活动有关联公共活动，则显示：

- 来源公共活动
- 查看公共活动详情

但不显示“基于这个组队再发起组队”。

## 防止“基于队伍再组队”的约束

前端和后端都需要限制：

### 前端限制

- 公共活动详情页显示“发起组队”。
- 组队详情页不显示“再发起组队”。

### 后端限制

创建组队的 action / route 只接受：

```text
publicEventId
```

不接受：

```text
activityId
parentActivityId
```

这样可以从数据入口上避免“队伍下面再组队伍”。

## 导入与查重逻辑

公共 API / 爬虫导入后应写入 `PublicEvent`，不再直接创建可报名 `Activity`。

查重优先级：

1. `externalSource + externalId`
2. `externalUrl`
3. `sourceUrl`
4. 标题 + 时间 + 地点 fingerprint

同一个公共活动被重复导入时，只更新 `PublicEvent`。

用户基于公共活动创建的多个组队不参与公共活动查重。

### 多日期 / 多场次处理

很多公共 API 会把同一个展览、演出或活动的多个日期放在同一条记录里。第一版建议用简单规则处理：

```text
一个具体开始时间 = 一个 PublicEvent
```

例如：

```text
同一个戏剧活动有 6月10日、6月11日、6月12日 三场
→ 导入成 3 个 PublicEvent
```

这样用户发起组队时不会出现“到底约哪一场”的歧义。

如果未来需要把这些场次聚合展示，可以后续再增加：

```text
PublicEventSeries
PublicEventOccurrence
```

但 MVP 不建议一开始就做 series / occurrence 双层模型。

建议保留导入状态：

```text
importedAt
updatedAt
sourcePayload
visibility
```

当公共活动来源更新时：

- 更新公共活动标题、时间、地点、封面、官方链接。
- 不自动覆盖已经创建的组队说明和人数限制。
- 如果公共活动时间发生重大变化，需要给关联组队发起人一个通知，由发起人确认是否更新组队时间。
- 如果公共活动被官方取消，`PublicEvent.status = CANCELLED`，并提示关联组队发起人处理自己的组队。

建议只自动同步 `PublicEvent`，不自动同步关联 `Activity`。

关联组队的处理策略：

- 公共活动轻微更新：组队不变。
- 公共活动时间 / 地点重大变化：通知组队发起人确认。
- 公共活动取消：公共活动页标记取消，关联组队显示风险提示，但是否取消组队由组队发起人处理。

## 数据验证指标

这次改造后，产品验证不应该只看公共活动数量。更关键的是公共活动能不能转化成真实组队。

建议第一版观察这些指标：

- 公共活动详情页浏览量
- 公共活动详情页点击“发起组队”的次数
- 公共活动成功创建组队数
- 每个公共活动平均组队数
- 公共活动下组队报名人数
- 用户是加入已有组队更多，还是自己创建组队更多
- 有好友参与信号的组队报名转化是否更高

这些指标能回答：

```text
公共活动只是内容消费，还是能真的带来线下组局？
```

如果公共活动浏览很多但组队很少，说明公共活动页的组队引导、活动质量或用户信任机制还需要调整。

## 现有功能影响

### 活动列表

后续需要明确两个列表：

- 公共活动列表：展示可作为组队来源的公共活动。
- 组队活动列表：展示用户可以报名加入的队伍。

如果仍想保留一个总入口，可以做成两个 tab：

```text
公共活动
组队
```

更推荐第一版的展示策略：

```text
活动发现首页
  - 默认优先展示可加入的组队
  - 旁边或 tab 展示公共活动
  - 公共活动卡片引导用户进入详情页后再发起组队
```

原因：

- 用户最想第一时间看到“我能加入什么”。
- 公共活动是供给来源，但不一定代表已经有人一起去。
- 如果默认全是公共活动，用户会误以为平台只是活动信息聚合，而不是组局工具。

### 搜索和筛选

公共活动和组队活动的筛选条件不同：

- 公共活动：时间、地点、分类、来源。
- 组队活动：时间、地点、分类、是否可参与、人数状态、好友参与信号。

不要把公共活动的 `0/100`、报名状态放进筛选里。

第一版搜索建议：

- 全站搜索可以单独展示公共活动结果。
- 公共活动搜索结果必须独立成区，不混入“可报名活动”结果。
- 公共活动搜索结果点击进入公共活动详情页，再让用户查看已有组队或发起组队。
- 活动发现页和组队大厅仍然只展示可报名的 `Activity`，不展示 `PublicEvent`。

### 好友信号

好友信号只属于组队活动，不属于公共活动。

公共活动页可以展示：

```text
你的 2 位好友参加了这个公共活动下的组队
```

但这个信号来自该公共活动下的 `ActivityParticipant` 聚合，而不是公共活动本身。

建议公共活动页的好友信号文案是：

```text
你的好友在这个活动下有 2 个组队
```

不要写：

```text
你的好友已报名这个公共活动
```

因为平台并不知道好友是否买票或真的参加官方活动，只知道好友参加了平台内的组队。

### 通知和聊天

通知和聊天仍然围绕组队活动。

公共活动本身不产生：

- 报名通知
- 审核通知
- 聊天会话

但公共活动可以触发弱提醒：

- 你创建的组队关联的公共活动时间变更
- 你收藏的公共活动即将开始

这些属于后续增强，不放入第一版。

### 旧链接兼容

迁移旧数据后，可能仍有用户打开旧的活动详情链接：

```text
/[locale]/activities/[activityId]
```

如果该旧记录已经迁移成 `PublicEvent`，建议做兼容跳转：

```text
旧 Activity 链接 → 对应 PublicEvent 详情页
```

第一版可以通过保留旧 `Activity` 一段时间来降低风险。等确认没有外部分享链接依赖旧记录后，再清理旧数据。

## 兼容当前 Phase 1 MVP

这次调整不会推翻 Phase 1，而是重新解释“官方活动系统”：

```text
官方活动系统 = PublicEvent 信息源
活动组织能力 = Activity 组队
```

Phase 1 里“官方活动展示 / 官方推荐活动”应落到 `PublicEvent`。

Phase 1 里“创建活动 / 申请加入活动”应落到 `Activity`。

这能避免公共活动被误当成一个可报名队伍。

## 推荐 MVP 最小版本

第一版只做这 4 件事：

1. 新增 `PublicEvent` 模型。
2. 公共活动导入写入 `PublicEvent`。
3. 新增公共活动详情页，展示已有组队和“发起组队”按钮。
4. 创建组队时写入 `Activity.publicEventId`。

暂时不做：

- 公共活动收藏
- 公共活动评论
- 公共活动通知
- 公共活动复杂推荐
- 公共活动和组队的统一复杂搜索

这样可以把风险控制在“数据模型拆分 + 一个新用户路径”，而不是重做整个活动系统。

## 建议实施顺序

### Step 1：模型准备

- 新增 `PublicEvent`
- `Activity` 增加 `publicEventId`
- 保留当前 `Activity` 的 source 字段，降低迁移风险
- 明确 `Activity` 仍然是可报名对象，不在第一版改名

### Step 2：导入逻辑改造

- 公共 API / 爬虫写入 `PublicEvent`
- 不再自动创建可报名 `Activity`
- 原有导入查重迁移到 `PublicEvent`

### Step 3：公共活动页面

- 新增公共活动列表页
- 新增公共活动详情页
- 公共活动卡片不展示人数上限和报名人数

### Step 4：基于公共活动创建组队

- 公共活动详情页增加“发起组队”
- 新增组队创建表单预填公共活动信息
- 创建成功后进入现有活动详情页

### Step 5：组队详情增强

- 组队详情页展示来源公共活动
- 组队详情页不允许再次派生组队

### Step 6：迁移旧数据

- 将现有 `type = PUBLIC_EVENT` 或带 `externalSource / sourceUrl` 的 Activity 迁移成 `PublicEvent`
- 如果旧数据已有真实用户报名，则需要人工判断是否保留为组队活动

建议迁移策略：

- 没有任何报名记录的导入活动：迁移为 `PublicEvent`，旧 `Activity` 可隐藏或删除。
- 已有报名记录的活动：保留为 `Activity` 组队，同时创建对应 `PublicEvent` 并关联。
- 用户自发活动：不迁移，保持 `publicEventId = null`。

迁移时不要一次删除旧字段，先保留一到两个版本，确认线上无误后再清理。

## MVP 验收标准

- 公共活动页不显示无意义的 `0/100`
- 用户可以从公共活动详情页创建组队
- 一个公共活动下可以出现多个组队
- 用户只能报名组队，不能报名公共活动本身
- 用户不能基于已有组队再创建另一个组队
- API / 爬虫导入不会重复创建可报名活动
- 现有用户自发活动仍然可以正常创建、报名、评论和聊天

## 待产品确认

1. “活动”这个导航是否要改成“发现”，再在内部区分公共活动和组队？
2. 公共活动是否允许用户收藏？
3. 公共活动页是否展示所有组队，还是只展示可参与的组队？
4. 基于公共活动创建组队时，时间是否必须等于公共活动时间，还是允许设置集合时间？
5. 公共活动和组队活动是否共用评论区？
6. 同一用户是否只能在同一公共活动下创建一个有效组队？
7. 公共活动结束后，关联组队是否自动结束，还是由组队自己的结束时间决定？
8. 公共活动列表默认展示全部公共活动，还是只展示“已有组队 / 即将开始”的公共活动？

推荐默认：

- 公共活动可以收藏。
- 组队才有评论、报名、聊天。
- 创建组队时允许填写集合时间说明，但活动时间默认跟随公共活动。
- 同一用户在同一公共活动下只能创建一个有效组队。
- 公共活动页优先展示可参与组队，已满员和已结束组队靠后。
