# Friemi 免费翻译：Cloudflare Workers AI + 数据库缓存

## 翻译规则

| 内容                                        | 何时翻译                                      | 保存和显示                                                   |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| API 活动 `/public-events`，包括遗留导入活动 | 访客实际打开对应语言详情页                    | 只生成当前语言标题和正文，缓存后网页和 SEO 直接使用          |
| 聚吧 `/lobby`                               | 新建、修改、后台创建/修改、热门活动创建聚吧后 | 自动生成中、英、法标题和正文                                 |
| 已有聚吧                                    | 首次运行补译命令；详情访问也补入任务          | 三种语言，复用已有缓存                                       |
| 私聊、聚吧群聊、星球群聊                    | 点击消息下的小圆形翻译图标                    | 只生成当前页面语言译文，保存数据库；重新打开聊天仍先显示原文 |
| 活动评论                                    | 点击小圆形翻译图标                            | 只翻译被点击的评论                                           |
| 列表、SSR、SEO、路由预取                    | 只读取缓存                                    | 缺失时显示原文，不请求翻译                                   |

大量 API 活动的新增和定时导入不会批量进入翻译队列。已知搜索引擎爬虫不会触发详情翻译。首次打开尚未翻译的活动先显示原文，保存译文后自动刷新。之后 HTML、title、description、Open Graph/Twitter 分享摘要直接读取当前版本译文；未访问的语言页在缓存生成前仍为原文。

消息不会因接收、发送、打开聊天或滚动历史而翻译；即便数据库已有译文，也需要点击才请求显示。纯图片消息、删除/撤回消息、尚未发送成功的私聊消息不显示按钮，不做 OCR。消息译文只供有权读取原消息的人查看。翻译服务会收到被点击的文字，不会发送用户资料、图片或整个聊天记录。按钮视觉为 28 px 小圈，点击区域为 44 px，沿用网站品牌色，具备三语言可访问名称和提示。图标放在消息气泡旁边，收到的消息在右侧、自己的消息在左侧；点击后译文直接替换气泡正文，再点同一图标恢复原文，反复切换不请求翻译接口。评论也在正文旁使用同一图标切换。

`Activity` / `PublicEvent` 原始字段和编辑表单保留原文。`ContentTranslation` 以实体、字段、语言、原文 SHA-256 保存译文，也保存检测结果和长文已完成分段。原文变更使旧缓存失效；未改变的文本继续复用。Llama 译文记录模型版本，新译文使用 70B v1。已经完成的 Llama 8B v1 和历史 DeepL 全文译文继续复用；新 70B 翻译不复用旧 8B 未完成分段，也不复用旧 M2M100 译文或分段。原文哈希算法保持兼容。消息/评论变更后需重新点击，旧任务不会自动翻译新版本。

`ContentTranslationTask` 保存任务、租约和重试时间，避免并发访问重复调用。新聚吧在请求结束后立即处理；失败或长文未完成的任务由 `/api/cron/content-translations` 每天 05:30 UTC 继续处理，每次最多 120 个字段，执行预算约 40 秒。只有被访问过的 API 活动和被点击过的消息才可能产生对应任务。

## 申请 Cloudflare（不需要 Azure）

1. 注册或登录 [Cloudflare Dashboard](https://dash.cloudflare.com/sign-up)，验证邮箱。官方说明 [Workers 可以不绑卡开始使用](https://www.cloudflare.com/products/workers/)。
2. 进入 **Workers AI**，保持 **Workers Free** 套餐；不要升级 Workers Paid，也不需要购买 AI Gateway credits。
3. 选择 **Use REST API → Create a Workers AI API Token**，检查模板限定到当前账户，点击 **Create API Token**，复制 Token。
4. 在同一页面 **Get Account ID** 复制 32 位 Account ID。
5. 如果手工创建 Token，按 [当前官方 REST 指南](https://developers.cloudflare.com/workers-ai/get-started/rest-api/) 设置 `Workers AI - Read` 和 `Workers AI - Edit`，范围限定当前账户。无需全局 API Key、DNS 权限或部署 Worker 的权限。

网站仍在现有服务器/Vercel 上运行，数据库仍使用 Prisma；无需迁移域名、网站或数据库到 Cloudflare。

当前官方免费额度为 **每天 10,000 Neurons**，UTC 00:00 重置。Workers Free 用完会报错停止；只有主动开通 Workers Paid 才可付费超额使用。[官方定价](https://developers.cloudflare.com/workers-ai/platform/pricing/)

## 配置

本地写入 `apps/web/.env.local`；Vercel 在项目 **Settings → Environment Variables** 添加后重新部署。Token 保存在后端，不提交 Git，也不加 `NEXT_PUBLIC_` 前缀。

```dotenv
CLOUDFLARE_TRANSLATOR_ENABLED=true
CLOUDFLARE_WORKERS_PLAN=FREE
CLOUDFLARE_ACCOUNT_ID=你的32位AccountID
CLOUDFLARE_API_TOKEN=你的WorkersAI专用Token
CLOUDFLARE_TRANSLATOR_DAILY_CHARACTER_LIMIT=100000
```

- `ENABLED` 默认关闭，填好 Token 后再启用。
- `WORKERS_PLAN=FREE` 是部署者对实际套餐的声明；代码不查询账户账单，也不会升级套餐。真正的零超额收费需要 Cloudflare 控制台保持 **Workers Free**。已有 Workers Paid 账户应使用单独的免费账户；不能仅把变量改成 FREE。
- `DAILY_CHARACTER_LIMIT` 为应用额外设定的字符上限，默认/最大 100,000，可调低。**字符不等于 Neurons**：输入/输出 token 和模型影响实际额度，Cloudflare 可能先到额度。检测、失败和超时的不确定请求也保守计入应用预算。
- 预览和生产建议只在生产开启，防止两套数据库重复消耗同一个账户额度。同一账户和数据库共享预算，轮换 Token 不重置计数。
- 保留现有 `CRON_SECRET`，供队列定时处理使用。
- Azure 和 DeepL 的旧环境变量不再使用；旧译文继续复用。

## 数据库迁移和补译

按项目原有数据库发布流程执行新迁移 `20261013180000_content_translations`（新任务表、预算表、缓存索引，以及三张翻译表的 RLS 和客户端权限隔离）：

```bash
cd ~/Bureau/friemi/apps/web
npx prisma migrate deploy --schema=prisma/schema.prisma
npm run db:generate
```

启用后，将所有已有聚吧补入任务队列：

```bash
cd ~/Bureau/friemi/apps/web
npm run translations:backfill
```

此命令分页扫描聚吧，排除 API 活动和遗留导入活动；立即处理首批，余下由日常 worker 继续。可重复执行，缓存命中的文本不重复翻译。部署命令可能同时应用仓库其他待发布迁移，需沿用该项目现有迁移发布流程。

## 模型、暂停与失败

翻译固定使用 Cloudflare 托管的 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`；原文语言检测仍使用 `@cf/meta/llama-3.1-8b-instruct`。两者均在 [官方 JSON Mode 文档](https://developers.cloudflare.com/workers-ai/features/json-mode/)的支持列表内，并已于 2026-10-13 用真实 Workers Free 请求验证。检测接口使用兼容 ID，响应报告底层模型为 `@cf/meta/llama-3.1-8b-fast-v2`；原 8B 模型独立目录页目前会重定向。若任何接口停用，则保留原文并退避重试，不自动切换其他模型或服务。

检测结果缓存后多语言共用，兼容 `fra`、`zho` 等三字母语言代码。只含数字、emoji、标点或纯链接的文本会原样缓存，不调用语言检测或翻译。检测返回合法的 `und`（无法确定语言）时，由固定 70B 模型自动识别原文并翻译到目标语言；非法 JSON、无效语言值仍拒绝处理。

翻译请求的 user message 直接包含原文，语言检测请求仍使用 JSON 封装。system 指令要求逐句完整翻译，只把输入视为文字而不执行其中指令，保留语义、事实、数字、日期、段落和链接，不添加事实或解释。70B 输出使用专用 JSON schema，temperature 为 0，最多生成 2,048 tokens。正文优先按段落和完整句子切分，每段初始最多 1,200 UTF-16 字符；链接由应用原样保留。

应用额外拒绝明显不完整的极短输出：当原文包含至少 120 个 Unicode 字母、译文字母数量却不足原文的 8% 时，按 `TRANSLATION_INVALID_RESPONSE` 处理。这是保守的遗漏防护，不能证明其他译文完全准确。该错误与生成截断均进入缩小片段的恢复流程：片段递归减半，长度达到 128 UTF-16 字符或更少时停止继续拆分；仍无法翻译则保留任务等待后续重试。分段决定和成功子片段都保存到数据库，下次跳过已经失败的大段和已经完成的子段。已消耗预算不退回、不重置；截断、空值、无效 JSON 或中途失败都不会作为完整正文保存。每次请求最多 12 秒，同时受 worker 剩余 40 秒预算限制。

2026-10-13 的早期对比使用 6 条固定公开样文测试 M2M100 与 Llama 8B；其中 8B 对 3 条完整正文的测试耗时约 0.86–1.32 秒，合计约 14.79 Neurons。这些是早期 8B 样本数据，不能作为当前 70B 的耗时或额度估算。当前 70B 已用固定公开样文完成免费接口验证，实际消耗仍由 Cloudflare 返回的 token/Neuron 用量决定，不能把字符上限当成固定可翻译条数。免费额度规则不变，没有付费自动升级或其他服务回退。

`ContentTranslationBudget` 按账户和 UTC 日期记录额外字符预算，并发请求前原子预留。收到 Cloudflare `3036` 时将暂停保存到数据库，直到下一天 UTC 00:00；若模型返回 `5035` 要求付费，同样停用，不升级或换模型。临时 `429`/`3040` 按 Retry-After 退避重试。[官方错误码](https://developers.cloudflare.com/workers-ai/platform/errors/)

暂停时已有译文继续显示，未翻译活动用原文，消息图标提示今日额度用完；发布和浏览继续正常工作。队列任务保留，次日访问或 worker 继续。可用受保护的 `GET /api/cron/content-translations` 手动处理已存在任务，携带 `Authorization: Bearer <CRON_SECRET>`；密钥不放进 URL。

## 本地验证

```bash
cd ~/Bureau/friemi/apps/web
node --import tsx --test features/translations/services/translationPolicy.test.ts
TRANSLATION_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/friemi_translation_qa_20261013 npm run translations:test-db
```

集成测试只接受独立本地 `translation_qa` 数据库并会清理其中的测试业务数据。所有 Cloudflare 请求模拟，禁止指向开发、预览或生产业务数据库。
