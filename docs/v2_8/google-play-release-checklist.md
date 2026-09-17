# Google Play 测试轨道发布清单

> 当前候选版本：`versionName 1.0.0` / `versionCode 10`。
>
> 本清单区分“代码已合并”和“测试轨道已验证”。只有从 Google Play 安装对应版本并复测通过后，才把验证框从 `[ ]` 改为 `[X]`。

## 1. 本版本更新内容（中法对照）

| ID | 中文 `zh-CN` | Français `fr-FR` | 代码依据 | Play 版本验证 |
|---|---|---|---|---|
| UPD-01 | 新增商家优惠券批次、用户领券背包和到店扫码核销流程。 | Ajout des campagnes de coupons commerçants, du portefeuille utilisateur et de la validation par QR code en boutique. | `7b1cd68`、`41da9e5`、`b7a41f7` | [ ] |
| UPD-02 | 新增移动端首页城市选择，支持选择、搜索和切换城市。 | Ajout du choix de ville sur l’accueil mobile, avec recherche et changement de ville. | `41da9e5`、`9d03d23` | [ ] |
| UPD-03 | 优化 AA 记账、分摊、多币种显示和付款确认流程。 | Amélioration des comptes partagés AA, des répartitions, de l’affichage multidevise et de la confirmation des paiements. | `7a7d8ee` | [ ] |
| UPD-04 | 聊天新增回复引用和历史消息分页加载。 | Ajout des réponses citées et du chargement paginé de l’historique des messages. | `41da9e5` | [ ] |
| UPD-05 | 新增官方反馈入口，并优化官方消息处理流程。 | Ajout d’un canal de retour officiel et amélioration du traitement des messages officiels. | `e1bf9cb`、`b7a41f7` | [ ] |
| UPD-06 | 更新礼物商店的分类、图片和展示内容。 | Mise à jour des catégories, des visuels et du contenu de la boutique de cadeaux. | `8ef7c49` | [ ] |

## 2. 本版本修复内容（中法对照）

| ID | 中文 `zh-CN` | Français `fr-FR` | 代码依据 | Play 版本验证 |
|---|---|---|---|---|
| FIX-01 | 修复移动端登录返回后，登录状态没有及时同步的问题。 | Correction de la synchronisation de session après le retour de connexion sur mobile. | `41da9e5`、`b7a41f7` | [ ] |
| FIX-02 | 修复聊天消息重复发送、历史消息加载不完整的问题。 | Correction des envois en double et du chargement incomplet de l’historique des messages. | `41da9e5` | [ ] |
| FIX-03 | 修复移动端键盘遮挡输入框、弹窗高度和滚动异常。 | Correction du clavier masquant la saisie ainsi que de la hauteur et du défilement des fenêtres mobiles. | `41da9e5` | [ ] |
| FIX-04 | 修复活动报名审核与签到审核中的部分状态和显示问题。 | Correction de certains états et affichages lors de l’approbation des participations et des présences. | `e1bf9cb`、`b7a41f7` | [ ] |
| FIX-05 | 修复从官方消息处理页面返回时进入错误页面的问题。 | Correction du retour vers une page incorrecte après le traitement d’un message officiel. | `b7a41f7` | [ ] |
| FIX-06 | 修复微信分享时部分页面缩略图不能正确显示的问题。 | Correction de l’affichage incorrect de certaines miniatures lors du partage sur WeChat. | `0bfaa08` | [ ] |

## 3. 本轮测试发现的问题

状态使用：`待复现 / 修复中 / 待复测 / 已验证解决 / 延后并说明`。

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

> 两种语言均低于 Google Play 每种语言 500 个 Unicode 字符的限制。上传前应删除尚未进入本次 AAB 的条目；如果上一测试版本已经包含某项，也不要重复写成新增内容。

```text
<fr-FR>
Nouveautés :
- Coupons commerçants : campagnes, portefeuille et validation en boutique.
- Ajout du choix de ville et du canal de retour officiel.
- Amélioration des comptes AA, des répartitions et des devises.
- Ajout des réponses et de l’historique du chat.

Correctifs :
- Synchronisation de session après connexion mobile.
- Envois en double, chargement des messages et clavier masquant la saisie.
- Validation des activités, navigation retour et affichage mobile.
</fr-FR>
<zh-CN>
更新内容：
- 商家优惠券批次、用户背包与到店核销。
- 首页城市选择与官方反馈入口。
- AA 记账、分摊和多币种流程优化。
- 聊天回复与历史消息加载。

修复内容：
- 移动端登录后的会话同步。
- 重复发消息、历史消息加载和键盘遮挡。
- 活动审核、返回导航和移动端显示问题。
</zh-CN>
```

## 5. 每次更新测试轨道

- [ ] `versionCode` 高于 Play Console 中已经上传的所有版本。
- [ ] 使用正式签名 AAB，包名和签名与现有应用一致。
- [ ] 记录本次 AAB 对应的 Git commit。
- [ ] 从 Google Play 测试链接完成全新安装和覆盖升级各一次。
- [ ] 检查启动、注册登录、城市切换、聚吧、聊天、AA 和优惠券核心流程。
- [ ] 检查 Pre-launch report 的稳定性、性能、无障碍和截图报告。
- [ ] 登记测试反馈；修复后上传更高 `versionCode` 再复测。
- [ ] P0/P1 问题清零后，再申请生产访问或提交正式审核。
- [ ] 如果适用，确认至少 12 名测试者连续加入封闭测试 14 天。

## 6. 仍需确认

- [ ] Play Console 上一次实际发布的 `versionName`、`versionCode` 和 Git commit。没有这个基线，不能准确判断哪些内容是“本次新增”。
- [ ] 当前 `1.0.0 (10)` 是否就是下一次测试轨道版本。
- [ ] 本次测试使用内部测试还是封闭测试轨道。
- [ ] 测试人员实际发现的问题、对应设备和复测结果。

## 7. 官方依据

- [准备和发布版本](https://support.google.com/googleplay/android-developer/answer/9859348)
- [新个人开发者账号的测试要求](https://support.google.com/googleplay/android-developer/answer/14151465)
- [理解 Pre-launch report](https://support.google.com/googleplay/android-developer/answer/9844487)
- [准备应用审核](https://support.google.com/googleplay/android-developer/answer/9859455)
