# Friemi Upstash Redis 接入与灰度方案

## 目标

在不改变 PostgreSQL/Supabase 数据真源、不降低现有功能正确性的前提下，引入 Upstash Redis，先解决跨 Vercel 实例的限流与热点读取问题。

当前分支：`perf/v2-7-upstash-redis-foundation`

## 边界

Redis 只用于可丢失、可重建的数据：

- 上传接口与 `@` 成员搜索的分布式限流。
- 未读数的短时缓存与影子校验。
- 后续可扩展 Presence、请求去重、热点列表 revision。

以下数据继续只以 PostgreSQL 为准：

- 聊天消息正文与已读状态。
- Friemi 币、魅力值、礼物交易。
- 报名、成员、角色、权限与游戏结果。
- 用户资料和任何不可重建的业务数据。

Redis 不可用、超时或未配置时，限流自动放行，未读数自动查询 PostgreSQL。Redis 故障不能阻断核心业务。

## 配置

| 环境变量                         | 默认值      | 说明                                             |
| -------------------------------- | ----------- | ------------------------------------------------ |
| `UPSTASH_REDIS_REST_URL`         | 空          | Upstash REST 地址，服务端使用                    |
| `UPSTASH_REDIS_REST_TOKEN`       | 空          | Upstash REST Token，严禁使用 `NEXT_PUBLIC_` 前缀 |
| `KV_REST_API_URL`                | 空          | Vercel Marketplace 自动注入的 REST 地址别名      |
| `KV_REST_API_TOKEN`              | 空          | Vercel Marketplace 自动注入的 Token 别名         |
| `REDIS_KEY_PREFIX`               | `friemi:v2` | 环境隔离前缀                                     |
| `REDIS_RATE_LIMIT_MODE`          | `off`       | `off`、`shadow`、`enforce`                       |
| `REDIS_RATE_LIMIT_TIMEOUT_MS`    | `400`       | Redis 限流最长等待时间，范围 100-2000 ms         |
| `REDIS_UNREAD_CACHE_MODE`        | `off`       | `off`、`shadow`、`serve`                         |
| `REDIS_UNREAD_CACHE_TTL_SECONDS` | `30`        | 未读缓存 TTL，范围 5-120 秒                      |

建议前缀：

- 本地：`friemi:local:v2`
- Preview：`friemi:preview:v2`
- Production：`friemi:prod:v2`

## 分步落实

### 第 1 步：代码基础层

- [x] 创建独立性能分支。
- [x] 安装官方 `@upstash/redis` 和 `@upstash/ratelimit` SDK。
- [x] 增加可选 Redis 客户端，未配置时不建立连接。
- [x] 增加环境变量解析、范围限制和单元测试。
- [x] 增加 Redis 读写删除检查脚本。
- [x] 所有 Redis 功能默认 `off`。

### 第 2 步：创建 Preview 资源

- [x] Friemi Vercel 账号所有者已接受 Upstash Marketplace 条款。
- [x] 已创建免费 Upstash Redis，Primary Region 为 `fra1`。
- [x] 资源仅连接 `Preview`，未连接 `Production`。
- [x] 创建时已关闭自动付费升级并启用 eviction。
- [x] Vercel Preview 已注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`，仅限 Preview。
- [x] 已设置 `REDIS_KEY_PREFIX=friemi:preview:v2`，功能模式保持 `off`。

账号所有者执行：

```bash
vercel integration accept-terms upstash --global-config /home/ubuntu23/.local/share/com.vercel.cli-friemi
```

条款确认后创建资源：

```bash
vercel integration add upstash/upstash-kv \
  --name friemi-preview-redis \
  --plan free \
  --metadata primaryRegion=fra1 \
  --metadata eviction=true \
  --metadata prodPack=false \
  --metadata autoUpgrade=false \
  --environment preview \
  --no-env-pull \
  --global-config /home/ubuntu23/.local/share/com.vercel.cli-friemi
```

### 第 3 步：连通性检查

- [x] Preview 环境变量已拉取到仓库外临时文件，未覆盖本地数据库配置。
- [x] 已完成 `PING`、短 TTL 写入、读取、删除。
- [x] 检查脚本未输出 Token，验证后已删除临时环境文件。

```bash
vercel env pull /tmp/friemi-preview.env \
  --environment=preview \
  --yes \
  --global-config /home/ubuntu23/.local/share/com.vercel.cli-friemi
```

```bash
cd apps/web
node --env-file=/tmp/friemi-preview.env scripts/check-upstash-redis.mjs
```

### 第 4 步：Preview 影子模式

先部署所有模式均为 `off` 的版本，确认功能无回归，再设置：

```text
REDIS_RATE_LIMIT_MODE=shadow
REDIS_UNREAD_CACHE_MODE=shadow
REDIS_RATE_LIMIT_TIMEOUT_MS=400
REDIS_UNREAD_CACHE_TTL_SECONDS=30
REDIS_KEY_PREFIX=friemi:preview:v2
```

- [x] `off` 基线 Preview 已部署，`/api/health` 返回 200。
- [x] `shadow` Preview 已部署，状态为 `READY`。
- [ ] 上传、`@` 搜索、未读数在 Redis 故障时仍可用。
- [ ] `X-Friemi-Unread-Cache` 返回 `shadow-miss`、`shadow-hit` 或 `shadow-error`。
- [ ] 日志中不存在 Redis Token、URL、用户消息正文。
- [ ] 观察至少 24 小时的命令量、错误率、延迟和数据库连接等待。
- [ ] 对比影子缓存与 PostgreSQL 结果，确认无持续不一致。

影子模式仍会执行原 PostgreSQL 查询，只用于验证正确性，不会降低数据库读取量。

当前影子部署：

- URL：`https://friemi-1a7d3aq6k-friemi.vercel.app`
- Deployment：`dpl_7M9os9ciyUWwXrjj45gKpks4Po7t`
- 开始时间：2026-08-25
- 范围：Vercel Preview，Production 未连接
- 初始检查：健康接口 200，部署完成后未发现 Error 级运行日志

### 第 5 步：灰度启用

- [ ] 先将 Preview 的 `REDIS_RATE_LIMIT_MODE` 改为 `enforce`。
- [ ] 验证上传正常用户不被误限，突发请求返回 429 和 `Retry-After`。
- [ ] 补齐聊天、通知、群聊、星球消息写入后的未读缓存失效覆盖。
- [ ] 完成并发写入、已读、免打扰、置顶、`@` 提醒回归测试。
- [ ] 缓存失效覆盖完成后，才允许在 Preview 设置 `REDIS_UNREAD_CACHE_MODE=serve`。
- [ ] 通过 20/50/100 CCU 压测后，再单独审批 Production。

当前禁止在 Production 启用 `REDIS_UNREAD_CACHE_MODE=serve`。目前已提供失效工具，但尚未覆盖所有消息和通知写路径，直接启用可能造成最多一个 TTL 周期的未读数滞后。

## 当前接入点

- 五类图片上传：每个用户每分钟共 40 次，影子/强制模式由环境变量控制。
- `GET /api/chat/mention-candidates`：每个用户每分钟 60 次。
- `GET /api/navigation/unread-counts`：支持 `off`、`shadow`、`serve`。

## 期望

- 多 Vercel 实例共享限流计数，不再依赖单实例内存。
- 在未读缓存正式启用后，降低导航未读接口的重复 PostgreSQL 查询。
- Redis 延迟或故障不扩大为全站不可用。
- Preview、Production key 空间完全隔离，可独立回滚。

## 风险与控制

| 风险                        | 等级 | 控制措施                                            |
| --------------------------- | ---- | --------------------------------------------------- |
| 未读数短时过期              | 中   | 先影子校验，补齐失效后再 `serve`，TTL 默认 30 秒    |
| 限流误伤                    | 低   | 先 `shadow`，按日志校准阈值后再 `enforce`           |
| Redis 故障拖慢请求          | 低   | 400 ms 超时、异常 fail-open、数据库回退             |
| Preview/Production 数据串用 | 中   | 使用独立 key prefix，Production 单独审批            |
| 命令量意外增长              | 低   | 免费 Preview、关闭 auto-upgrade、监控 Upstash 用量  |
| Token 泄露到浏览器          | 高   | 仅服务端变量，不使用 `NEXT_PUBLIC_`，日志不输出凭据 |

## 回滚

1. 将 `REDIS_RATE_LIMIT_MODE` 和 `REDIS_UNREAD_CACHE_MODE` 设置为 `off`。
2. 重新部署对应环境。
3. 保留 Redis 资源用于排查；不需要清库即可恢复原 PostgreSQL 路径。
4. 如需彻底移除，再断开 Vercel Marketplace 资源和删除环境变量。

## 验收标准

- [x] 未配置 Redis 时，TypeScript、289 项测试与生产构建通过，现有接口保持原路径。
- [ ] Redis 不可用时，核心读取与写入仍成功，不产生 500。
- [ ] Preview 连通性脚本完成 PING/SET/GET/DEL。
- [ ] 影子限流只记录、不拦截请求。
- [ ] 影子未读缓存不直接返回缓存值，页面仍以 PostgreSQL 结果为准。
- [ ] 强制限流仅在 Preview 完成误伤检查后启用。
- [ ] 未读 `serve` 在完整失效覆盖和并发回归前保持关闭。
- [ ] Production 未经单独验收和审批不连接、不启用。
