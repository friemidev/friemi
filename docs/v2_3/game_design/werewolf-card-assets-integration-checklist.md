# 狼人杀卡牌正反面视觉接入 Checklist

> 文档版本：v0.1
> 生成日期：2026-07-07
> 适用阶段：v2.3 狼人杀 UI 拓展优化
> 目标：把狼人杀正面角色卡和背面座位卡接入开局后的身份展示、法官视图、结算和复盘页面

---

## 1. 资源约定

当前资源目录：

```text
apps/web/public/game-tools/werewolf
```

正面角色卡：

```text
apps/web/public/game-tools/werewolf/recto/{role}_{locale}.png
```

背面座位卡：

```text
apps/web/public/game-tools/werewolf/verso/{seatNumber}.png
```

当前只有英文版正面卡，因此所有语言先使用 `_en.png`：

```text
cupid_en.png
guard_en.png
hunter_en.png
idiot_en.png
knight_en.png
lovers_en.png
seer_en.png
villager_en.png
werewolf_en.png
white_wolf_king_en.png
witch_en.png
wolf_king_en.png
```

背面卡为数字牌，不需要区分语言：

```text
1.png
2.png
...
12.png
```

## 2. 接入原则

- 狼人杀仍然是线下游戏辅助工具，不把 UI 做成完整线上游戏。
- 玩家默认看到背面卡，点击后短暂显示正面角色卡。
- 从背面切到正面前必须二次确认，避免误触泄露身份。
- 从正面切回背面不需要确认，必须快速、直接。
- 法官视图可以看到所有玩家角色卡缩略图。
- 死亡状态不能暴露死因，只表达“该玩家已出局”。
- 当前三语都 fallback 到英文正面卡。
- 后续新增中文、法语卡面时，只扩展资源和 helper，不重写页面逻辑。
- 图片缺失时必须有兜底，不让页面报错或空白。

## 3. 技术 Checklist

### 3.1 资源命名

- [x] 将旧 `mafia` 目录改为 `werewolf`
- [x] 将狼人杀主图改为 `werewolf.jpeg`
- [x] 将正面角色卡统一为 `{role}_en.png`
- [x] 保留背面数字牌 `1.png` 到 `12.png`
- [ ] 后续新增中文正面卡 `{role}_zh-CN.png`
- [ ] 后续新增法语正面卡 `{role}_fr.png`

### 3.2 图片 helper

- [ ] 新增 `getWerewolfRoleCardImage(roleKey, locale)` helper
- [ ] 新增 `getWerewolfSeatBackImage(seatNumber)` helper
- [ ] 当前所有 locale fallback 到 `_en.png`
- [ ] 未来优先读取当前语言资源，不存在时 fallback 到 `_en.png`
- [ ] 为未知角色提供默认正面图或文字卡兜底
- [ ] 为越界座位号提供默认背面图兜底

建议路径：

```text
apps/web/features/game-tools/werewolfCardAssets.ts
```

建议输出：

```ts
getWerewolfRoleCardImage("seer", "zh-CN")
// /game-tools/werewolf/recto/seer_en.png

getWerewolfSeatBackImage(7)
// /game-tools/werewolf/verso/7.png
```

### 3.3 玩家私密身份页

- [ ] 未发身份时显示背面卡或等待状态
- [ ] 已发身份但未翻开时显示当前座位号背面卡
- [ ] 点击“查看我的角色”后先弹出确认，确认后才翻到正面角色卡
- [ ] 从正面切回背面不弹确认，点击后立刻盖回
- [ ] 正面显示 2 秒后自动翻回背面
- [ ] 玩家可以重复点击查看
- [ ] 死亡后卡牌从彩色过渡到灰色 / 黑白状态
- [ ] 死亡后保留背面 / 正面翻牌规则，不因为死亡泄露身份
- [ ] 结算后可显示角色正面卡和胜负状态

重点页面：

```text
apps/web/features/game-tools/components/WerewolfPrivateSeatCard.tsx
```

### 3.4 死亡动效

- [ ] 法官点击“标记死亡”时仍需要确认，避免误操作
- [ ] 法官确认天亮 / 确认死亡状态后，对应玩家端触发死亡动效
- [ ] 死亡动效使用通用视觉，不区分狼刀、毒药、猎枪、投票或其他死因
- [ ] 动效可以包含短暂震动，但必须检测浏览器支持
- [ ] 动效可以包含短音效，但默认应克制，避免打断线下主持
- [ ] 震动和音效失败时不影响死亡状态更新
- [ ] 动效结束后，玩家卡片固定为灰色 / 黑白状态
- [ ] 法官页、房间页、公共屏和复盘页使用同一套死亡视觉语言
- [ ] 死亡文案只使用“你已出局 / 已出局 / 死亡”等通用表达
- [ ] 不出现“被狼人击杀”“被毒死”“被带走”等会泄露死因的表达

建议实现：

```text
视觉：卡牌轻微震动 -> 暗色遮罩 -> 彩色逐渐变灰
触觉：navigator.vibrate([80, 40, 80])
声音：短促低音效，可后续再接入开关
```

重点页面：

```text
apps/web/features/game-tools/components/WerewolfPrivateSeatCard.tsx
apps/web/features/game-tools/components/WerewolfRoomOverview.tsx
apps/web/features/game-tools/components/WerewolfPublicScreen.tsx
apps/web/features/game-tools/components/WerewolfRecapView.tsx
```

### 3.5 法官视图

- [ ] 法官页玩家列表显示角色缩略图
- [ ] 未开局前不显示角色图
- [ ] 开局后显示所有玩家角色正面缩略图
- [ ] 死亡玩家角色卡置灰
- [ ] 标记死亡 / 取消死亡按钮不遮挡角色图
- [ ] 标记死亡只记录“死亡状态”，不记录公开死因
- [ ] 移动端法官页仍保持可快速操作

重点页面：

```text
apps/web/features/game-tools/components/WerewolfPrivateSeatCard.tsx
apps/web/features/game-tools/components/WerewolfRoomOverview.tsx
```

### 3.6 房间页

- [ ] 普通房间页不开局前只展示座位状态
- [ ] 已结束后可展示角色缩略图
- [ ] 玩家身份不在公开房间页提前泄露
- [ ] 当前用户的“身份页”入口保持明显

重点页面：

```text
apps/web/features/game-tools/components/WerewolfRoomOverview.tsx
```

### 3.7 公共屏

- [ ] 公共屏默认不展示私密角色
- [ ] 游戏结束后可以展示所有角色卡
- [ ] 死亡状态用灰度、透明度或角标表达
- [ ] 死亡状态不显示死因
- [ ] 大屏布局不依赖大量文字说明

重点页面：

```text
apps/web/features/game-tools/components/WerewolfPublicScreen.tsx
```

### 3.8 复盘页

- [ ] 复盘玩家列表展示座位号、昵称、角色卡、阵营、胜负
- [ ] 使用角色卡减少文字密度
- [ ] 胜负结果用颜色和图标表达
- [ ] 复盘页默认只显示死亡状态，不展示死因字段
- [ ] 保持移动端单列可读

重点页面：

```text
apps/web/features/game-tools/components/WerewolfRecapView.tsx
```

## 4. 多语言策略

当前阶段：

```text
zh-CN -> *_en.png
en    -> *_en.png
fr    -> *_en.png
```

未来阶段：

```text
zh-CN -> *_zh-CN.png，不存在则 *_en.png
en    -> *_en.png
fr    -> *_fr.png，不存在则 *_en.png
```

Checklist：

- [ ] helper 中集中处理语言 fallback
- [ ] 页面组件不直接拼图片路径
- [ ] 新增语言卡面时不需要修改业务组件
- [ ] 缺失资源在本地开发时容易发现

## 5. 移动端体验 Checklist

- [ ] 卡牌使用固定比例，避免图片加载后布局跳动
- [ ] 翻牌按钮足够大，适合单手点击
- [ ] 底部导航不遮挡卡牌和主按钮
- [ ] 卡面不被裁切到看不清角色名
- [ ] 横向不会溢出
- [ ] 死亡、胜利、失败动画不遮挡系统级返回和导航
- [ ] WebView 和移动浏览器表现一致

## 6. 验收 Checklist

- [ ] 创建狼人杀房间
- [ ] 玩家入座
- [ ] 全员准备
- [ ] 法官发身份
- [ ] 玩家身份页默认显示背面卡
- [ ] 玩家点击查看角色时需要确认
- [ ] 玩家确认后显示正面角色卡
- [ ] 玩家点击盖回背面时不需要确认
- [ ] 2 秒后自动翻回背面
- [ ] 法官可以看到所有角色缩略图
- [ ] 法官可以标记死亡 / 取消死亡
- [ ] 法官确认死亡后，对应玩家端出现通用死亡动效
- [ ] 死亡动效不暴露死因
- [ ] 死亡玩家卡牌从彩色变成灰色 / 黑白色
- [ ] 支持震动或音效时可以触发，不支持时不影响流程
- [ ] 法官结束游戏
- [ ] 玩家看到胜负和角色卡
- [ ] 复盘页显示角色卡
- [ ] 公共屏不提前泄露私密身份
- [ ] `npm run typecheck --workspace=apps/web` 通过
- [ ] `npm run test --workspace=apps/web` 通过
- [ ] `git diff --check` 通过
