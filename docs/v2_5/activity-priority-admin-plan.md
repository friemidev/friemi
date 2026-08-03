# v2.5 活动优先度管理方案

## 目标

上线前需要一套由平台维护的活动排序控制能力，让管理员可以在不改代码、不改数据库脚本的情况下，调整活动在发现页、活动列表和推荐位里的露出顺序。

核心目标：

- 活动列表优先展示进行中和未开始的内容。
- 已结束活动仍可被看到，但排序永远靠后。
- 时间越接近，活动自然排序越靠前。
- 管理员可以临时提高某个活动的优先度。
- 管理员可以在总控台查看、修改、清除所有人工调整。
- 普通用户完全感知不到后台策略，只看到更合理的活动顺序。

## 推荐算法

采用“生命周期分层 + 时间分 + 管理员加权天数”的方案。

不采用单纯 `0.5 - 1.5` 倍率加成作为 v2.5 首版。原因：

- 倍率对非技术管理员不直观。
- `1.5x` 不保证一定排在未加权活动前面。
- 不容易表达“这 7 天希望它更靠前”这种运营需求。
- 上线前控制内容时，整数天数更稳定、更容易验收。

## 排序规则

### 1. 生命周期分层

活动先按生命周期分桶：

| 状态 | 是否参与正常排序 | 说明 |
|---|---|---|
| 进行中 | 是 | 自然时间分最高，可被人工重点活动超过 |
| 未开始 | 是 | 按时间接近度和管理员权重排序 |
| 已取消 | 否 | 默认不进入主推荐流 |
| 已结束 | 单独靠后展示 | 优先度视为 0，但仍可在列表底部看到 |

### 2. 时间优先度

时间分取值 `0 - 1`。

建议规则：

- 进行中：`timeScore = 1`
- 未开始：越接近开始时间，越接近 `1`
- 距离超过排序窗口：接近 `0`
- 已结束：`timeScore = 0`

建议首版窗口：

```ts
const rankingWindowDays = 30;
const daysUntilStart = Math.max(0, (startAt - now) / oneDayMs);
const timeScore = clamp(1 - daysUntilStart / rankingWindowDays, 0, 1);
```

这样：

- 今天或正在发生的活动接近 `1`
- 15 天后的活动约 `0.5`
- 30 天及以后约 `0`

### 3. 管理员加权天数

管理员不是直接填最终分数，而是填一个整数加权值。

例如：

| 管理员设置 | 用户侧效果 |
|---:|---|
| `+1` | 今天明显靠前 |
| `+3` | 约 3 天内持续靠前 |
| `+7` | 约 7 天内持续靠前 |
| `+14` | 约 2 周内持续靠前 |

加权值实时衰减，不需要每天跑 cron。

```ts
const elapsedDays = Math.floor((now - boostStartedAt) / oneDayMs);
const activeBoost = Math.max(0, initialBoost - elapsedDays);
const adminBoostScore = activeBoost >= 1 ? activeBoost : 0;
```

最终排序分：

```ts
const finalPriorityScore = adminBoostScore + timeScore;
```

说明：

- 未加权活动最高自然分约为 `1`。
- 管理员加权仍有效时，`finalPriorityScore > 1`，会稳定优先于普通活动。
- 加权自然衰减到 `0` 后，活动回到时间自然排序。
- 已结束活动强制 `finalPriorityScore = 0` 并进入已结束分桶，不被人工加权顶上来。

## 数据模型方案

### ActivityPriorityOverride

保存当前人工权重状态。

建议支持 `PUBLIC_EVENT` 和 `ACTIVITY` 两类目标，避免只服务 `/public-events`，后续也能复用到用户创建的聚吧。

字段建议：

- `id`
- `targetType`: `PUBLIC_EVENT | ACTIVITY`
- `targetId`
- `initialBoost`: 整数，范围 `0 - 30`
- `boostStartedAt`
- `boostExpiresAt`: `boostStartedAt + initialBoost days`，用于快速查有效加权
- `note`: 可选，管理员备注
- `updatedById`
- `createdAt`
- `updatedAt`

唯一索引：

- `targetType + targetId`

查询索引：

- `targetType + boostExpiresAt`
- `targetType + updatedAt`
- `updatedById + updatedAt`

### ActivityPriorityOverrideLog

保存变化记录，便于总控台查看历史。

字段建议：

- `id`
- `targetType`
- `targetId`
- `oldBoost`
- `newBoost`
- `note`
- `actorId`
- `createdAt`

索引：

- `targetType + targetId + createdAt`
- `actorId + createdAt`

## 权限策略

只有网站或 App 管理员可以看到和操作该功能。

判断规则：

- 使用现有 `UserProfile.role === "ADMIN"`。
- 页面层可以隐藏入口。
- Server action 必须再次校验管理员权限。
- 非管理员访问管理接口返回 `notFound` 或 `403`。
- 权重变化必须写入 log。

## UI 方案

### 1. 活动详情页入口

页面：

- `/public-events/[publicEventId]`
- 后续可扩展到 `/lobby/[activityId]`

管理员看到：

- 活动详情右上角显示一个点点点按钮。
- 普通用户不显示。

点开下拉：

- 调整活动权重
- 查看权重记录

移动端：

- 点点点放在封面图右上角按钮组里，保持小按钮。

网页端：

- 点点点放在详情页右上角或侧栏操作区。

### 2. 调整权重弹窗

弹窗内容保持简单：

- 活动标题
- 当前状态：进行中 / 未开始 / 已结束
- 当前时间分
- 当前管理员加权
- 当前最终排序分
- 快捷按钮：`+1`、`+3`、`+7`、`+14`
- 清除加权
- 备注输入，可选

文案建议：

- 标题：`调整活动优先度`
- 辅助文案：`加权会自动随时间降低。已结束活动不会被顶到前面。`
- 确认按钮：`保存`
- 清除按钮：`清除加权`

### 3. 活动权重总控台

页面建议：

- `/admin/activity-priority`

入口：

- 管理员 Profile 设置页显示 `活动优先度` 按钮。
- 普通用户不显示。

总控台内容：

- 当前有人工权重的活动
- 已过期但有历史记录的活动
- 活动标题、封面、时间、状态
- 目标类型：活动 / 聚吧
- 当前自然时间分
- 当前管理员加权
- 当前最终排序分
- 最近修改人
- 最近修改时间
- 操作：调整、清除、查看记录、打开详情页

筛选器：

- 当前有效
- 已衰减
- 全部记录
- Public Event
- 聚吧

## 排序接入位置

首版优先接入：

- `/public-events`
- `/mobile-home` 活动推荐区域
- `/home` 活动推荐区域
- 活动列表相关 API

后续再接入：

- Top News
- Swipe 推荐
- 冷门分类补齐推荐
- 城市/分类页

## 服务层方案

新增排序工具：

- `features/activities/priority/activityPriority.ts`

核心函数：

- `getActivityLifecycleBucket(activity, now)`
- `getActivityTimeScore(activity, now)`
- `getActiveAdminBoost(override, now)`
- `getActivityPriorityScore(activity, override, now)`
- `sortActivitiesByPriority(items, overrides, now)`

排序结果结构：

```ts
type ActivityPriorityScore = {
  lifecycleBucket: "active" | "upcoming" | "ended";
  timeScore: number;
  adminBoostScore: number;
  finalPriorityScore: number;
};
```

## 查询策略

v2.5 首版不做复杂数据库排序表达式，避免上线前引入高风险 SQL。

建议：

1. 数据库先查候选池。
2. 应用层计算排序分。
3. 应用层排序后截取展示数量。

候选池建议：

- 进行中和未开始活动：按开始时间取最近 `200` 条。
- 已结束活动：按结束时间倒序取少量 fallback。
- 人工加权目标：即使时间较远，也需要额外查入候选池。

这样可以满足上线前控制需求，同时避免全表扫描。

## 逻辑闭环分析

### 写入闭环

管理员调整权重时只写两类数据：

1. `ActivityPriorityOverride` 保存当前有效设置。
2. `ActivityPriorityOverrideLog` 保存本次变更记录。

写入流程：

1. Server action 校验当前用户是否为 `ADMIN`。
2. 校验目标是否存在，且目标类型只允许 `PUBLIC_EVENT` 或 `ACTIVITY`。
3. 校验 `initialBoost` 是 `0 - 30` 的整数。
4. `initialBoost > 0` 时重置 `boostStartedAt = now`，并计算 `boostExpiresAt`。
5. `initialBoost = 0` 时视为清除加权，但保留历史 log。
6. 写入 override 后追加 log。
7. revalidate 目标详情页、列表页和总控台。

这个闭环保证：

- 当前状态可读。
- 历史变化可追踪。
- 清除权重不会丢失审计记录。
- 管理员误操作可以通过总控台再改回来。

### 读取闭环

列表读取时分成四步：

1. 按现有可见性、城市、分类、搜索、时间筛选条件获取自然候选池。
2. 额外读取仍在有效期内的人工加权目标。
3. 合并候选、去重、批量读取对应 override。
4. 应用层计算排序分并排序。

人工权重只影响排序，不影响资格。

也就是说：

- 被取消的活动不能因为加权重新出现。
- 私密或不可见内容不能因为加权出现在公开列表。
- 用户选择了分类或城市后，其他分类或城市的加权活动不能混进来。
- 已结束活动即使有历史加权，也不能排到未结束活动前面。

### 管理闭环

管理员有两个入口：

- 活动详情页点点点：快速调整单个活动。
- `/admin/activity-priority`：查看所有调整和历史。

总控台必须能覆盖所有动作：

- 新增加权
- 修改加权
- 清除加权
- 查看衰减后当前分
- 查看历史记录
- 打开活动详情复核

如果只能在详情页改，管理员会忘记改过哪些活动；如果只有总控台，临时运营操作又太慢。两个入口一起才闭环。

## 排序闭环分析

### 最终排序建议

推荐使用稳定排序，不使用随机数。

排序顺序：

1. 可正常展示的进行中、未开始活动。
2. `finalPriorityScore` 从高到低。
3. `timeScore` 从高到低。
4. `startAt` 从近到远。
5. `id` 升序兜底。
6. 已结束活动单独放最后，按结束时间从近到远。

这样可以保证：

- 人工加权能稳定生效。
- 没有人工加权时，越接近的活动越靠前。
- 同分活动不会因为每次请求顺序不同而抖动。
- 已结束内容仍可浏览，但不抢新活动位置。

### 加权衰减规则

`+7` 的语义必须固定：

- 保存当天：`activeBoost = 7`
- 第 2 天：`activeBoost = 6`
- 第 7 天：`activeBoost = 1`
- 第 8 天：`activeBoost = 0`

`activeBoost < 1` 后不再参与人工加权排序。

不需要 cron 每天扣减，因为排序时实时计算。`boostExpiresAt` 只是为了快速查询仍有效的加权目标。

### 时间边界

时间判断统一使用服务器时间和 UTC 时间戳，不使用用户本地时区判断排序。

特殊情况：

- `endAt` 为空：视为单点时间活动，`startAt < now` 后进入已结束。
- `startAt <= now < endAt`：进行中。
- `startAt > now`：未开始。
- `status = CANCELLED`：不进入主推荐流。
- 隐藏、私密、无权限内容：先过滤，再排序。

## 性能闭环分析

### 不做的事情

为了保证性能，v2.5 首版明确不做：

- 不在 SQL 里拼复杂动态分数排序。
- 不对全量活动做应用层排序。
- 不在每张卡片上单独查询一次权重。
- 不为了衰减每天跑批量更新。
- 不让人工权重绕过现有列表筛选。

### 查询预算

每个列表请求最多增加两类轻量查询：

1. 读取当前有效人工加权 override。
2. 根据候选 `targetType + targetId` 批量读取 override。

必须避免 N+1：

```ts
const candidateKeys = collectTargetKeys(candidates);
const overrides = await prisma.activityPriorityOverride.findMany({
  where: {
    OR: [
      { targetType: "PUBLIC_EVENT", targetId: { in: publicEventIds } },
      { targetType: "ACTIVITY", targetId: { in: activityIds } },
    ],
  },
});
```

然后用 Map 合并：

```ts
const overrideByKey = new Map(
  overrides.map((item) => [`${item.targetType}:${item.targetId}`, item]),
);
```

### 候选池上限

不同入口使用不同上限，避免一次读取过多数据。

| 入口 | 自然候选上限 | 人工加权补充上限 | 说明 |
|---|---:|---:|---|
| 首页推荐 | 80 | 30 | 只服务首屏和模块推荐 |
| 移动首页 | 80 | 30 | 保持移动端快 |
| `/public-events` 首屏 | 160 | 50 | 需要覆盖更多公开活动 |
| `/lobby` 聚吧列表 | 160 | 50 | 后续接入时使用 |
| 后台总控台 | 分页查询 | 不需要补充 | 管理端可以分页 |

超过候选池的普通活动继续按原有数据库排序展示。人工加权目标会被额外补进候选池，所以远期重点活动仍能被顶上来。

### 分页策略

优先度排序只保证默认列表前几页的准确性。

建议：

- 第 1 页必须严格应用优先度。
- 第 2 - 5 页可以使用扩大候选池后应用优先度。
- 更深分页回落到现有数据库排序，避免为了低频浏览读取全量数据。

原因：

- 运营调整主要影响首屏和前几页。
- 用户很少翻到很深页。
- 深分页全局排序成本高，不适合 v2.5 上线前阶段。

如果未来需要全站严格全量排序，再考虑异步计算 `priorityScoreSnapshot` 或搜索索引，不放在 v2.5 首版。

### 数据库索引

现有表已经有可复用索引：

- `Activity`: `city + startAt`
- `Activity`: `publicEventId + status + startAt`
- `PublicEvent`: `city + startAt`
- `PublicEvent`: `status + startAt`
- `PublicEvent`: `visibility + startAt`

新增表必须补：

- `ActivityPriorityOverride`: `targetType + targetId` 唯一索引
- `ActivityPriorityOverride`: `targetType + boostExpiresAt`
- `ActivityPriorityOverrideLog`: `targetType + targetId + createdAt`

这样读取有效人工加权和目标历史都能走索引。

### 失败降级

排序权重不是核心交易逻辑，失败时必须降级为原排序。

建议：

- override 查询失败：记录错误，继续返回原列表。
- 排序计算异常：记录错误，继续返回原列表。
- 管理后台保存失败：给管理员明确失败提示，不影响普通用户浏览。

这样优先度系统不会拖垮活动列表。

## 风险分析

### 风险 1：管理员把太多活动都加权

处理：

- UI 上显示当前有效加权数量。
- 建议有效加权上限先设为 `50`。
- 超过上限时提示先清理旧加权。

### 风险 2：远期活动被过度置顶

处理：

- 单次加权最大 `30`。
- 加权随时间自动衰减。
- 已结束强制归零。

### 风险 3：筛选页出现“不相关活动”

处理：

- 人工加权只补入符合当前筛选条件的目标。
- 城市、分类、搜索、可见性、权限全部先判断。

### 风险 4：排序结果每天跳动

处理：

- 衰减按整天计算。
- 同分用 `startAt` 和 `id` 兜底。
- 不使用随机权重。

### 风险 5：性能变慢

处理：

- 候选池固定上限。
- override 批量查询。
- 排序只在内存里处理小数组。
- 失败回落原排序。

## Checklist

### P0 数据模型与权限

- [ ] 新增 `ActivityPriorityOverride`。
- [ ] 新增 `ActivityPriorityOverrideLog`。
- [ ] `ActivityPriorityOverride` 包含 `boostExpiresAt`，用于快速查询有效加权。
- [ ] 新增 Prisma migration。
- [ ] 新增管理员权限校验 helper。
- [ ] 非管理员无法访问权重页面和 action。
- [ ] 权重修改必须写入 log。
- [ ] 有效人工加权数量设置上限，首版建议 `50`。

验收标准：

- [ ] 本地和预览数据库迁移后表结构存在。
- [ ] 非管理员访问 `/admin/activity-priority` 被拦截。
- [ ] 非管理员调用 action 无法修改权重。
- [ ] 管理员修改权重后能看到当前状态和历史记录。
- [ ] 清除加权后 override 状态和 log 都正确保留。

### P1 排序算法服务

- [ ] 实现生命周期分桶。
- [ ] 实现 `0 - 1` 时间分。
- [ ] 实现管理员加权实时衰减。
- [ ] 已结束活动强制进入底部分桶。
- [ ] 同分排序使用 `startAt + id` 兜底，避免列表抖动。
- [ ] 人工权重不绕过权限、城市、分类、搜索和可见性筛选。
- [ ] 增加排序单元测试。

验收标准：

- [ ] 进行中活动优先于未开始活动。
- [ ] 未开始活动越接近开始时间越靠前。
- [ ] 已结束活动不会因为人工权重出现在前面。
- [ ] 设置 `+7` 后，7 天内活动稳定优先于普通活动。
- [ ] 第 8 天后活动回到自然时间排序。
- [ ] 已取消、私密无权限、跨城市、跨分类活动不会因为加权混入当前列表。
- [ ] 同一批数据连续请求排序结果稳定。

### P2 活动详情页管理员入口

- [ ] `/public-events/[publicEventId]` 管理员右上角显示点点点。
- [ ] 普通用户不显示点点点。
- [ ] 下拉包含 `调整活动权重`。
- [ ] 点击后打开权重调整弹窗。
- [ ] 保存后刷新当前页排序状态。

验收标准：

- [ ] 管理员能从活动详情直接调整权重。
- [ ] 普通用户完全看不到管理入口。
- [ ] 移动端和网页端入口不遮挡现有收藏、分享、封面按钮。
- [ ] 弹窗文案简短，不出现开发者语言。

### P3 活动权重总控台

- [ ] 新增 `/admin/activity-priority`。
- [ ] 展示所有人工调整过的活动。
- [ ] 支持当前有效、已衰减、全部记录筛选。
- [ ] 支持调整、清除、查看记录、打开详情页。
- [ ] 管理员 Profile 设置页增加入口。

验收标准：

- [ ] 管理员可以不用改代码完成权重调整。
- [ ] 管理员可以看到谁在什么时候改过权重。
- [ ] 清除加权后活动回到自然排序。
- [ ] Profile 设置页只有管理员显示入口。

### P4 列表排序接入

- [ ] `/public-events` 接入优先度排序。
- [ ] `/mobile-home` 活动推荐区域接入优先度排序。
- [ ] `/home` 活动推荐区域接入优先度排序。
- [ ] 活动列表 API 保持候选池限制，避免全表排序。
- [ ] override 批量读取，不允许每张卡片单独查询。
- [ ] override 查询失败时回落原排序。
- [ ] 已结束活动仍可在底部或历史区域看到。

验收标准：

- [ ] 人工加权中的未结束活动能明显前置。
- [ ] 未加权活动仍按时间接近度自然排序。
- [ ] 已结束活动不会挤占未结束活动位置。
- [ ] 列表接口响应时间没有明显变慢。
- [ ] 首页和移动首页候选池不超过文档约定上限。
- [ ] 活动列表首屏严格应用优先度，深分页可以回落自然排序。

## 期望效果

- 平台可以控制上线前重点活动的露出。
- 活动列表不再完全依赖导入顺序或随机顺序。
- 用户优先看到正在发生、马上发生、平台希望重点展示的内容。
- 管理员可以通过页面完成调整，不需要程序员介入。
- 权重会自然过期，减少人工维护成本。

## 暂不做

- 不做复杂推荐系统。
- 不做用户画像推荐。
- 不做付费置顶。
- 不做全站无限期置顶。
- 不做每个用户个性化排序。
- 不让普通主理人自己购买或设置优先度。
