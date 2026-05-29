# 公共活动定时同步

本功能用于从 Paris OpenData `que-faire-a-paris-` 数据集定时拉取未来活动，并写入本项目活动库。

## 数据来源

- Source: `paris-opendata:que-faire-a-paris`
- API: `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records`
- 当前只拉取 `date_start > NOW()` 的未来活动

## 查重策略

导入时会按以下顺序查重：

- `externalSource + externalId`
- `externalUrl`

已存在的活动会更新标题、描述、时间、地点、费用、封面和原始 payload，不会重复创建。

`externalId` 优先使用 Paris OpenData record `id`，其次使用 `event_id` 或 `url`。这样可以更好地区分同一公共活动的不同记录，同时保留 `externalUrl` 作为兜底查重。

定时同步不会修改 `isPromoted`，运营手动置顶的公共活动不会因为下一次 Paris OpenData 更新而丢失推荐状态。

## 数据库字段

`Activity` 预留了外部活动字段：

- `externalSource`
- `externalId`
- `externalUrl`
- `sourcePayload`
- `importedAt`

`sourcePayload` 保存原始 API payload，方便后续公共 API 字段增加时继续迭代。

落库前会对 payload 做 JSON 安全化处理，避免 `undefined` 等非 JSON 值影响 Prisma 写入。

## 当前边界

当前只接入 Paris OpenData Events API。`docs/paris_open_apis_summary.md` 中的 OSM、Nominatim、Overpass 暂不直接接入前端，后续如需扩展，也应继续走后端 API Route 并增加缓存或限流。

导入的活动会使用 `Activity.type = PUBLIC_EVENT`，列表卡片会展示“公共活动”类型标签，用于和用户发起活动区分。

## 手动推荐公共活动

MVP 阶段不做后台推荐位管理。运营可以先在 Supabase SQL Editor 手动修改 `isPromoted`。

按活动 ID 置顶：

```sql
UPDATE "Activity"
SET "isPromoted" = true
WHERE "id" = '活动ID';
```

按 Paris OpenData 外部 ID 置顶：

```sql
UPDATE "Activity"
SET "isPromoted" = true
WHERE "externalSource" = 'paris-opendata:que-faire-a-paris'
  AND "externalId" = 'Paris OpenData 记录 ID';
```

取消置顶：

```sql
UPDATE "Activity"
SET "isPromoted" = false
WHERE "id" = '活动ID';
```

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

最大限制为 `50`。

`dryRun=true` 只拉取和解析公共活动，并返回将会创建/更新/跳过的数量，不写入数据库。建议在 Vercel Preview 首次验证时使用。

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
