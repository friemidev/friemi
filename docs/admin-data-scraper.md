# Admin data scraper（管理端活动抓取）

运营后台从公共站点批量抓取活动，预览后选择性导入活动库。入口：`/{locale}/admin/data-scraper`（例如 `/zh-CN/admin/data-scraper`），商户管理：`/{locale}/admin/merchants`。

实现：

- `apps/web/app/[locale]/admin/data-scraper/` — 页面
- `apps/web/components/admin/ScraperImportSection.tsx` — 预览与导入 UI
- `apps/web/lib/admin-scraper.ts` — 预览、去重、导入、活动 CRUD
- `packages/scraper-core` — `scrapeActivities()` 与各站 `link-import` 解析器

## 管理员权限

须配置 Clerk，并在 **`apps/web/.env.local`**（不是仓库根目录）中设置至少一项：

| 变量 | 说明 |
|------|------|
| `ADMIN_EMAILS` | 逗号分隔邮箱，与 Clerk **Primary email** 一致（不区分大小写） |
| `ADMIN_CLERK_USER_IDS` | 逗号分隔 Clerk `user.id`，更稳定 |
| Clerk metadata | `publicMetadata` 或 `privateMetadata` 中 `"role": "admin"` |

未命中时：头像菜单无「活动运营」入口；访问 admin 路径会重定向到首页。修改 env 后需 **重启** `npm run dev`。

详见 [README 环境变量](../README.md#环境变量)。

## 抓取来源（当前）

| `ScraperSource` | 站点 |
|-----------------|------|
| `sortiraparis` | Sortir à Paris 文章列表 |
| `playinparis` | Play in Paris 活动列表 |

其他站点（Eventbrite、Meetup、Fever 等）的解析器在 `@chill-club/scraper-core`，主要用于**链接导入**；扩展批量抓取需在 `scrapeActivities()` 中接入。

## 预览流程

1. 勾选来源、时间范围、条数、`maxPages`。
2. **缺失坐标时用 Nominatim 自动补全**（默认开启）：对无经纬度的条目按地址调用 OpenStreetMap Nominatim，约 **1 条/秒**（遵守限速）。预览较慢属正常。
3. 点击「预览活动」→ 表格展示状态、标题、日期、**坐标**、来源、重复命中。

### 预览状态

| 状态 | 含义 |
|------|------|
| **新增** | 库中无同 ID、无同 `sourceUrl`、无同指纹（标题 + 开始时间 + 地址） |
| **已有** | 与库中活动 **同稳定 ID**（`{source}_{urlHash}`） |
| **相似** | ID 不同，但 `sourceUrl` 或指纹与某条已有活动匹配 |

## 经纬度

| 步骤 | 行为 |
|------|------|
| 解析 | JSON-LD `Event.location` / Meetup 场馆 / Fever `defaultPlace` 等 → `ScrapedActivity.latitude/longitude`（`packages/scraper-core/src/geo.ts`） |
| 补全 | 仍缺坐标时 → `apps/web/lib/nominatim-geocode.ts`（与 `/api/places/search` 共用 `buildGeocodingQueries`） |
| 入库 | `Activity.latitude` / `Activity.longitude`（`Float?`） |

预览表「坐标」列有值只表示**抓取结果**；是否写入数据库取决于下方导入模式。

## 导入模式

默认 **「只新增」** 会 **跳过所有「已有」** 记录（用于首次灌库）。要给库里已有活动**补坐标或其它字段**，须改模式：

| 模式 | 「已有」 | 「相似」 | 「新增」 |
|------|----------|----------|----------|
| **只新增** `create_only` | 跳过 | 勾选「相似内容合并」时可合并更新 | 写入 |
| **只更新** `update_only` | **更新**（含坐标） | 可更新（合并时写到 `duplicateOfId`） | 跳过 |
| **新增或更新** `upsert` | **更新** | 可更新/合并 | 写入 |
| **忽略已有** `skip_existing` | 跳过 | 视合并选项 | 写入 |

### 给已有活动补坐标（推荐步骤）

1. 预览并确认「坐标」列有值。
2. 导入模式选 **「只更新」** 或 **「新增或更新」**。
3. 点击 **「只选可更新」**（或手动勾选「已有」行）。
4. **「导入选中」** — toast 应显示成功条数 > 0、跳过 ≈ 0。

若仍为「只新增」，toast 常见：`成功 0 条，跳过 N 条`，坐标不会入库。

### 其它注意

- 批量导入会把 `organizerId` 设为 `scraper-import-bot`。
- 更新为**全量字段覆盖**（含 `latitude`/`longitude`）；预览为「无坐标」时会写入 `null`，覆盖库内已有坐标。
- 「相似内容合并」主要作用于 **相似** 行，并维护 `ActivitySourceLink`；**已有** 行不依赖该勾选即可按 ID 更新。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/scraper/preview` | body: `sources`, `limit`, `mode`, `from`, `to`, `maxPages`, `geocodeMissing?` |
| POST | `/api/admin/scraper/import` | body: `items`, `mode`, `mergeDuplicates` |

均需管理员登录（`requireAdminApiAccess`）。

## 与链接导入的关系

- **解析器**：共用 `packages/scraper-core/src/link-import.ts`。
- **入口**：链接导入在「新建活动」；批量抓取在 admin。
- **站点白名单**：`activity-link-import-sites.ts` 与 `ScraperSource` 需分别维护，见 [activity-link-import.md](./activity-link-import.md)。

## 测试

```bash
cd packages/scraper-core && npm test   # 含 geo.test.ts、各站 fixture
cd apps/web && npm run typecheck
```
