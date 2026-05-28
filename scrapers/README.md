# Scrapers

独立的巴黎活动爬虫工具，用来从以下来源抓取最近的活动信息，并同步到 Supabase/Postgres：

- Sortir à Paris
- Play in Paris

## 目录目标

这个目录设计成可以直接被拆出去单独做成另一个仓库：

- 自己有 `package.json`
- 自己有 `tsconfig.json`
- 自己有环境变量模板
- 只依赖 `DATABASE_URL`
- 默认从 `../apps/web/.env.local` 读取 Supabase/Postgres 配置

## 配置

优先复制仓库里的现有配置文件，不需要再手写一份：

```powershell
# 在 scrapers 目录下运行
npm run doctor
```

它会优先读取：

1. `../apps/web/.env.local`
2. `../.env.local`
3. `./.env.local`

如果你把这个目录分离到新仓库，就复制 `scrapers/.env.example` 为 `scrapers/.env.local`，然后填写 `DATABASE_URL`。

## 命令

```powershell
cd scrapers
npm run doctor
npm run scrape -- all
npm run scrape -- sortir --limit=12
npm run scrape -- play --limit=12
npm run sync
npm run sync -- --dry-run
```

## 输出的数据字段

抓取结果会被标准化为 Prisma `Activity` 所需字段：

- `title`
- `description`
- `itinerary`
- `type`
- `category`
- `city`
- `destination`
- `address`
- `startAt`
- `endAt`
- `capacity`
- `minParticipants`
- `requiresApproval`
- `priceType`
- `priceText`
- `coverImageUrl`
- `status`
- `visibility`

同步时会用来源 URL 生成稳定 ID，避免重复导入。

## 运行逻辑

### Sortir à Paris

- 抓取分类页中的文章链接
- 再进入文章页读取 `NewsArticle` JSON-LD
- 尝试从标题、描述和正文里解析中文日期
- 如果解析不到日期，就使用文章发布时间作为 fallback

### Play in Paris

- 直接读取活动页里的 `Event` JSON-LD
- 能直接拿到：开始时间、结束时间、地点、价格、图片

## 同步

同步使用现有 Prisma Client 写入当前 Supabase/Postgres：

- 会读取 `DATABASE_URL`
- 会 upsert 一个固定的导入者账号（`SCRAPER_ORGANIZER_CLERK_USER_ID`）
- 会按活动 `id` 去重

## 单独拆分到新仓库

如果你要把它迁移成独立仓库，只需要：

1. 把整个 `scrapers/` 目录复制出去
2. 复制 `scrapers/.env.example` 为 `scrapers/.env.local`
3. 填写 `DATABASE_URL`
4. 执行 `npm install`
5. 运行 `npm run sync`

如果你的新仓库不再和主项目共用数据库配置，也可以直接把 `DATABASE_URL` 写进 `scrapers/.env.local`。
