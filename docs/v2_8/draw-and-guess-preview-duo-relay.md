# 接龙模式：Preview 双人练习验收

更新于 2026-09-29。画猜分支 `codex/draw-and-guess` 的 Vercel Preview 已开放两位真人开始接龙；正式环境仍要求 5–8 人。稳定入口：`https://friemi-git-codex-draw-and-guess-friemi.vercel.app/zh-CN/game-tools/draw-guess`。

## 双人规则

- 仅当 `VERCEL_ENV=preview` 且 `DRAW_GUESS_CHAIN_ENABLED=true` 时，创建接龙房可选 2 人；人数选择只提供 2、5、6、7、8 人。服务端也拒绝 3、4 人以及正式环境中的 2 人请求。
- 双人房在内部增加第 3 个系统座位。真人占 1、2 号位，系统占 3 号位。两位真人入座后房主即可开局；房间显示真人进度 `2/2`，并标注系统补位。
- 三个位次按“起始词 → 画 → 猜”传递。任何一条链的最终猜词位都不同于出题位。系统自动提供起始词、测试问号画作或“未猜出”占位；这些步骤标为系统作品且不计分。系统不投票、不评选最佳作品，也不进入排行榜。两位真人完成各自步骤即可继续；两人都投票后进入评选，真人出题人评选可选的人类画作后结算。
- 系统画作和猜词只用于验收房间同步、阶段推进和结算，不能代替第三位真人的真实创作与猜测。正式多人接龙的规则没有改变。

## 验收证据

| 检查 | 结果 |
| --- | --- |
| 规则与构建 | 画猜规则测试 12/12、`npx tsc --noEmit`、`npm run build` 通过；单元测试覆盖出题人不猜自己的词、系统自动提交、真人投票、最佳作品、结算和系统零分。 |
| Preview 隔离数据库 | `scripts/test-draw-guess-preview-duo.ts` 使用独立的 Preview 数据库跑通建房、双真人入座、系统补位、画猜传递、投票、评选、结算与再来一局。临时房间和资料在退出时删除。 |
| Preview 部署 | 提交 `3ccd650` 推送到 `codex/draw-and-guess`，对应的 Vercel Preview 部署 `HZ7ru5MHDY845fRqZpu6yBe6n1HV` 显示 Ready。 |
| 页面实测 | 两个独立 Clerk Development 登录会话（桌面与 390px 手机视口）在稳定 Preview 域名完成建房、加入、两人出词、两人作画、两人猜词、三条链投票、评选、排行榜、历史页和再来一局。历史及当前排行榜只列两位真人。页面探针重复跑通两次，每次清理 1 个房间、2 个资料、2 个临时 Clerk 用户。 |

在 `apps/web` 目录复核服务端完整局：

```bash
node --env-file=../../.env.local --conditions=react-server --import tsx scripts/test-draw-guess-preview-duo.ts
```

在同一目录复核已部署 Preview 的两会话页面流程：

```bash
node --env-file=../../.env.local --conditions=react-server --import tsx scripts/probe-draw-guess-preview-duo-relay-browser.mjs
```

两支脚本均限制在隔离的画猜 Preview 数据库；页面脚本还要求 Clerk Development 密钥，并在结束时删除临时数据。运行时不要输出或提交环境变量值。
