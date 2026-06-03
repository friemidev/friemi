# Next Fun Club 文档索引

文档按项目版本阶段归档，方便回看每个阶段的产品、技术和协作决策。

## 目录结构

```text
docs/
  v1_0/  MVP 基础框架与活动闭环
  v1_1/  活动发现、导入、部署和线上环境增强
  v1_2/  活动信息位与组队模型调整，进行中
```

## 版本状态

### v1.0

MVP 基础阶段，重点完成：

- 项目基础架构
- 本地开发与团队协作流程
- 登录、活动列表、活动详情、创建活动、报名、个人空间
- 第一版产品需求和 MVP 清单

### v1.1

功能增强阶段，重点完成：

- 活动链接导入
- 公共活动 API / 爬虫导入
- 管理后台导入工具
- 预览 / 生产数据库环境说明
- 团队同步 Clerk、Supabase、Vercel 的协作说明

### v1.2

进行中阶段，重点调整：

- 公共活动信息位
- 用户基于活动信息创建组队
- 活动发现页和组队大厅的语义拆分
- 评论、举报、好友搜索、私聊入口等社交能力规划

v1.2 尚未作为正式版本发布，因此只保留草稿公告，不进入公开 `/updates` 版本列表。

v1.2 分支实现清单维护在：

```text
docs/v1_2/implementation-checklist.md
```

## 更新公告

面向用户的 `/updates` 页面数据维护在：

```text
apps/web/features/updates/versionUpdates.ts
```

每个版本对应的公告草稿或归档文档维护在版本目录内：

```text
docs/v1_0/update-announcement.md
docs/v1_1/update-announcement.md
docs/v1_2/update-announcement-draft.md
```
