# 你画我猜接龙开放检查

接龙入口与新房间默认开放。正式环境仍需 5–8 位真人；Preview 的双人练习规则不进入正式环境。`DRAW_GUESS_CHAIN_ENABLED=false` 可临时关闭新接龙房间、开局和再来一局。

## 生产环境截止扫描

接龙的全员离线推进需要独立的 5 秒截止扫描。部署应用代码前，使用正式站点的 `CRON_SECRET`、正式 Supabase 的 `DIRECT_URL` 和项目标识，执行：

```bash
DRAW_GUESS_PRODUCTION_DB_REF='<生产项目标识>' \
DRAW_GUESS_DEADLINE_ENDPOINT='https://www.friemi.com/api/cron/draw-guess-deadlines' \
CRON_SECRET='<与正式站点一致的密钥>' \
DIRECT_URL='<正式数据库直连地址>' \
npm run draw-guess:production-cron --workspace=apps/web
```

脚本先验证正式站点的鉴权端点，再核对域名与数据库项目，随后把端点和密钥写入正式库的 Supabase Vault，创建 `draw_guess_production_deadlines` 和任务记录清理任务。它拒绝已知的画猜 Preview 数据库。正式环境的每日数据维护继续由 `vercel.json` 的 Vercel Cron 执行。

应用部署后，检查 `/api/health` 返回 200、正式库的 `draw_guess_production_deadlines` 处于 Active 且最近运行成功，再用 5 位测试玩家完成一局接龙。若 Vercel 环境中已有 `DRAW_GUESS_CHAIN_ENABLED=false`，开放前需移除该覆盖值。此次代码不包含数据库迁移。
