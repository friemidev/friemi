# 原有玩家猫角色导出

这些是 Friemi 已实现的你画我猜角色，直接使用 React `renderToStaticMarkup` 渲染 `DrawGuessCatSprite`。没有重新绘制路径、替换为 emoji、改变配色或新建角色体系。它们是四个真实动画关键姿态的静态 SVG，供当前独立 HTML 骰子样机切换。

## 角色与样机映射

| 样机玩家 | 原角色 ID | 原角色名称 | 现有特征 |
| --- | --- | --- | --- |
| 我 | `cloud` | 云朵喵 / Cloud / Nuage | 奶油白、毛簇、蓬尾 |
| 桃桃 | `baker` | 面包喵 / Baker / Boulanger | 珊瑚粉贝雷帽与围裙、折耳、面包 |
| 小鹿 | `scholar` | 学者喵 / Scholar / Savant | 绿色衣服、蓝帽、方眼镜、书 |
| 猫猫 | `captain` | 船长喵 / Captain / Capitaine | 青蓝制服、皇冠、高耳、蓬尾 |

玩家昵称只是本骰子样机的映射，不会重命名原有角色。例如“桃桃”在这里选择的是 `baker`；源角色目录另外存在 `peach`（桃桃喵），两者不能混淆。

每个角色提供以下文件，其中 `{id}` 为上表角色 ID：

- `{id}-idle.svg`：等待，`mood="idle" activity="none" frame={0}`。
- `{id}-thinking.svg`：思考，`mood="idle" activity="thinking" frame={8}`，含抬爪与源组件的思考气泡。
- `{id}-happy.svg`：开心，`mood="happy" activity="none" frame={5}`，含源组件的跳起、笑脸和短线反馈。
- `{id}-sad.svg`：失落，`mood="sad" activity="none" frame={5}`，含源组件的垂耳、低落脸和泪滴。

`thinking` 是现有 `activity`，不是 `DrawGuessCatMood` 的合法值。其余三个是源组件真实的 mood；没有臆造新表情。文件亦提供同名 256×256 透明 PNG，便于预览。`contact-sheet.png` 在雾蓝背景上显示全部 16 个状态。

## 来源

完整源码仓库下：

- `apps/web/features/game-tools/drawGuessCats.ts`：15 个既有角色的 ID、简中/英/法名称及原始配色；`DrawGuessCatMood`、`getDrawGuessCatName`、`isDrawGuessCatId`。
- `apps/web/features/game-tools/components/DrawGuessCatSprite.tsx`：实际 SVG、每个角色的耳/尾/配饰、idle/happy/sad 动作、thinking activity。
- `apps/web/features/game-tools/components/DrawGuessLobby.tsx`：现有角色选择弹窗遍历 `DRAW_GUESS_CATS`，选择后保存当前玩家 `catId`；支持查看不同方向。
- `apps/web/features/game-tools/components/DrawGuessPet.tsx`：源组件的交互包装器，用于已有待机小动作和结果反应；它不是本次 SVG 导出的额外绘图来源。

`manifest.json` 记录实际来源路径、SHA-256、各文件的原组件 props、原有名称和配色。重新导出会读取当前源码，因此它不是永久冻结的角色设计副本。

## 导出处理与验证

固定 `direction="S"`、`size={120}`、`animated={false}`，明确选取 frame。`size=120` 使用原组件 full 细节分支。SVG 内部路径、渐变、阴影和姿态变换完整保留；仅外层改为共享的 `viewBox="-8 -18 136 136"` 和 136×136 固定尺寸，并加独立标题。留白用于容纳原组件跳起时超出原始 viewport 的帽子/皇冠与思考气泡，防止作为外部 `<img>` 时被裁切。所有状态共用地面锚点 `(68/136, 126/136)`，切换时无需重新定位。

React `identifierPrefix` 为每个角色/状态生成独立的渐变和剪裁引用，16 个 SVG 同时内联也不会互相引用。检查确认 16 张 PNG 外缘完全透明、所有 `url(#...)` 引用存在、所有 ID 唯一；并人工查看了 16 状态总览。验证记录在 `validation.json`。这属于资产导出验证，不声称已测试多人游戏或完成页面浏览器验收。

从仓库根目录重新导出：

```sh
node docs/v2_8/dice-design-preview/assets/cats/players/export.mjs
```

使用仓库已安装的 `esbuild`、`react`、`react-dom` 和 `sharp`，不联网。临时组件 bundle 在本目录生成并清除，所有写入仅发生在本目录。

## 正式应用复用建议

正式 React 游戏优先直接引用 `DrawGuessCatSprite`，持久化原角色 `catId`，按游戏状态映射 props，避免将本次静态副本变成第二套角色实现：

```tsx
<DrawGuessCatSprite
  animated
  catId={player.catId}
  direction="S"
  mood={result === "win" ? "happy" : result === "lose" ? "sad" : "idle"}
  activity={isChoosingBid ? "thinking" : "none"}
  size={64}
/>
```

结果到来时先清除思考 activity，再展示 happy/sad，避免同时表达冲突状态。原组件已处理减少动态偏好、页面隐藏和不可见暂停；`size <= 36` 进入 tiny 分支，不显示完整思考动作/气泡，关键行动状态宜使用更大的 sprite 或单独的文字状态。用户可见角色名称调用 `getDrawGuessCatName(catId, locale)`，入参用 `isDrawGuessCatId` 校验。若需要与大厅同款点击互动或庆祝反应，可在合适的等待/结算界面复用 `DrawGuessPet`；其当前接口不接收 thinking activity，不能直接用它代替行动中的 Sprite。
