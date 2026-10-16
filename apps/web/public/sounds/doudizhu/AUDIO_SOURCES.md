# 斗地主音频来源

核查及生成日期：2026-10-16。所有短音频均随应用静态部署；游戏过程中不请求第三方语音服务，不使用浏览器临时朗读。

## 纸牌录音

来自 Kenney [Casino Audio](https://kenney.nl/assets/casino-audio)，官方标注 CC0，原许可随本目录保存。只做截短、转单声道 PCM 和峰值处理。

| 文件 | 原文件 | 用途 |
| --- | --- | --- |
| select.wav | card-slide-1.ogg | 选牌 |
| play.wav | card-place-1.ogg | 接受出牌 |
| deal.wav | card-fan-1.ogg | 发牌 |

## 专属音效

`pass.wav`、`straight.wav`、`pairs.wav`、`airplane.wav`、`rocket.wav`、`bomb.wav` 是项目脚本原创合成的短音效，没有引用第三方采样。分别采用轻木质双拍、递进拨弦、成对拨弦、掠过气流、上升气流与低频点缀、短促低频落点。它们不是实物录音，也不复制其他游戏音效。`bomb.wav` 已替换早期的 Kenney 占位素材。

生成脚本：[`generate-doudizhu-audio.py`](../../../scripts/generate-doudizhu-audio.py)。固定随机种子 `20261016`，24 kHz、单声道、PCM 16-bit，时长 0.23–1.30 秒，峰值约 −9 dBFS。

## 合成语音

`voice/{zh-CN,en,fr}/` 共 18 条通用播报。它们是离线生成的合成语音，不是真人录制，也没有克隆指定个人或模仿竞品角色。使用官方公布的声音权重：

| 语言 | 模型 | 固定版本 | 声音 / 语速 |
| --- | --- | --- | --- |
| 中文 | [hexgrad/Kokoro-82M-v1.1-zh](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh) | `01e7505bd6a7a2ac4975463114c3a7650a9f7218` | `zf_001` / 1.13 |
| 英语 | [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | `f3ff3571791e39611d31c381e3a41a3af07b4987` | `af_heart` / 1.12 |
| 法语 | 同上 | 同上 | `ff_siwis` / 1.15 |

Kokoro 模型及[生成代码](https://github.com/hexgrad/kokoro)采用 Apache-2.0；代码许可副本见 `KOKORO_LICENSE.txt`。中文模型卡说明中文训练数据由 LongMaoData 提供使用许可。模型/代码许可与这些生成音频的来源记录分别保留，不把生成音频描述为 Apache 源代码。

法语声音的来源数据署名：Yamagishi, Junichi; Honnet, Pierre-Edouard; Garner, Philip; Lazaridis, Alexandros (2017). *The SIWIS French Speech Synthesis Database, 2016*. University of Edinburgh. [doi:10.7488/ds/1705](https://doi.org/10.7488/ds/1705)，[数据集页面](https://datashare.ed.ac.uk/handle/10283/2353)，CC BY 4.0。本项目使用模型发布者提供的声音权重，未分发原始语料。

| 文件名 | 中文 | 英语 | 法语 |
| --- | --- | --- | --- |
| pass | 不出！ | Pass! | Je passe ! |
| straight | 顺子！ | Straight! | Suite ! |
| pairs | 连对！ | Pair run! | Suite de paires ! |
| airplane | 飞机！ | Airplane! | Avion ! |
| rocket | 王炸！ | Rocket! | Fusée ! |
| bomb | 炸弹！ | Bomb! | Bombe ! |

语音统一为 24 kHz、单声道、PCM 16-bit，约 0.42–0.81 秒，峰值约 −3.1 dBFS。清理前后空白并保留辅音余量，做短淡入淡出；这不是 LUFS 响度归一化。每条音频的文本、音素、时长和 SHA-256 记录在 [`audio-manifest.json`](./audio-manifest.json)。

复现时使用独立 Python 环境：`kokoro==0.9.4`、`misaki[zh]==0.9.4`、`soundfile`、`numpy`、`scipy`、`espeakng-loader`，CPU PyTorch 即可。英文管线还需要 `en_core_web_sm`。按上述固定版本下载 `config.json`、模型权重和对应 `voices/*.pt` 到 `MODEL_DIR/zh`、`MODEL_DIR/multi`，再运行脚本 `--models MODEL_DIR --voices --effects`。模型和依赖不进入前端包；环境版本差异可能影响逐字节复现。

## 其他声音与混音

结果提示复用 `/sounds/draw-guess/finish.wav`，叫分提示复用 `ready.wav`。两首音乐复用 `/sounds/draw-guess/music-lobby.mp3`、`music-game.mp3`；来源和 CC0 记录见 [既有来源表](../draw-guess/AUDIO_SOURCES.md)。不复制大文件。

音效默认 70%，语音 85%，音乐首次默认关闭、开启后 15%；三个通道分别开关和调音。出牌音效或播报期间，音乐平滑降至原音量的最多 20%，同时按前景音量设置更低的上限；结束后恢复。语音和特效使用同一事件和开始时间，迟到素材不会补播。需首次用户手势解锁；后台、断线及手机竖屏暂停，换房/卸载停止，初始化和恢复快照不重播旧事件。

已检查文件编码、峰值、清单和浏览器调度；这些检查不替代真人试听。手机扬声器、耳机听感和多设备输出延迟仍需实机验收。
