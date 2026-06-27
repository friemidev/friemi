# v2.1 全站品牌风格与 Logo 大整改规划

## 分支

```text
feature/v2-1-brand-style-overhaul
```

本分支目标先做品牌视觉规划和素材规范，不直接动页面代码。后续实施时再按阶段拆小提交，避免一次性改动 header、footer、卡片、详情页、后台和分享图导致回归难排查。

## 已查看素材

### `apps/web/public/logo.png`

尺寸：`1766 x 1811`，RGBA 透明图。

定位：v2.1 最终主 logo，也是这次全站品牌整改的视觉核心。

视觉判断：

- 这是更强识别度的新主视觉：大面积 Friemi 绿、珊瑚粉人物、奶白人物，整体更年轻、社交、亲近。
- 当前文件画布留白较大，如果直接作为 header / favicon / loading 小图使用，会有“图标显得小”的风险。
- 适合作为主 app icon、移动端品牌锚点、PWA icon、loading fallback、空状态小图，但需要先产出裁切后的标准版本。

建议定位：

- 主品牌 icon。
- 小尺寸场景必须用裁切版，不直接用原始大画布。

### `apps/web/public/logo_ancient3.png`

尺寸：`1254 x 1254`，RGBA 透明图。

定位：过去式资产，不进入 v2.1 新品牌系统。

视觉判断：

- 这是偏旧版 / 经典版的双人心形符号，深蓝 + 珊瑚渐变，比新 `logo.png` 更克制，但和新绿色系统不是同一种视觉语言。
- 如果和新绿色 icon 同时在 header、footer、卡片、loading 里混用，会让用户感觉品牌没有确定下来。

建议定位：

- 不作为全站主 logo。
- 不进入 header、footer、favicon、loading、分享图和空状态。
- 仅作为历史文件保留或后续清理对象。

### `apps/web/public/bg_mobile.PNG`

尺寸：`1206 x 2622`，RGB 竖版背景。

定位：v2.1 移动端品牌背景母版，也是新风格的第二个核心资产。

视觉判断：

- 这是一个很强的移动端品牌容器：深绿外框、内部大圆角浅绿到珊瑚到奶黄渐变。
- 它很适合做移动端首屏、登录页、空状态、海报、引导页的背景框架。
- 不适合直接拉伸到桌面端大屏，否则会出现手机壳式比例和大片空白，网页端会显得不自然。

建议定位：

- 移动端品牌背景母版。
- 桌面端需要单独派生横版背景，不要直接复用这张竖图。

## 核心视觉方向

建议把 v2.1 品牌方向定为：

```text
温暖社交感 + 绿色品牌框架 + 奶油纸面 + 珊瑚行动色
```

关键词：

- 绿：品牌识别、导航锚点、移动端背景框架
- 奶油白：页面主体、卡片、表单、阅读区域
- 珊瑚粉：主按钮、重点状态、报名 / 发起动作
- 深蓝 / 深墨：文字、图标、管理类信息密度
- 沙金边框：分割线、卡片边框、弱强调

避免：

- 全站都铺满高饱和绿色，容易疲劳。
- 同时混用新绿色 icon 和旧蓝红心形 icon。
- 把 `bg_mobile.PNG` 拉伸到桌面端。
- 每个页面都用大面积渐变，活动和组局内容会被背景抢走。

## 网页端与移动端如何融合

### 共享的品牌语言

网页端和移动端应该共享这些基础 token：

```text
brand green      主品牌识别色
warm coral       主行动色 / 重点状态
cream paper      页面底色 / 卡片底色
deep ink         正文和图标
sand border      边框和弱分割
soft glow        轻微阴影和浮层
```

共享的是颜色、图标策略、圆角层级、按钮语义和状态语义，不强行共享布局。

### 移动端策略

移动端更适合“品牌壳 + 内容卡片”的结构：

- 顶部 header 使用裁切后的新 icon，小而清楚，不挤压搜索、语言和登录按钮。
- 可在首页、登录页、空状态、共创页首屏使用 `bg_mobile` 的绿色框架感。
- 列表页不要整屏都铺 `bg_mobile`，否则卡片内容会变重；更适合使用浅奶油背景 + 局部绿色 header / section band。
- 底部导航保留纸面感，选中态使用珊瑚粉或品牌绿，但不要两个高饱和色同时抢。
- 移动端 CTA 需要更轻，避免每张卡片都出现大面积彩色按钮。

适合优先整改：

- mobile header
- bottom nav
- home / co-creators 首屏
- 活动大厅 / 组队大厅顶部筛选区
- 空状态、loading、登录引导

### 网页端策略

网页端不应该把移动端背景横向拉伸，而是做“高级纸面 + 品牌色边界”：

- 页面主体继续使用温暖纸色，而不是纯白。
- 顶部 header 可以有轻微绿色或奶油底，但要保持信息密度。
- 大屏使用横向品牌 band、左侧品牌 rail、卡片顶部细线、section 背景层次来融入绿色。
- 列表页保留内容优先，不做过重装饰；品牌感来自统一边框、按钮、badge、hover、空状态。
- 首页 / 共创页可以更强视觉，后台和数据页要更克制。

适合优先整改：

- desktop header / footer
- 首页和共创页的收口统一
- 活动大厅 / 组队大厅卡片与筛选区
- 详情页 hero / 操作区 / 分享区
- loading、错误页、空状态

## Logo 使用策略

### 主 icon

使用 `logo.png` 的裁切版。`logo_ancient3.png` 不再参与新品牌系统。

要求：

- 透明背景
- 去掉多余画布留白
- 方形安全区清楚
- 32px、40px、48px 下仍能看清人物形态

### 横向 lockup

当前第一轮接入使用 v2.1 icon + 文本 wordmark；仍保留横向 lockup 素材，方便后续在分享图、海报和更强品牌露出区域统一比例。

需要两版：

- 深色文字版：用于浅色 header / footer / 普通页面
- 白色文字版：用于深色 hero / 海报 / 暗色 footer

### Favicon / App Icon

不要直接使用原始 `logo.png`。必须使用专门裁切、压缩、对齐的小尺寸 icon。

需要覆盖：

- favicon
- apple touch icon
- manifest 192 / 512
- loading fallback
- 分享缩略图兜底

## 页面整改顺序

### Phase 1：品牌资产与 token

目标：先确立品牌资产和基础变量，避免后续页面一边改一边猜。

- 建立 `apps/web/public/brand/v2_1/`
- 放入标准化 logo、lockup、背景、分享图
- 更新 `brand.ts` 中的路径规划
- 在 `globals.css` 或 tailwind token 中沉淀品牌色
- 定义按钮、badge、card、surface 的基础语义

### Phase 2：全局壳层

目标：让用户从任何页面进入都先看到统一品牌。

- `AppHeader`
- `MobileNav`
- `HomeFooter`
- `BrandLoader`
- favicon / manifest / metadata
- 登录页、错误页、loading-test

### Phase 3：首页 / 共创页

目标：把最强品牌感放在品牌入口页。

- 首页使用移动端背景框架或其派生版本
- 共创页与首页统一视觉语言
- 桌面端增加横版背景或品牌 band
- CTA、section title、图片遮罩统一

### Phase 4：核心内容页

目标：让活动和组局内容在新品牌下仍然清楚好读。

- 活动大厅
- 组队大厅
- 搜索页
- 活动 / 组局详情页
- 个人主页

这些页面要控制装饰强度，避免品牌背景抢内容。

### Phase 5：系统状态与运营页

目标：把旧样式残留清干净。

- 空状态
- 错误状态
- toast
- 弹窗 / drawer
- 上传封面弹窗
- 后台页面
- 分享海报和 OG 图

后台页面只需要统一 token，不要做强视觉装饰。

## 需要补充 / 规范化的素材

建议全部放到：

```text
apps/web/public/brand/v2_1/
```

## 已生成素材

已基于最终资产 `apps/web/public/logo.png` 和 `apps/web/public/bg_mobile.PNG` 生成第一版标准素材，存放在：

```text
apps/web/public/brand/v2_1/
```

生成方式：

- 不使用 AI 重新绘制 logo。
- 对 `logo.png` 做透明区域裁切、尺寸归一和不同场景导出。
- 对 `bg_mobile.PNG` 保留移动端母版，并用同一组颜色与圆角语言派生桌面横版背景。
- 横向 lockup 和文字 wordmark 使用当前图标 + 系统字体合成，属于第一版可用素材；如果后续有正式 Friemi 字标，应替换。

| 文件名 | 尺寸 | 用途 | 状态 |
|---|---:|---|---|
| `friemi-icon-square-1024.png` | 1024x1024 | app icon 母版 / 大尺寸品牌图 | 可用 |
| `friemi-icon-transparent-512.png` | 512x512 | header、loading、空状态基础 icon | 可用 |
| `friemi-icon-apple-180.png` | 180x180 | Apple touch icon | 可用 |
| `friemi-icon-pwa-192.png` | 192x192 | PWA manifest icon | 可用 |
| `friemi-icon-pwa-512.png` | 512x512 | PWA manifest icon | 可用 |
| `friemi-bg-mobile-frame.png` | 1206x2622 | 移动端背景母版 | 可用，来自最终 `bg_mobile.PNG` |
| `friemi-bg-desktop-wide.png` | 2560x1440 | 桌面端大背景派生版 | 第一版，需要页面里试效果 |
| `friemi-bg-desktop-soft-band.png` | 2400x900 | 列表页 / section 顶部品牌 band | 第一版，需要页面里试效果 |
| `friemi-title-navy.png` | 512x160 | 兼容旧 title 图片调用的文字 wordmark | 第一版，占位字标 |
| `friemi-lockup-horizontal-navy.png` | 1200x360 | 浅色 header / footer 横向 lockup | 第一版，占位字标 |
| `friemi-lockup-horizontal-white.png` | 1200x360 | 暗色 hero / 海报横向 lockup | 第一版，占位字标 |
| `friemi-og-default-1200x630.png` | 1200x630 | 默认分享图 | 第一版，可先接入 |
| `friemi-empty-state-mark.png` | 512x512 | 空状态插图 | 可用 |
| `friemi-loading-mark.webp` | 320x320 | 静态 loading fallback | 可用 |

## Phase 1 / Phase 2 第一轮接入状态

已完成：

- `apps/web/lib/brand.ts` 切换到 v2.1 品牌资产路径。
- `apps/web/app/layout.tsx` 使用新 favicon、Apple icon 和默认 Open Graph 图。
- `apps/web/app/manifest.ts` 新增 PWA manifest，使用 192 / 512 icon。
- `apps/web/app/icon.png` 和 `apps/web/app/apple-icon.png` 已替换为新品牌图导出。
- `BrandLoader` 通过 `brand.loadingImagePath` 使用新 `friemi-loading-mark.webp` 静态 fallback。
- `AppHeader` 使用新 icon + 文本 wordmark，不再依赖旧 `title.png`。
- `HomeFooter` 使用新 icon + 文本 wordmark，并切换为品牌深绿底色。
- `brand.titleImagePath` 改为 v2.1 文字 wordmark，兼容仍需要图片字标的页面和分享海报。
- `MobileNav` 完成 v2.1 试点：实色奶油底、品牌绿选中态、珊瑚主入口，并保留原 5 栏结构。
- 全局 `body` 背景和 Tailwind `paper` / `sand` 语义色从旧米棕纸面调整为浅绿奶油调。
- 全局 `coral`、`team-bg`、`team-border`、`moss`、`clay` 等语义色已收敛到 v2.1 绿 / 奶油 / 珊瑚系统。
- 活动 / 组局卡片完成第一轮品牌统一：卡片边框、顶部状态条、徽章、报名按钮、复制按钮和无图 fallback 不再使用旧橙棕系统。
- 搜索、分页、导航进度条、详情页 CTA、分享 / 复制浮层、日期视图控件完成第一轮品牌色统一。
- `EmptyState` 共享组件接入新品牌 icon 和绿色行动按钮。
- `RouteErrorState` 共享组件接入新品牌 icon 和更克制的错误状态。
- 组局微信 / 社交分享动态图 API 的品牌 lockup 从旧 `friemi-logotitle.png` 切到 v2.1 lockup。
- Tailwind 和全局 CSS 增加 v2.1 品牌 token。

本轮暂不改：

- 活动卡片、组队卡片、详情页、搜索页、个人主页等内容页视觉。
- 分享海报 canvas 内的品牌绘制逻辑。
- 共创页和首页的页面级背景接入。

### 必需素材

| 文件名 | 尺寸 / 格式 | 用途 | 说明 |
|---|---:|---|---|
| `friemi-icon-square-1024.png` | 1024x1024 PNG | app icon 母版 | 基于新 `logo.png` 裁切，去掉多余透明留白，保留安全边距 |
| `friemi-icon-transparent-512.png` | 512x512 PNG | header / loading / 空状态 | 透明背景，只保留图标主体，不要大绿底外框 |
| `friemi-lockup-horizontal-navy.png` | 约 1200x360 PNG | 浅色 header / footer | icon + Friemi 字标完整组合，深蓝文字 |
| `friemi-lockup-horizontal-white.png` | 约 1200x360 PNG | 暗色 hero / 海报 | icon + Friemi 字标完整组合，白色文字 |
| `friemi-bg-mobile-frame.png` | 1206x2622 PNG | 移动端背景母版 | 由最终资产 `bg_mobile.PNG` 规范命名复制而来 |
| `friemi-bg-desktop-wide.png` | 2400x1400 或 2560x1440 PNG/JPG | 桌面端背景母版 | 需要从 `bg_mobile` 视觉派生横版，不要拉伸手机图 |
| `friemi-og-default-1200x630.png` | 1200x630 PNG/JPG | 默认分享图 | 包含新版 logo、品牌色和简短品牌语，不能只放空白 logo |

### 建议素材

| 文件名 | 尺寸 / 格式 | 用途 | 说明 |
|---|---:|---|---|
| `friemi-icon-apple-180.png` | 180x180 PNG | Apple touch icon | 从 square icon 导出 |
| `friemi-icon-pwa-192.png` | 192x192 PNG | manifest icon | 从 square icon 导出 |
| `friemi-icon-pwa-512.png` | 512x512 PNG | manifest icon | 从 square icon 导出 |
| `friemi-bg-desktop-soft-band.png` | 2400x900 PNG/JPG | 列表页顶部品牌 band | 更克制的桌面背景，不要太强渐变 |
| `friemi-empty-state-mark.png` | 512x512 PNG | 空状态插图 | 可用透明 icon + 柔和底影 |
| `friemi-loading-mark.webp` | 320x320 WEBP/GIF | loading | 如果不做动图，先用静态透明 icon |

## 当前素材是否足够开工

现在已经足够开始 Phase 1 和 Phase 2：

- 品牌 token
- header / footer 结构规划与第一版替换
- 移动端背景试点
- logo 路径整理
- favicon / PWA icon 第一版替换
- loading fallback 第一版替换
- 默认 OG 图第一版替换
- 页面审计清单

仍建议后续精修的部分：

- 横向 lockup：当前是系统字体合成，占位可用，但正式品牌最好换成专门 wordmark。
- 桌面端大背景：已有第一版派生图，但必须在首页、共创页、列表页实测后再决定是否保留。
- 分享图文案：当前默认 OG 图是中英双语通用文案，后续可以按 locale 或页面类型派生。

## 已确认决策

- `logo.png` 是 v2.1 最终主 logo。
- `bg_mobile.PNG` 是 v2.1 移动端最终背景方向。
- `logo_ancient3.png` 和其他旧 logo 都是过去式，不进入新品牌整改目标。

## 仍需确认的问题

1. 桌面端是否希望走“绿色品牌框架”还是“奶油纸面 + 少量绿色边界”的克制方向？
2. 后续是否会提供正式 Friemi 字标文件，用来替换当前系统字体合成的 wordmark / lockup？

## 验收方式

实施阶段建议每次至少检查：

- 390px 移动端 header、bottom nav、首页、活动大厅、组队大厅、详情页
- 1280px 桌面端 header、footer、首页、活动大厅、组队大厅、详情页
- favicon / PWA icon / loading / 空状态是否统一
- 中文、英文、法语长文案是否被新 logo 或按钮挤压
- 新旧 logo 是否混用
