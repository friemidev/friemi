# 公共活动定时同步

本功能用于从 Paris OpenData `que-faire-a-paris-` 数据集定时拉取未来公共活动，并写入 `PublicEvent` 公共活动库。

## 数据来源

- Source: `paris-opendata:que-faire-a-paris`
- API: `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records`
- 当前只拉取未来活动，但不再单纯按“离现在最近”取前 N 条。导入会按时间窗口分布拉取：
  - `0-2 天`：20%
  - `3-14 天`：60%
  - `15-45 天`：20%

这样列表不会全部挤在几个小时内的临时活动上，更多覆盖用户可提前安排的未来几天到两周活动。

- 自动默认导入 `50` 条，会分成两个内容池：
  - `普通活动`：80%，默认 40 条
  - `中文/华人相关`：20%，默认 10 条

`Que Faire à Paris` 当前公开数据的 `locale` 只有 `fr`，不能直接筛“中文语种活动”。中文/华人相关池会用官方 API 的 `search(...)` 在 `qfap_tags`、标题、简介、描述、受众和组织名中匹配中文/华人相关关键词，例如 `chinois`、`chinoise`、`mandarin`、`franco-chinois`、`calligraphie chinoise`、`nouvel an chinois`、`institut confucius` 等。拉回后还会在本地做一次严格关键词校验，避免 API 近似搜索带入弱相关活动。它表示“中文/华人相关活动”，不是官方语种字段。

## 查重策略

导入时会按以下顺序查重：

- `externalSource + externalId`
- `externalUrl`

已存在的公共活动会更新标题、描述、时间、地点、费用、封面和原始 payload，不会重复创建。

`externalId` 优先使用 Paris OpenData record `id`，其次使用 `event_id` 或 `url`。这样可以更好地区分同一公共活动的不同记录，同时保留 `externalUrl` 作为兜底查重。

## 数据库字段

`PublicEvent` 保存外部公共活动字段：

- `externalSource`
- `externalId`
- `externalUrl`
- `officialUrl`
- `sourcePayload`
- `importedAt`
- `lastSyncedAt`

`sourcePayload` 保存原始 API payload，方便后续公共 API 字段增加时继续迭代。

落库前会对 payload 做 JSON 安全化处理，避免 `undefined` 等非 JSON 值影响 Prisma 写入。

## 当前边界

当前只接入 Paris OpenData Events API。`docs/paris_open_apis_summary.md` 中的 OSM、Nominatim、Overpass 暂不直接接入前端，后续如需扩展，也应继续走后端 API Route 并增加缓存或限流。

导入结果不会直接创建可报名的 `Activity`。用户需要进入公共活动详情页，从公共活动发起自己的组队，组队才会成为可报名的 `Activity`。

## API Route

```txt
GET /api/cron/import-public-activities
POST /api/cron/import-public-activities
```

可选参数：

```txt
limit=20
dryRun=true
```

最大限制为 `200`。例如 `limit=200` 时，导入器会先按 `160 / 40` 分配到 `普通活动 / 中文华人相关` 两个内容池，再在每个池内按 `20% / 60% / 20%` 分配到 `0-2 天 / 3-14 天 / 15-45 天` 三个时间窗口。

`dryRun=true` 只拉取和解析公共活动，并返回将会创建/更新/跳过的数量，不写入数据库。返回的 `summary.pools` 会展示每个内容池的请求数量和实际抓取数量，`summary.timeWindows` 会展示每个内容池下各时间窗口的请求数量和实际抓取数量，建议在 Vercel Preview 首次验证时使用。

## 本地调用

本地开发环境未配置 `CRON_SECRET` 时允许直接调用：

```bash
curl "http://localhost:3000/api/cron/import-public-activities?limit=10&dryRun=true"
```

## Vercel Preview 调用

Preview 环境需要配置 `CRON_SECRET`，然后手动调用：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://你的-preview-domain.vercel.app/api/cron/import-public-activities?limit=10&dryRun=true"
```

## Vercel Production Cron

`vercel.json` 已配置每天同步一次，满足 Vercel Hobby 计划的 Cron 限制：

```json
{
  "path": "/api/cron/import-public-activities",
  "schedule": "0 3 * * *"
}
```

如果后续升级到 Pro 计划，可以再把频率调高，例如每 6 小时一次。

需要在 Vercel 的 Preview 和 Production 环境变量中配置：

```txt
CRON_SECRET
DATABASE_URL
```

首次部署前，需要把 Prisma schema 同步到对应数据库。

数据库调取

```
curl -H "x-cron-secret: $CRON_SECRET" \
  "http://localhost:3000/api/cron/import-public-activities?limit=30"
```
