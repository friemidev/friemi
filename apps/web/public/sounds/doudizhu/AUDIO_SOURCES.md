# 斗地主音频来源

核查日期：2026-10-16。纸牌音效来自 Kenney [Casino Audio](https://kenney.nl/assets/casino-audio)，官方标注 CC0，原许可随本目录保存。仅截短、转单声道 PCM 和限制峰值，没有合成冒充录音。

| 文件 | 原文件 | 用途 |
| --- | --- | --- |
| select.wav | card-slide-1.ogg | 选牌 |
| play.wav | card-place-1.ogg | 接受出牌 |
| deal.wav | card-fan-1.ogg | 发牌 |
| bomb.wav | card-shove-1.ogg | 炸弹/火箭接受后 |

结果提示复用 `/sounds/draw-guess/finish.wav`，叫分提示复用 `ready.wav`。两首音乐复用 `/sounds/draw-guess/music-lobby.mp3`、`music-game.mp3`；来源和 CC0 记录见 [既有来源表](../draw-guess/AUDIO_SOURCES.md)。不复制大文件。

音效默认70%，音乐首次默认关闭、开启后15%。音频需首次用户手势解锁；后台暂停，换房/卸载停止，快照初始化不重播旧事件，过期和已静音的异步加载不得补播。使用真实录音素材并不等于已完成听感验收；真机听感和混音仍需验收。
