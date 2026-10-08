# Friemi UI 开发准则

本文件用于后续全站 UI 开发。品牌事实与色值以 [v2.1 品牌规划](v2_1/brand-style-overhaul-plan.md)、`apps/web/app/globals.css`、`apps/web/tailwind.config.ts` 和 `apps/web/lib/brandPalette.ts` 为准。页面改动应沿用现有品牌，不再建立一套平行的绿色、灰色或字体。

## 页面结构

- 操作型页面先显示当前对象和主要任务：例如店铺身份、票券批次、优惠券状态。主要操作应在首屏可找到。
- 设置页按用户心智分组；列表、编辑和历史各有明确入口。返回按钮指向确定的上一级路由，不依赖浏览器历史。
- 同一信息只展示一次。避免页眉、副标题、卡片标题和说明重复表达同一件事。
- 优先用一块内容面和行间距建立层级；只在分隔不同任务时使用边框。不要把每个字段、指标和操作分别装进卡片。
- 创建次要内容使用渐进展开；现有对象、状态和主要操作始终直接可见。

## 视觉与组件

- 新组件使用 Tailwind 语义色 `forest`、`meadow`、`paper`、`fog`、`sand`、`ink`、`coral`、`danger`，不要新增近似的十六进制色值。现有 `paper` 的 CSS 值与旧规划文档略有不同，不能为统一文档而直接修改全站变量。
- 标题、正文和辅助信息靠字号、字重与间距区分。白底小号正文使用 `ink/70` 或更深；`outline` 只用于弱图标、禁用状态等不承担主要阅读的内容。
- 每个区域最多一个明显的主按钮。危险、次要和导航操作使用各自语义，不用同样的强调色。
- 表单保留可见标签、字段旁错误、提交中的禁用状态以及成功反馈。图标按钮需要可访问名称，键盘焦点必须可见。
- 触控目标至少 44×44 px。输入框用至少 16 px 字体，移动端遵守安全区、动态视口和既有底部导航空间。
- 手机与桌面共享颜色、文字和状态语义；当结构需要不同顺序时，按 [响应式拆分规则](v2_1/responsive-style-split-guidelines.md) 分开布局。

## 业务约束

- 物品背包与商城送礼是不同流程。后台的票券分发、用户背包赠送和店家优惠券发布不能用同一个泛化入口代替。
- 管理员票券页按“选批次 → 核对库存与可赠送状态 → 找到账户 → 填数量分发 → 看历史”组织；不能为了排版隐藏分发操作。
- 店家优惠券页按“当前店铺 → 发布/核销 → 查看现有券与状态”组织，保留已有发布、下架、扫码和统计行为。
- 面向用户的多语言页面覆盖简体中文、英语、法语，新增可见文字进入对应的多语言文案。现有仅中文的管理后台可逐页迁移，不因单次视觉调整强制重写整条流程。

## 验证

- 检查正常、空数据、加载、成功、失败状态。至少查看 390 px 手机和 1280 px 桌面截图，并排查横向溢出。
- 用键盘检查导航、筛选、表单与弹窗焦点；用浏览器操作验证主要流程，而不只依赖构建成功。
- 视觉验证使用测试数据或只读数据，不为截图向预览数据库写入业务记录。

设计参考： [Impeccable](https://github.com/pbakaus/impeccable)、[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)、[Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)、[Mobile Native](https://github.com/emilkowalski/skills/tree/main/skills/mobile-native)。[Prototype](https://github.com/emilkowalski/skills/tree/main/skills/prototype) 用于明确要求比较多个方案的探索；日常页面整改直接实施并验证。浏览器验证采用 [Playwright](https://github.com/openai/skills/tree/main/skills/.curated/playwright)。
