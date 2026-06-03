# v1.2 全局埋点方案

## 目标

埋点不是为了“记录所有事情”，而是为了让团队和用户看到真正有用的数据。

v1.2 阶段只保留三类会被使用的数据：

1. 产品团队需要的数据：判断活动发现、组队、报名、社交是否真的有效。
2. 活动发起人需要的数据：看到自己活动或组队的浏览、报名、沟通和分享表现。
3. 管理员需要的数据：处理举报、维护公共活动来源、判断内容运营压力。

开发排错不放进产品埋点。加载失败、接口异常、构建错误、服务端错误等问题优先使用 Vercel Logs、Sentry、console 日志或数据库日志处理，不进入第一版产品数据系统。

## 判断标准

每个埋点必须能回答下面至少一个问题：

1. 这个数据是否会影响产品功能取舍。
2. 这个数据是否能展示给活动发起人，帮助他优化活动。
3. 这个数据是否能帮助管理员处理社区和内容运营。

如果三个问题都不能回答，就不做。

## 不进入第一版埋点的内容

以下内容第一版不做，避免数据系统变重：

- 每个普通按钮点击
- 鼠标悬停
- 停留时长
- 页面滚动深度
- 普通 404 访问
- 普通加载失败
- 表单每个字段聚焦 / 失焦
- 用户输入的搜索原文
- 聊天正文
- 评论正文
- 举报正文
- 报名留言正文
- 邮箱、手机号、Google 用户信息
- 复杂用户画像标签
- 复杂推荐算法分数
- A/B 测试平台
- 实时大屏

这些不是永远不能做，而是不适合放在 v1.2 第一版。

## 数据分层

### 1. 产品决策数据

用于回答：

- 用户是否真的会发现活动。
- 公共活动信息是否能转化成组队。
- 组队详情是否能转化成报名。
- 评论、私聊、好友、通知是否促进活动前沟通。
- 分享、复制、宣传图是否带来传播。

这些数据主要给团队看，不一定直接展示给普通用户。

### 2. 活动发起人可见数据

活动发起人不关心全站 DAU，也不关心后台导入成功率。他更关心自己的活动表现。

建议后续在“活动管理 / 个人空间 / 组队详情”里展示：

| 数据 | 对发起人的意义 |
| --- | --- |
| 详情页浏览次数 | 活动是否有人看 |
| 独立浏览人数 | 不是同一个人反复刷新 |
| 报名点击次数 | 用户是否有报名意愿 |
| 报名成功人数 | 实际转化结果 |
| 报名转化率 | 详情信息是否足够打动用户 |
| 评论数 | 活动是否引发提问或讨论 |
| 联系发起人次数 | 用户是否需要活动前确认 |
| 分享 / 复制链接次数 | 活动是否被用户带出网站 |
| 来源入口 | 用户从首页、搜索、好友、分享还是活动发现进入 |
| 设备类型 | 移动端还是网页端更常访问 |

这类数据是最容易被用户感知到价值的埋点，应当优先保证准确。

### 3. 管理员运营数据

管理员需要的是可处理、可维护、可判断风险的数据：

| 数据 | 管理意义 |
| --- | --- |
| 新举报数 | 社区风险压力 |
| 待处理举报数 | 管理员是否积压 |
| 举报处理时间 | 后台处理是否顺畅 |
| 被举报对象类型 | 用户、活动、组队、评论哪个风险更高 |
| 公共活动导入数量 | 来源是否稳定 |
| 公共活动被点击数量 | 来源是否有价值 |
| 公共活动转组队数量 | 来源是否真的促进组局 |

管理员不需要看到技术异常列表，技术异常应由开发工具处理。

### 4. 技术健康数据

技术健康不作为产品埋点的核心部分。

第一版只保留一个原则：

```text
埋点失败不能影响用户主流程。
```

如果后续需要技术监控，可以单独建设：

- Sentry
- Vercel Logs
- Prisma query logs
- API error logs
- uptime monitoring

这些不和产品行为数据混在一起。

## 北极星指标

v1.2 阶段建议把北极星指标定义为：

```text
每周产生真实组队意图的活跃用户数
```

内部指标名：

```text
weekly_active_intent_users
```

计入动作：

- 发起组队成功
- 报名组队成功
- 联系活动发起人
- 发布评论或回复
- 发送私聊消息

不计入动作：

- 单纯浏览
- 单纯收藏
- 单纯复制链接
- 单纯打开弹窗

这个指标比 DAU 更接近 Next Fun Club 的价值，因为产品目标不是让用户刷页面，而是促成线下活动前的真实行动。

## 核心指标

### 产品团队核心指标

| 指标 | 计算方式 | 说明 |
| --- | --- | --- |
| 活动发现点击率 | `activity_card_clicked / activity_list_viewed` | 活动卡片是否吸引人 |
| 活动信息转组队率 | `team_created / public_event_detail_viewed` | 公共活动信息是否能促成组局 |
| 组队报名转化率 | `join_submitted / activity_detail_viewed` | 组队详情页是否有效 |
| 活动前沟通率 | `(comment_created + organizer_contact_clicked + conversation_opened) / activity_detail_viewed` | 用户是否需要沟通确认 |
| 好友申请通过率 | `friend_request_accepted / friend_request_sent` | 好友系统是否形成真实关系 |
| 分享使用率 | `(link_copied + poster_downloaded + qr_code_shared) / activity_detail_viewed` | 活动是否被带出网站 |

### 活动发起人可见指标

| 指标 | 说明 |
| --- | --- |
| 浏览人数 | 去重后的访问用户数 |
| 浏览次数 | 详情页访问总次数 |
| 报名点击次数 | 用户点击报名入口的次数 |
| 报名成功人数 | 实际报名成功的人数 |
| 报名转化率 | 报名成功人数 / 浏览人数 |
| 评论和回复数 | 活动讨论热度 |
| 联系发起人次数 | 用户沟通需求 |
| 分享次数 | 复制链接、下载海报、二维码分享 |
| 入口来源 | 首页、活动发现、搜索、好友、通知、分享链接 |

### 管理员核心指标

| 指标 | 说明 |
| --- | --- |
| 待处理举报数 | 当前需要处理的内容风险 |
| 举报处理时间 | 管理员处理效率 |
| 举报对象分布 | 用户、活动、组队、评论的风险比例 |
| 公共活动来源点击率 | 哪些 API / 爬虫来源有价值 |
| 公共活动转组队率 | 哪些来源真的带来组局 |

## 最小事件清单

第一版只做以下事件。其他事件暂时不做，避免冗余。

### P0：产品和发起人都需要

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `activity_list_viewed` | 活动发现页打开 | 判断活动发现页是否被使用 |
| `activity_card_clicked` | 点击活动或组队卡片 | 判断活动卡片吸引力 |
| `public_event_detail_viewed` | 活动信息详情页打开 | 判断活动信息是否被查看 |
| `activity_detail_viewed` | 组队详情页打开 | 给发起人统计浏览，也用于报名转化 |
| `team_create_started` | 点击发起组队 | 判断组队入口是否有效 |
| `team_created` | 组队创建成功 | 判断公共活动是否促成组局 |
| `join_started` | 点击报名 / 加入 | 判断报名意愿 |
| `join_submitted` | 报名成功 | 判断真实转化 |

### P1：活动前沟通

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `comment_created` | 评论发布成功 | 判断活动讨论是否有效 |
| `comment_reply_created` | 回复发布成功 | 判断评论区是否形成互动 |
| `organizer_contact_clicked` | 点击联系发起人 | 判断用户是否需要私聊确认 |
| `conversation_opened` | 打开私聊 | 判断私聊入口是否被使用 |
| `message_sent` | 消息发送成功 | 判断私聊是否真的发生 |

### P1：好友和通知

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `friend_request_sent` | 好友申请发送成功 | 判断好友系统使用量 |
| `friend_request_accepted` | 好友申请通过 | 判断好友关系是否成立 |
| `notification_opened` | 点击通知进入目标页 | 判断通知是否有用 |

不单独记录好友搜索每一次提交。好友搜索更像入口功能，第一版只关心是否成功发起好友申请和是否被接受。

### P1：搜索、筛选和关键阻碍

这些事件不是开发排错，而是会直接影响用户能不能找到活动、能不能完成关键操作。

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `search_submitted` | 用户提交活动或全站搜索 | 判断搜索是否真的被使用、是否有结果 |
| `filter_applied` | 用户使用筛选并刷新结果 | 判断用户最关心哪些筛选维度 |
| `form_submit_failed` | 关键业务表单提交失败 | 判断用户在哪些业务规则上被挡住 |
| `wechat_webview_login_guide_viewed` | 微信内置浏览器登录提示页打开 | 判断微信 WebView 是否影响登录和转化 |

`search_submitted` 不存搜索原文，只记录：

```text
keyword_length
scope
result_count
filter_count
```

`form_submit_failed` 不记录完整错误和用户输入，只记录可归类的业务原因，例如：

```text
not_signed_in
already_joined
activity_full
activity_ended
required_field_missing
permission_denied
```

### P1：分享和活动传播

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `link_copied` | 复制活动链接 | 给发起人看传播动作 |
| `field_copied` | 复制地点、标题等字段 | 判断复制功能是否提高体验 |
| `poster_downloaded` | 下载宣传图 | 判断宣传图功能是否有价值 |
| `qr_code_shared` | 下载或复制二维码 | 判断二维码是否被使用 |

### P1：管理员运营

| 事件名 | 触发时机 | 用途 |
| --- | --- | --- |
| `report_submitted` | 举报提交成功 | 判断社区风险来源 |
| `admin_report_status_updated` | 管理员更新举报状态 | 判断处理效率 |
| `public_event_source_clicked` | 用户点击来源链接 | 判断公共活动来源价值 |
| `public_event_converted_to_team` | 活动信息被转化为组队 | 判断公共活动来源是否促成组局 |

### 第二版候选事件

这些事件有价值，但不是第一版必须先做。等基础看板跑起来后再补。

| 事件名 | 暂缓原因 |
| --- | --- |
| `page_viewed` | 太泛，第一版用具体页面事件替代 |
| `home_viewed` | 首页浏览有价值，但第一版先看活动发现和详情转化 |
| `notification_marked_read` | 优先级低于 `notification_opened` |
| `report_dialog_opened` | 可以判断举报入口意愿，但第一版先看真实举报提交 |
| `report_duplicate_blocked` | 偏风控和防刷，后续再接 |
| `auth_required_redirected` | 登录漏斗需要时再补 |
| `not_found_viewed` | 分享链接失效问题明显时再补 |

### 不进入产品埋点的开发监控

这些问题有用，但应由开发监控处理，不进入产品行为埋点。

| 事件名 | 处理方式 |
| --- | --- |
| `load_failed` | Vercel Logs / Sentry / 服务端日志 |
| 接口异常 | Vercel Logs / Sentry / API 日志 |
| 构建失败 | Vercel / GitHub checks |
| 数据库连接错误 | Prisma logs / Vercel Logs |

### 管理员导入日志

公共活动导入开始和导入完成对管理员有用，但更适合放在导入后台或 cron 日志里，不和用户行为埋点混在一起。

| 事件名 | 建议处理方式 |
| --- | --- |
| `public_event_import_started` | 管理员导入日志 |
| `public_event_import_completed` | 管理员导入日志 |

## 活动级数据口径

为了让活动发起人能看到自己的活动数据，所有活动相关事件必须带：

```text
entityType
entityId
sourceSurface
```

其中：

| 字段 | 说明 |
| --- | --- |
| `entityType` | `activity` 或 `public_event` |
| `entityId` | 当前活动或组队 ID |
| `sourceSurface` | 用户从哪里进入或触发 |

建议 `sourceSurface` 可选值：

| 值 | 含义 |
| --- | --- |
| `home_recent` | 首页最近活动 |
| `activity_list` | 活动发现列表 |
| `global_search` | 全站搜索结果 |
| `friend_activity` | 好友动态 |
| `notification` | 通知中心 |
| `share_link` | 分享链接 |
| `profile` | 个人空间 |

### 活动发起人可见看板

第一版可以只做简单汇总，不做复杂图表：

```text
浏览人数
浏览次数
报名成功人数
报名转化率
评论 / 回复数
联系发起人次数
分享次数
主要入口来源
```

后续再做按天趋势。

## 好友信号补充字段

如果要判断好友关系是否促进报名，活动点击和报名事件建议带：

```text
has_friend_participants
friend_participant_count
```

用途：

- 判断有好友报名的组队是否更容易被点击。
- 判断有好友报名的组队是否更容易转化。
- 判断“熟人参与”是否是平台核心价值。

这两个字段对产品决策很重要，建议保留。

## 通用事件结构

建议所有事件统一使用以下结构：

```ts
type AnalyticsEvent = {
  id: string;
  name: string;
  createdAt: Date;
  environment: "development" | "preview" | "production";

  userProfileId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;

  locale: "zh-CN" | "en" | "fr";
  route: string;
  referrer?: string | null;
  userAgent?: string | null;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  sourceSurface?: string | null;

  entityType?: string | null;
  entityId?: string | null;

  appVersion?: string | null;
  properties?: Record<string, unknown>;
};
```

`properties` 只放非敏感、可统计的结构化字段。

## 推荐数据表

第一版只做一张事件表：

```prisma
model AnalyticsEvent {
  id            String   @id @default(cuid())
  name          String
  environment   String
  userProfileId String?
  anonymousId   String?
  sessionId     String?
  locale        String
  route         String
  referrer      String?
  userAgent     String?
  deviceType    String?
  sourceSurface String?
  entityType    String?
  entityId      String?
  appVersion    String?
  properties    Json?
  createdAt     DateTime @default(now())

  @@index([name, createdAt])
  @@index([entityType, entityId, createdAt])
  @@index([userProfileId, createdAt])
  @@index([sourceSurface, createdAt])
  @@index([environment, createdAt])
}
```

不要一开始就做复杂 BI 表。等数据量和看板需求明确后，再加每日汇总表。

## 事件属性规则

### 1. 不存正文

以下内容不能进入埋点表：

- 搜索原文
- 评论正文
- 聊天正文
- 举报正文
- 报名留言
- 邮箱
- 手机号
- Google 用户信息
- 完整自由文本地址

同时，`route` 和 `referrer` 只保留路径，不保留查询参数。

例如：

```text
/zh-CN/activities?q=xxx -> /zh-CN/activities
https://example.com/zh-CN?q=xxx -> https://example.com/zh-CN
```

这样可以避免搜索词、外部分享参数或第三方追踪参数进入产品数据表。

### 2. 字段数量限制

`properties` 建议限制：

- 最多 20 个字段。
- 字符串字段最多 120 个字符。
- 数组最多 10 个元素。
- 不允许嵌套大型对象。
- 不允许存错误堆栈。

### 3. 命名规则

顶层字段使用 `camelCase`：

```text
userProfileId
entityId
sourceSurface
```

`properties` 内部字段使用 `snake_case`：

```text
activity_category
has_friend_participants
friend_participant_count
participation_status
```

第一版只接受 `snake_case` 属性名，跳过 `camelCase`、带连字符、带空格或不可比较的字段名。

### 4. 标准化范围

为了让后续看板可以直接聚合，第一版只允许有限的实体类型和入口来源。

`entityType` 建议只使用：

```text
activity
public_event
team
comment
user
merchant
report
notification
conversation
```

`sourceSurface` 建议只使用：

```text
home_recent
activity_list
public_event_detail
activity_detail
global_search
friend_activity
notification
share_link
profile
messages
comments
report_dialog
admin_reports
public_event_source
wechat_webview
```

活动相关事件必须带 `entityType`、`entityId` 和 `sourceSurface`，否则数据无法归属到某个活动或某个入口，不进入第一版统计。

## 关键漏斗

### 1. 活动发现漏斗

```text
activity_list_viewed
-> activity_card_clicked
-> public_event_detail_viewed / activity_detail_viewed
```

用于判断用户是否真的被活动吸引。

### 2. 活动信息转组队漏斗

```text
public_event_detail_viewed
-> team_create_started
-> team_created
```

用于判断公共活动信息是否能促成用户发起组队。

### 3. 组队报名漏斗

```text
activity_detail_viewed
-> join_started
-> join_submitted
```

用于判断组队详情页是否能促成报名。

### 4. 活动前沟通漏斗

```text
activity_detail_viewed
-> comment_created / organizer_contact_clicked / conversation_opened
-> message_sent
```

用于判断用户是否需要活动前沟通。

### 5. 举报处理漏斗

```text
report_submitted
-> admin_report_status_updated
```

用于判断管理员是否能及时处理风险内容。

## 看板建议

### 产品团队看板

只看核心判断：

1. 每周真实组队意图用户数
2. 活动发现点击率
3. 活动信息转组队率
4. 组队报名转化率
5. 活动前沟通率
6. 好友申请通过率
7. 分享使用率

### 活动发起人看板

只看自己的活动：

1. 浏览人数
2. 浏览次数
3. 报名成功人数
4. 报名转化率
5. 评论 / 回复数
6. 联系发起人次数
7. 分享次数
8. 主要入口来源

### 管理员看板

只看运营和安全：

1. 待处理举报数
2. 平均处理时间
3. 举报对象分布
4. 公共活动来源点击量
5. 公共活动来源转组队量

## 数据质量规则

### 1. 成功事件以服务端为准

以下事件只能在服务端写入：

- `team_created`
- `join_submitted`
- `friend_request_sent`
- `friend_request_accepted`
- `message_sent`
- `comment_created`
- `comment_reply_created`
- `report_submitted`
- `admin_report_status_updated`

客户端只能记录入口点击，不能记录业务成功。

### 2. 生产和预览隔离

`environment` 必须准确区分：

- `development`
- `preview`
- `production`

正式看板默认只看 `production`。

### 3. 管理员和测试账号过滤

正式产品指标默认过滤：

- `UserProfile.role = ADMIN`
- 明确标记的测试账号
- `environment != production`

管理员自己的操作不能污染真实用户行为数据。

### 4. 事件白名单

只允许写入文档列出的事件。未知事件拒绝写入，避免后续出现无意义数据。

## 实施阶段

### Phase A：埋点基础设施

建议分支：

```text
feature/analytics-foundation
```

小功能：

- 新增 `AnalyticsEvent` 数据模型
- 新增服务端埋点 helper
- 新增客户端埋点 API route
- 新增事件白名单
- 新增环境区分：development / preview / production
- 确保埋点失败不影响主流程

验收标准：

- 事件可以写入数据库
- 未知事件不会写入
- Preview 和 Production 数据可区分

### Phase B：核心产品和活动级埋点

建议分支：

```text
feature/analytics-activity-insights
```

小功能：

- 活动发现点击
- 活动详情浏览
- 组队创建开始 / 成功
- 报名开始 / 成功
- 搜索提交
- 筛选使用
- 关键业务提交失败
- 微信内置浏览器登录提示页打开
- 活动发起人可见的活动级汇总数据

验收标准：

- 可以还原活动发现、组队和报名三条核心漏斗
- 可以判断搜索、筛选和关键阻碍是否影响转化
- 活动发起人可以看到自己活动的基础数据

### Phase C：沟通、好友和分享埋点

建议分支：

```text
feature/analytics-social-sharing
```

小功能：

- 评论和回复
- 联系发起人
- 私聊打开和消息发送
- 好友申请和通过
- 链接复制、字段复制、海报下载、二维码分享

验收标准：

- 可以判断社交沟通是否促进报名
- 可以给发起人展示分享和沟通数据

### Phase D：管理员运营数据

建议分支：

```text
feature/admin-analytics-operations
```

小功能：

- 举报提交
- 举报处理
- 公共活动来源点击
- 公共活动转组队
- 管理员运营看板

验收标准：

- 管理员能看到举报处理压力
- 管理员能判断公共活动来源是否值得继续维护

## 上线验收清单

每个埋点分支合并前都要确认：

- [ ] 这个事件会被产品团队、活动发起人或管理员使用。
- [ ] 事件名在白名单里。
- [ ] 成功事件由服务端写入。
- [ ] 不记录正文、邮箱、手机号、Google 资料。
- [ ] 能区分 development / preview / production。
- [ ] 埋点失败不会影响用户主流程。
- [ ] 正式看板过滤管理员和测试账号。
- [ ] 活动相关事件都带 `entityType` 和 `entityId`。

## 最小可落地版本

如果要最快上线，第一版只做：

1. `AnalyticsEvent` 表
2. `activity_list_viewed`
3. `activity_card_clicked`
4. `public_event_detail_viewed`
5. `activity_detail_viewed`
6. `team_create_started`
7. `team_created`
8. `join_started`
9. `join_submitted`
10. `search_submitted`
11. `filter_applied`
12. `form_submit_failed`
13. `wechat_webview_login_guide_viewed`
14. `comment_created`
15. `organizer_contact_clicked`
16. `link_copied`

这 16 个事件已经能回答第一批核心问题：

- 用户是否真的看活动。
- 用户点了哪些活动。
- 用户是否通过搜索和筛选找到活动。
- 用户是否基于活动发起组队。
- 用户是否报名。
- 用户在哪些业务规则上被挡住。
- 微信内置浏览器是否影响登录。
- 活动发起人能看到自己的活动表现。
- 分享和沟通功能是否有实际价值。
