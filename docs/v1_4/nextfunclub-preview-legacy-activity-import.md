# Next Fun Preview 历史真实组局导入 SQL

> 本文档包含参与人微信号，只用于本机 SQL Editor 操作，不要提交到 Git。

## 数据来源

- 主表：`/home/ubuntu23/Téléchargements/NEXT FUN ☕ 快乐制造局 项目管理 (3).xlsx`
- 微信映射：`/home/ubuntu23/Téléchargements/昵称和微信号的对照关系.xlsx`
- 导入批次：`paris-juin-2026`

## 导入策略

- 真实组局写入 `Activity`，不写 `PublicEvent`。
- 参与人写入 `GuestActivityParticipant`，后续用户填写相同微信号后可自动关联正式账号。
- 发起人必须对应 `UserProfile`；SQL 会优先匹配同昵称 active profile，没有则创建 preview 专用 organizer profile。
- `Past` 导入为 `ENDED`，`Going` 导入为 `CONFIRMED`。
- 日期按巴黎时间解释后转为 UTC timestamp 写入数据库。
- 缺失集合时间的记录暂按巴黎时间 19:00 导入，并在活动描述中标记导入复核。
- `Hoting` / `hoting` 合并为同一发起人。
- `咔哒` / `咔嗒` 合并为同一参与人。
- SQL 使用 deterministic id，可重复执行，不会重复创建同一批组局。

## 本次统计

- Activity：19 条
- GuestActivityParticipant：83 条
- Organizer profile：5 个候选
- 没有微信映射的参与昵称：2 个
- 需要复核的活动：5 条

## 需要人工复核的活动

- `4` 博物馆之夜：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。；原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。
- `11` 2026白夜艺术节：巴赫的回响：原表缺少活动地点，SQL 使用集合地点兜底。
- `12` 户外音乐节：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。
- `17` 唱 跳 RAP 干饭：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。
- `19` 夜间城市徒步：戴高乐主题：原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。

## 没有微信映射的参与昵称

这些参与人仍会导入为游客参与人，但 `normalizedWechatId` 为空，后续无法靠微信号自动绑定，除非补充映射后重新生成 SQL。

NickJY, 咔嗒

## 执行步骤

1. 确认 Preview 数据库已经执行 v1.4 guest signup migration，存在 `GuestActivityParticipant` 表。
2. 打开 Preview 数据库 SQL Editor。
3. 复制下方完整 SQL 并执行。
4. 如果之前执行过旧版脚本，可以直接重新执行新版脚本；新版会先删除本批 `legacy-nextfun-xlsx` 旧导入，再把它们作为真实 `Activity` 组局重新写入。
5. 查看末尾 summary 结果，确认数量符合预期。
6. 如果要撤销，手动执行文末注释里的 rollback SQL。

## SQL Editor 可运行代码

```sql
-- Next Fun legacy real group import for PREVIEW database
-- Source workbook: NEXT FUN ☕ 快乐制造局 项目管理 (3).xlsx
-- Generated locally. Contains participant WeChat IDs; do not commit this file.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."Activity"') IS NULL THEN
    RAISE EXCEPTION 'Activity table does not exist';
  END IF;
  IF to_regclass('public."GuestActivityParticipant"') IS NULL THEN
    RAISE EXCEPTION 'GuestActivityParticipant table does not exist. Apply v1.4 guest signup migration first.';
  END IF;
END $$;

-- Use regular staging tables instead of TEMP tables because some hosted SQL editors
-- can run selected statements on different connections.
DROP TABLE IF EXISTS legacy_import_guest_participants;
DROP TABLE IF EXISTS legacy_import_activities;
DROP TABLE IF EXISTS legacy_import_organizers;

-- Clean the previous run first. These are real team activities, not PublicEvent rows.
DELETE FROM "GuestActivityParticipant"
WHERE "sourceUserAgent" = 'legacy-xlsx-import:paris-juin-2026';

DELETE FROM "Activity"
WHERE "source" = 'legacy-nextfun-xlsx';

DELETE FROM "UserProfile" u
WHERE u."clerkUserId" LIKE 'legacy-preview-organizer:%'
  AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id");

CREATE TABLE legacy_import_organizers (
  organizer_key text PRIMARY KEY,
  profile_id text NOT NULL,
  nickname text NOT NULL,
  clerk_user_id text NOT NULL
);

INSERT INTO legacy_import_organizers (organizer_key, profile_id, nickname, clerk_user_id) VALUES
  ('louise', 'legacy_org_louise', 'Louise', 'legacy-preview-organizer:louise'),
  ('james', 'legacy_org_james', 'James', 'legacy-preview-organizer:james'),
  ('张杠杠', 'legacy_org_zhangganggang', '张杠杠', 'legacy-preview-organizer:张杠杠'),
  ('hoting', 'legacy_org_hoting', 'Hoting', 'legacy-preview-organizer:hoting'),
  ('👀', 'legacy_org_eyes', '👀', 'legacy-preview-organizer:👀');

CREATE TABLE legacy_import_activities (
  activity_id text PRIMARY KEY,
  legacy_id text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  activity_type text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  start_at timestamp NOT NULL,
  end_at timestamp,
  capacity integer NOT NULL,
  price_type text NOT NULL,
  price_text text NOT NULL,
  status text NOT NULL,
  visibility text NOT NULL,
  organizer_key text NOT NULL,
  organizer_profile_id text NOT NULL,
  organizer_nickname text NOT NULL,
  external_url text,
  source_payload jsonb NOT NULL
);

INSERT INTO legacy_import_activities (activity_id, legacy_id, external_id, title, description, activity_type, category, city, address, start_at, end_at, capacity, price_type, price_text, status, visibility, organizer_key, organizer_profile_id, organizer_nickname, external_url, source_payload) VALUES
  ('legacy_activity_001', '1', 'paris-juin-2026-001', '音乐节游船', '游船 DJ

活动地点：LA MADRAGUE

原始链接：https://shotgun.live/fr/venues/rivers-king', 'LOCAL', 'EXHIBITION', 'Paris', '4 Quai Saint-Bernard, 75005 Paris, France', '2026-05-15 18:00:00', NULL, 5, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://shotgun.live/fr/venues/rivers-king', '{"importBatch":"paris-juin-2026","legacyId":1,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"LA MADRAGUE","originalMeetingAddress":"4 Quai Saint-Bernard, 75005 Paris, France","originalLinkPresent":true,"declaredParticipantCount":5,"importedParticipantCount":5,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_002', '2', 'paris-juin-2026-002', '桌游', '历史真实组局，来自 Next Fun 内部管理表。

活动地点：Au Bonheur des Jeux', 'LOCAL', 'BOARD_GAME', 'Paris', '21 Boulevard de Charonne, 75011 Paris', '2026-05-16 13:00:00', NULL, 6, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'james', 'legacy_org_james', 'James', NULL, '{"importBatch":"paris-juin-2026","legacyId":2,"originalStatus":"Past","originalType":"🎲 桌游","originalVenue":"Au Bonheur des Jeux","originalMeetingAddress":"21 Boulevard de Charonne, 75011 Paris","originalLinkPresent":false,"declaredParticipantCount":6,"importedParticipantCount":6,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_003', '3', 'paris-juin-2026-003', 'Apéro Picnic on the Seine+Supersonic', '活动是由 Franco-Americans in Paris（在巴黎的法美社群） 组织的一场塞纳河畔野餐聚会（Apéro Picnic）。

以下是该活动的详细介绍：

活动名称：Apéro Picnic @ LA SEINE (Quai de la Tournelle)

活动时间：2026年5月21日（周四） 晚上 19:30 开始

地点：塞纳河边，靠近 圣路易岛 (Île Saint-Louis) 的 Quai de la Tournelle（具体位置在 2 Quai de la Tournelle 附近）。

活动形式：

自带饮食：参与者需要自带饮料和食物进行分享和交流。

社交氛围：这是一个轻松的社交场合，大家可以边吃喝边聊天，同时欣赏塞纳河上的夕阳和圣母院的美景。

辨识标志：组织者会带着美国国旗和法国国旗，方便大家在河岸边找到人群。

交通信息：

可以乘坐地铁 7号线 到 Pont Marie 站。

或者乘坐地铁 4号线 到 Saint-Michel 站。

这对于想在巴黎结识国际朋友、特别是对美法文化感兴趣的人来说，是一个非常浪漫且随性的聚会机会。

原始链接：https://www.meetup.com/franco-american-meetup-in-paris/events/314381484/?_xtd=gqFyqTQ3NjY1NTg0NaFwo2FwaQ%253D%253D&from=ref', 'LOCAL', 'FOOD', 'Paris', '2, Quai de la Tournelle · Paris', '2026-05-21 17:30:00', NULL, 4, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.meetup.com/franco-american-meetup-in-paris/events/314381484/?_xtd=gqFyqTQ3NjY1NTg0NaFwo2FwaQ%253D%253D&from=ref', '{"importBatch":"paris-juin-2026","legacyId":3,"originalStatus":"Past","originalType":"🍷 聚餐","originalVenue":"2, Quai de la Tournelle · Paris","originalMeetingAddress":"2, Quai de la Tournelle · Paris","originalLinkPresent":true,"declaredParticipantCount":4,"importedParticipantCount":4,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_004', '4', 'paris-juin-2026-004', '博物馆之夜', '历史真实组局，来自 Next Fun 内部管理表。

导入复核：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。；原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。', 'LOCAL', 'EXHIBITION', 'Paris', '根据附表结果决定', '2026-05-23 17:00:00', NULL, 5, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', NULL, '{"importBatch":"paris-juin-2026","legacyId":4,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"根据附表结果决定","originalMeetingAddress":null,"originalLinkPresent":false,"declaredParticipantCount":5,"importedParticipantCount":5,"needsReview":true,"reviewNotes":["原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。","原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。"]}'::jsonb),
  ('legacy_activity_005', '5', 'paris-juin-2026-005', '密室逃脱 Rashomon Escape 的经典主题——《大劫案》（Le Braquage / The Heist）', '🕵️‍♂️ 剧情背景
你们是一支由顶级神偷组成的王牌团队，而这一次的目标是巴黎保护最严密的金库。据说这里存放着价值连城的无价之宝，但金库的主人绝非等闲之辈，内部机关重重、安保系统极其严密。你们需要潜入其中，在警报响起源源不断的安保人员赶到之前，破解重重谜题，神不知鬼不鬼地带着宝藏全身而退。

🌟 游戏亮点与特色
沉浸式动作体验：这不仅是一个烧脑的解谜密室，更充满了好莱坞动作大片般的紧张感。你们需要像真正的电影特工一样分工协作。

6人黄金阵容：这个主题非常看重团队协作。6个人的配置非常完美，非常适合和朋友们一起分头寻找线索、同步破解机关，体验团队“协同作案”的快感。

难度适中、反转不断：Rashomon Escape 的谜题设计以逻辑性强、机关精巧著称。随着游戏推进，剧情可能会有预料之外的反转。

⚠️ 玩家行前小贴士
准时到达：密室通常要求提前 10-15 分钟到达进行行前培训（Briefing），千万不要迟到哦，否则可能会扣减你们在房间内的游戏时间（通常为60分钟）。

着装建议：既然是去“搞大劫案”，建议穿着舒适、便于行动的衣服和运动鞋，部分环节可能需要你弯腰或灵活移动。

语言确认：Rashomon Escape 的前台接待和谜题通常支持法语和英语，进场前可以和主持经理（Game Master）确认你们倾向的语言版本。

祝你们全员配合默契，成功洗劫金库，完美逃脱！

为了让你们在5月27日去现场前更有代入感，这里为你奉上最原汁原味的官方剧情和关卡介绍：

🚨 剧情背景：潜入巴黎戒备最严的金库
“你们是盗贼界的一代传奇。这一次，你们的目标锁定了巴黎最古老、防护最严密的金融机构之一。

目标很明确：潜入大楼核心，在神不知鬼不觉的情况下，把存放在绝密金库里的无价之宝偷出来。

但是，留给你们的时间只有 60 分钟。60 分钟后，终极防御系统就会彻底锁死整栋大楼，届时你们将插翅难飞。警报随时可能响起，红外线、密码锁、监控网……你们准备好迎接这场史诗级的挑战了吗？”

🎮 游戏核心亮点与体验
真正的“特工”体验：这个主题非常注重沉浸感。你和朋友们一跨进门，就会瞬间化身好莱坞大片里的神偷天团。你们需要破解复杂的激光防御、复杂的电路系统、以及高级密码锁。

硬核烧脑 vs 团队协作：作为 6 人局，游戏的谜题非常注重“平行推进”和“同步协作”。这意味着你们不能聚在一起看同一个线索，而是需要分工明确——有人负责放风，有人负责破译，有人负责操作机关，极度考验默契！

高科技机关主导：Rashomon 的这个经典房间减少了传统密室“到处翻钥匙”的枯燥感，更多的是充满科技感和现代感的电子机关。

📊 关卡核心参数（去前必看）
官方难度：⭐⭐⭐⭐（属于中等偏上难度，适合喜欢动脑和渴望挑战的玩家）

搜索度/逻辑度/操作度：逻辑推理和机关操作占大头，需要细心观察环境。

游戏时间：60 分钟。

完美人数：官网显示该主题支持 2-7 人，你们派出的 6 人黄金阵容可以说是最容易通关、体验感最棒的配置，大家都能分到任务！

倒计时已经开始，祝你们 5 月 27 日 19:00 准时空降巴黎金库，完美带走宝藏！💰

活动地点：RASHOMON ESCAPE

原始链接：https://www.rashomon-escape.com/escape-game-paris/missions/le-braquage', 'LOCAL', 'OTHER', 'Paris', '2 Pass. du Chemin Vert, 75011 Paris', '2026-05-27 17:00:00', NULL, 6, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', '张杠杠', 'legacy_org_zhangganggang', '张杠杠', 'https://www.rashomon-escape.com/escape-game-paris/missions/le-braquage', '{"importBatch":"paris-juin-2026","legacyId":5,"originalStatus":"Past","originalType":"❓密室","originalVenue":"RASHOMON ESCAPE","originalMeetingAddress":"2 Pass. du Chemin Vert, 75011 Paris","originalLinkPresent":true,"declaredParticipantCount":6,"importedParticipantCount":6,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_006', '6', 'paris-juin-2026-006', '海军府舞会', '舞会到20:30

活动地点：海军府舞会

原始链接：https://www.hotel-de-la-marine.paris/', 'LOCAL', 'EXHIBITION', 'Paris', 'Hôtel de la Marine', '2026-05-29 17:00:00', NULL, 6, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'james', 'legacy_org_james', 'James', 'https://www.hotel-de-la-marine.paris/', '{"importBatch":"paris-juin-2026","legacyId":6,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"海军府舞会","originalMeetingAddress":"Hôtel de la Marine","originalLinkPresent":true,"declaredParticipantCount":5,"importedParticipantCount":6,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_007', '7', 'paris-juin-2026-007', '大哥私房菜', '历史真实组局，来自 Next Fun 内部管理表。

活动地点：大哥私房菜

原始链接：https://shotgun.live/en/events/aquaboulevard-paris-biggest-pool-party-2026-samedi-30-mai', 'LOCAL', 'FOOD', 'Paris', '4 Rue Louis Armand, 75015 Paris, France', '2026-05-30 16:00:00', NULL, 6, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'hoting', 'legacy_org_hoting', 'Hoting', 'https://shotgun.live/en/events/aquaboulevard-paris-biggest-pool-party-2026-samedi-30-mai', '{"importBatch":"paris-juin-2026","legacyId":7,"originalStatus":"Past","originalType":"🍷 聚餐","originalVenue":"大哥私房菜","originalMeetingAddress":"4 Rue Louis Armand, 75015 Paris, France","originalLinkPresent":true,"declaredParticipantCount":6,"importedParticipantCount":6,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_008', '8', 'paris-juin-2026-008', '徒步 森林 + 沙滩 + 奇石 + 远眺', '这条徒步路线上能看到的景观非常丰富且具有当地特色，主要包括以下几个方面：
1. 独特的自然与地质景观
• 沙海（Mers de Sable）： 这是该区域最神奇的景观之一。在茂密的森林中会突然出现大片细腻的白色沙滩，仿佛置身于海滨或沙漠。
• 奇石怪岩（Chaos Rocheux / Rochers aux formes insolites）： 沿途布满了巨大的砂岩（Grès），由于长期的自然侵蚀，它们呈现出各种千奇百怪的形状。在内穆尔森林里，你可以沿路寻找并辨认形似“猴子头（Tête de singe）”、“象（Éléphant）”或“乌龟”的巨石。
• 茂密的植被（Forêt dense et Fougères）： 经典的法式森林风光，沿途有高大的橡树、松树，到了夏秋季节，路两旁会有齐肩高的蕨类植物（Fougères），林荫蔽日。
2. 人文与历史遗迹
• 法兰西岛史前博物馆（Musée de la Préhistory d''Île-de-France）： 这座博物馆本身就建在内穆尔森林的环抱之中，它的标志性现代建筑很好地融入了森林环境中。
• 新石器时代磨石（Polissoirs de Faÿ-les-Nemours）： 这一带在史前时代就有人类活动，路线上有时能看到几千年前新石器时代人类用来打磨石器的凹槽岩石（磨石）。
• 全景瞭望点（Points de vue / Panoramas）： 由于地形有一定起伏（如 Mont Olivet 或一些岩石高地），沿途有几个极佳的观景点，可以俯瞰下方的卢安河谷（Vallée du Loing）和周围的乡村风光。
3. 起点或终点附近的城镇风光（视具体路线而定）
由于这是一场“Rando-Talk”（一边徒步一边社交交流）的活动，通常会从附近的火车站（如 Nemours - Saint-Pierre）出发。因此在徒步前后，你可能还会看到：
• 内穆尔城堡（Château de Nemours）： 一座历史悠久的12世纪中世纪城堡，矗立在河畔。
• 卢安运河与河流（Le Loing et son canal）： 宁静的河畔纤道、古老的桥梁以及夏日里的河边露天咖啡座（Terrasses éphémères）。
总结：
这是一条**“森林 + 沙滩 + 奇石 + 远眺”**完美结合的经典路线。由于是 Columbia Hike Society 或相关组织举办的社群徒步，一路上除了欣赏自然美景，最大的亮点还在于和同行的人聊天交流（Talk）。建议穿着防滑的徒步鞋，并做好鞋子里进沙子的准备！

活动地点：Forêt de nemours

原始链接：https://www.eventbrite.co.uk/e/billets-rando-talk-foret-de-nemours-1986886406728?utm_experiment=test_share_listing&aff=ebdsshios&sg=4c686fc7bd7e1e9962dcf0661fd251239e6af2ae9f46809b3a06750344f5e478ebf9022ab69aa17a66e01b8492c3183cdfa783f42a1095dabf3ae0cd7ecab935ec561b33d7196760a0ced271ba6c', 'LOCAL', 'SPORTS', 'Paris', 'Gare de Lyon', '2026-05-31 12:00:00', NULL, 2, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.eventbrite.co.uk/e/billets-rando-talk-foret-de-nemours-1986886406728?utm_experiment=test_share_listing&aff=ebdsshios&sg=4c686fc7bd7e1e9962dcf0661fd251239e6af2ae9f46809b3a06750344f5e478ebf9022ab69aa17a66e01b8492c3183cdfa783f42a1095dabf3ae0cd7ecab935ec561b33d7196760a0ced271ba6c', '{"importBatch":"paris-juin-2026","legacyId":8,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"Forêt de nemours","originalMeetingAddress":"Gare de Lyon","originalLinkPresent":true,"declaredParticipantCount":2,"importedParticipantCount":2,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_009', '9', 'paris-juin-2026-009', '“白夜”当代艺术节', '当天晚上的活动及展览看点如下：

夜间免费开放：美术馆将在当晚 17:00 至午夜（24:00） 免费向公众开放（需提前在官网预约门票）。

藤本由纪子（Fujiko Nakaya）的“雾雕”新作：从6月4日开始，日本著名的“雾之艺术家”藤本由纪子将接管美术馆核心的中央圆顶大厅（Rotunda），展出名为《Cloud #07156》的沉浸式白雾雕塑装置。在白夜的灯光和夜色下，观众可以体验漫步于虚无缥缈的迷雾之中的奇幻感受。

“明暗对照”主题展（Clair-obscur）：当晚你还可以欣赏到美术馆正在进行的春夏季大展。该展览汇集了皮诺收藏（Pinault Collection）中约20位现代与当代艺术家的作品，以卡拉瓦乔式的“明暗对比法（Chiaroscuro）”为灵感，探索光影、阴暗与人类潜意识的张力，包含维克托·曼（Victor Man）的神秘绘画以及劳拉·拉米尔（Laura Lamiel）在展厅长廊中打造的感性光影装置。

这是一个在独特夜间氛围下、免费感受巴黎顶尖当代艺术与标志性穹顶建筑完美结合的绝佳机会。

活动地点：Bourse de Commerce - Pinault Collection

原始链接：https://share.google/BJNthPQa18ah8g5PO', 'LOCAL', 'EXHIBITION', 'Paris', '2 Rue de Viarmes, 75001 Paris', '2026-06-06 15:30:00', NULL, 8, 'FREE', '免费', 'ENDED', 'PUBLIC', '👀', 'legacy_org_eyes', '👀', 'https://share.google/BJNthPQa18ah8g5PO', '{"importBatch":"paris-juin-2026","legacyId":9,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"Bourse de Commerce - Pinault Collection","originalMeetingAddress":"2 Rue de Viarmes, 75001 Paris","originalLinkPresent":true,"declaredParticipantCount":8,"importedParticipantCount":8,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_010', '10', 'paris-juin-2026-010', '沿着圣但尼运河（Canal Saint-Denis）步行到圣但尼大教堂（Basilique Saint-Denis）的文化徒步/导览活动', '0欧

活动地点：Gare RER Cité universitaire
Boulevard Jourdan

75014 Paris

原始链接：https://www.eventbrite.fr/e/billets-le-canal-saint-denis-jusqua-la-basilique-1989780913275?utm_experiment=test_share_listing&aff=ebdsshios&sg=09584b3bb4cda8c92db50c6d9cc23a767be32d1eaa19f83f8216a39c695dc42b7b8c9080c22f25cfad5da41d5d92f76fd72be6f6d6b2bcc3f7288db46febe579f06e53112e42c5fbb36d2f56f8af', 'LOCAL', 'SPORTS', 'Paris', 'Cité universitaire
Boulevard Jourdan, 75014 Paris', '2026-06-06 15:00:00', '2026-06-06 19:00:00', 2, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.eventbrite.fr/e/billets-le-canal-saint-denis-jusqua-la-basilique-1989780913275?utm_experiment=test_share_listing&aff=ebdsshios&sg=09584b3bb4cda8c92db50c6d9cc23a767be32d1eaa19f83f8216a39c695dc42b7b8c9080c22f25cfad5da41d5d92f76fd72be6f6d6b2bcc3f7288db46febe579f06e53112e42c5fbb36d2f56f8af', '{"importBatch":"paris-juin-2026","legacyId":10,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"Gare RER Cité universitaire\nBoulevard Jourdan\n\n75014 Paris","originalMeetingAddress":"Cité universitaire\nBoulevard Jourdan, 75014 Paris","originalLinkPresent":true,"declaredParticipantCount":2,"importedParticipantCount":2,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_011', '11', 'paris-juin-2026-011', '2026白夜艺术节：巴赫的回响', '这场音乐会主要演奏的曲目是约翰·塞巴斯蒂安·巴赫（Johann Sebastian Bach）的双钢琴与三钢琴协奏曲（Concertos pour deux et trois pianos）。

在演出当晚，这几首古典协奏曲将在法兰西学会（Institut de France）的圆顶建筑下唱响，并通过音响和灯光技术在主庭院中进行回网和扩音。

原始链接：https://www.eventbrite.fr/e/billets-nuit-blanche-2026-bach-en-echo-1989002405738?utm_experiment=test_share_listing&aff=ebdsshios&sg=4834f73c5ee6ebaeab6ff3c7090b85049a678e2b96e523981ae6b3e44225e3058de3e62d730590c87e038f95bb52e8888affc3e3510bbffdb852cebf9bb8c73a4adefbda17c5d7ec762f5e4a61ba

导入复核：原表缺少活动地点，SQL 使用集合地点兜底。', 'LOCAL', 'EXHIBITION', 'Paris', '23 Quai de Conti, 75006 Paris', '2026-06-06 21:00:00', NULL, 4, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.eventbrite.fr/e/billets-nuit-blanche-2026-bach-en-echo-1989002405738?utm_experiment=test_share_listing&aff=ebdsshios&sg=4834f73c5ee6ebaeab6ff3c7090b85049a678e2b96e523981ae6b3e44225e3058de3e62d730590c87e038f95bb52e8888affc3e3510bbffdb852cebf9bb8c73a4adefbda17c5d7ec762f5e4a61ba', '{"importBatch":"paris-juin-2026","legacyId":11,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":null,"originalMeetingAddress":"23 Quai de Conti, 75006 Paris","originalLinkPresent":true,"declaredParticipantCount":4,"importedParticipantCount":4,"needsReview":true,"reviewNotes":["原表缺少活动地点，SQL 使用集合地点兜底。"]}'::jsonb),
  ('legacy_activity_012', '12', 'paris-juin-2026-012', '户外音乐节', '84欧

活动地点：We Love Green Festival 2026

原始链接：https://shotgun.live/festivals/we-love-green-2026

导入复核：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。', 'LOCAL', 'EXHIBITION', 'Paris', '12区，Bois de Vincennes', '2026-06-06 17:00:00', NULL, 1, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'james', 'legacy_org_james', 'James', 'https://shotgun.live/festivals/we-love-green-2026', '{"importBatch":"paris-juin-2026","legacyId":12,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"We Love Green Festival 2026","originalMeetingAddress":"12区，Bois de Vincennes","originalLinkPresent":true,"declaredParticipantCount":1,"importedParticipantCount":1,"needsReview":true,"reviewNotes":["原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。"]}'::jsonb),
  ('legacy_activity_013', '13', 'paris-juin-2026-013', 'De la Seine à la Seine par les Buttes du Parisis', '由自然保护机构举办的公益徒步，地点在巴黎西北郊的阿让特伊（Argenteuil）到萨特鲁维尔（Sartrouville）之间，主打“工业废墟变自然绿洲”的工业山丘改造风光与塞纳河畔的印象派足迹。
这是一场由“Enlarge your Paris”和“Île-de-France Nature”组织的17公里徒步活动，带领参与者从阿让特伊（Argenteuil）出发，穿过帕里西丘陵（Buttes du Parisis）并欣赏塞纳河谷的全景。耗时约6.5小时，从瓦兹河谷省的阿让特伊（Argenteuil）出发，终点位于萨特鲁维尔（Sartrouville）。路线的核心亮点是穿越帕里西丘陵（Buttes du Parisis）——这里曾是石膏采石场，经过大自然修复后，现已成为俯瞰塞纳河蜿蜒美景、拉德芳斯商务区以及巴黎全景的绝佳观景台。参与者将体验从城市街道到森林草地、再回到塞纳河畔印象派画作般景观的奇妙旅程，适合身体状况良好且喜爱自然风光的徒步爱好者。

活动地点：巴黎西北郊的瓦兹河谷省（Val-d''Oise）和伊夫林省（Yvelines），具体是一条沿着塞纳河畔和山丘展开的徒步路线。

原始链接：https://www.eventbrite.fr/e/billets-de-la-seine-a-la-seine-par-les-buttes-du-parisis-1990425784101?utm_experiment=test_share_listing&aff=ebdsshios&sg=4834f73c5ee6ebaeab6ff3c7090b85049a678e2b96e523981ae6b3e44225e3058de3e62d730590c87e038f95bb52e8888affc3e3510bbffdb852cebf9bb8c73a4adefbda17c5d7ec762f5e4a61ba', 'LOCAL', 'SPORTS', 'Paris', '1 Bd de la Résistance, 95100 Argenteuil', '2026-06-07 08:30:00', NULL, 2, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.eventbrite.fr/e/billets-de-la-seine-a-la-seine-par-les-buttes-du-parisis-1990425784101?utm_experiment=test_share_listing&aff=ebdsshios&sg=4834f73c5ee6ebaeab6ff3c7090b85049a678e2b96e523981ae6b3e44225e3058de3e62d730590c87e038f95bb52e8888affc3e3510bbffdb852cebf9bb8c73a4adefbda17c5d7ec762f5e4a61ba', '{"importBatch":"paris-juin-2026","legacyId":13,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"巴黎西北郊的瓦兹河谷省（Val-d''Oise）和伊夫林省（Yvelines），具体是一条沿着塞纳河畔和山丘展开的徒步路线。","originalMeetingAddress":"1 Bd de la Résistance, 95100 Argenteuil","originalLinkPresent":true,"declaredParticipantCount":2,"importedParticipantCount":2,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_014', '14', 'paris-juin-2026-014', '夜跑山地9公里“燃脂”路线', '一条约 9 公里的环形路线，累计爬升（D+）近 140 米。它将穿梭于巴黎市中心的街道，并带我们挑战那些通往蒙马特高地（la butte）的标志性上坡。这条路线节奏紧凑，我们将接连迎来台阶、缓坡和制高点，最后再一路下行，返回玛黑区（le Marais）。 une boucle d’environ 9 km avec près de 140 m de D+, entre les rues du centre de Paris et les montées iconiques vers les hauteurs de la butte. Un tracé rythmé qui nous fera enchaîner escaliers, faux plats et points hauts avant de redescendre vers le Marais.

活动地点：蒙马特高地

原始链接：https://www.eventbrite.se/e/fjallmaraton-100-warm-up-run-2-klattermusen-paris-tickets-1983770414712?utm_experiment=test_share_listing&aff=ebdsshios&sg=4ed62da59a536ad2c61627aebb4f8f40ed3cc804ad93c15ea587d9d8fddaf11aff6421496164c46427071fa16a79571e951f1a17c25162bb035f72c88a99fb1a3755ca405365ef703d544153d231', 'LOCAL', 'SPORTS', 'Paris', 'Klättermusen Paris — 103 rue du Temple', '2026-06-12 16:30:00', NULL, 2, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'james', 'legacy_org_james', 'James', 'https://www.eventbrite.se/e/fjallmaraton-100-warm-up-run-2-klattermusen-paris-tickets-1983770414712?utm_experiment=test_share_listing&aff=ebdsshios&sg=4ed62da59a536ad2c61627aebb4f8f40ed3cc804ad93c15ea587d9d8fddaf11aff6421496164c46427071fa16a79571e951f1a17c25162bb035f72c88a99fb1a3755ca405365ef703d544153d231', '{"importBatch":"paris-juin-2026","legacyId":14,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"蒙马特高地","originalMeetingAddress":"Klättermusen Paris — 103 rue du Temple","originalLinkPresent":true,"declaredParticipantCount":2,"importedParticipantCount":2,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_015', '15', 'paris-juin-2026-015', '大皇宫 舞蹈表演+音乐会', '15欧 (连音乐会一块买，25欧)

活动地点：Derniers Feux

原始链接：https://www.grandpalais.fr/fr/programme/nemo-flouret-derniers-feux', 'LOCAL', 'EXHIBITION', 'Paris', '大皇宫', '2026-06-13 18:30:00', NULL, 1, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'james', 'legacy_org_james', 'James', 'https://www.grandpalais.fr/fr/programme/nemo-flouret-derniers-feux', '{"importBatch":"paris-juin-2026","legacyId":15,"originalStatus":"Past","originalType":"🎨 文化","originalVenue":"Derniers Feux","originalMeetingAddress":"大皇宫","originalLinkPresent":true,"declaredParticipantCount":1,"importedParticipantCount":1,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_016', '16', 'paris-juin-2026-016', '参观巨石阵 徒步日：5km/10km 趣味走', '这场活动是由卡米耶·克洛岱尔博物馆（Musée Camille Claudel）组织的文化徒步之旅，结合了自然运动与考古发现。
• 一句话介绍： 这是一场从卡米耶·克洛岱尔博物馆出发，前往探寻圣奥班（Saint-Aubin）史前巨石遗迹并品尝新石器时代特色食品的5公里/10公里徒步活动。
• 活动特点：
• 文化与运动结合： 在徒步锻炼的同时，有专家讲解诺让地区的巨石文化奥秘。
• 沉浸式体验： 活动包含当地特色产品品尝，特别设计了模拟“新石器时代饮食”的体验。
• 便捷服务： 提供从博物馆到出发点的接驳车。
• 适合什么人参加：
• 所有年龄段： 网页标注适合所有年龄段（all ages），提供5公里和10公里两种长度，灵活性高。
• 考古与历史爱好者： 对史前遗迹、巨石文化感兴趣的人。
• 家庭与休闲游客： 想要体验当地风味并进行轻松户外活动的人群。

活动地点：10 Rue Gustave Flaubert
10400 Nogent-sur-Seine

原始链接：https://www.eventbrite.fr/e/randonnee-pedestre-5-km-et-10-km-tickets-1987822236821?utm_experiment=test_share_listing&aff=ebdsshios&sg=09584b3bb4cda8c92db50c6d9cc23a767be32d1eaa19f83f8216a39c695dc42b7b8c9080c22f25cfad5da41d5d92f76fd72be6f6d6b2bcc3f7288db46febe579f06e53112e42c5fbb36d2f56f8af', 'LOCAL', 'SPORTS', 'Paris', 'RDV à 10h30 dans la cour du musée Camille Claudel, 10 Rue Gustave Flaubert, 10400 Nogent-sur-Seine pour un départ en navette vers Saint-Aubin ou directement au parking de l''église de Saint-Aubin à 11h.', '2026-06-14 08:30:00', NULL, 2, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.eventbrite.fr/e/randonnee-pedestre-5-km-et-10-km-tickets-1987822236821?utm_experiment=test_share_listing&aff=ebdsshios&sg=09584b3bb4cda8c92db50c6d9cc23a767be32d1eaa19f83f8216a39c695dc42b7b8c9080c22f25cfad5da41d5d92f76fd72be6f6d6b2bcc3f7288db46febe579f06e53112e42c5fbb36d2f56f8af', '{"importBatch":"paris-juin-2026","legacyId":16,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"10 Rue Gustave Flaubert\n10400 Nogent-sur-Seine","originalMeetingAddress":"RDV à 10h30 dans la cour du musée Camille Claudel, 10 Rue Gustave Flaubert, 10400 Nogent-sur-Seine pour un départ en navette vers Saint-Aubin ou directement au parking de l''église de Saint-Aubin à 11h.","originalLinkPresent":true,"declaredParticipantCount":2,"importedParticipantCount":2,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_017', '17', 'paris-juin-2026-017', '唱 跳 RAP 干饭', '吃饭加唱歌

活动地点：阿里郎/面对面

导入复核：原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。', 'LOCAL', 'FOOD', 'Paris', '晚上', '2026-06-06 17:00:00', NULL, 11, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', 'hoting', 'legacy_org_hoting', 'Hoting', NULL, '{"importBatch":"paris-juin-2026","legacyId":17,"originalStatus":"Past","originalType":"🍷 聚餐","originalVenue":"阿里郎/面对面","originalMeetingAddress":"晚上","originalLinkPresent":false,"declaredParticipantCount":11,"importedParticipantCount":10,"needsReview":true,"reviewNotes":["原表缺少集合时间，SQL 暂按巴黎时间 19:00 导入。"]}'::jsonb),
  ('legacy_activity_018', '18', 'paris-juin-2026-018', 'sherwood parc CS+午餐野餐+爬树', '早上9点45在gare du nord集合，然后一起坐10:04的H线过去。大家各自带点吃的去那边野个餐，先CS然后吃完饭可以玩一个下午（爬树/迷宫...）

活动地点：Chemin des Rouliers
95270 VIARMES

原始链接：https://www.sherwoodparc.com', 'LOCAL', 'SPORTS', 'Paris', 'Gare du nord', '2026-06-13 07:45:00', NULL, 6, 'AA', '以原组局说明为准', 'ENDED', 'PUBLIC', '张杠杠', 'legacy_org_zhangganggang', '张杠杠', 'https://www.sherwoodparc.com', '{"importBatch":"paris-juin-2026","legacyId":18,"originalStatus":"Past","originalType":"👟 运动","originalVenue":"Chemin des Rouliers\n95270 VIARMES","originalMeetingAddress":"Gare du nord","originalLinkPresent":true,"declaredParticipantCount":6,"importedParticipantCount":6,"needsReview":false,"reviewNotes":[]}'::jsonb),
  ('legacy_activity_019', '19', 'paris-juin-2026-019', '夜间城市徒步：戴高乐主题', '巴黎徒步协会（FFRandonnée Paris）组织的追随戴高乐将军的足迹（Dans les pas de DE GAULLE, un Général pas comme les autres）星期四（恰逢戴高乐发表著名的《六一八宣言》纪念日）19:00 于 地铁 12号线 Notre Dame des Champs 站
• 终点位置：约 22:00 抵达 地铁 1号线/13号线 Champs-Élysées - Clemenceau 站
• 路线长度：约 7.5 公里（沿途包含历史文化讲解）

原始链接：https://www.rando-paris.org/panamee

导入复核：原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。', 'LOCAL', 'SPORTS', 'Paris', '地铁 12号线 Notre Dame des Champs 站', '2026-06-18 17:00:00', NULL, 5, 'AA', '以原组局说明为准', 'CONFIRMED', 'PUBLIC', 'louise', 'legacy_org_louise', 'Louise', 'https://www.rando-paris.org/panamee', '{"importBatch":"paris-juin-2026","legacyId":19,"originalStatus":"Going","originalType":"👟 运动","originalVenue":"地铁 12号线 Notre Dame des Champs 站","originalMeetingAddress":null,"originalLinkPresent":true,"declaredParticipantCount":5,"importedParticipantCount":5,"needsReview":true,"reviewNotes":["原表缺少集合地点，SQL 使用活动地点或 Paris 兜底。"]}'::jsonb);

CREATE TABLE legacy_import_guest_participants (
  guest_id text PRIMARY KEY,
  activity_id text NOT NULL,
  display_name text NOT NULL,
  wechat_id text,
  normalized_wechat_id text,
  message text,
  status text NOT NULL,
  joined_at timestamp NOT NULL
);

INSERT INTO legacy_import_guest_participants (guest_id, activity_id, display_name, wechat_id, normalized_wechat_id, message, status, joined_at) VALUES
  ('legacy_guest_001_001', 'legacy_activity_001', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-15 18:00:00'),
  ('legacy_guest_001_002', 'legacy_activity_001', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-15 18:00:00'),
  ('legacy_guest_001_003', 'legacy_activity_001', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-05-15 18:00:00'),
  ('legacy_guest_001_004', 'legacy_activity_001', '二十八君', 'GodinNutshell', 'godinnutshell', '历史真实组局导入', 'APPROVED', '2026-05-15 18:00:00'),
  ('legacy_guest_001_005', 'legacy_activity_001', '咔嗒', NULL, NULL, '历史真实组局导入', 'APPROVED', '2026-05-15 18:00:00'),
  ('legacy_guest_002_001', 'legacy_activity_002', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_002_002', 'legacy_activity_002', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_002_003', 'legacy_activity_002', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_002_004', 'legacy_activity_002', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_002_005', 'legacy_activity_002', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_002_006', 'legacy_activity_002', '二十八君', 'GodinNutshell', 'godinnutshell', '历史真实组局导入', 'APPROVED', '2026-05-16 13:00:00'),
  ('legacy_guest_003_001', 'legacy_activity_003', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-21 17:30:00'),
  ('legacy_guest_003_002', 'legacy_activity_003', '咔嗒', NULL, NULL, '历史真实组局导入', 'APPROVED', '2026-05-21 17:30:00'),
  ('legacy_guest_003_003', 'legacy_activity_003', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-21 17:30:00'),
  ('legacy_guest_003_004', 'legacy_activity_003', '烤粒子', 'YANGx6219', 'yangx6219', '历史真实组局导入', 'APPROVED', '2026-05-21 17:30:00'),
  ('legacy_guest_004_001', 'legacy_activity_004', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-23 17:00:00'),
  ('legacy_guest_004_002', 'legacy_activity_004', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-23 17:00:00'),
  ('legacy_guest_004_003', 'legacy_activity_004', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-05-23 17:00:00'),
  ('legacy_guest_004_004', 'legacy_activity_004', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '历史真实组局导入', 'APPROVED', '2026-05-23 17:00:00'),
  ('legacy_guest_004_005', 'legacy_activity_004', '荼蘼', 'uneshrish', 'uneshrish', '历史真实组局导入', 'APPROVED', '2026-05-23 17:00:00'),
  ('legacy_guest_005_001', 'legacy_activity_005', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_005_002', 'legacy_activity_005', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_005_003', 'legacy_activity_005', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_005_004', 'legacy_activity_005', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_005_005', 'legacy_activity_005', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_005_006', 'legacy_activity_005', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-05-27 17:00:00'),
  ('legacy_guest_006_001', 'legacy_activity_006', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_006_002', 'legacy_activity_006', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_006_003', 'legacy_activity_006', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_006_004', 'legacy_activity_006', '咔嗒', NULL, NULL, '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_006_005', 'legacy_activity_006', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_006_006', 'legacy_activity_006', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-05-29 17:00:00'),
  ('legacy_guest_007_001', 'legacy_activity_007', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_007_002', 'legacy_activity_007', 'nicky', 'A15611231096', 'a15611231096', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_007_003', 'legacy_activity_007', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_007_004', 'legacy_activity_007', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_007_005', 'legacy_activity_007', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_007_006', 'legacy_activity_007', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-30 16:00:00'),
  ('legacy_guest_008_001', 'legacy_activity_008', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-05-31 12:00:00'),
  ('legacy_guest_008_002', 'legacy_activity_008', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-05-31 12:00:00'),
  ('legacy_guest_009_001', 'legacy_activity_009', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_002', 'legacy_activity_009', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_003', 'legacy_activity_009', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_004', 'legacy_activity_009', 'Jin', 'FuhaiPARIS1et2', 'fuhaiparis1et2', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_005', 'legacy_activity_009', '荼蘼', 'uneshrish', 'uneshrish', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_006', 'legacy_activity_009', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_007', 'legacy_activity_009', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_009_008', 'legacy_activity_009', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '历史真实组局导入', 'APPROVED', '2026-06-06 15:30:00'),
  ('legacy_guest_010_001', 'legacy_activity_010', 'Jin', 'FuhaiPARIS1et2', 'fuhaiparis1et2', '历史真实组局导入', 'APPROVED', '2026-06-06 15:00:00'),
  ('legacy_guest_010_002', 'legacy_activity_010', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-06-06 15:00:00'),
  ('legacy_guest_011_001', 'legacy_activity_011', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-06 21:00:00'),
  ('legacy_guest_011_002', 'legacy_activity_011', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-06-06 21:00:00'),
  ('legacy_guest_011_003', 'legacy_activity_011', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-06-06 21:00:00'),
  ('legacy_guest_011_004', 'legacy_activity_011', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-06 21:00:00'),
  ('legacy_guest_012_001', 'legacy_activity_012', 'James', 'univasity', 'univasity', '历史真实组局导入；备注：原表参与人名单少于参加人数，导入时补入发起人。', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_013_001', 'legacy_activity_013', 'James', 'univasity', 'univasity', '历史真实组局导入；备注：抢票了, 同样看前天情况', 'APPROVED', '2026-06-07 08:30:00'),
  ('legacy_guest_013_002', 'legacy_activity_013', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入；备注：原表参与人名单少于参加人数，导入时补入发起人。', 'APPROVED', '2026-06-07 08:30:00'),
  ('legacy_guest_014_001', 'legacy_activity_014', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-12 16:30:00'),
  ('legacy_guest_014_002', 'legacy_activity_014', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-12 16:30:00'),
  ('legacy_guest_015_001', 'legacy_activity_015', 'James', 'univasity', 'univasity', '历史真实组局导入；备注：原表参与人名单少于参加人数，导入时补入发起人。', 'APPROVED', '2026-06-13 18:30:00'),
  ('legacy_guest_016_001', 'legacy_activity_016', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-14 08:30:00'),
  ('legacy_guest_016_002', 'legacy_activity_016', 'James', 'univasity', 'univasity', '历史真实组局导入；备注：6月中估计热起来了？貌似那地没啥树木遮盖 Louise：看天气吧 下雨直接拜拜 先抢个位子', 'APPROVED', '2026-06-14 08:30:00'),
  ('legacy_guest_017_001', 'legacy_activity_017', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_002', 'legacy_activity_017', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_003', 'legacy_activity_017', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_004', 'legacy_activity_017', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_005', 'legacy_activity_017', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_006', 'legacy_activity_017', 'Jin', 'FuhaiPARIS1et2', 'fuhaiparis1et2', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_007', 'legacy_activity_017', '👀', 'w0218_w', 'w0218_w', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_008', 'legacy_activity_017', '荼蘼', 'uneshrish', 'uneshrish', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_009', 'legacy_activity_017', '二十八君', 'GodinNutshell', 'godinnutshell', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_017_010', 'legacy_activity_017', '醒睡二象性', 'ADEL_666_', 'adel_666_', '历史真实组局导入', 'APPROVED', '2026-06-06 17:00:00'),
  ('legacy_guest_018_001', 'legacy_activity_018', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_018_002', 'legacy_activity_018', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_018_003', 'legacy_activity_018', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_018_004', 'legacy_activity_018', 'Hoting', 'qhan017', 'qhan017', '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_018_005', 'legacy_activity_018', 'NickJY', NULL, NULL, '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_018_006', 'legacy_activity_018', 'lcj', 'MeowCoDing', 'meowcoding', '历史真实组局导入', 'APPROVED', '2026-06-13 07:45:00'),
  ('legacy_guest_019_001', 'legacy_activity_019', 'Louise', 'P555-555-555', 'p555-555-555', '历史真实组局导入', 'APPROVED', '2026-06-18 17:00:00'),
  ('legacy_guest_019_002', 'legacy_activity_019', '张杠杠', 'fightingzgg918', 'fightingzgg918', '历史真实组局导入', 'APPROVED', '2026-06-18 17:00:00'),
  ('legacy_guest_019_003', 'legacy_activity_019', '烤粒子', 'YANGx6219', 'yangx6219', '历史真实组局导入', 'APPROVED', '2026-06-18 17:00:00'),
  ('legacy_guest_019_004', 'legacy_activity_019', 'James', 'univasity', 'univasity', '历史真实组局导入', 'APPROVED', '2026-06-18 17:00:00'),
  ('legacy_guest_019_005', 'legacy_activity_019', '荼蘼', 'uneshrish', 'uneshrish', '历史真实组局导入', 'APPROVED', '2026-06-18 17:00:00');

-- 1) Create preview organizer profiles only when no active profile with the same nickname exists.
INSERT INTO "UserProfile" (
  "id", "clerkUserId", "nickname", "status", "role", "syncedAt", "createdAt", "updatedAt"
)
SELECT
  o.profile_id,
  o.clerk_user_id,
  o.nickname,
  'ACTIVE'::"UserProfileStatus",
  'USER'::"UserRole",
  NOW(), NOW(), NOW()
FROM legacy_import_organizers o
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserProfile" u
  WHERE u."status" = 'ACTIVE'::"UserProfileStatus"
    AND LOWER(TRIM(u."nickname")) = LOWER(TRIM(o.nickname))
)
ON CONFLICT ("id") DO UPDATE SET
  "nickname" = EXCLUDED."nickname",
  "updatedAt" = NOW();

-- 2) Upsert legacy activities as real Activity rows.
INSERT INTO "Activity" (
  "id", "title", "description", "itinerary", "type", "category", "city", "destination",
  "address", "latitude", "longitude", "startAt", "endAt", "capacity", "minParticipants",
  "requiresApproval", "priceType", "priceText", "coverImageUrl", "ticketUrl", "ticketLabel",
  "source", "sourceUrl", "externalSource", "externalId", "externalUrl", "sourcePayload",
  "importedAt", "status", "visibility", "shareEnabled", "shareToken", "organizerId",
  "publicEventId", "merchantId", "createdAt", "updatedAt"
)
SELECT
  a.activity_id,
  a.title,
  a.description,
  NULL,
  a.activity_type::"ActivityType",
  a.category::"ActivityCategory",
  a.city,
  NULL,
  a.address,
  NULL,
  NULL,
  a.start_at,
  a.end_at,
  a.capacity,
  NULL,
  FALSE,
  a.price_type::"PriceType",
  a.price_text,
  NULL,
  NULL,
  NULL,
  'legacy-nextfun-xlsx',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  a.status::"ActivityStatus",
  a.visibility::"ActivityVisibility",
  FALSE,
  NULL,
  COALESCE(
    (SELECT u."id"
     FROM "UserProfile" u
     WHERE u."status" = 'ACTIVE'::"UserProfileStatus"
       AND LOWER(TRIM(u."nickname")) = LOWER(TRIM(a.organizer_nickname))
     ORDER BY CASE WHEN u."clerkUserId" LIKE 'legacy-preview-organizer:%' THEN 1 ELSE 0 END, u."createdAt" ASC
     LIMIT 1),
    a.organizer_profile_id
  ),
  NULL,
  NULL,
  NOW(),
  NOW()
FROM legacy_import_activities a
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "type" = EXCLUDED."type",
  "category" = EXCLUDED."category",
  "city" = EXCLUDED."city",
  "address" = EXCLUDED."address",
  "startAt" = EXCLUDED."startAt",
  "endAt" = EXCLUDED."endAt",
  "capacity" = EXCLUDED."capacity",
  "priceType" = EXCLUDED."priceType",
  "priceText" = EXCLUDED."priceText",
  "source" = EXCLUDED."source",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "externalSource" = EXCLUDED."externalSource",
  "externalId" = EXCLUDED."externalId",
  "externalUrl" = EXCLUDED."externalUrl",
  "sourcePayload" = EXCLUDED."sourcePayload",
  "importedAt" = EXCLUDED."importedAt",
  "status" = EXCLUDED."status",
  "visibility" = EXCLUDED."visibility",
  "organizerId" = EXCLUDED."organizerId",
  "updatedAt" = NOW();

-- 3) Insert participant rows as guest participants. They can be linked later by matching WeChat ID.
INSERT INTO "GuestActivityParticipant" (
  "id", "activityId", "displayName", "phone", "normalizedPhone", "email", "normalizedEmail",
  "wechatId", "normalizedWechatId", "message", "status", "sourceLocale", "sourceUserAgent",
  "sourceFingerprint", "joinedAt", "cancelledAt", "linkedAt", "linkedUserProfileId",
  "linkedParticipantId", "createdAt", "updatedAt"
)
SELECT
  p.guest_id,
  p.activity_id,
  p.display_name,
  NULL,
  NULL,
  NULL,
  NULL,
  p.wechat_id,
  p.normalized_wechat_id,
  p.message,
  p.status::"ParticipantStatus",
  'zh-CN',
  'legacy-xlsx-import:paris-juin-2026',
  'legacy-xlsx:paris-juin-2026',
  p.joined_at,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM legacy_import_guest_participants p
JOIN "Activity" a ON a."id" = p.activity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM "GuestActivityParticipant" g
  WHERE g."activityId" = p.activity_id
    AND (
      (p.normalized_wechat_id IS NOT NULL AND g."normalizedWechatId" = p.normalized_wechat_id)
      OR (p.normalized_wechat_id IS NULL AND g."displayName" = p.display_name)
      OR g."id" = p.guest_id
    )
)
ON CONFLICT DO NOTHING;

-- 4) Final summary. Supabase SQL Editor usually displays only the last result set.
-- Expected:
-- - legacy activities = 19
-- - legacy guest participants = 83
-- - visible to lobby query = 19
-- - activity public info match = 0
-- - suspicious public event duplicate = 0
WITH legacy_activity_summary AS (
  SELECT
    COUNT(*) AS legacy_activity_count,
    COUNT(*) FILTER (
      WHERE a."visibility" = 'PUBLIC'
        AND a."type" <> 'PUBLIC_EVENT'
        AND a."status" IN ('OPEN', 'RECRUITING', 'CONFIRMED', 'ENDED')
        AND u."status" = 'ACTIVE'
    ) AS visible_to_lobby_query,
    COUNT(*) FILTER (
      WHERE a."publicEventId" IS NULL
        AND (
          a."id" ILIKE 'playinparis_%'
          OR a."id" ILIKE 'sortiraparis_%'
          OR a."id" ILIKE 'paris-opendata_%'
          OR a."id" ILIKE 'paris_open_data_%'
          OR a."id" ILIKE 'feverup_%'
          OR a."source" ILIKE '%playinparis%'
          OR a."source" ILIKE '%sortiraparis%'
          OR a."source" ILIKE '%paris-opendata%'
          OR a."source" ILIKE '%opendata.paris.fr%'
          OR a."source" ILIKE '%feverup%'
          OR a."sourceUrl" ILIKE '%playinparis%'
          OR a."sourceUrl" ILIKE '%sortiraparis%'
          OR a."sourceUrl" ILIKE '%paris-opendata%'
          OR a."sourceUrl" ILIKE '%opendata.paris.fr%'
          OR a."sourceUrl" ILIKE '%feverup%'
          OR a."externalUrl" ILIKE '%playinparis%'
          OR a."externalUrl" ILIKE '%sortiraparis%'
          OR a."externalUrl" ILIKE '%paris-opendata%'
          OR a."externalUrl" ILIKE '%opendata.paris.fr%'
          OR a."externalUrl" ILIKE '%feverup%'
          OR a."externalSource" IS NOT NULL
          OR a."externalId" IS NOT NULL
          OR a."externalUrl" IS NOT NULL
          OR a."importedAt" IS NOT NULL
        )
    ) AS activity_public_info_match
  FROM "Activity" a
  LEFT JOIN "UserProfile" u ON u."id" = a."organizerId"
  WHERE a."source" = 'legacy-nextfun-xlsx'
),
legacy_guest_summary AS (
  SELECT COUNT(*) AS legacy_guest_participant_count
  FROM "GuestActivityParticipant"
  WHERE "sourceUserAgent" = 'legacy-xlsx-import:paris-juin-2026'
),
suspicious_public_event_summary AS (
  SELECT COUNT(*) AS suspicious_public_event_duplicate_count
  FROM "PublicEvent"
  WHERE "id" LIKE 'legacy_activity_%'
     OR "id" LIKE 'legacy_%'
     OR "title" IN (SELECT "title" FROM "Activity" WHERE "source" = 'legacy-nextfun-xlsx')
)
SELECT item, count, expected
FROM (
  SELECT 1 AS sort_order, 'legacy activities' AS item, legacy_activity_count::bigint AS count, '19' AS expected
  FROM legacy_activity_summary
  UNION ALL
  SELECT 2, 'legacy guest participants', legacy_guest_participant_count::bigint, '83'
  FROM legacy_guest_summary
  UNION ALL
  SELECT 3, 'visible to lobby query', visible_to_lobby_query::bigint, '19'
  FROM legacy_activity_summary
  UNION ALL
  SELECT 4, 'activity public info match', activity_public_info_match::bigint, '0'
  FROM legacy_activity_summary
  UNION ALL
  SELECT 5, 'suspicious public event duplicate', suspicious_public_event_duplicate_count::bigint, '0'
  FROM suspicious_public_event_summary
) summary
ORDER BY sort_order;

DROP TABLE IF EXISTS legacy_import_guest_participants;
DROP TABLE IF EXISTS legacy_import_activities;
DROP TABLE IF EXISTS legacy_import_organizers;

COMMIT;

-- Optional rollback, only run manually if you need to remove this import batch:
-- BEGIN;
-- DELETE FROM "GuestActivityParticipant" WHERE "sourceUserAgent" = 'legacy-xlsx-import:paris-juin-2026';
-- DELETE FROM "Activity" WHERE "source" = 'legacy-nextfun-xlsx';
-- DELETE FROM "UserProfile" u WHERE u."clerkUserId" LIKE 'legacy-preview-organizer:%' AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id");
-- COMMIT;
```
