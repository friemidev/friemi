# v2.7 星球 UI P0 基线记录

记录时间：2026-08-13  
分支：`ui/v2-7-planet-ui-adjustments`  
对应方案：[planet-ui-chat-unification-plan.md](./planet-ui-chat-unification-plan.md)

## 1. 测试对象

使用当前数据库中的 `test-2` 星球作为固定基线：

| 数据 | 数量 |
| --- | ---: |
| 已审核成员 | 1（OWNER） |
| 星球消息 | 4 |
| 精彩瞬间 | 1 |
| 瞬间照片 | 2 |
| 瞬间弹幕/评论 | 1 |
| 瞬间点赞 | 1 |

固定路由：

```text
/zh-CN/footprints?tab=planet
/zh-CN/planets/test-2
/zh-CN/planets/test-2/moments/cmrryss680034poxazxhtnful
```

## 2. 截图基线

计划保存以下六张截图：

```text
planet-ui-baseline/01-square-mobile.png
planet-ui-baseline/01-square-desktop.png
planet-ui-baseline/02-detail-mobile.png
planet-ui-baseline/02-detail-desktop.png
planet-ui-baseline/03-moment-mobile.png
planet-ui-baseline/03-moment-desktop.png
```

当前会话的 Browser runtime 返回 `No browser is available`，可用浏览器列表为空，因此本轮不能生成真实页面截图。该项保持未完成，不使用设计稿、HTML 或伪造图片代替基线证据。

补测视口固定为：

- 移动端：`390 x 844`。
- 桌面端：`1280 x 900`。
- 截图必须使用同一个 `test-2` 星球和同一条精彩瞬间。
- 截图前记录登录身份；星球详情和瞬间建议使用 OWNER 身份，确保聊天室、发布、点赞和弹幕状态完整可见。

## 3. 星球详情 HTTP 基线

测试方式：本地 Next.js 开发服务连接当前项目数据库；路由预热后连续请求10次。

测试地址：

```text
GET http://127.0.0.1:3000/zh-CN/planets/test-2
```

| 指标 | 结果 |
| --- | ---: |
| HTTP 状态 | 200 |
| 样本数 | 10 |
| 平均 TTFB | 132.3 ms |
| 最大 TTFB | 170.1 ms |
| 平均完整响应时间 | 424.0 ms |
| 最大完整响应时间 | 459.3 ms |
| 平均 HTML 下载大小 | 81,081 bytes |

限制：该 HTTP 样本是未登录请求，响应头显示 `x-clerk-auth-status: signed-out`；数值用于后续相同本地条件下的相对比较，不代表 Vercel Preview 或生产环境 SLO。

## 4. `getPlanetRoom()` 数据库基线

测试方式：使用 `test-2` OWNER Profile 直接调用 `getPlanetRoom()`；预热后连续采样10次，Prisma query event 记录当前数据库往返。

| 指标 | 结果 |
| --- | ---: |
| 样本数 | 10 |
| 函数总耗时 p50 | 700.26 ms |
| 函数总耗时 p95 | 736.23 ms |
| Prisma event duration p50 | 680 ms |
| Prisma event duration p95 | 717 ms |
| 每次逻辑 Prisma 调用 | 4 |
| 每次实际 `SELECT` | 11 |
| 每次 Prisma query event | 23 |
| 每次星球消息历史查询 | 1 个 `planetMessage.findMany` |
| 返回消息行数 | 4 |
| 消息读取上限 | 40 |

当前4个逻辑调用：

1. `planet.findFirst()`：星球、创建人、成员预览、轨迹摘要及关联用户。
2. `planetMember.findFirst()`：当前用户成员身份。
3. `planetMessage.findMany()`：最多40条星球消息及发送者。
4. `planetMember.findMany()`：OWNER/ADMIN 的待审核成员。

实际事件为11条 `SELECT` 加4组 `BEGIN / DEALLOCATE ALL / COMMIT`，共23条 query event。关联数据由 Prisma 拆成多条 SQL，因此不能只用4个顶层方法代表真实数据库往返。

### 对 P1 的直接意义

星球详情移除内嵌聊天室后，可以删除第3个逻辑调用：

```text
planetMessage.findMany({
  where: { planetId },
  take: 40,
  orderBy: { createdAt: "desc" },
  include/select: author
})
```

在当前数据下，这对应2条实际 `SELECT`（消息和发送者）以及一组事务控制事件。预期会降低详情页数据库往返、查询时间和服务端序列化体积，但必须在 P1 完成后用相同账号、数据和脚本复测，不能直接把本地差值当作生产收益。

## 5. 旧精彩瞬间入口审计

### 正式页面入口

`MomentOrbitCard` 当前从星球详情跳转至：

```text
/planets/[planetSlug]/moments/[momentId]
```

代码位置：

```text
apps/web/features/planets/components/PlanetPages.tsx
```

### Demo 入口

`PlanetMobileDemo` 还有一处演示路由引用：

```text
apps/web/features/planets/components/PlanetMobileDemo.tsx
```

P1 修改时需要同步处理，避免演示页继续指向旧交互。

### 旧 URL 可用性

基线路由请求结果：

| 指标 | 结果 |
| --- | ---: |
| HTTP 状态 | 200 |
| 重定向 | 无 |
| HTML 下载大小 | 83,395 bytes |

### 分享与通知

- 当前 `PlanetMomentPage` 没有专用分享按钮或星球瞬间分享 metadata。
- 用户仍可能通过浏览器地址栏、收藏或外部聊天手动保存旧 URL，因此旧路由不能直接删除。
- `NotificationType` 没有星球瞬间点赞、评论或回复类型。
- `Notification` 没有 `planetId`、`planetMomentId` 或 `planetMomentCommentId` 外键。
- `planetActions.ts` 的发布、点赞和评论操作目前不会创建站内通知。
- 因此当前没有星球瞬间通知入口需要迁移；未来新增通知时应直接使用新的 `?moment=[momentId]` 深链接。

## 6. P0 结论

- 路由、功能和数据关系审计完成。
- HTTP、数据库调用、消息查询和响应大小基线完成。
- 旧路由、分享风险及通知入口清单完成。
- 唯一未完成项是六张真实浏览器截图；当前执行环境没有可用浏览器，需补测后才能宣称 P0 全部完成。

