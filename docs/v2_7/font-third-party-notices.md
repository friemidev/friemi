# Friemi v2.7 字体第三方声明

日期：2026-08-11

本文件用于记录 v2.7 全局字体接入所使用的第三方字体资源，供发布说明、合规检查和后续字体优化追溯。

## Plus Jakarta Sans

- 用途：英文、法文、数字、ASCII 标点。
- 当前资源路径：`apps/web/public/font/Plus_Jakarta_Sans/`
- 当前加载文件：`PlusJakartaSans-FriemiLatin.woff2`
- 原始来源文件：`PlusJakartaSans-VariableFont_wght.ttf`
- 授权文件：`apps/web/public/font/Plus_Jakarta_Sans/OFL.txt`
- 授权类型：SIL Open Font License 1.1。
- 落地说明：作为 Friemi 全局 Latin 字体优先加载；P1 已转 WOFF2，暂不加载 italic 和 static 子目录中的其他字重。

## HarmonyOS Sans SC

- 用途：中文、中文标点、常见 CJK 文本。
- 当前资源路径：`apps/web/public/font/HarmonyOS_Sans_SC/`
- 当前加载文件：`HarmonyOS_Sans_SC_FriemiUI-Regular.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Medium.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Bold.woff2`
- 原始来源文件：`HarmonyOS_Sans_SC_Regular.ttf`、`HarmonyOS_Sans_SC_Medium.ttf`、`HarmonyOS_Sans_SC_Bold.ttf`
- 授权文件：`apps/web/public/font/HarmonyOS_Sans_SC/LICENSE.txt`
- 落地说明：作为 Friemi 全局中文字体 fallback；P1 已生成 UI 子集 WOFF2，暂不加载 Thin / Light / Black，避免首屏体积和视觉字重过重。

## 发布注意

- 保留以上两个字体目录中的授权文件，不单独售卖或独立分发字体文件。
- 后续如果新增大量中文 UI 文案，需要重新生成 HarmonyOS UI 子集。
- 如果未来新增字体文件、子集文件或 CDN 路径，需要同步更新本文件和 `docs/v2_7/global-font-management.md`。
