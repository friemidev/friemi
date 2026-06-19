# 历史真实组局导入 Preview 数据库

## 目标

将内部人工维护的历史真实组局导入 Preview 数据库，让组队大厅和详情页更接近真实运营状态。

本导入只面向 Preview 环境，不应直接在 Production 执行。

## 数据来源

本次读取的本机文件：

```text
/home/ubuntu23/Téléchargements/NEXT FUN ☕ 快乐制造局 项目管理 (3).xlsx
/home/ubuntu23/Téléchargements/昵称和微信号的对照关系.xlsx
```

已生成完整 SQL Editor 文档：

```text
/home/ubuntu23/Bureau/nextfunclub/docs/v1_4/nextfunclub-preview-legacy-activity-import.md
```

该完整文档包含参与人的微信号，不要提交到 Git，也不要放进 PR 描述。

## 导入策略

- 真实组局写入 `Activity`，不写 `PublicEvent`。
- 参与人写入 `GuestActivityParticipant`，后续用户填写相同微信号后可自动关联正式账号。
- 发起人需要对应 `UserProfile`；SQL 会优先匹配同昵称 active profile，没有则创建 preview 专用 organizer profile。
- `Past` 状态导入为 `Activity.status = ENDED`。
- `Going` 状态导入为 `Activity.status = CONFIRMED`。
- 日期按巴黎时间解释后转为 UTC timestamp 写入数据库。
- 缺失集合时间的组局暂按巴黎时间 19:00 导入，并在活动描述中标记导入复核。
- `Hoting` / `hoting` 按同一发起人导入。
- `咔哒` / `咔嗒` 按同一参与人导入，统一展示为 `咔嗒`。
- SQL 使用 deterministic id，例如 `legacy_activity_001`、`legacy_guest_001_001`，可以重复执行，不会重复创建同一批组局。

## 字段映射

| xlsx 字段 | 数据库字段 |
| --- | --- |
| 活动名称 | `Activity.title` |
| 活动介绍 | `Activity.description` |
| 类型 | `Activity.category` |
| Date + 集合时间 | `Activity.startAt` / `Activity.endAt` |
| 集合地点，兜底活动地点 | `Activity.address` |
| 链接 | 写入 `Activity.description` 的原始链接说明，不写 `externalUrl` |
| 发起人 | `Activity.organizerId` |
| 参加人数 | `Activity.capacity` |
| 报名成员 | `GuestActivityParticipant.displayName` |
| 昵称和微信号对照 | `GuestActivityParticipant.wechatId` / `normalizedWechatId` |

## 本次统计

- `Activity`：19 条
- `GuestActivityParticipant`：83 条
- Organizer profile 候选：5 个
- 没有微信映射的参与昵称：2 个
- 需要复核的活动：5 条

## 执行前检查

1. 确认连接的是 Preview 数据库，不是 Production。
2. 确认 Preview 数据库已经执行 v1.4 guest signup migration，存在 `GuestActivityParticipant` 表。
3. 打开完整 SQL 文档：

```bash
xdg-open "/home/ubuntu23/Bureau/nextfunclub/docs/v1_4/nextfunclub-preview-legacy-activity-import.md"
```

4. 复制文档末尾 SQL 到 Preview 数据库 SQL Editor 执行。
5. 执行后检查 summary 结果：

```text
legacy activities = 19
legacy guest participants = 83
```

## 回滚

完整 SQL 文档末尾包含注释形式的 rollback SQL。

回滚只会删除本批次导入的数据：

- `GuestActivityParticipant.sourceUserAgent = legacy-xlsx-import:paris-juin-2026`
- `Activity.source = legacy-nextfun-xlsx`
- 未再被 Activity 使用的 preview 专用 organizer profile

## 注意事项

- 该导入文档包含真实微信号，不能进入 Git。
- 没有微信映射的游客参与人仍会导入，但后续无法通过微信号自动绑定账号。
- 缺失时间或地点的记录已经在活动描述中标记，后续可以在后台或 SQL 中人工修正。
