# Activity link import（活动链接智能导入）

在「新建活动」表单中粘贴外部活动页 URL，系统会抓取页面并生成可勾选的预览字段，确认后写入表单。

实现分布在：

- `apps/web/features/activity-link-import/` — 抓取、预览映射、UI
- `packages/scraper-core/src/link-import.ts` — 各站点 HTML 解析
- `apps/web/lib/activity-link-import-sites.ts` — 面向用户的支持站点列表（文案）

API：`POST /api/activity-link-preview`（见 `apps/web/app/api/activity-link-preview/route.ts`）。

## 支持的网站

| 主机 | 显示名 | 解析方式 | 单元测试 fixture |
|------|--------|----------|------------------|
| `feverup.com` | Fever | 专用 `parseFeverupEventHtml`（JSON-LD + `ticket-selector-config` 票档） | ✅ |
| `eventbrite.*`（`.fr` / `.co.uk` / `.com` 等） | Eventbrite | 专用 `parseEventbriteEventHtml`（JSON-LD、`AggregateOffer`、structuredContent） | ✅ |
| `meetup.com` | Meetup | 专用 `parseMeetupEventHtml`（`__NEXT_DATA__`） | ✅ |
| `playinparis.com` | Play in Paris | 专用 `parsePlayInParisEventHtml`（路径需含 `/event/`） | ✅ |
| `sortiraparis.com` | Sortir à Paris | 专用 `parseSortirAParisArticleHtml`；中文文章会尝试抓取法语版补地址 | ✅ |
| `quefaire.paris.fr` | Que Faire à Paris | 通用 `buildPreview`（meta + JSON-LD） | ❌ |
| `paris.fr` | Paris.fr | 专用 `parseParisFrEventHtml`（JSON-LD + 页面标签；Billetreduc 票价尽力抓取） | ✅ |
| `billetweb.fr` | Billetweb | 通用 | ❌ |
| `opendata.paris.fr` | Paris OpenData | JSON API → `buildParisOpenDataPreview` | ❌ |

**Eventbrite 域名**：任意 `eventbrite.<tld>` 均视为支持（`isEventbriteHost()`），路由键统一为 `eventbrite.fr`。

**通用解析**（无专用 parser 时）：Open Graph / meta、`schema.org/Event` JSON-LD；价格无法识别时使用本地化文案「以外部页面为准」（`RANGE`）。

## 导入字段与行为

| 字段 | 说明 |
|------|------|
| 标题、时间、地址、封面 | 尽量从结构化数据提取；缺失会列入 `missingFields` |
| 分类 | 关键词启发式（`mapCategory`）；Fever / Paris.fr 等有额外规则；含 **THEATER（戏剧）** |
| 价格 | `FREE` / `FIXED` / `RANGE`；多档票合并为区间（如 `12,50 € – 19,50 €`） |
| 人数 | 链接导入默认 **99**（`linkImportDefaultCapacity`） |
| 描述 | 附带来源链接后缀；Sortir / Meetup / Eventbrite 等尽量拉取长文；详情页以 `whitespace-pre-line` 保留换行 |
| 行程 | `itinerary` 字段，按行展示为编号列表；Eventbrite 从 `structured_content` API 解析 programme（`19h – …` 等） |

预览 UI（`ActivityLinkImportPanel`）：字段纵向排列，**所有字段可选**勾选后再应用。

### 重复活动检测（轻量）

解析预览时会查库（不阻止发布）：

| 优先级 | 规则 | 提示 |
|--------|------|------|
| 1 | `Activity.sourceUrl` 或 `ActivitySourceLink.sourceUrl` 与当前链接一致（忽略 `aff` 等追踪参数） | 相同来源链接 |
| 2 | `sha1(title + startAt + address)` 与已有活动一致 | 可能重复 |

套用导入并创建活动时，会将规范化后的来源 URL 写入 `Activity.sourceUrl`，便于下次识别。

实现：`findActivityDuplicateHint()`、`lib/activity-dedupe.ts`。

抓取限制：

- 仅 `https:` URL
- 超时 12s
- HTML 最多保留 **2MB**（避免 Fever 等大页在 ~600KB 处截断导致票价丢失）

## 价格识别要点

| 来源 | 逻辑 |
|------|------|
| Fever | `ticket-selector-config.transferState` 各 zone 的 `ticketTypes` 最低价–最高价；无配置时回退 JSON-LD 单价 |
| Eventbrite | 描述/行程：`/api/v3/events/{id}/structured_content/`（页面 HTML 中 modules 常为空）；价格见 `extractJsonLdOfferPrice()` |
| Paris.fr | JSON-LD `price: 0` 或页面 **Gratuit** → FREE；票价链接指向 Billetreduc 时会尝试搜索页解析区间，失败则「以外部页面为准」 |
| 通用 / 无数据 | `priceType: RANGE`，`priceText` 为「以外部页面为准」类文案 |

示例：

| 链接 | 期望价格 | 期望分类 |
|------|----------|----------|
| [Eventbrite Yoga](https://www.eventbrite.com/e/paris-yoga-club-may-31-with-lucy-tickets-1990485031311) | FIXED `7.58 EUR` | SPORTS |
| [Eventbrite Hololive UK](https://www.eventbrite.co.uk/e/paris-hololive-english-3rd-concert-all-for-one-screening-tickets-1988723487486) | RANGE `58.86 – 116.52 EUR` | MUSIC |
| [Paris.fr L'Ogrelet](https://www.paris.fr/evenements/l-ogrelet-110475) | RANGE `12.95 – 16.5 EUR`（经 Billetreduc，或外部页） | THEATER |
| [Paris.fr PASSIONS](https://www.paris.fr/evenements/passions-l-expo-poetico-drole-de-guillaume-blot-108919) | FREE | EXHIBITION |

## 测试

### 自动化

```bash
# scraper-core：专用 parser + 站点矩阵 + 回归用例
cd packages/scraper-core && npm test

# web：Eventbrite 域名、AggregateOffer、地址/描述等
cd apps/web && npm test
```

主要测试文件：

| 文件 | 内容 |
|------|------|
| `packages/scraper-core/src/link-import.test.ts` | Meetup、Eventbrite、Sortir、Fever、Play in Paris 等细节 |
| `packages/scraper-core/src/link-import-supported-sites.test.ts` | 各支持站点 fixture 矩阵 |
| `apps/web/features/activity-link-import/parseActivityLink.test.ts` | `isEventbriteHost`、`extractJsonLdOfferPrice` |

Fixture 目录：`packages/scraper-core/src/fixtures/`。

### 本地 probe（可选，需网络）

`packages/scraper-core/scripts/` 下有开发用脚本，例如：

```bash
node packages/scraper-core/scripts/probe-eventbrite-uk-price.mjs
```

用于对照线上 HTML / JSON-LD，**不参与 CI**。

### 手动验收

1. `npm run dev`，打开新建活动 → 粘贴链接 → 导入预览。
2. 核对：标题、时间、地址、封面、分类、价格类型与区间、描述长度。
3. 应用勾选字段后，确认表单中 `priceType` 与预览一致（受控 state，非仅 `defaultValue`）。

## 补充 fixture：需要你提供什么

目标：为**尚无 fixture** 的站点，或**新页面形态**（新票档 UI、新 TLD）增加可重复的单元测试，避免回归。

请按下面模板提供（可一次一条，也可多条）：

### 1. 基本信息（必填）

```text
站点 ID: billetweb-sample          # 自定义短名，用于测试用例 id
URL: https://www.billetweb.fr/...  # 实际可访问的 https 链接
解析器: generic | parseXxxEventHtml  # 若已知专用 parser 可写明
```

### 2. 期望结果（必填，用于 assert）

```text
title: /正则或子串/
category: MUSIC | EXHIBITION | ...   # 可选
priceType: FREE | FIXED | RANGE      # 可选
priceText: /58\.86.*116\.52/         # 可选，正则
address: /Rue|Paris/                 # 可选
capacity: 99                         # 可选，链接导入一般为 99
```

### 3. HTML 片段（二选一）

**方式 A — 你保存 snippet（推荐，稳定、可离线测）**

1. 浏览器打开 URL → 查看源代码或 DevTools。
2. 复制页面中**最小必要**片段并保存为  
   `packages/scraper-core/src/fixtures/<站点>-<简短描述>-snippet.html`  
   通常需包含：
   - `application/ld+json`（Event / Offer / AggregateOffer）
   - 站点特有块（如 Fever 的 `ticket-selector-config`、Meetup 的 `__NEXT_DATA__`）
3. 脱敏：可删掉无关 script、评论、个人数据；保留解析依赖的结构。

**方式 B — 只给 URL，由维护者抓 snippet**

提供稳定、长期有效的活动页（勿用过期售票页 unless 只测结构）。注明是否允许在 CI 中 `fetch`（默认 fixture **不** 打外网）。

### 4. 建议优先补充的站点

| 站点 | 原因 |
|------|------|
| `billetweb.fr` | 仅通用 JSON-LD，尚无 fixture |
| `quefaire.paris.fr` | 巴黎官方活动页结构多样 |
| `paris.fr` | 同上 |
| `opendata.paris.fr` | 需 **JSON** 样例（非 HTML），可提供 API 响应片段 fixture |
| Eventbrite **付费区间** `.fr` | 现有 festival fixture 为 `price: 0`（FREE） |

### 5. 已有 fixture 参考

| Fixture | 对应用例 |
|---------|----------|
| `feverup-renaissance-snippet.html` | 展览 + 票价区间 |
| `feverup-candlelight-snippet.html` | 音乐会 + 多档价 |
| `eventbrite-festival-snippet.html` | 免费活动 |
| `eventbrite-hololive-aggregate-offer-snippet.html` | UK + AggregateOffer 区间 |
| `eventbrite-yoga-fixed-snippet.html` | US + 固定价 AggregateOffer |
| `paris-fr-ogrelet-snippet.html` | 戏剧 + Billetreduc 票价注释块 |
| `paris-fr-passions-expo-snippet.html` | 免费展览 |
| `meetup-nextdata-snippet.html` | 描述 + 地址 |
| `playinparis-event-snippet.html` | 免费活动 |
| `sortiraparis-article-snippet.html` | 中文文章 |

提供后，维护者在 `link-import-supported-sites.test.ts`（或 `link-import.test.ts`）增加 `siteParserCases` 条目并运行 `npm test`。

## 已知问题与修复记录

| 问题 | 处理 |
|------|------|
| Fever 只识别单一价 `25 EUR` | HTML 截断上限提至 2MB |
| Renaissance 标成 TRAVEL | 避免 `voyage` 子串误匹配；Fever `category: art` → EXHIBITION |
| Candlelight 标成 MOVIE | 音乐会优先规则 |
| `eventbrite.co.uk` 不支持 | `isEventbriteHost()` |
| Hololive 价格显示「以外部页面为准」 | `AggregateOffer` → `extractJsonLdOfferPrice` |
| 表单 `priceType` 不更新 | 新建活动表单改为受控 `priceType` |

## 数据库（THEATER 分类）

新增 `ActivityCategory.THEATER` 后，在本地/部署环境执行一次：

```bash
cd apps/web && npm run db:push
```

若 `npx prisma generate` 因 dev 进程占用报 `EPERM`，请先停止 `npm run dev` 再重新 generate。

## 经纬度（地图）

| 场景 | 行为 |
|------|------|
| **链接导入** | 优先从 JSON-LD `Event.location` / Paris OpenData `lat_lon` 解析；站点专用 `ScrapedActivity` 预览会带出坐标；无坐标时用户可在 `ActivityPlacePicker` 用 Nominatim 选点 |
| **管理端抓取** | 同上解析 + 预览可选 Nominatim 补全；导入模式须用 **「只更新」/「新增或更新」** 才能给 **「已有」** 活动写入坐标（默认「只新增」会跳过已有记录） |
| **入库** | `Activity.latitude` / `Activity.longitude`（Prisma `Float?`） |

共享实现：`packages/scraper-core/src/geo.ts`；地理编码：`apps/web/lib/nominatim-geocode.ts`（与 `/api/places/search` 共用 `buildGeocodingQueries`）。

管理端抓取、导入模式与补坐标步骤见 **[admin-data-scraper.md](./admin-data-scraper.md)**。

## 相关文档

- [Admin data scraper](./admin-data-scraper.md) — 批量抓取、坐标、导入模式
- [Development](./development.md) — 环境、分支、PR
- [Architecture](./architecture.md) — monorepo 结构
