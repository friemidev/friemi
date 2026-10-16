# 斗地主短播报、音效与音乐方案

日期：2026-10-16。本轮增加“不出、顺子、连对、飞机、王炸、炸弹”中英法短播报。仅使用发布方提供的通用声线离线合成，不使用竞品录音、用户上传的人声或真人克隆。资产生成与实际验收由本轮实施记录归档；本文件区分已核查来源与运行时设计要求。

## 模型与许可选择

| 用途 | 已选择模型/声线 | 官方依据 |
| --- | --- | --- |
| 中文 | Kokoro-82M-v1.1-zh，`zf_001` | [官方模型页](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh) 标注 Apache-2.0，语言为中英；发布者说明中文专业数据获 LongMaoData 许可提供。[官方生成示例](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh/blob/main/samples/make_zh.py) 使用此声线 |
| 英文 | Kokoro-82M v1.0，`af_heart` | [官方模型页](https://huggingface.co/hexgrad/Kokoro-82M) 标注 Apache-2.0，并明确支持生产部署；声线见[官方 Voices](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) |
| 法文 | Kokoro-82M v1.0，`ff_siwis` | 同一模型 Apache-2.0；[官方声线表](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) 标出 SIWIS 来源，模型页标明该数据为 CC BY 4.0 |

中文 v1.1-zh 不是覆盖全部语言的 v1.0 替代品，法语仍使用 v1.0。Apache-2.0 的使用与分发授权见[官方许可文本](https://www.apache.org/licenses/LICENSE-2.0)，Kokoro 推理代码也使用[Apache-2.0](https://github.com/hexgrad/kokoro/blob/main/LICENSE)。模型许可与生成音频的资产声明分别记录，不把合成输出一概标成模型源码许可。

法语来源清单保留：Yamagishi, Junichi; Honnet, Pierre-Edouard; Garner, Philip; Lazaridis, Alexandros. (2017). *The SIWIS French Speech Synthesis Database, 2016* [dataset]. University of Edinburgh. DOI [10.7488/ds/1705](https://doi.org/10.7488/ds/1705)。作者与引用格式来自[数据库发布页](https://datashare.ed.ac.uk/handle/10283/2353)。这里只使用已发布模型的声线向量，不下载或重新分发原始数据集。

未选择 Piper 中文 huayan：其[单声线 MODEL_CARD](https://huggingface.co/rhasspy/piper-voices/blob/main/zh/zh_CN/huayan/medium/MODEL_CARD) 将数据集许可写为 `Unknown`。不能用上层仓库 MIT 标签消除这一来源不明问题。

## 可复现的模型文件

以下路径经官方 Hugging Face 文件列表/API 核对，研究阶段未下载权重。每个主模型约 327 MB，每个已选声线约 523 kB。生成时仅获取所需配置、权重和声线，保存 revision 与文件 SHA256。

| 模型 | 核查时 revision | 必需文件 |
| --- | --- | --- |
| v1.1-zh | `01e7505bd6a7a2ac4975463114c3a7650a9f7218` | [权重](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh/resolve/main/kokoro-v1_1-zh.pth)、[配置](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh/resolve/main/config.json)、[zf_001](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh/resolve/main/voices/zf_001.pt) |
| v1.0 | `f3ff3571791e39611d31c381e3a41a3af07b4987` | [权重](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v1_0.pth)、[配置](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/config.json)、[af_heart](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices/af_heart.pt)、[ff_siwis](https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices/ff_siwis.pt) |

上表链接便于获取，生成脚本应将 `main` 换为记录的 revision，或用 `hf_hub_download(..., revision=...)` 固定版本。

## 本机环境与隔离运行

研究时只读检查结果：默认 `/home/ubuntu23/anaconda3/bin/python3` 为 Python 3.11.5；PyTorch 2.7.0+cu126 实际导入成功，CUDA 不可用，可使用 8 个 CPU 线程；Transformers 4.51.3 已安装。初始环境没有 Kokoro、Misaki、Piper、ONNX Runtime、SoundFile、phonemizer 或 eSpeak 可执行文件；`ffmpeg`/`ffprobe` 已存在。系统 `/usr/bin/python3` 为 3.11.4，也没有上述 TTS 库。

本轮采用隔离 venv 并复用已有 PyTorch，不全局安装。Kokoro 0.9.4 的[官方依赖定义](https://github.com/hexgrad/kokoro/blob/main/pyproject.toml) 使用 Misaki；[Misaki 0.9.4 的 English extras](https://github.com/hexgrad/misaki/blob/main/pyproject.toml) 包含 `phonemizer-fork` 和 `espeakng-loader`，Chinese extras 补充中文分词与拼音依赖。

无需为此全局安装 eSpeak。[Misaki 官方代码](https://github.com/hexgrad/misaki/blob/main/misaki/espeak.py) 已采用以下本地库定位方式，与 [espeakng-loader 发布说明](https://pypi.org/project/espeakng-loader/) 一致：

```python
from phonemizer.backend.espeak.wrapper import EspeakWrapper
import espeakng_loader

EspeakWrapper.set_library(espeakng_loader.get_library_path())
EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
```

需使用 `phonemizer-fork` 提供的同名 import；若 `set_data_path` 不存在，应检查是否被旧 `phonemizer` 覆盖。Loader 包装代码为 [MIT](https://github.com/thewh1teagle/espeakng-loader/blob/main/LICENSE)，其载入的 eSpeak NG 为 [GPLv3](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING)。这些是本地资产制作工具，不把运行库或模型加入网页产物；最终网页只加载已生成的短音频。

## 播报文本与制作要求

| 事件 | 中文 | 英文 | 法文 |
| --- | --- | --- | --- |
| PASS | 不出！ | Pass! | Je passe ! |
| STRAIGHT | 顺子！ | Straight! | Suite ! |
| PAIR_STRAIGHT | 连对！ | Pair run! | Suite de paires ! |
| AIRPLANE / AIRPLANE_SINGLE / AIRPLANE_PAIR | 飞机！ | Airplane! | Avion ! |
| ROCKET | 王炸！ | Rocket! | Fusée ! |
| BOMB | 炸弹！ | Bomb! | Bombe ! |

上表已对齐最终[资产清单](../../apps/web/public/sounds/doudizhu/audio-manifest.json)：英文连对采用更短的 `Pair run!`，法语连对与王炸采用 `Suite de paires !`、`Fusée !`。

使用每种语言一致的通用声线，清楚、轻快，语音不模仿竞品人物。中文重点核对“不出”的连读，以及“炸”在王炸/炸弹中是否为 `zhà`。[Kokoro 官方声音说明](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) 提醒极短输入可能退化，因此每条需要试听确认；必要时先合成有停顿的短段再精确裁切，不把多余上下文保留在资产里。

保存原始 24kHz WAV 作为生成输出，再制作网页播放格式。清理明显首尾静音、保留自然收尾，做轻量峰值规范化，不使用截断字尾或明显压缩破音来追求极短时长。为每条记录文本、语言、模型 revision、声线、速度、最终时长、SHA256 与来源。未试听前不宣称自然度已合格。

## 运行时同步与混音验收

以下为实现要求，代码完成后单独只读审查：

1. 所有播报由服务端已接受的事件驱动，按房间/席位/局数/事件 ID 去重。点击“出牌”后被规则拒绝不播报；初次进入、刷新、重复快照和重连基线不补播旧事件。
2. PASS 读取最新有效 PASS；第二次 PASS 与 TRICK 同快照不能被 TRICK 掩盖。特殊牌型从最新 PLAY 识别，末手 PLAY+RESULT 仍播牌型一次，不以结算音覆盖刚开始的语音。
3. 特效和播报共用同一接受事件作为起点；提前加载/解码短音频，资源迟到超过有效窗口就跳过，不在几秒后突然补播。较长法语词句可以自然结束，不拉长牌桌操作锁。
4. 同一时刻只保留一个主要播报，新动作不形成历史播报长队列。快速重复触发、音频加载失败及播放中断都必须释放占用和恢复音乐。
5. 语音开始时压低背景音乐，结束或取消后平滑恢复到用户设置值；保留独立的总开关、音效/播报与音乐控制。静音和 0 音量不能被自动恢复逻辑重新打开。
6. hidden、离房、账号/房间改变、转入遮罩时取消在播与待播；恢复后重建基线。真实房间和无轮询的冻结预览要区分，不能吞掉预览恢复后的第一手主动出牌。
7. 浏览器要求手势解锁音频；拒绝解锁时保留视觉状态，不反复弹错。多标签页只让当前获得音频所有权的页面播报，切换后停止旧页音乐与声音。
8. 减少动态只控制视觉演出，不等同于静音。音频遵守用户自己的开关；必须核对这一设置切换不会重播刚结束的事件。

## 本轮落地状态

18 条播报与 6 条对应音效已由主实施方生成，存于 `apps/web/public/sounds/doudizhu/`，元数据见 [audio-manifest.json](../../apps/web/public/sounds/doudizhu/audio-manifest.json)。清单记录 24kHz、文本、声线、模型、速度、音素、时长、峰值和 SHA256：语音约 0.42–0.81 秒，6 条新音效约 0.23–1.30 秒。此处为读取清单确认的资产状态，不宣称独立完成了全部试听。

已完成运行时、统一事件时间线、AudioProvider、PlayEffects 与 PASS 入场的独立只读审查。发现并由运行时实现方修复了快速 PASS→PASS 或飞机→PASS 时两条语音叠说的问题：新语音将旧语音在 20ms 内淡出，独立 voice generation 阻止旧下载/解码完成后补播，普通音效仍可并行；过期请求不会打断当前有效语音。

修后复读未发现新的明确问题。代码使用同一 `startAt` 驱动声音与视觉，保留末手 PLAY+RESULT 的牌型语音，第二 PASS 不被 TRICK 掩盖；音乐通过独立 gain bus 压低并按最长前景声期限恢复，取消时清理待播；hidden/portrait/连接恢复与冻结预览分别处理，减少动态不误静音。本次独立审查未重复运行实现方测试，也未冒称完成真实听感验证。最终试听、真实点击及浏览器证据见[实施记录](doudizhu-implementation.md)。
