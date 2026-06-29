# v2.1 移动端 / 网页端样式拆分规则

## 目标

v2.1 开始，复杂页面不要继续只靠一套 DOM 加大量 Tailwind breakpoint 同时服务移动端和网页端。移动端和网页端的空间、阅读节奏、触控方式和信息密度不同，布局应该允许分开演进。

## 先拆哪些

优先拆这些页面或模块：

- 首页、活动大厅、组队大厅、搜索、详情页、个人空间
- 首屏结构差异很大的页面
- 移动端需要双列 / 折叠 / 底部浮层，桌面端需要横向筛选 / 多列栅格的页面
- 已经出现大量 `sm:`、`md:`、`lg:` 串联并互相影响的组件

## 推荐结构

页面级试点优先使用：

```text
Page
├─ MobileLayout
├─ DesktopLayout
└─ SharedAtoms / SharedData
```

约定：

- `MobileLayout` 只负责移动端 DOM 和布局节奏
- `DesktopLayout` 只负责网页端 DOM 和布局节奏
- 共享的是 copy、数据、基础视觉 token 和小型 atom，不共享复杂布局
- 顶层允许用 `md:hidden` / `hidden md:block` 做 layout boundary
- layout 内部尽量少写跨端 breakpoint；如果还需要大量 breakpoint，说明拆得不够干净

## 组件入参

仍然需要跨端复用的组件，使用明确入参区分密度：

```tsx
<Component density="mobile" />
<Component density="desktop" />
```

`density` 应该控制：

- 卡片宽度
- 字号
- 图片比例
- 间距
- 操作按钮尺寸
- carousel / grid 的滑动或列数规则

不要让一个组件内部通过一长串 `basis-[...] sm:basis-[...] lg:basis-[...]` 承担所有端的布局责任。

## 共享内容

可以共享：

- 文案 copy
- 数据查询结果
- 颜色、字体、圆角、阴影等基础 token
- 小图标、基础按钮 atom、轻量 badge

不强行共享：

- 页面首屏结构
- 筛选器排列
- 卡片栅格列数
- 详情页信息顺序
- 移动端浮层和桌面端侧栏

## 当前试点

本轮先完成首页：

- `MobileLuxuryHome`：移动端单独控制首屏高度、价值卡密度、轮播密度和 IP 文案排布
- `DesktopLuxuryHome`：桌面端保留沉浸式 hero、横向图文叙事和多列 carousel
- `HomeActivityCarousel`：新增 `density="mobile" | "desktop"` 作为后续拆分入口；本试点先保持原有卡片宽度、字号和视觉参数不变

后续页面按同一规则推进，不把全站响应式重构塞进同一个 PR。
