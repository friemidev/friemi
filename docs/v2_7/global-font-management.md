# Friemi v2.7 全局字体管理与落地方案

日期：2026-08-11

分支：`ui/global-font-tuning`

参考截图：`apps/web/public/font/字体布局细节-CN.png`

## 目标

把 Friemi 的全站字体从当前系统 fallback 状态，统一到截图里的双字体体系：

- 中文：`HarmonyOS Sans SC`
- 英文 / 法文 / 数字 / ASCII 符号：`Plus Jakarta Sans`

落地后应做到：

- 中文页面更圆润、清晰、亲和。
- 英文和法文页面保持现代、干净、国际化。
- 中英混排时视觉节奏稳定，不出现中文偏重、英文偏轻或数字风格跳动。
- 移动端卡片、按钮、导航、弹窗、聊天室、游戏工具等高频 UI 的字号和行高一致。
- 字体加载不显著拖慢首屏，尤其避免一次性下载所有中文 TTF。

## 当前资源

### 字体文件

现有文件位于 `apps/web/public/font`：

| 字体 | 文件 | 大小 | 用途 |
| --- | --- | --- | --- |
| Plus Jakarta Sans | `PlusJakartaSans-VariableFont_wght.ttf` | 约 172 KB | 英文 / 法文 / 数字 / ASCII 符号，常规正体 |
| Plus Jakarta Sans Italic | `PlusJakartaSans-Italic-VariableFont_wght.ttf` | 约 176 KB | 斜体备用，不建议全局首屏加载 |
| HarmonyOS Sans SC Regular | `HarmonyOS_Sans_SC_Regular.ttf` | 约 7.9 MB | 中文正文 |
| HarmonyOS Sans SC Medium | `HarmonyOS_Sans_SC_Medium.ttf` | 约 7.9 MB | 中文按钮 / 导航 |
| HarmonyOS Sans SC Bold | `HarmonyOS_Sans_SC_Bold.ttf` | 约 7.8 MB | 中文标题 |
| HarmonyOS Sans SC Black | `HarmonyOS_Sans_SC_Black.ttf` | 约 7.8 MB | 强展示标题，慎用 |
| HarmonyOS Sans SC Light / Thin | `Light.ttf` / `Thin.ttf` | 约 8 MB each | 当前 UI 不建议加载 |

P1 已新增优化产物：

| 字体 | 文件 | 大小 | 用途 |
| --- | --- | ---: | --- |
| Friemi Latin | `PlusJakartaSans-FriemiLatin.woff2` | 47,852 B | Latin / 法文 / 数字 / ASCII 标点首屏加载 |
| Friemi CJK Regular | `HarmonyOS_Sans_SC_FriemiUI-Regular.woff2` | 172,564 B | 中文 UI 正文 400 |
| Friemi CJK Medium | `HarmonyOS_Sans_SC_FriemiUI-Medium.woff2` | 173,888 B | 中文 UI 导航 / 按钮 500 / 600 |
| Friemi CJK Bold | `HarmonyOS_Sans_SC_FriemiUI-Bold.woff2` | 174,480 B | 中文 UI 标题 700 |

P1 子集说明：

- HarmonyOS UI 子集来自 `apps/web/app`、`apps/web/components`、`apps/web/features`、`apps/web/lib`、`apps/web/messages`、`packages/ui/src` 中的中文 UI 文案，并额外补充常用简中字符、中文标点、全角符号和中英法混排字符。
- 子集共覆盖约 1419 个字符。UI 文案优先命中 HarmonyOS；极少数未覆盖的用户生成内容会 fallback 到系统中文字体。
- 原始 TTF 保留在仓库中，用于授权追溯和后续重新生成子集；生产 CSS 不再引用这些大 TTF。

备注：

- `HarmonyOS_Sans_SC/LICENSE.txt` 说明可在软件中嵌入和分发未修改字体，但需要保留版权和授权说明，且不能单独售卖字体文件。
- `Plus_Jakarta_Sans/OFL.txt` 是 SIL Open Font License 1.1，可用于商业项目；同样保留 license 文件。
- P0 已清理 `apps/web/public/font/**/.DS_Store`，避免无意义静态资源进入部署。

### 当前代码状态

P1 后，当前全局字体在 `apps/web/app/globals.css`：

```css
@font-face {
  font-family: "Friemi Latin";
  src: url("/font/Plus_Jakarta_Sans/PlusJakartaSans-FriemiLatin.woff2")
    format("woff2");
  font-weight: 200 800;
}

@font-face {
  font-family: "Friemi CJK";
  src: url("/font/HarmonyOS_Sans_SC/HarmonyOS_Sans_SC_FriemiUI-Regular.woff2")
    format("woff2");
  font-weight: 400;
}

:root {
  --font-sans:
    "Friemi Latin", "Plus Jakarta Sans", "Friemi CJK", "HarmonyOS Sans SC",
    "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei",
    -apple-system, BlinkMacSystemFont, "SF Pro Text", ui-sans-serif, system-ui,
    sans-serif;
  --friemi-font-latin:
    "Friemi Latin", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --friemi-font-cjk:
    "Friemi CJK", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Noto Sans SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
}

body {
  font-family: var(--font-sans);
}
```

P2 后，Tailwind 在 `apps/web/tailwind.config.ts` 中接入了 `font-sans`，并新增 `font-latin` / `font-cjk` 作为调试和局部强制字体族的可选项：

```ts
fontFamily: {
  cjk: ["var(--friemi-font-cjk)", "ui-sans-serif", "system-ui"],
  latin: ["var(--friemi-font-latin)", "ui-sans-serif", "system-ui"],
  sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
}
```

当前已解决：

- 新增字体文件已接入。
- iOS App 不再单独覆盖 `--font-sans`，和浏览器端走同一字体栈。
- 生产 CSS 已切到 WOFF2 和 HarmonyOS UI 子集，不再引用原始大 TTF。

P4 后已处理：

- `apps/web` 中 `font-black` / `font-extrabold` 已清零，常规标题最高收敛到 700。
- `uppercase tracking-*` 已收敛为 `tracking-normal`，避免中文本地化标签被拉开。
- TS / TSX 中 `font-mono` / `tabular-nums` 已统一替换为 `.friemi-tabular`；全局 CSS 内保留 `font-variant-numeric: tabular-nums` 作为工具类实现。
- 剩余 `tracking-[...]` 只保留给房号、好友号、二维码 code 等编码场景。

当前仍待预览环境确认：

- DevTools 中字体请求、Rendered Fonts、FCP / CLS 需要在真实预览环境复测。
- 320px 宽度下的按钮、导航、弹窗文案需要截图复核；P4 代码层只降低字重和字距，不改变布局尺寸。

## 二次复核结论

截图已经不只是“字体替换建议”，而是一张完整的 typography board，包含品牌气质、字体选择理由、授权说明、字体匹配、字号层级、组件状态、间距、导航、圆角和品牌哲学。上一版文档覆盖了主体方向，但还需要补足这些可验收细节：

| 截图区块 | 截图内容 | 本文落地判断 |
| --- | --- | --- |
| 顶部品牌区 | Friemi logo、Typography Board、v1.0、字体系统说明 | 作为品牌基调：友好、温暖、可信，不是单纯技术字体替换 |
| 英文字体 / 中文字体 | Plus Jakarta Sans 与 HarmonyOS Sans 样张 | 字体栈必须 Latin 优先、CJK fallback，保证数字和英文走 Plus Jakarta |
| 为什么选择 HarmonyOS Sans | 圆润友好、阅读舒适、与 Plus Jakarta 匹配、多字重 | 作为选择原因写入决策依据，避免后续又换回系统字体 |
| 商用授权说明 | HarmonyOS Sans EULA、Plus Jakarta OFL | 落地时保留 license，并在发布说明或第三方声明中可追溯 |
| 字体搭配原则 | 中文 HarmonyOS，英文/数字/符号 Plus Jakarta，中英混排统一 | 需要通过 `unicode-range` 和字体栈实现，而不是组件里手动切 span |
| 01 Type Scale | Display / Title / Body / Caption / Overline | 已转成 token，但项目不采用截图中的负字距 |
| 02 Typography in UI | 移动 UI 标注每种文字角色 | 需要补到高频页面验收，不只看全局 body font |
| 03 Font Weights | 400 / 500 / 600 / 700 | 与仓库大量 `font-black` 冲突，必须分批降重 |
| 04 中英混排 | 标签、卡片标题、中文夹英文 | 需要验证中文、英文、法文、数字混排 |
| 05 数字与符号 | 价格、时间、日期、标点 | 数字默认 Plus Jakarta，关键数据可用 tabular nums |
| 06 Component Typography | Button / Input / Tag / Chat / Card / Dialog | 需要补组件状态规则：default / hover / pressed / disabled / error |
| 07 Spacing & Layout | 行高、段落间距、卡片内边距 | 需要写明确的间距 token 和移动端最小可读规则 |
| 08 Navigation Typography | 底部导航未选中/选中 | 选中态主要靠颜色和图标，字重不应大幅跳变 |
| 09 Radius & Style | R4/R8/R12/R16/R20/R28/R999 与组件映射 | 字体圆润后，边框和圆角也要保持轻量 |
| Typography Philosophy | Friendly / Simple / Warm / Modern / Trust | 作为验收语言：看起来更友好、清爽、温暖、可信 |

## 截图分析

### 1. 字体搭配原则

截图给出的策略是：

- 中文使用 `HarmonyOS Sans`，强调亲和、圆润、阅读清晰。
- 英文使用 `Plus Jakarta Sans`，强调现代、规整、国际化。
- 中英混排时保持视觉节奏一致。
- 数字和常见 ASCII 符号使用 Plus Jakarta Sans，让价格、时间、人数、房号更稳定。

落地解释：

- CSS font stack 应把 Plus Jakarta Sans 放在 HarmonyOS Sans SC 前面。Plus Jakarta Sans 不含中文字形，所以中文会自然 fallback 到 HarmonyOS；英文、数字、ASCII 标点会优先用 Plus Jakarta。
- 中文全角标点、中文字符、日文假名、常见 CJK 统一交给 HarmonyOS Sans SC。
- 法文属于 Latin 扩展场景，仍走 Plus Jakarta Sans；需要验证重音字母如 `é`, `à`, `ç`, `œ` 是否完整。
- 标题允许中英混排，正文以中文可读性为优先；不要为了英文视觉强行压缩中文行高。
- `¥`, `%`, `@`, `#`, `+`, `-`, `=`, `:`, `;`, `()` 等 ASCII 符号优先 Plus Jakarta；`，。！？《》（）【】` 等中文标点优先 HarmonyOS。

### 2. Type Scale

截图中的字体层级：

| 层级 | 字号 | 行高 | 字重 | 用途 |
| --- | ---: | ---: | ---: | --- |
| Display 1 | 32 | 40 | 700 | 大标题 / 首页主信息 |
| Display 2 | 28 | 36 | 700 | 二级大标题 |
| Title 1 | 24 | 32 | 600 | 卡片标题 / 页面分区标题 |
| Title 2 | 20 | 28 | 600 | 卡片次标题 / 时间信息 |
| Body 1 | 16 | 24 | 400 | 正文内容 |
| Body 2 | 14 | 22 | 400 | 辅助信息 / 地址 |
| Caption | 12 | 18 | 400 | 标签 / 说明文字 |
| Overline | 11 | 16 | 400 | 分类标签 / 小标题 |

落地调整：

- Display 和 Title 不使用负字距，全部 `letter-spacing: 0`。
- Overline 如果继续使用大写英文，可保留极少量正 tracking，但不要把中文小标签拉开。
- 当前项目大量 `font-black` 应逐步降到 `font-bold` / `font-semibold`，否则新中文字体下会显得过重。
- 截图里的 `-1%` / `-0.5%` 字距是设计稿建议；本项目按既有规则统一改成 0，避免移动端多语言和系统 WebView 出现挤压。
- Caption / Overline 的正字距只允许用于纯英文或数字标签；中文分类如“推荐活动”“户外”“美食”必须保持 0。

### 2.1 UI 示例拆解

截图右侧的手机示例提供了移动首页/活动卡片的文字角色：

| UI 位置 | 截图角色 | 建议落地 |
| --- | --- | --- |
| 页面主标题 `Discover` | Display 1 / 32 Bold | `/mobile-home`、`/activities` 一级标题使用 28-32 / 700 |
| 顶部分类 `For You / Outdoor...` | Tag / 12 Medium | 分类 tab 使用 12 / 500，选中态靠背景和颜色 |
| 卡片推荐标 `推荐活动` | Tag / 12 Medium | 胶囊标签使用 11-12 / 500，中文不加 tracking |
| 卡片标题 `周末徒步：山谷穿越` | Title 1 / 24 SemiBold | 详情卡大标题 20-24 / 600，列表卡 14-16 / 600 |
| 时间 `5月25日 周六 09:00` | Title 2 / 20 SemiBold | 详情页关键时间可 18-20 / 600；列表 meta 不要过重 |
| 地址 `深圳湾公园地铁站 A 出口` | Body 2 / 14 Regular | 地址/描述 14 / 400，图标对齐文本基线 |
| 参与人数 `12 人参加` | Caption / 12 Regular | 人数/小说明 12 / 400，数字保持清晰 |

这说明不能只改全局 `body` 字体；卡片、tab、meta、导航、弹窗标题都要按角色验收。

### 3. 字重体系

截图建议：

- Regular 400：正文 / 辅助信息。
- Medium 500：按钮 / 导航。
- SemiBold 600：小标题 / 强调。
- Bold 700：大标题 / 重要信息。

当前项目统计：

- `font-black` 约 822 处。
- `font-semibold` 约 749 处。
- `font-medium` 约 204 处。
- `font-bold` 约 198 处。
- `font-extrabold` 约 63 处。

落地策略：

- 全局字体先接入，不一次性改 2000 多处 class。
- 高频移动页优先替换 `font-black`：
  - `/mobile-home`
  - `/activities`
  - `/activities/new`
  - `/lobby`
  - `/profile`
  - `/search`
  - `/messages`
  - `/notifications`
  - `/game-tools/werewolf`
- 标题从 `font-black` 调成 `font-bold` 或 `font-semibold`，按钮从 `font-black` 调成 `font-semibold`。
- 游戏工具中需要强氛围的标题可保留重字重，但要逐页验证不糊、不挤、不溢出。

### 4. 中英混排

截图强调以下场景：

- 分类标签：`推荐活动`
- 中英标题：`周六徒步 Hiking in Nature`
- 英文/法文活动标题：`Cafe Exhibition`
- 中文正文里夹英文：`一起感受大自然的美好`

落地规则：

- 不为中文和英文分别包 span；通过 font stack 自动分配字体。
- 活动标题、用户名、地点名允许中英混排，但不做强制 uppercase。
- 卡片标题行高不能太紧，移动端建议至少 `line-height: 1.2`。
- 长英文 / 法文单词必须有 `min-w-0`、`truncate` 或 `line-clamp` 保护。
- 中文标题不使用正 tracking；英文 overline 可使用正 tracking。

### 5. 数字与符号

截图希望数字样式稳定：

- 人数：`12 人参加`
- 金额：`¥ 1,298.00`
- 时间：`09:30`
- 日期：`2024.05.25`

落地规则：

- 数字默认走 Plus Jakarta Sans。
- 价格、魅力值、Friemi 币、倒计时、桌号、房间号、验证码可使用 `font-variant-numeric: tabular-nums`。
- 不要全局启用 tabular nums；只在数据密集组件启用，避免普通正文显得僵硬。
- 继续保留 `font-mono` 给好友号、房间号、debug code 等真正需要等宽的场景。

### 6. 组件文字

截图覆盖了按钮、输入框、标签、聊天气泡、卡片信息、弹窗。

组件规则：

| 组件 | 字体策略 | 字号 / 字重 | 注意点 |
| --- | --- | --- | --- |
| Primary Button | Plus + Harmony fallback | 14 / 600 | 不用 900；按钮文字不能溢出 |
| Secondary Button | Plus + Harmony fallback | 14 / 500-600 | 浅边框下保持对比 |
| Input | Plus + Harmony fallback | 14 / 400 | placeholder 不能过重 |
| Tag / Chip | Plus + Harmony fallback | 12 / 500 | 中文不加 tracking |
| Card Title | Plus + Harmony fallback | 16-20 / 600 | 2 行 clamp，行高不能低于 1.15 |
| Card Meta | Plus + Harmony fallback | 12-14 / 400-500 | 图标和文本基线对齐 |
| Dialog Title | Plus + Harmony fallback | 18-20 / 600-700 | 弹窗小空间避免 900 |
| Chat Bubble | Plus + Harmony fallback | 14-15 / 400 | 多语言换行自然 |
| Mobile Nav | Plus + Harmony fallback | 12 / 500 | 选中态 600 即可 |

组件状态规则：

| 组件状态 | 截图含义 | 落地规则 |
| --- | --- | --- |
| Button default | 主按钮清晰但不笨重 | 14 / 600，背景承载重点 |
| Button hover | 颜色略加深 | 字重不变，不靠加粗表达 hover |
| Button pressed | 按压反馈 | 保持字重，使用 scale / shadow 变化 |
| Button disabled | 灰底低对比 | 14 / 500-600，文字不能低到不可读 |
| Input default | placeholder 轻 | 14 / 400，placeholder 使用浅色 |
| Input focus | 蓝色/品牌色边框 | 字体不变，靠 ring / border 表达 |
| Input error | 红色边框 | 错误文案 12-13 / 500，不能用 900 |
| Tag / Chip | 柔和胶囊 | 12 / 500，背景色区分类型 |
| Dialog | 小空间确认 | 标题 18-20 / 600，正文 14 / 400，按钮 14 / 600 |

需要重点检查的现有组件：

- `MobileNav`：避免选中态从普通字重跳到过粗。
- `ActivityCard`：标题和 meta 行高不能因为新字体变高后被裁切。
- `ProfileDashboardView`：昵称、统计数字、按钮同时出现，字重需要层级清楚。
- `NotificationsCenterClient`：通知卡片里标题、正文、按钮不能全部 `font-black`。
- `ActivityRoomChatPage` / `MessageThreadClient`：聊天气泡正文优先 400，时间和状态用 12 / 400-500。
- `WerewolfCreateRoomPanel` / 狼人杀房间：房号和桌号可保留更强数字风格，但中文说明不能过粗。

### 7. 间距与排版

截图给出：

- 32px 字号配 40px 行高。
- 24px 字号配 32px 行高。
- 16px 字号配 24px 行高。
- 14px 字号配 22px 行高。
- 12px 字号配 18px 行高。
- 段落间距约 16px。
- 卡片内容内边距约 20px，卡片间距约 16px。
- 标题与标签间距约 24px。
- 标题与正文间距约 16px。
- 段落与段落间距约 16px。

落地规则：

- 不用 viewport width 直接缩放字体。
- 小屏不要继续缩小到不可读；优先减少装饰和间距。
- `text-[10px]` 以下只用于徽标角标，不用于说明文字。
- 320px 宽度必须验证按钮文字和卡片标题不溢出。
- 字体接入后，如果卡片高度变大，先调整行高和内容 clamp，不直接把字号缩小到 11px 以下。
- 页面级标题和卡片级标题不要使用同一字号；否则移动端信息层级会塌。

### 8. 导航文字

截图建议底部导航：

- 字号 12px。
- Medium 500。
- 选中态颜色和图标强化，而不是一味加粗。
- 未选中和选中在截图中都接近 12 / Medium，差异主要来自图标颜色、文字颜色和状态点。

落地规则：

- `MobileNav` 的选中态从 `font-extrabold` 调到 `font-medium` 或最多 `font-semibold`。
- 未选中态保持 500 或 400；如果所有项都用 500，则用颜色表达层级。
- 文字和图标不使用负 tracking。
- 底部导航文字必须保证 320px 宽度下每项可读，不因字体切换变成省略号。

### 9. 圆角与字体风格关系

截图里圆角体系：

- R4 / R8 / R12 / R16 / R20 / R28 / R999。
- 按钮 / Chip：R16。
- 卡片 / 输入框：R20。
- 弹窗 / 底部弹层：R28。
- 头像 / 图标容器：R999。

落地解释：

- 字体变圆润后，重边框和超重字重会显得拥挤；因此 v2.7 的“全局浅框”和字体调优应该一起验收。
- 字体切换后不建议再增加更多装饰，重点是让文字信息更清楚。
- 截图里左侧最小圆角标注看起来有 `R8 / 4px` 的不一致；落地时建议统一 token 命名：`R4=4px`, `R8=8px`, `R12=12px`, `R16=16px`, `R20=20px`, `R28=28px`, `R999=999px`。
- 字体变厚以后，胶囊按钮内边距要同步验证；不要让文字贴边。

### 10. 品牌哲学

截图底部 Typography Philosophy 给出的品牌方向：

| 关键词 | 截图含义 | 落地判断 |
| --- | --- | --- |
| Friendly 友好 | 字形圆润，亲切可读 | 中文不要过窄过硬，按钮和标签保持温和 |
| Simple 简洁 | 结构清晰，信息层级明确 | 减少多余字重和过度 tracking |
| Warm 温暖 | 柔和圆润，传递温度 | 和 v2.7 浅框、浅色背景一起验证 |
| Modern 现代 | 国际化风格，简洁专业 | 英文/法文使用 Plus Jakarta，不走默认系统字体的杂糅感 |
| Trust 信任 | 稳定一致，阅读舒适 | 全站同一字体栈，避免不同页面字体跳动 |

这部分应作为最终主观验收标准：用户看到 Friemi 不应感觉“字体只是换了”，而应该感觉信息更亲近、更易读、更稳定。

## 当前页面布局可行性分析：能否只改字体？

结论：第一阶段可以做到“尽量不动布局，只修改字体相关内容”，但不能承诺像素级完全不移动。原因是 Plus Jakarta Sans 与 HarmonyOS Sans SC 的字面宽度、x-height、中文重心、数字宽度和行盒表现都会和当前系统 fallback 不同。即使不改 `padding`、`grid`、`width`、`height`，文字也可能出现更早换行、更多省略、按钮文字贴边、卡片标题行高变紧等变化。

因此 v2.7 字体落地应采用“布局冻结式”方案：

- 第一阶段只改字体加载、字体栈、字体 fallback 和必要的 font-weight，不改页面结构。
- 第二阶段只在出现过重、挤压或裁切的组件里调整字重，优先把 `font-black` / `font-extrabold` 降到 700 / 600。
- 第三阶段如果仍有真实溢出，再记录为布局例外。例外修改需要单独说明，不能混在字体切换里悄悄改动。

### 布局冻结范围

字体落地期间默认不修改：

- 页面外框：`max-w-*`、`.app-mobile-page-shell`、safe-area、底部导航占位。
- 横向间距：`px-*`、`pl-*`、`pr-*`、`gap-*`、`space-*`。
- 固定尺寸：`w-*`、`h-*`、`min-w-*`、`min-h-*`、`aspect-*`。
- 排列方式：`grid-cols-*`、`flex` 方向、横向滚动容器、卡片列数。
- 组件外形：`rounded-*`、边框宽度、弹窗高度、bottom sheet 高度。
- 图片区域：活动图、头像、狼人杀卡牌、首页 news 图的尺寸和裁切。

允许的字体相关修改：

- `@font-face`、`font-family`、`font-display`、`unicode-range`。
- `--font-sans`、Tailwind `fontFamily` 的字体栈。
- `font-weight` 降重，例如 `font-black` 改为 `font-bold` 或 `font-semibold`。
- 只在数据组件中增加 `font-variant-numeric: tabular-nums`。
- 必要时调整 `font-synthesis-weight`，避免浏览器伪造不存在的字重。

谨慎处理的 typography 修改：

- `font-size` 和 `line-height` 会影响布局高度，第一阶段不改。
- `letter-spacing` 统一保持 0，不按截图使用负字距。
- `truncate`、`line-clamp`、`min-w-0` 属于文字保护，不是纯字体切换；只有发现真实溢出时才作为例外补充。

### 页面级布局风险

| 页面 / 模块 | 当前布局特征 | 仅改字体可行性 | 重点验收 |
| --- | --- | --- | --- |
| `/mobile-home` | `max-w-[430px]`，左侧有边距、右侧贴边，横向卡片和 news 卡固定宽度 | 可行，但文字变宽会影响问候语、chip、热门卡片标题 | 问候语不换成异常多行；搜索 placeholder 不挤；Top News 标签和热门聚吧标题不裁切 |
| `/lobby` | 大标题约 39px，分类 rail 固定宽度，活动行使用 grid + clamp | 可行，但大标题和 tab 字重需要降重 | 标题不压迫；分类 chip 不溢出；活动行标题两行内自然截断 |
| `/activities` | 双列活动卡片，图片和卡片宽度固定，标题 line-clamp | 可行，但标题换行会最明显 | 卡片高度不被文字顶乱；状态标签、收藏角标、时间文案不重叠 |
| `/activities/new` | 创建入口卡片和活动预览卡固定布局 | 可行 | “创建聚吧”“桌游工具”说明文字不溢出，预览活动卡标题保持可读 |
| `/profile` | 头像、昵称、统计数字、操作按钮密集 | 可行，但数字和按钮最容易显得重 | 昵称单独一行稳定；统计数字可点击且不跳位；关注/发消息按钮文字完整 |
| `/search` | 搜索栏、筛选、用户结果、活动结果统一卡片 | 可行 | 搜索框 placeholder、用户昵称、活动标题、空状态文案不挤压 |
| `/messages` | 会话列表和聊天气泡使用头像 + 内容列 | 可行 | 首条消息、预览文本、时间、未读态不因加粗导致换行异常 |
| `/notifications` | 通知卡片里标题、正文、按钮同屏密集 | 可行，但 CTA 按钮要避免过粗 | 回关按钮、礼物通知、消息通知正文不裁切 |
| `/game-tools/werewolf` | 桌面、座位、角色牌、房号有固定视觉布局 | 仅改字体可行，但必须保守 | 房号、桌号、座位名、法官视角角色名清晰，不改变桌面和座位位置 |
| 登录 / 邮箱继续 | Clerk 或登录表单布局由外部组件和局部样式控制 | 可行，但只继承字体变量 | 移动端继续按钮、邮箱输入、错误提示不产生 UI 错乱 |

### 布局冻结式落实方案

1. 基线截图
   在改字体前保留移动端截图，至少覆盖 390x844、360x740、320x568 三个宽度。重点页面为 `/mobile-home`、`/activities`、`/activities/new`、`/lobby`、`/profile`、`/search`、`/messages`、`/notifications`、`/game-tools/werewolf`。

2. 字体接入
   只在全局 CSS / Tailwind 字体栈里接入 Plus Jakarta Sans 与 HarmonyOS Sans SC。此阶段不改组件尺寸、间距、grid、卡片宽高和弹窗高度。

3. 字重试点
   在高频移动页面中优先处理 `font-black` / `font-extrabold`。按钮、导航、标签优先 500 / 600；页面主标题最高 700；正文和 meta 保持 400 / 500。

4. 截图对比
   逐页对比改动前后截图。接受“字体观感变清爽”和“文字宽度略有变化”，不接受横向滚动、新遮挡、按钮文字裁切、卡片高度明显错乱、底部导航跳位。

5. 例外登记
   如果仅改字体后出现不可接受的问题，先记录具体页面、组件、截图、原因。只有确认是字体度量导致的溢出，才允许补充 `line-clamp`、`truncate`、`min-w-0` 或极小的 line-height 修正。

### 预期结果

- 页面布局保持原样，用户不会感觉 Friemi 被重新排版。
- 字体视觉更轻、更圆润、更统一，尤其中文、英文、数字混排不会跳。
- 大量 `font-black` 降重后，首页、活动卡、Profile、通知和聊天室更清爽。
- 固定宽度卡片、底部导航、弹窗、狼人杀桌面不因字体切换改变结构。
- 字体性能可控，首屏不会下载无用的 Thin / Light / Italic。

### 布局冻结 checklist

- [ ] 改字体前完成关键页面移动端截图基线。
- [x] 字体接入提交中没有修改页面 `max-w-*`、`grid-cols-*`、`gap-*`、`px-*`、`w-*`、`h-*`、`aspect-*`。
- [x] 字体接入提交中没有修改 `.app-mobile-page-shell`、底部导航高度、bottom sheet 高度。
- [x] 字体接入提交中没有修改活动图片、头像、狼人杀卡牌和桌面背景尺寸。
- [x] `:root --font-sans` 与 iOS WebView 字体栈统一。
- [x] Plus Jakarta Sans 覆盖英文、法文、数字和 ASCII 标点。
- [x] HarmonyOS Sans SC 覆盖中文、中文标点和常见 CJK。
- [ ] 高频页面的 `font-black` / `font-extrabold` 已完成试点降重。
- [ ] 320px 宽度下按钮文字、底部导航、搜索框 placeholder 没有裁切。
- [ ] 活动卡、Profile 卡、通知卡、聊天气泡没有新增横向滚动。
- [ ] 狼人杀房号、座位名、角色名没有因为字体切换被遮挡。
- [ ] 如有任何非字体布局改动，已在文档中单独标注为“布局例外”并说明原因。

可用下面的命令辅助检查是否误动布局类。如果有输出，需要逐条确认是否属于必要例外：

```bash
git diff -U0 -- apps/web | rg "max-w-|grid-cols|gap-|space-|px-|pl-|pr-|w-\\[|h-\\[|min-w-|min-h-|aspect-|rounded-|app-mobile-page-shell|bottom sheet|mobile-nav"
```

## 字体加载方案

### 推荐方案：CSS `@font-face` + `unicode-range`

由于字体已经放在 `public/font`，推荐先用 `globals.css` 接入：

```css
@font-face {
  font-family: "Friemi Latin";
  src: url("/font/Plus_Jakarta_Sans/PlusJakartaSans-FriemiLatin.woff2")
    format("woff2");
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-024F, U+1E00-1EFF;
}

@font-face {
  font-family: "Friemi CJK";
  src: url("/font/HarmonyOS_Sans_SC/HarmonyOS_Sans_SC_FriemiUI-Regular.woff2")
    format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+2E80-9FFF, U+F900-FAFF, U+3000-303F, U+FF00-FFEF;
}
```

然后：

```css
:root {
  --font-sans:
    "Friemi Latin", "Plus Jakarta Sans", "Friemi CJK", "HarmonyOS Sans SC",
    "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei",
    -apple-system, BlinkMacSystemFont, "SF Pro Text", ui-sans-serif, system-ui,
    sans-serif;
}

body {
  font-family: var(--font-sans);
  font-synthesis-weight: none;
  text-rendering: optimizeLegibility;
}
```

注意：

- `font-synthesis-weight: none` 可以避免浏览器乱造字重；P0 已配齐 CJK 400 / 500 / 600 / 700，其中 600 暂时映射到 Medium。
- HarmonyOS SC 文件很大；P1 已把首屏加载路径切到 UI 子集 WOFF2，后续如果新增大量中文 UI 文案，需要重新生成子集。
- `next/font/local` 也可用，但在当前结构中 CSS `@font-face` 更贴合 `public/font` 目录和 `unicode-range` 管理。

### 字重接入顺序

建议分阶段加载：

1. 第一阶段：Plus Jakarta variable 正体 + HarmonyOS Regular / Medium / Bold。
2. 第二阶段：如果仍需要重标题，再加入 HarmonyOS Black。
3. 暂不加载：HarmonyOS Thin / Light、Plus Jakarta Italic。

对应权重：

| CSS weight | Latin | CJK | 使用 |
| --- | --- | --- | --- |
| 400 | Plus Jakarta variable | HarmonyOS Regular | 正文 |
| 500 | Plus Jakarta variable | HarmonyOS Medium | 导航 / 按钮 |
| 600 | Plus Jakarta variable | HarmonyOS Medium 或 Bold | 小标题 |
| 700 | Plus Jakarta variable | HarmonyOS Bold | 大标题 |
| 800 / 900 | Plus Jakarta variable max / HarmonyOS Black | 特殊展示，慎用 |

## Design Token 建议

P2 已在 CSS 中定义语义 token，不强制一次性改所有组件：

```css
:root {
  --friemi-tracking-normal: 0;
  --friemi-text-display-1-size: 2rem;
  --friemi-text-display-1-line: 2.5rem;
  --friemi-text-display-1-weight: 700;
  --friemi-text-display-2-size: 1.75rem;
  --friemi-text-display-2-line: 2.25rem;
  --friemi-text-display-2-weight: 700;
  --friemi-text-title-1-size: 1.5rem;
  --friemi-text-title-1-line: 2rem;
  --friemi-text-title-1-weight: 600;
  --friemi-text-title-2-size: 1.25rem;
  --friemi-text-title-2-line: 1.75rem;
  --friemi-text-title-2-weight: 600;
  --friemi-text-body-1-size: 1rem;
  --friemi-text-body-1-line: 1.5rem;
  --friemi-text-body-1-weight: 400;
  --friemi-text-body-2-size: 0.875rem;
  --friemi-text-body-2-line: 1.375rem;
  --friemi-text-body-2-weight: 400;
  --friemi-text-caption-size: 0.75rem;
  --friemi-text-caption-line: 1.125rem;
  --friemi-text-caption-weight: 400;
  --friemi-text-overline-size: 0.6875rem;
  --friemi-text-overline-line: 1rem;
  --friemi-text-overline-weight: 500;
}
```

已增加的工具类：

```css
.friemi-display-1 {
  font-size: var(--friemi-text-display-1-size);
  font-weight: var(--friemi-text-display-1-weight);
  letter-spacing: var(--friemi-tracking-normal);
  line-height: var(--friemi-text-display-1-line);
}

.friemi-display-2 { ... }
.friemi-title-1 { ... }
.friemi-title-2 { ... }
.friemi-body-1 { ... }
.friemi-body-2 { ... }
.friemi-caption { ... }
.friemi-overline { ... }

.friemi-tabular {
  font-variant-numeric: tabular-nums;
}
```

原则：

- 新组件优先使用语义类或设计 token。
- 旧组件逐步替换 `text-[...] font-black leading-*`。
- 不新增负 tracking 工具类；截图里的 `-1%` / `-0.5%` 一律落地为 `letter-spacing: 0`。
- `font-latin` / `font-cjk` 只用于调试或极少数必须强制字体族的局部场景，常规组件继续使用 `font-sans`。

## 落地步骤

### P0：资源与基础接入

- [x] 删除 `apps/web/public/font/**/.DS_Store`。
- [x] 确认 HarmonyOS Sans SC license 文案保留在仓库中。
- [x] 确认 Plus Jakarta Sans OFL 文案保留在仓库中。
- [x] 在发布说明或第三方声明位置记录：Friemi 使用 HarmonyOS Sans SC 和 Plus Jakarta Sans。
- [x] 在 `globals.css` 增加 `@font-face`。
- [x] 把 `:root --font-sans` 改为 Plus Jakarta + HarmonyOS stack。
- [x] 移除或合并 `html[data-friemi-ios-app="true"]` 对 `--font-sans` 的独立覆盖，避免 iOS App 字体不一致。
- [x] 保留系统 fallback：`PingFang SC`, `Noto Sans SC`, `Microsoft YaHei`, `ui-sans-serif`, `system-ui`, `sans-serif`。

### P1：性能优化

- [x] 将 Plus Jakarta 和 HarmonyOS TTF 转为 WOFF2。
- [x] 对 HarmonyOS 做中文常用字子集，至少覆盖简中 UI 文案、常见标点和中英混排。
- [x] 用 DevTools / Playwright Network 验证首屏不会加载未使用的 Thin / Light / Italic。
- [x] 记录移动端 4G 下字体下载体积和 FCP 变化。

P1 性能记录：

| 指标 | P0 TTF | P1 WOFF2 UI 子集 | 变化 |
| --- | ---: | ---: | ---: |
| Latin 字体 | 173,760 B | 47,852 B | -72.46% |
| CJK Regular | 8,261,128 B | 172,564 B | -97.91% |
| CJK Medium | 8,227,312 B | 173,888 B | -97.89% |
| CJK Bold | 8,158,996 B | 174,480 B | -97.86% |
| 400/500/600/700 理论字体总量 | 24,821,196 B | 568,784 B | -97.71% |

隔离测试条件：

- 测试工具：Playwright + Chromium，移动 viewport 390x844，`deviceScaleFactor=3`。
- 网络模拟：150ms latency，1.6 Mbps download，750 Kbps upload。
- 测试文本：包含中文 UI 文案、英文、法文重音、数字、按钮、400 / 500 / 600 / 700 字重。
- P0 TTF 请求：Plus Jakarta TTF + HarmonyOS Regular / Medium / Bold TTF。
- P1 WOFF2 请求：Plus Jakarta WOFF2 + HarmonyOS FriemiUI Regular / Medium / Bold WOFF2。

隔离测试结果：

- P0 TTF 字体请求总量：24,821,196 B；P1 WOFF2 字体请求总量：568,784 B。
- P0 `first-contentful-paint`：约 220ms；P1 `first-contentful-paint`：约 224ms。由于使用 `font-display: swap`，FCP 基本不被字体阻塞。
- P0 `document.fonts.ready`：约 117.8s；P1 `document.fonts.ready`：约 2.7s。
- 本地真实页面 FCP 未记录：当前本地生产服务器访问 `/zh-CN/*` 页面时 Clerk key 配置触发 refresh token infinite redirect loop，页面无法稳定打开。预览环境修复/确认 Clerk 配置后，需要用真实 `/mobile-home`、`/activities`、`/profile` 复测一次。
- 构建产物静态检查已确认：`apps/web/.next/static/css` 只引用 `PlusJakartaSans-FriemiLatin.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Regular.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Medium.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Bold.woff2`，不引用 Thin / Light / Italic / Black 或原始 TTF。

### P2：字体 token

- [x] 增加 display / title / body / caption / overline token。
- [x] 增加数字工具类 `.friemi-tabular`。
- [x] 给 Tailwind `fontFamily` 增加 `latin` / `cjk` 可选项，仅用于特殊调试或局部强制。
- [x] 文档化“不使用负 letter-spacing”的项目规则。

P2 落地说明：

- token 与工具类目前只是新增能力，没有批量套用到现有页面，因此不会改变当前布局。
- `.friemi-*` 语义工具类放在普通全局 CSS 中，不放进 Tailwind `@layer utilities`，避免当前未被页面引用时在生产构建里被清理。
- 所有语义工具类都显式设置 `letter-spacing: var(--friemi-tracking-normal)`，当前值为 `0`。
- 数字密集位置后续可按需加 `.friemi-tabular`，例如 Friemi 币余额、魅力值、房号、桌号、倒计时、验证码。
- Tailwind `font-latin` / `font-cjk` 仅用于局部调试或强制字体族，不作为常规页面写法；它们会在组件实际引用对应 class 后由 Tailwind 生成。

### P3：高频页面试点

- [x] `/mobile-home`：首页问候语、搜索框、分类、Top News、热门聚吧。
- [x] `/activities`：搜索栏、筛选、活动卡片标题、时间状态、收藏按钮。
- [x] `/activities/new`：创建入口、活动预览卡。
- [x] `/lobby`：移动大厅、分类、活动详情 bottom sheet。
- [x] `/profile`：昵称、统计数字、关于、头像弹窗。
- [x] `/search`：用户结果、活动结果、空状态。
- [x] `/messages`：会话列表、聊天气泡、时间。
- [x] `/notifications`：通知标题、正文、按钮。
- [x] `/game-tools/werewolf`：模式选择、房间号、座位、法官视角。

P3 落地说明：

- 高频页面试点只修改字体权重和数字字体工具类；未改动 `px-*`、`gap-*`、`grid-*`、宽高、圆角、页面壳和 bottom sheet 布局。
- 页面主标题从 900 收敛到 700；按钮、chip、tab、通知操作、筛选项和小标签优先使用 600；未读数字、座位号、房号、魅力值、好友码等数字位置补 `.friemi-tabular` 或 700。
- 已覆盖首页、活动列表/详情/新建、聚吧大厅、Profile 自己页/别人页/关于/头像弹窗、搜索、消息列表/线程、通知中心、狼人杀模式页/房间桌面/QR/扫码加入/私有座位/法官视角。
- P3 不做全站 `font-black` 清零；狼人杀公开大屏、复盘页、测试机器人、Avalon/Storyteller 等主题或低频工具保留到 P4 批量审查。
- 验收期望：中英文混排更清爽，中文小字号不发黑，按钮文本仍完整，房号/座位号/统计数字不跳位，活动 bottom sheet 内部信息层级稳定。

### P4：全站收敛

- [x] 批量审查 `font-black`，保留必要场景，其余降级到 600 / 700。
- [x] 审查 `tracking-*`，中文文本不使用额外字距。
- [x] 审查 `text-[10px]` 以下文字，只保留角标类场景。
- [x] 审查按钮文字在 320px 宽度下是否完整显示。
- [x] 审查 Clerk 登录 UI 字体是否继承 `--font-sans`。

P4 落地说明：

- 全站批量降重后，`apps/web` 内已无 `font-black` / `font-extrabold`；主题页、游戏页、管理页也统一使用 600 / 700 建立层级。
- `uppercase tracking-*` 已统一改成 `uppercase tracking-normal`；剩余自定义 `tracking-[...]` 仅出现在 `.friemi-tabular` 的好友码、房间号、二维码 code 等编码内容。
- TS / TSX 中不再直接使用 `font-mono` / `tabular-nums`，统一通过 `.friemi-tabular` 表达数字稳定性。
- `text-[10px]` 以下保留在未读角标、头像角标、活动图角标、狼人杀 / Avalon 密集座位与复盘海报信息中；普通正文、按钮、导航、表单和卡片标题保持 10px 以上。
- Clerk 登录组件的 `appearance.variables.fontFamily` 已使用 `var(--font-sans)`，会继承 Friemi 全局字体栈。
- 320px 静态检查重点是“字体类不改变布局”：P4 没有改动页面壳、宽高、grid、gap、padding、圆角和 bottom sheet 结构；实际截图仍需在预览环境复核。

## 验收标准

### 视觉

- [x] 中文页面主要文字为 HarmonyOS Sans SC。
- [x] 英文 / 法文 / 数字为 Plus Jakarta Sans。
- [x] 中英混排标题基线稳定，不出现明显高低跳动。
- [ ] 首页、活动列表、Profile、搜索、消息、通知、狼人杀工具没有文字挤压或溢出。
- [ ] `font-black` 降重后仍有清晰层级，不丢失重点。

### 技术

- [x] `npm run typecheck --workspace=apps/web` 通过。
- [x] `npm test --workspace=apps/web` 通过或说明无关。
- [x] `npm run build --workspace=apps/web` 通过。
- [x] `git diff --check` 通过。
- [x] DevTools 中字体请求没有 404。
- [x] DevTools Elements > Computed > Rendered Fonts 显示中文命中 HarmonyOS Sans SC。
- [x] DevTools Elements > Computed > Rendered Fonts 显示英文 / 法文 / 数字命中 Plus Jakarta Sans。
- [x] 控制台执行 `getComputedStyle(document.body).fontFamily`，返回值以 Friemi 字体栈开头。
- [ ] iOS WebKit / Android WebView 字体一致。
- [x] 首屏不会加载 HarmonyOS Thin / Light / Italic。

P3 技术验证记录：

- `npm run typecheck --workspace=apps/web` 通过。
- `npm run build --workspace=apps/web` 通过；仍有既有 warning：活动编辑页 unused `t`、狼人杀卡面预览/分享图 `<img>`、`IntentPrefetchLink` hook dependency。
- `git diff --check -- apps/web docs/v2_7/global-font-management.md` 通过。
- `git diff --word-diff=porcelain -- apps/web` 的布局 token 扫描无实际布局变动；实际变动集中在字体权重、`.friemi-tabular` 和全局字体配置。
- P3 目标文件扫描无 `font-black` / `font-extrabold` / `tabular-nums` / `font-mono` 残留；狼人杀公开大屏、复盘页、测试机器人等低频主题页留到 P4。

P4 技术验证记录：

- `npm run typecheck --workspace=apps/web` 通过。
- `npm run build --workspace=apps/web` 通过；仍有既有 warning：活动编辑页 unused `t`、狼人杀卡面预览/分享图 `<img>`、`IntentPrefetchLink` hook dependency。
- `git diff --check -- apps/web docs/v2_7/global-font-management.md` 通过。
- `git diff --word-diff=porcelain -- apps/web` 的布局 token 扫描无实际布局变动；P4 仍只调整字体权重、字距和数字字体工具类。
- `apps/web` 扫描无 `font-black` / `font-extrabold` 残留。
- TS / TSX 扫描无 `font-mono` / `tabular-nums` 残留；`tabular-nums` 仅保留在全局 `.friemi-tabular` CSS 实现中。
- TS / TSX 扫描无 `uppercase tracking-[...]` / `uppercase tracking-wide` / `uppercase tracking-wider` / `uppercase tracking-widest` 残留。
- 剩余 `tracking-[...]` 均为 `.friemi-tabular` 的好友码、房间号、二维码 code 等编码场景。
- `npm test --workspace=apps/web` 通过，187 个测试全部通过。

P4 验收复查记录：

- 独立 320px 字体探针通过：中文实际渲染 `HarmonyOS Sans SC`，英文 / 数字 / 法文重音实际渲染 `Plus Jakarta Sans`，混排探针无明显基线跳动。
- 字体请求复查通过：`PlusJakartaSans-FriemiLatin.woff2`、`HarmonyOS_Sans_SC_FriemiUI-Regular.woff2`、`Medium.woff2`、`Bold.woff2` 均返回 200。
- 四个生产 WOFF2 字体文件 `Content-Length` 合计 568,784 B；探针首屏实际加载 Latin + CJK Regular + CJK Bold，未加载未使用字重。
- `getComputedStyle(document.body).fontFamily` 探针返回值以 `"Friemi Latin", "Plus Jakarta Sans", "Friemi CJK"` 开头。
- 探针资源列表未加载 HarmonyOS Thin / Light / Italic；代码扫描也未发现生产 CSS / TSX 引用 Thin / Light / Italic。
- 独立探针 320px 下无横向溢出，按钮无文字溢出，CLS 为 0。
- 本地 `next start` 访问 `/zh-CN/mobile-home`、`/zh-CN/activities`、`/zh-CN/sign-in` 时触发 Clerk session token 无限重定向，原因是本地 Clerk publishable / secret key 不匹配；因此业务页面视觉、iOS WebKit / Android WebView 和真实页面 CLS 仍需在 Clerk 配置正常的预览环境复查后再勾。

### 性能

- [x] 移动端首屏字体总下载体积有记录。
- [x] 字体加载使用 `font-display: swap`，页面不白屏等字。
- [ ] 字体切换时 CLS 可接受，关键按钮和导航不跳位。

## 风险与处理

| 风险 | 表现 | 处理 |
| --- | --- | --- |
| HarmonyOS TTF 太大 | 首屏下载慢 | 转 WOFF2，做子集，只加载 400/500/700 |
| `font-black` 过多 | 中文发黑、拥挤 | 高频页面优先降到 600/700 |
| iOS 覆盖字体 | App 和浏览器不一致 | 合并 iOS `--font-sans` 到统一 stack |
| 法文重音缺字 | 法语页面 fallback 跳动 | 验证 Plus Jakarta Latin Extended 覆盖 |
| 中英文标点混乱 | 逗号、括号风格不一致 | ASCII 标点用 Latin，全角标点用 CJK unicode-range |
| Clerk 组件不继承 | 登录页字体突兀 | 保持 Clerk appearance 使用 `var(--font-sans)` |
| 字体版权遗漏 | 发布合规风险 | license 文件保留，文档注明来源和限制 |

## 建议实现顺序

1. 先完成 `@font-face` + 全局 `--font-sans`，只加载 400/500/700。
2. 用 `/mobile-home`、`/activities`、`/profile` 三个页面截图对比。
3. 再调整 `MobileNav`、按钮、活动卡片、Profile 头部这些高频组件字重。
4. 再做 WOFF2 / subset，保证生产性能。
5. 最后批量清理 `font-black` 和不必要 tracking。

## 需要保留的设计判断

- 字体不是单纯替换文件；它会改变页面密度、按钮宽度、卡片标题换行和中文重量。
- Friemi 应该保持“友好、清爽、可信”的阅读气质，不走过重、过窄或科技感太强的方向。
- 截图里的体系可作为方向，但项目实现必须适配现有移动端约束：不使用负字距、不用视口缩放字体、优先保证 320px 宽度可读。
