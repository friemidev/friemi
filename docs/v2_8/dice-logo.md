# 摇骰子 Logo

用于游戏房间页，排在「你画我猜」入口下方。

- 成品：`apps/web/public/game-tools/dice/logo.webp`
- 尺寸：1254 × 1254，带透明 Alpha。
- 参考：`apps/web/public/game-tools/draw-guess/logo.png`。延续深蓝粗描边、蓝色 / 珊瑚色 / 黄色块、圆润手写字与弧线下划线。
- 内容：光泽奶油色骰子、倾斜骰盅、短促摇动线，以及唯一标题「摇骰子」。
- 制作方式：内置 `image_gen`；未使用 API / CLI 生成。`cwebp -q 92 -alpha_q 100 -m 6` 转码，保留原尺寸与透明度。
- 已检查：汉字、骰子与骰盅轮廓、透明背景。入口的手机与桌面显示由页面集成验证覆盖。

## 原图来源

生成时间：2026-10-11。

本机生成原图保留在 `/home/ubuntu23/.codex/generated_images/01a1285c-8318-7e41-baf5-fe5fd94b9e08/exec-eb1018c1-abd1-4623-8f3c-6aa1b022cbf3.png`。产品只引用仓库内成品。

## 完整生成提示词

```text
Use case: logo-brand.
Asset type: transparent raster companion game logo for Friemi's game room list.
Primary request: design a polished playful Chinese dice-game logo matching the Draw & Guess logo shown immediately above in the conversation. Make this feel like the same illustrator drew both logos: very thick rounded deep navy outlines, bold flat cyan-blue/coral/yellow shape accents, friendly hand-drawn confident linework, compact near-square silhouette. Preserve the reference's light, cute, casual tabletop-game spirit and simple readable construction.
Subject: two glossy warm cream rounded dice springing out of a tilted cyan-blue dice cup. Dice have coherent perspective and navy pips with a coral single pip; softly polished cream surfaces and crisp simple white specular highlights, not metallic or photorealistic. Use a few short yellow motion dashes and a small coral rounded backdrop shape to convey a shake. No extra props.
Composition: large dice-and-cup illustration above a broad, strong hand-drawn title, dark navy round-ended handwritten Chinese strokes with a playful slight tilt, visually balanced and legible at small size. Include a single loose navy curved underline below the title matching the reference. Title must be exactly three Chinese characters: 摇 骰 子, composed as the natural word 摇骰子. All three characters must be correct, recognizable, with no missing strokes. The title is the only text. Use generous clean transparent margin around the complete silhouette, nothing clipped.
Scene/backdrop: genuinely transparent RGBA background, no solid rectangle, no paper, no checkerboard painted into the image. Artwork is crisp and smoothly antialiased.
Constraints: no gradients in the background, no pastel fog, no neon, no corporate app tile or rounded square frame, no watermark, no English, no additional text, no casino chips, no gambling imagery, no cat character. Avoid excessive microscopic details; this must work beside the existing logo in a game-selection card. Output a single final logo, not a mockup, contact sheet, page or multiple options.
```
