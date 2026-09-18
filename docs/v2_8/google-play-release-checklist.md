# Google Play 测试轨道发布清单

> 当前候选版本：`versionName 1.0.1` / `versionCode 11`。
>
> 对比基线：`versionName 1.0.0` / `versionCode 10`。本次功能与修复范围为 `85acc61..f90dea5`，版本号提交为 `3d2003c`。
>
> 状态口径：代码已经进入 `dev` 不代表测试通过。只有从 Google Play 安装对应版本并复测通过后，才把验证框从 `[ ]` 改为 `[X]`。

## 1. 本版本修复内容（中法对照，重点）

| ID | 中文：问题与解决结果 `zh-CN` | Français : problème et correction `fr-FR` | 代码依据 | Play 版本验证 |
|---|---|---|---|---|
| FIX-101 | 群聊设置中的成员无法正确打开个人主页；现已恢复成员主页跳转。 | Le profil d’un membre ne s’ouvrait pas depuis les réglages du chat de groupe ; l’accès au profil a été rétabli. | `a536075` | [ ] |
| FIX-102 | 狼人杀房间状态更新不及时；现改为房间级实时失效通知，并保留定时完整性校验。 | L’état des salles Loup-Garou se mettait à jour trop tard ; une synchronisation en temps réel par salle a été ajoutée, avec un contrôle périodique de secours. | `d1c3f74` | [ ] |
| FIX-103 | 扫码后部分 Friemi 深链、外部操作或普通文本无法正确处理；现支持安全链接、电话、短信、邮件、地图和文本，并拒绝可执行脚本协议。 | Certains liens Friemi, actions externes ou textes étaient mal traités après un scan ; les liens sûrs, appels, SMS, e-mails, cartes et textes sont désormais pris en charge, tandis que les protocoles exécutables sont bloqués. | `3923ed3` | [ ] |
| FIX-104 | 投票人姓名较多时会挤出页面；现根据可用宽度折叠为姓名加 `+N`。 | Les noms des votants pouvaient déborder ; ils sont maintenant regroupés selon l’espace disponible avec un compteur `+N`. | `f90dea5` | [ ] |
| FIX-105 | 投票分享卡片和社交平台预览信息不完整；现补充投票分享图和对应页面元数据。 | La carte de partage et l’aperçu social d’un sondage étaient incomplets ; une image de partage et des métadonnées adaptées ont été ajoutées. | `f90dea5` | [ ] |
| FIX-106 | 投票的重复选项、截止时间、多选上限及游客身份存在边界问题；现已统一清洗和校验。 | Des cas limites existaient pour les choix en double, la date de clôture, la limite de sélection et l’identité des invités ; les règles sont désormais normalisées et validées. | `b017339`、`9ce995c`、`f90dea5` | [ ] |

### 修复项复测重点

- [ ] 从群聊设置依次点击多个成员，均进入对应成员主页，返回后仍停留在原群聊。
- [ ] 两台设备进入同一狼人杀房间，一端操作后另一端及时刷新；断开实时连接后仍能恢复一致。
- [ ] 分别扫描 Friemi 内链、优惠券码、HTTPS、电话、短信、邮件、地图和普通文本。
- [ ] 扫描 `javascript:` 等不安全协议时不会执行或跳转。
- [ ] 使用窄屏和长昵称验证投票人名单不溢出，并正确显示 `+N`。
- [ ] 在微信及系统分享中检查投票标题、图片和落地页。
- [ ] 验证重复选项、已截止投票、单选/多选上限、登录用户和游客投票。

## 2. 本版本更新内容（中法对照）

| ID | 中文 `zh-CN` | Français `fr-FR` | 代码依据 | Play 版本验证 |
|---|---|---|---|---|
| UPD-101 | 新增活动投票：主理人可创建、管理和分享，参与者及符合规则的游客可以投票。 | Ajout des sondages d’activité : création, gestion et partage par l’organisateur, avec vote des participants et des invités autorisés. | `b017339`、`9ce995c`、`f90dea5` | [ ] |
| UPD-102 | 投票支持单选、多选、截止时间、结果可见范围、投票人显示和分享落地页。 | Les sondages prennent en charge le choix unique ou multiple, la clôture, la visibilité des résultats et des votants, ainsi qu’une page de partage. | `b017339`、`9ce995c`、`f90dea5` | [ ] |
| UPD-103 | 优化狼人杀房间配置、桌面展示、座位信息和实时同步。 | Amélioration de la configuration, de la table, des sièges et de la synchronisation en temps réel des salles Loup-Garou. | `d1c3f74`、`3923ed3` | [ ] |
| UPD-104 | 扩展全局扫码，可识别更多站内页面、安全外部操作和普通文本。 | Extension du scanner global pour reconnaître davantage de pages internes, d’actions externes sûres et de textes simples. | `3923ed3` | [ ] |
| UPD-105 | 优化 AA 结算进度、付款方式显示及相关账务操作。 | Amélioration du suivi des règlements AA, de l’affichage des moyens de paiement et des opérations associées. | `b017339` | [ ] |

## 3. 本轮测试问题与解决记录

状态使用：`待复现 / 已复现 / 修复中 / 待复测 / 已验证解决 / 延后并说明`。

| 问题 ID | 发现版本 | 设备 / Android | 中文问题描述 | Description française | 解决方式 / commit | 修复版本 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|
| GP-001 | 待填写 | 待填写 | 待填写 | À compléter | 待填写 | 待填写 | 待复现 | 截图、录屏或日志 |

### 标记为已解决前必须满足

- [ ] 在问题对应的 Google Play 测试轨道版本中完成复测。
- [ ] 记录测试设备、Android 版本、账号类型和网络环境。
- [ ] 原问题不再出现。
- [ ] 相邻流程没有新增明显回归。
- [ ] 补充截图、录屏、日志或测试人员反馈作为证据。
- [ ] 把对应的更新或修复条目标记为 `[X]`。

## 4. 可直接粘贴到 Google Play Console 的版本说明

> 以下内容侧重修复，两种语言均不超过 Google Play 每种语言 500 个 Unicode 字符的限制。

```text
<fr-FR>
Correctifs :
- Accès au profil depuis les réglages du chat de groupe.
- Synchronisation en temps réel des salles Loup-Garou.
- Scan QR amélioré pour les liens, actions externes et textes.
- Affichage des votants et partage des sondages corrigés.
- Validation renforcée des choix, délais et votes invités.

Nouveautés :
- Création, vote, gestion et partage de sondages d’activité.
- Amélioration du suivi des règlements AA et des salles Loup-Garou.
</fr-FR>
<zh-CN>
修复内容：
- 修复群聊设置中无法打开成员主页的问题。
- 修复狼人杀房间状态更新不及时的问题。
- 修复部分二维码、外部操作和文本识别问题。
- 修复投票人名单及投票分享显示问题。
- 加强投票选项、截止时间和游客投票校验。

更新内容：
- 新增活动投票的创建、投票、管理和分享。
- 优化 AA 结算进度和狼人杀房间体验。
</zh-CN>
```

## 5. 每次更新测试轨道

- [ ] 建立新版本小节，写明上一 Play 版本、当前版本和 Git 范围。
- [ ] `versionCode` 高于 Play Console 中已经上传的所有版本。
- [ ] 使用正式签名 AAB，包名和签名与现有应用一致。
- [ ] 记录本次 AAB 对应的 Git commit。
- [ ] 从 Google Play 测试链接完成全新安装和覆盖升级各一次。
- [ ] 优先复测本版本修复清单，再检查新增内容和核心回归流程。
- [ ] 检查 Pre-launch report 的稳定性、性能、无障碍和截图报告。
- [ ] 登记测试反馈；修复后上传更高 `versionCode` 再复测。
- [ ] P0/P1 问题清零后，再申请生产访问或提交正式审核。
- [ ] 如果适用，确认至少 12 名测试者连续加入封闭测试 14 天。

## 6. 仍需确认

- [ ] Play Console 是否已经收到 `1.0.0 (10)`；如果没有，本次版本说明还需要合并 1.0.0 的内容。
- [X] 当前代码中的下一次 Android 测试轨道版本为 `1.0.1 (11)`。
- [ ] 本次测试使用内部测试还是封闭测试轨道。
- [ ] 测试人员实际发现的问题、对应设备和复测结果。

## 7. 历史版本摘要

### `1.0.0 (10)`

更新内容：商家优惠券、城市选择、AA 流程、聊天回复与历史消息、官方反馈和礼物商店。

修复内容：移动端登录状态同步、聊天重复发送和历史加载、键盘遮挡、活动审核、官方消息返回路径及微信分享缩略图。

对应代码截至 `85acc61`；是否已经上传到 Play Console 仍需确认。

## 8. 官方依据

- [准备和发布版本](https://support.google.com/googleplay/android-developer/answer/9859348)
- [新个人开发者账号的测试要求](https://support.google.com/googleplay/android-developer/answer/14151465)
- [理解 Pre-launch report](https://support.google.com/googleplay/android-developer/answer/9844487)
- [准备应用审核](https://support.google.com/googleplay/android-developer/answer/9859455)
