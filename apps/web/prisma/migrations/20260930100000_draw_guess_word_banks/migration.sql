CREATE TABLE "public"."DrawGuessWordBank" (
    "id" VARCHAR(64) NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "category" VARCHAR(80),
    "title" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "words" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawGuessWordBank_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DrawGuessWordBank_title_required" CHECK (btrim("title") <> ''),
    CONSTRAINT "DrawGuessWordBank_words_required" CHECK (cardinality("words") > 0)
);

CREATE UNIQUE INDEX "DrawGuessWordBank_locale_title_key"
ON "public"."DrawGuessWordBank"("locale", "title");

CREATE INDEX "DrawGuessWordBank_locale_isActive_sortOrder_idx"
ON "public"."DrawGuessWordBank"("locale", "isActive", "sortOrder");

ALTER TABLE "public"."GameToolRoom" ADD COLUMN "wordBankId" VARCHAR(64);

CREATE INDEX "GameToolRoom_wordBankId_idx"
ON "public"."GameToolRoom"("wordBankId");

ALTER TABLE "public"."GameToolRoom"
ADD CONSTRAINT "GameToolRoom_wordBankId_fkey"
FOREIGN KEY ("wordBankId") REFERENCES "public"."DrawGuessWordBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "public"."DrawGuessWordBank" ("id", "locale", "category", "title", "description", "words", "sortOrder") VALUES
('daily-zh', 'zh-CN', '日常生活', '日常小画家', '熟悉的物品和场景，适合第一次开局。', ARRAY[
  '雨伞','台灯','闹钟','牙刷','拖鞋','书包','钥匙','门铃','眼镜','手表',
  '水杯','茶壶','电饭煲','微波炉','冰箱','洗衣机','吹风机','沙发','枕头','被子',
  '窗帘','花瓶','镜子','扫把','拖把','垃圾桶','购物车','自行车','公交车','地铁',
  '红绿灯','斑马线','咖啡杯','生日蛋糕','礼物盒','风筝','气球','滑板','耳机','电脑',
  '手机','相机','铅笔','画笔','足球','篮球','游泳圈','帐篷','背包','行李箱'
]::TEXT[], 0),
('animals-zh', 'zh-CN', '动物', '动物朋友', '从猫咪到海洋生物，画出你认识的动物。', ARRAY[
  '猫咪','小狗','兔子','熊猫','长颈鹿','大象','狮子','老虎','斑马','猴子',
  '狐狸','狼','熊','考拉','袋鼠','河马','犀牛','骆驼','松鼠','刺猬',
  '水獭','海豚','鲸鱼','鲨鱼','海龟','章鱼','螃蟹','水母','企鹅','海豹',
  '北极熊','猫头鹰','鹦鹉','孔雀','天鹅','火烈鸟','啄木鸟','鸵鸟','蝴蝶','蜜蜂',
  '蜻蜓','瓢虫','蚂蚁','蜗牛','青蛙','鳄鱼','变色龙','恐龙','独角兽','龙'
]::TEXT[], 1),
('daily-en', 'en', 'Everyday', 'Everyday Sketches', 'Familiar things and places for an easy first round.', ARRAY[
  'umbrella','lamp','alarm clock','toothbrush','slippers','backpack','key','doorbell','glasses','watch',
  'cup','teapot','rice cooker','microwave','fridge','washing machine','hair dryer','sofa','pillow','blanket',
  'curtains','vase','mirror','broom','mop','trash can','shopping cart','bicycle','bus','subway',
  'traffic light','crosswalk','coffee cup','birthday cake','gift box','kite','balloon','skateboard','headphones','computer',
  'phone','camera','pencil','paintbrush','soccer ball','basketball','swim ring','tent','suitcase','lunch box'
]::TEXT[], 0),
('animals-en', 'en', 'Animals', 'Animal Friends', 'Pets, wildlife, birds, and sea creatures.', ARRAY[
  'cat','dog','rabbit','panda','giraffe','elephant','lion','tiger','zebra','monkey',
  'fox','wolf','bear','koala','kangaroo','hippo','rhino','camel','squirrel','hedgehog',
  'otter','dolphin','whale','shark','sea turtle','octopus','crab','jellyfish','penguin','seal',
  'polar bear','owl','parrot','peacock','swan','flamingo','woodpecker','ostrich','butterfly','bee',
  'dragonfly','ladybug','ant','snail','frog','crocodile','chameleon','dinosaur','unicorn','dragon'
]::TEXT[], 1),
('daily-fr', 'fr', 'Quotidien', 'Dessins du quotidien', 'Des objets et des lieux familiers pour commencer.', ARRAY[
  'parapluie','lampe','réveil','brosse à dents','pantoufles','sac à dos','clé','sonnette','lunettes','montre',
  'tasse','théière','cuiseur à riz','micro-ondes','frigo','machine à laver','sèche-cheveux','canapé','oreiller','couverture',
  'rideaux','vase','miroir','balai','serpillière','poubelle','caddie','vélo','bus','métro',
  'feu tricolore','passage piéton','tasse de café','gâteau','cadeau','cerf-volant','ballon','skateboard','casque audio','ordinateur',
  'téléphone','appareil photo','crayon','pinceau','ballon de foot','basket','bouée','tente','valise','boîte repas'
]::TEXT[], 0),
('animals-fr', 'fr', 'Animaux', 'Amis des animaux', 'Des animaux familiers, sauvages et marins.', ARRAY[
  'chat','chien','lapin','panda','girafe','éléphant','lion','tigre','zèbre','singe',
  'renard','loup','ours','koala','kangourou','hippopotame','rhinocéros','chameau','écureuil','hérisson',
  'loutre','dauphin','baleine','requin','tortue de mer','pieuvre','crabe','méduse','manchot','phoque',
  'ours polaire','hibou','perroquet','paon','cygne','flamant rose','pic-vert','autruche','papillon','abeille',
  'libellule','coccinelle','fourmi','escargot','grenouille','crocodile','caméléon','dinosaure','licorne','dragon'
]::TEXT[], 1)
ON CONFLICT ("id") DO NOTHING;
