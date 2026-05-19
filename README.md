# Next Fun Club

> What's next? Fun begins. / 下一场，Fun 开场。

Next Fun Club 是一个全球化的活动策划与组织平台，不限定地区或市场。**首发市场：法国（巴黎）**；**首发界面：中文**。用户可以找**本地活动搭子**，也可以找**旅游搭子**——一起逛街、看展、吃饭，或结伴出行、周末短途、欧洲/长假旅行；商家（餐厅、密室逃脱、旅行社、大型活动主办方等）可通过平台获得曝光与精准客流。

---

## 目录

- [产品定位](#产品定位)
- [目标用户](#目标用户)
- [核心功能](#核心功能)
- [信息架构](#信息架构)
- [功能模块详述](#功能模块详述)
- [活动详情页设计](#活动详情页设计)
- [数据库设计](#数据库设计)
- [API 设计](#api-设计)
- [技术架构](#技术架构)
- [盈利模式](#盈利模式)
- [合规与信任](#合规与信任)
- [MVP 规划](#mvp-规划)
- [品牌与域名](#品牌与域名)
- [竞品与差异化](#竞品与差异化)

---

## 产品定位

| 维度 | 说明 |
|------|------|
| **一句话** | What's next? Fun begins. — 本地局、旅游搭子，都能组起来 |
| **使用场景** | 本地小局（桌游、密室、看展、饭局）+ 旅游搭子（周末游、城市漫步、欧洲结伴） |
| **首发市场** | **法国 · 巴黎** |
| **首发语言** | **中文 UI**；产品全球化，后续扩展法语、英文等 |
| **覆盖范围** | 全球，无地域限制；按城市/local 逐步运营 |
| **差异化** | 小局 / 组局 / 找搭子 — 不只是大型票务或攻略，而是能真正找到人、成行 |

与 Meetup、Eventbrite、穷游/马蜂窝结伴等平台的区别：Next Fun Club 聚焦**用户自发组局**与**最少成团机制**，同一套流程既适用于巴黎的一局饭，也适用于欧洲短途或长假旅行；并通过商家合作实现 B 端盈利。

---

## 目标用户

### C 端（个人用户）

- 在法国找搭子、组局参加**本地活动**的华人留学生、工作者、访客（桌游、密室、看展、饭局等）
- 想找**旅游搭子**的人：巴黎周末游、欧洲短途、长假结伴、独自出行想找人同行
- 活动发起人：组织一次巴黎饭局，或发起「五一荷兰 / 圣诞冰岛」等结伴行程

### B 端（商家）

- 密室逃脱（Escape Game）、剧本杀、体验类场馆
- 餐厅、Bar、Brunch 店
- 旅行社、本地向导、户外俱乐部
- 大型活动主办方（市集、音乐节、展览）
- 巴黎及欧洲本地的活动聚合、文旅合作方

---

## 核心功能

- **活动发现**：首页按类型、地点、日期浏览与搜索活动
- **找旅游搭子**：按目的地、出行日期、预算、旅行风格筛选；支持多日行程
- **活动卡片**：类 Trello 的活动卡片，支持封面、时间、地点、费用、人数等
- **发起活动**：手动创建或粘贴外部链接智能解析（如 sortiràparis、Meetup、Eventbrite、Fnac Spectacles 等）
- **参与报名**：一键参加，支持免审核 / 需审核两种模式
- **个人空间**：我发起的、我参与的、收藏、兴趣标签
- **意见与反馈**：活动前提问/建议，活动后评价
- **商家推广**：置顶、推荐位、按效果付费（CPA）
- **过期处理**：活动时间过后自动置灰，默认不在首页展示

---

## 信息架构

```
Next Fun Club
├── 首页（活动发现）
│   ├── 搜索栏（关键词 + 快捷筛选）
│   ├── 分类 Tab（桌游 / 运动 / 摄影 / 旅行·旅游搭子 / 密室 / 餐饮 …）
│   ├── 地点筛选（当前城市 / 目的地 / 附近 / 地图模式）
│   └── 活动卡片流
│
├── 活动详情页
│   ├── Hero 封面图
│   ├── 发起人信息 + 关注
│   ├── 核心信息（地点 / 时间 / 人数 / 费用）
│   ├── 活动描述 + 行程安排
│   ├── 「我要参加」/ 报名状态
│   ├── 意见与反馈区
│   └── 互动栏（点赞 / 收藏 / 评论）
│
├── 创建 / 编辑活动
│   ├── 活动类型（本地局 / 旅游结伴）
│   ├── 基础信息（标题、分类、封面、描述）
│   ├── 时间（确定日期 / 日期范围 / 多日行程）
│   ├── 地点（地图选点 + 详细地址；旅游类可填目的地城市）
│   ├── 费用（免费 / AA / 固定金额 / 预算区间）
│   ├── 人数（最多参与 / 最少成团）
│   ├── 旅行偏好（可选：节奏、预算、风格标签）
│   ├── 可见性（公开 / 仅链接 / 私密）
│   └── 智能导入（粘贴外部链接自动解析）
│
├── 个人空间
│   ├── 头像、昵称、兴趣标签、简介、旅行足迹（可选）
│   ├── 我发起的活动 / 行程
│   ├── 我参与的 / 待审核 / 已结束
│   ├── 我的收藏
│   └── 关注 / 粉丝
│
├── 商家主页（B 端）
│   ├── Logo、地址、营业时间
│   ├── 官方活动列表
│   └── 评分与历史活动
│
├── 消息中心
│   ├── 报名审核通知
│   ├── 活动提醒
│   └── 活动群聊（或 WhatsApp 链接）
│
└── 设置
    ├── 账号与安全
    ├── 通知偏好
    └── 隐私设置（GDPR 等合规）
```

---

## 功能模块详述

### 1. 活动发现（首页）

- **分类浏览**：横向 Tab + 完整分类树
- **地点筛选**：城市切换、附近（经纬度）、地图模式（活动 Pin）
- **多维筛选**：日期、费用区间、人数是否未满、是否需要审核、活动类型（本地 / 旅游）
- **排序**：最新发布 / 即将开始 / 距离最近 / 热度
- **过期活动**：自动置灰，默认不在首页展示（可在「历史」中查看）

### 2. 活动卡片

| 字段 | 说明 |
|------|------|
| 标题 | 简短醒目 |
| 封面图 | 首图吸引点击 |
| 分类标签 | 可多个 |
| 时间 | 单日或日期范围 |
| 地点 | 城市 + 详细地址 |
| 费用 | 免费 / AA / 固定金额（支持多币种） |
| 人数 | 当前/上限，满员显示「已满 / Full」 |
| 状态 | 招募中 / 已成团 / 已结束 / 已取消 |

### 3. 发起活动

**手动创建**：完整表单（见信息架构）

**智能导入**：
- 粘贴常见活动网站链接（如 sortiràparis、Timeout Paris、Meetup、Eventbrite、Fnac Spectacles 等）
- 后端解析：标题、时间、地点、封面、描述
- 解析结果预填表单，用户可手动调整

**成团逻辑**：
- 未达到「最少成团人数」→ 状态「招募中」
- 达到最少人数 → 「已成团」，可选自动通知参与者
- 超过「最多参与人数」→ 关闭报名或进入候补

### 4. 参与与审核

| 状态 | 说明 |
|------|------|
| 未报名 | 初始状态 |
| 待审核 | 点击参加（需审核时） |
| 已通过 | 发起人批准或免审核直接通过 |
| 已拒绝 | 发起人拒绝 |
| 已取消 | 用户主动取消 |

- 发起人可设置：免审核 / 需审核
- 通过后可选进入活动群聊或 WhatsApp 群组

### 5. 意见与反馈区

| 类型 | 场景 | 示例 |
|------|------|------|
| 提问 | 活动前 | 「可以带朋友吗？」 |
| 建议 | 活动前 | 「能否改到周六下午？」 |
| 评价 | 活动结束后 | 「组织很好，推荐！」 |

- 发起人可置顶官方回复
- 活动结束后 7 天内开放评价

### 6. 个人空间

- **我发起的**：草稿 / 招募中 / 进行中 / 已结束
- **我参与的**：待审核 / 已通过 / 已拒绝 / 历史
- **兴趣标签**：用于推荐相似活动（如 `#摄影` `#徒步` `#美食` `#自由行`）
- **关注体系**：关注组织者，首页「关注动态」流

### 7. 搜索

- 关键词：标题、描述、标签、地点、**目的地**
- 组合筛选：分类 + 城市/目的地 + 日期范围 + 费用 + 活动类型
- 后续可接入 Meilisearch / Elasticsearch 做全文检索

### 8. 旅游搭子

同一套「发起 → 报名 → 成团」流程，覆盖从楼下饭局到跨城旅行的场景：

| 场景 | 示例 | 关键字段 |
|------|------|----------|
| 本地小局 | 周五桌游、周末看展 | 单点地址、单日时间 |
| 城市漫步 | City walk、探店 | 集合点、半日~一日 |
| 周末短途 | 周边两日游 | 目的地、日期范围、AA 预算 |
| 长假结伴 | 荷兰 5 日、南法 10 日 | 目的地、行程概要、最少成团、旅行风格 |

**旅行风格标签（可选）**：休闲 / 特种兵 / 摄影 / 美食 / 徒步 / 穷游 / 轻奢 …

**成团与安全**：
- 发起人可设置需审核，先看资料再通过
- 意见区可提前聊行程、预算、作息是否合拍
- 后续可扩展：实名认证、同行评价、紧急联系人

**与攻略网站的区别**：穷游/马蜂窝重在「信息」，Next Fun Club 重在「找到人并成行」。

---

## 活动详情页设计

```
┌─────────────────────────────────────┐
│  [大图 Hero - 活动封面]              │
├─────────────────────────────────────┤
│  👤 小明  ·  关注                      │
│  周五夜 · 桌游局                       │
├─────────────────────────────────────┤
│  📍 巴黎 11 区 · Rue xxx 123           │
│  ⏰ 周六 19:00 - 22:00                │
│  👥 3/6 人                            │
│  💰 免费 / AA ~ €10                   │
├─────────────────────────────────────┤
│  【我们会做什么】                      │
│  · 19:00 集合                         │
│  · 19:30 开始游戏                     │
│  · 21:30 自由交流                     │
│                                     │
│  【注意事项】                          │
│  · 请准时                              │
├─────────────────────────────────────┤
│  [ 我要参加 ]                          │
├─────────────────────────────────────┤
│  💬 意见与反馈 (12)                    │
│  [ 写下你的想法... ]                   │
├─────────────────────────────────────┤
│  ❤️ 128   ⭐ 收藏   💬 评论            │
└─────────────────────────────────────┘
```

设计原则：大图优先、信息图标化、留白充足、**移动端优先**。本地局与旅游结伴共用同一套详情页结构，旅游类突出目的地与行程天数。

**旅游搭子示例：**

```
┌─────────────────────────────────────┐
│  [大图 Hero - 目的地封面]            │
├─────────────────────────────────────┤
│  👤 小红  ·  关注                      │
│  五一 · 阿姆斯特丹找搭子（3–5 人）     │
├─────────────────────────────────────┤
│  📍 荷兰 · 阿姆斯特丹                  │
│  ⏰ 5/1 - 5/5（5 天 4 晚）             │
│  👥 2/4 人                            │
│  💰 AA ~ €300–400/人                  │
│  🏷 休闲 · 摄影 · 博物馆               │
├─────────────────────────────────────┤
│  【大致行程】                          │
│  · D1 抵达，运河区闲逛                 │
│  · D2 梵高博物馆                       │
│  · D3 羊角村一日游                     │
│                                     │
│  【希望你是】                          │
│  · 节奏不要太赶，愿意 A 费用           │
├─────────────────────────────────────┤
│  [ 我要参加 ]                          │
└─────────────────────────────────────┘
```

---

## 数据库设计

使用 PostgreSQL，核心表结构如下：

```sql
-- 用户
users (
  id, email, password_hash, nickname, avatar_url,
  bio, city, latitude, longitude,
  interest_tags[], locale,           -- zh | en | fr | ...
  created_at, updated_at
)

-- 活动分类
categories (
  id, name, slug, icon, sort_order
)

-- 商家
merchants (
  id, name, business_registration,   -- 各地工商/税号（可选）
  logo_url, address, city, country,
  latitude, longitude,
  category,                          -- restaurant | escape | event_venue | ...
  subscription_tier,                 -- free | local | pro
  created_at, updated_at
)

-- 活动
activities (
  id, organizer_id, merchant_id,
  category_id, activity_type,           -- local | trip
  title, description, cover_image_url,
  external_link,
  location_name, address, city, country,
  destination,                        -- 旅游类目的地（可与 city 区分）
  latitude, longitude,
  start_time, end_time,
  cost_type, cost_amount, cost_budget_min, cost_budget_max,
  travel_style_tags[],                -- 旅行风格标签
  max_participants, min_participants,
  requires_approval,
  visibility,                        -- public | link | private
  status,                            -- draft | recruiting | confirmed | ended | cancelled
  is_promoted,                       -- 是否付费推广
  participant_count,
  created_at, updated_at
)

-- 报名 / 参与
participations (
  id, activity_id, user_id,
  status,                            -- pending | approved | rejected | cancelled
  message,
  checked_in_at,                     -- 到店核销时间
  created_at, updated_at
  UNIQUE(activity_id, user_id)
)

-- 意见 / 评论
comments (
  id, activity_id, user_id, parent_id,
  type,                              -- question | suggestion | review
  content, is_pinned,
  created_at
)

-- 收藏、点赞、关注
favorites ( user_id, activity_id, created_at )
likes ( user_id, activity_id, created_at )
follows ( follower_id, following_id, created_at )

-- 活动消息
activity_messages ( id, activity_id, user_id, content, created_at )

-- 通知
notifications ( id, user_id, type, payload, read_at, created_at )
```

---

## API 设计

```
# 认证
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

# 活动
GET    /api/activities              ?category=&city=&destination=&type=local|trip&lat=&lng=&radius=&q=&sort=
GET    /api/activities/:id
POST   /api/activities
PATCH  /api/activities/:id
DELETE /api/activities/:id
POST   /api/activities/import       { url }  → 智能解析

# 参与
POST   /api/activities/:id/join
DELETE /api/activities/:id/join
GET    /api/activities/:id/participants
PATCH  /api/activities/:id/participants/:userId  { status }

# 互动
POST   /api/activities/:id/comments
GET    /api/activities/:id/comments
POST   /api/activities/:id/like
POST   /api/activities/:id/favorite

# 用户
GET    /api/users/:id
GET    /api/users/:id/activities      ?role=organized|joined
POST   /api/users/:id/follow
DELETE /api/users/:id/follow

# 商家（B 端）
GET    /api/merchants/:id
POST   /api/merchants                   -- 入驻
GET    /api/merchants/:id/analytics     -- 曝光、报名、核销

# 消息
GET    /api/activities/:id/messages
POST   /api/activities/:id/messages
GET    /api/notifications
```

---

## 技术架构

**原则**：TypeScript 全栈、MVP 不拆后端；业务复杂后再独立 API 服务。

```
                    ┌──────────────────────┐
  用户（手机/浏览器）──▶│  Next.js (Vercel)    │
                    │  页面 + API Routes    │
                    └──────────┬───────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
   ┌───────────┐        ┌───────────┐        ┌────────────┐
   │ PostgreSQL │        │ Redis     │        │ Meilisearch│
   │ (Neon)     │        │ (Upstash) │        │ 活动搜索    │
   └───────────┘        └───────────┘        └────────────┘
         │
         ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ Cloudinary│   │ Clerk     │   │ Mapbox    │
   │ 图片       │   │ 登录       │   │ 地图（法国）│
   └───────────┘   └───────────┘   └───────────┘
```

| 层级 | 选型 | 说明 |
|------|------|------|
| **语言** | TypeScript | 前后端统一，类型共享 |
| **前端** | Next.js (App Router) + Tailwind + shadcn/ui | SSR、移动端优先 |
| **后端** | Next.js API Routes / Server Actions | MVP 阶段与前端同项目；后期可拆 NestJS |
| **ORM** | Prisma | Schema、迁移、TS 类型生成 |
| **数据库** | PostgreSQL (Neon) | 关系清晰；地理查询可用 PostGIS |
| **缓存** | Redis (Upstash) | 热门活动、Session、未读通知 |
| **认证** | Clerk 或 Auth.js | 注册登录、OAuth |
| **搜索** | Meilisearch | 按城市、目的地、分类、关键词 |
| **图片** | Cloudinary | 封面裁切、CDN |
| **地图** | Mapbox | 法国首发；抽象 MapService，后续扩展其他地区 |
| **i18n** | next-intl | **中文 UI 首发**（默认 `zh`）；后续扩展法语、英文 |
| **支付** | Stripe（€） | 法国及欧洲商家订阅、佣金；国内后期可接微信/支付宝 |
| **部署** | Vercel + Neon + Upstash | 冷启动成本低，自动 CI/CD |

**何时拆独立后端？** 活动群聊/WebSocket 变重、大量后台任务（链接解析、过期置灰）、团队前后端分工明确时，再抽 `apps/api`（NestJS）。

---

## 盈利模式

### C 端

- 免费使用：浏览、发起、参与、评论

### B 端

| 模式 | 适用商家 | 参考定价 |
|------|----------|----------|
| **置顶 / 推荐位** | 密室、餐厅、Bar | 按天/周/月，或 CPM |
| **商家主页 Premium** | 所有 B 端 | 月订阅 |
| **按效果付费 CPA** | 餐厅、密室、旅行社 | 按成团并核销计费 |
| **大型活动推广** | 市集、音乐节 | 单场推广费 + 票务佣金 3–8% |
| **SaaS 订阅** | 多门店、连锁 | 月/年订阅 |

### 商家套餐（示例）

| 套餐 | 价格 | 功能 |
|------|------|------|
| **Free** | 0 | 1 活动/月，基础 listing |
| **Local** | 月费 | 置顶 + 统计 + 多活动/月 |
| **Pro** | 月费 | 多地址、核销、CRM 轻量 |
| **Event** | 按场 | 大型活动单次推广 |
| **Performance** | CPA | 按成团核销计费 |

具体定价按当地市场与币种调整（法国首发以 **欧元 €** 为主）。

### 冷启动策略（法国 · 巴黎）

1. 聚焦 **巴黎**，品类：Escape game、Brunch/Apéro、免费展览、City walk
2. 首批 10–20 家本地商家：**免费试用 Local 套餐**，换案例与露出
3. 支持解析 sortiràparis 等法国本地活动链接，降低发活动门槛
4. 在华人社群（小红书、微信群、校园群）+ Instagram 同步冷启动
5. 核心卖点：带来**已组好、愿意订位/到店的团体**，而非纯流量

---

## 合规与信任

| 项目 | 要求 |
|------|------|
| **隐私** | **RGPD / GDPR**；Cookie 同意、数据导出/删除 |
| **商家** | 法国 **SIRET**、Raison sociale；发票 HT + TVA 20% |
| **支付** | Stripe（€）；显示 TTC；退款政策清晰 |
| **UGC** | 活动审核、举报机制 |
| **订座/购票** | 早期外链 TheFork、Google Maps 导航 + UTM 追踪 |

---

## MVP 规划

### Phase 1 — 核心闭环

- [ ] 用户注册 / 登录
- [ ] 活动 CRUD + 分类 / 地点筛选（含本地局 + 旅游结伴类型）
- [ ] 首页卡片流 + 搜索
- [ ] 报名（免审核）
- [ ] 个人空间（发起 / 参与列表）
- [ ] 基础评论 / 意见区
- [ ] 中文 UI 默认 + 多语言框架（i18n，默认 `zh`）
- [ ] Mapbox 地图选点（巴黎）

### Phase 2 — 体验增强

- [ ] 报名审核流程
- [ ] 收藏、点赞、关注
- [ ] 活动过期自动置灰
- [ ] 地图选点与附近活动（Mapbox）
- [ ] 通知中心
- [ ] 智能链接导入（sortiràparis、Meetup、Eventbrite 等）

### Phase 3 — 商业化

- [ ] 商家入驻与主页
- [ ] 推广套餐与置顶
- [ ] 核销 / 签到（支撑 CPA）
- [ ] 活动群聊或 WhatsApp / 微信群链接
- [ ] 活动后评价
- [ ] Stripe 订阅与佣金

---

## 品牌与域名

| 项目 | 建议 |
|------|------|
| **主品牌** | Next Fun Club |
| **主 Slogan** | *What's next? Fun begins.* |
| **中文 Slogan** | 下一场，Fun 开场。 |
| **副 Slogan** | 本地组局 · 旅游搭子 · 巴黎首发 |
| **域名** | nextfunclub.com / nextfun.club |
| **社交** | @nextfunclub（小红书、Instagram、微信群） |
| **联系** | contact@nextfunclub.com |

---

## 竞品与差异化

| 平台 | 强项 | Next Fun Club 差异 |
|------|------|-------------------|
| Meetup | 社群、定期活动 | 更轻量、组局导向、商家 CPA |
| Eventbrite | 大型票务 | 聚焦小局、组局、最少成团 |
| Facebook Events | 社交传播 | 独立产品、审核、商家工具 |
| 穷游/马蜂窝结伴 | 旅行攻略、结伴帖 | 结构化组局、成团机制、本地+旅游统一 |
| 本地活动聚合站 | 信息罗列 | 用户可发起、可组局、可参与 |
| 订座/票务平台 | 交易闭环 | 活动驱动导流、按成团效果付费 |

**核心差异**：不只是「活动列表」或「旅行攻略」，而是「能找到人、组得起局」——**楼下的一局饭，和去另一座城的旅行，用同一套产品**；商家为**成团核销**付费，而非纯曝光。

---

## 项目结构（规划）

```
chill-club/
├── apps/
│   └── web/                 # Next.js（页面 + API Routes）
├── packages/
│   ├── database/            # Prisma schema + client
│   └── shared/              # 共享类型、常量
├── prisma/
│   └── schema.prisma
└── README.md
```

---

## 开发说明

```bash
# 待初始化后补充
# npm install
# npm run dev
```

---

*Last updated: 2025-05*
