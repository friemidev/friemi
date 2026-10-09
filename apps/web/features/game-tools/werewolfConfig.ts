export const werewolfRoleKeys = [
  "bear",
  "big_bad_wolf",
  "cupid",
  "dream_catcher",
  "elder",
  "fox",
  "gravedigger",
  "guard",
  "hunter",
  "hybrid",
  "idiot",
  "knight",
  "little_girl",
  "lovers",
  "magician",
  "mechanical_wolf",
  "nightmare_shadow",
  "pied_piper",
  "seer",
  "silencing_elder",
  "thief",
  "villager",
  "wild_child",
  "werewolf",
  "white_wolf_king",
  "witch",
  "wolf_beauty",
  "wolf_king",
] as const;

export type WerewolfRoleKey = (typeof werewolfRoleKeys)[number];
export type WerewolfRoleLocale = "en" | "fr" | "zh-CN";

export const werewolfExtendedRoleKeys = [
  "bear",
  "big_bad_wolf",
  "dream_catcher",
  "elder",
  "fox",
  "gravedigger",
  "hybrid",
  "little_girl",
  "magician",
  "mechanical_wolf",
  "nightmare_shadow",
  "pied_piper",
  "silencing_elder",
  "thief",
  "wild_child",
  "wolf_beauty",
] as const satisfies readonly WerewolfRoleKey[];

export type WerewolfAlignment = "good" | "third_party" | "werewolf";

export type WerewolfVariantKey =
  | "eight_player_basic"
  | "nine_player_basic"
  | "seven_player_basic"
  | "ten_player_seer_witch_hunter"
  | "twelve_player_guard_wolf_king"
  | "twelve_player_idiot"
  | "custom";

export type WerewolfVariant = {
  enabled: boolean;
  judgeSeatNumber: number;
  key: WerewolfVariantKey;
  labels: Record<string, string>;
  playerSeatCount: number;
  roles: WerewolfRoleKey[];
  totalSeats: number;
};

export type WerewolfPrivatePayload = {
  alignmentLabel: string;
  roleDescription: string;
  roleKey: WerewolfRoleKey;
  roleLabel: string;
  variantLabel: string;
};

type WerewolfRoleCopy = {
  alignmentLabels: Record<WerewolfAlignment, string>;
  roleDescriptions: Record<WerewolfRoleKey, string>;
  roleLabels: Record<WerewolfRoleKey, string>;
};

export const werewolfToolPath = "/game-tools/werewolf";

export function getWerewolfPlayerJudgeLabel(
  locale: string,
  playerSeatCount: number,
) {
  if (locale === "fr") {
    return `${playerSeatCount} joueurs + maître`;
  }

  if (locale === "en") {
    return `${playerSeatCount} players + judge`;
  }

  return `${playerSeatCount}人+法官`;
}

export const werewolfVariants: WerewolfVariant[] = [
  {
    enabled: true,
    judgeSeatNumber: 7,
    key: "seven_player_basic",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 6),
      en: getWerewolfPlayerJudgeLabel("en", 6),
      fr: getWerewolfPlayerJudgeLabel("fr", 6),
    },
    playerSeatCount: 6,
    roles: ["werewolf", "werewolf", "seer", "witch", "villager", "villager"],
    totalSeats: 7,
  },
  {
    enabled: true,
    judgeSeatNumber: 8,
    key: "eight_player_basic",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 7),
      en: getWerewolfPlayerJudgeLabel("en", 7),
      fr: getWerewolfPlayerJudgeLabel("fr", 7),
    },
    playerSeatCount: 7,
    roles: [
      "werewolf",
      "werewolf",
      "seer",
      "witch",
      "hunter",
      "villager",
      "villager",
    ],
    totalSeats: 8,
  },
  {
    enabled: true,
    judgeSeatNumber: 9,
    key: "nine_player_basic",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 8),
      en: getWerewolfPlayerJudgeLabel("en", 8),
      fr: getWerewolfPlayerJudgeLabel("fr", 8),
    },
    playerSeatCount: 8,
    roles: [
      "werewolf",
      "werewolf",
      "werewolf",
      "seer",
      "witch",
      "hunter",
      "villager",
      "villager",
    ],
    totalSeats: 9,
  },
  {
    enabled: true,
    judgeSeatNumber: 10,
    key: "ten_player_seer_witch_hunter",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 9),
      en: getWerewolfPlayerJudgeLabel("en", 9),
      fr: getWerewolfPlayerJudgeLabel("fr", 9),
    },
    playerSeatCount: 9,
    roles: [
      "werewolf",
      "werewolf",
      "werewolf",
      "seer",
      "witch",
      "hunter",
      "villager",
      "villager",
      "villager",
    ],
    totalSeats: 10,
  },
  {
    enabled: true,
    judgeSeatNumber: 13,
    key: "twelve_player_idiot",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 12),
      en: getWerewolfPlayerJudgeLabel("en", 12),
      fr: getWerewolfPlayerJudgeLabel("fr", 12),
    },
    playerSeatCount: 12,
    roles: [
      "werewolf",
      "werewolf",
      "werewolf",
      "werewolf",
      "seer",
      "witch",
      "hunter",
      "idiot",
      "villager",
      "villager",
      "villager",
      "villager",
    ],
    totalSeats: 13,
  },
  {
    enabled: true,
    judgeSeatNumber: 13,
    key: "twelve_player_guard_wolf_king",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 12),
      en: getWerewolfPlayerJudgeLabel("en", 12),
      fr: getWerewolfPlayerJudgeLabel("fr", 12),
    },
    playerSeatCount: 12,
    roles: [
      "wolf_king",
      "werewolf",
      "werewolf",
      "werewolf",
      "seer",
      "witch",
      "hunter",
      "guard",
      "villager",
      "villager",
      "villager",
      "villager",
    ],
    totalSeats: 13,
  },
];

export const defaultWerewolfVariantKey: WerewolfVariantKey =
  "twelve_player_idiot";

export function getWerewolfVariant(key: string | null | undefined) {
  return (
    werewolfVariants.find((variant) => variant.key === key) ??
    werewolfVariants.find(
      (variant) => variant.key === defaultWerewolfVariantKey,
    ) ??
    werewolfVariants[0]
  );
}

export function getEnabledWerewolfVariant(key: string | null | undefined) {
  const variant = getWerewolfVariant(key);

  return variant.enabled
    ? variant
    : getWerewolfVariant(defaultWerewolfVariantKey);
}

export function getWerewolfVariantLabel(
  locale: string,
  variant: WerewolfVariant,
) {
  return variant.labels[locale] ?? variant.labels.en ?? variant.labels["zh-CN"];
}

function getCustomWerewolfVariantLabel(locale: string) {
  if (locale === "fr") {
    return "Configuration libre";
  }

  if (locale === "en") {
    return "Custom setup";
  }

  return "自定义（抢先体验）";
}

function getConfigNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = config[key];
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function getConfigVariantKey(config: unknown) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as { variantKey?: unknown }).variantKey;

  return typeof value === "string" ? value : null;
}

export function normalizeWerewolfRoleDeck(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const roles = value.filter(isWerewolfRoleKey);

  if (roles.length < 5 || roles.length > 15) {
    return null;
  }

  const hasWerewolf = roles.some(
    (role) => werewolfRoleAlignments[role] === "werewolf",
  );
  const hasGood = roles.some((role) => werewolfRoleAlignments[role] === "good");

  if (!hasWerewolf || !hasGood) {
    return null;
  }

  return roles;
}

export function getWerewolfVariantFromRoomConfig(
  config: unknown,
  locale = "zh-CN",
) {
  const configObject =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : null;
  const variantKey = getConfigVariantKey(config);
  const storedRoleDeck = configObject
    ? normalizeWerewolfRoleDeck(configObject.roleDeck)
    : null;

  if (storedRoleDeck && configObject) {
    const playerSeatCount = getConfigNumber(
      configObject,
      "playerSeatCount",
      storedRoleDeck.length,
    );
    const totalSeats = getConfigNumber(
      configObject,
      "totalSeats",
      playerSeatCount + 1,
    );
    const judgeSeatNumber = getConfigNumber(
      configObject,
      "judgeSeatNumber",
      totalSeats,
    );
    const isCustom = variantKey === "custom";
    const storedKey = werewolfVariants.some(
      (variant) => variant.key === variantKey,
    )
      ? (variantKey as WerewolfVariantKey)
      : defaultWerewolfVariantKey;
    const label = isCustom
      ? typeof configObject.variantName === "string" &&
        configObject.variantName.trim()
        ? configObject.variantName.trim()
        : getCustomWerewolfVariantLabel(locale)
      : getWerewolfPlayerJudgeLabel(locale, playerSeatCount);

    return {
      enabled: true,
      judgeSeatNumber,
      key: isCustom ? "custom" : storedKey,
      labels: {
        "zh-CN": label,
        en: label,
        fr: label,
      },
      playerSeatCount,
      roles: storedRoleDeck,
      totalSeats,
    } satisfies WerewolfVariant;
  }

  return getEnabledWerewolfVariant(variantKey);
}

export function getWerewolfDefaultRoomTitle(locale: string) {
  if (locale === "fr") {
    return "Loups-garous de ce soir";
  }

  if (locale === "en") {
    return "Tonight's Werewolf";
  }

  return "今晚的狼人杀";
}

export function getWerewolfSeatName({
  locale,
  seatNumber,
  variant,
}: {
  locale: string;
  seatNumber: number;
  variant: WerewolfVariant;
}) {
  if (seatNumber === variant.judgeSeatNumber) {
    if (locale === "fr") {
      return "Maître du jeu";
    }

    if (locale === "en") {
      return "Judge";
    }

    return "法官位";
  }

  if (locale === "fr") {
    return `Joueur ${seatNumber}`;
  }

  if (locale === "en") {
    return `Player ${seatNumber}`;
  }

  return `${seatNumber} 号玩家`;
}

export function isWerewolfJudgeSeat(
  seatNumber: number,
  variant: WerewolfVariant,
) {
  return seatNumber === variant.judgeSeatNumber;
}

export function isWerewolfPlayerSeat(
  seatNumber: number,
  variant: WerewolfVariant,
) {
  return seatNumber >= 1 && seatNumber <= variant.playerSeatCount;
}

export function isActiveWerewolfSeatOccupant(seat: {
  guestName: string | null;
  leftAt: Date | null;
  profileId: string | null;
}) {
  return (
    seat.leftAt === null && Boolean(seat.profileId || seat.guestName?.trim())
  );
}

export function isActiveWerewolfJudgeSeat(
  seat: {
    guestName: string | null;
    leftAt: Date | null;
    profileId: string | null;
    seatNumber: number;
  },
  variant: WerewolfVariant,
) {
  return (
    isWerewolfJudgeSeat(seat.seatNumber, variant) &&
    isActiveWerewolfSeatOccupant(seat)
  );
}

export function isActiveWerewolfPlayerSeat(
  seat: {
    guestName: string | null;
    leftAt: Date | null;
    profileId: string | null;
    seatNumber: number;
  },
  variant: WerewolfVariant,
) {
  return (
    isWerewolfPlayerSeat(seat.seatNumber, variant) &&
    isActiveWerewolfSeatOccupant(seat)
  );
}

export function getWerewolfUSeatColumns<T extends { seatNumber: number }>(
  seats: T[],
) {
  const sortedSeats = [...seats].sort(
    (first, second) => first.seatNumber - second.seatNumber,
  );
  const leftSeatCount = Math.ceil(sortedSeats.length / 2);

  return {
    left: sortedSeats.slice(0, leftSeatCount),
    right: sortedSeats.slice(leftSeatCount).reverse(),
  };
}

export const werewolfRoleAlignments: Record<
  WerewolfRoleKey,
  WerewolfAlignment
> = {
  bear: "good",
  big_bad_wolf: "werewolf",
  cupid: "good",
  dream_catcher: "good",
  elder: "good",
  fox: "good",
  gravedigger: "good",
  guard: "good",
  hunter: "good",
  hybrid: "good",
  idiot: "good",
  knight: "good",
  little_girl: "good",
  lovers: "good",
  magician: "good",
  mechanical_wolf: "werewolf",
  nightmare_shadow: "werewolf",
  pied_piper: "third_party",
  seer: "good",
  silencing_elder: "good",
  thief: "good",
  villager: "good",
  wild_child: "good",
  werewolf: "werewolf",
  white_wolf_king: "werewolf",
  witch: "good",
  wolf_beauty: "werewolf",
  wolf_king: "werewolf",
};

export const werewolfRoleLabels = {
  "zh-CN": {
    bear: "熊",
    big_bad_wolf: "大坏狼",
    cupid: "丘比特",
    dream_catcher: "摄梦人",
    elder: "长老",
    fox: "狐狸",
    gravedigger: "守墓人",
    guard: "守卫",
    hunter: "猎人",
    hybrid: "混血儿",
    idiot: "白痴",
    knight: "骑士",
    little_girl: "小女孩",
    lovers: "情侣",
    magician: "魔术师",
    mechanical_wolf: "机械狼",
    nightmare_shadow: "噩梦之影",
    pied_piper: "吹笛者",
    seer: "预言家",
    silencing_elder: "禁言长老",
    thief: "盗贼",
    villager: "平民",
    wild_child: "野孩子",
    werewolf: "狼人",
    white_wolf_king: "白狼王",
    witch: "女巫",
    wolf_beauty: "狼美人",
    wolf_king: "狼王",
  },
  en: {
    bear: "Bear",
    big_bad_wolf: "Big Bad Wolf",
    cupid: "Cupid",
    dream_catcher: "Dream Catcher",
    elder: "Elder",
    fox: "Fox",
    gravedigger: "Gravedigger",
    guard: "Guard",
    hunter: "Hunter",
    hybrid: "Hybrid",
    idiot: "Idiot",
    knight: "Knight",
    little_girl: "Little Girl",
    lovers: "Lovers",
    magician: "Magician",
    mechanical_wolf: "Mechanical Wolf",
    nightmare_shadow: "Nightmare Shadow",
    pied_piper: "Pied Piper",
    seer: "Seer",
    silencing_elder: "Silencing Elder",
    thief: "Thief",
    villager: "Villager",
    wild_child: "Wild Child",
    werewolf: "Werewolf",
    white_wolf_king: "White Wolf King",
    witch: "Witch",
    wolf_beauty: "Wolf Beauty",
    wolf_king: "Wolf King",
  },
  fr: {
    bear: "Ours",
    big_bad_wolf: "Grand méchant loup",
    cupid: "Cupidon",
    dream_catcher: "Attrape-rêves",
    elder: "Ancien",
    fox: "Renard",
    gravedigger: "Fossoyeur",
    guard: "Garde",
    hunter: "Chasseur",
    hybrid: "Hybride",
    idiot: "Idiot",
    knight: "Chevalier",
    little_girl: "Petite fille",
    lovers: "Amoureux",
    magician: "Magicien",
    mechanical_wolf: "Loup mécanique",
    nightmare_shadow: "Ombre du cauchemar",
    pied_piper: "Joueur de flûte",
    seer: "Voyante",
    silencing_elder: "Ancien du silence",
    thief: "Voleur",
    villager: "Villageois",
    wild_child: "Enfant sauvage",
    werewolf: "Loup-garou",
    white_wolf_king: "Roi loup blanc",
    witch: "Sorcière",
    wolf_beauty: "Belle louve",
    wolf_king: "Roi loup",
  },
} satisfies Record<WerewolfRoleLocale, Record<WerewolfRoleKey, string>>;

const roleCopy: Record<WerewolfRoleLocale, WerewolfRoleCopy> = {
  "zh-CN": {
    alignmentLabels: {
      good: "好人阵营",
      third_party: "第三方阵营",
      werewolf: "狼人阵营",
    },
    roleDescriptions: {
      bear: "你是熊。天亮时若相邻玩家有狼人，由法官按现场规则提示。",
      big_bad_wolf: "你是大坏狼。夜晚参与狼人行动；若还没有狼人死亡，可按卡牌规则额外选择目标。",
      cupid: "你是丘比特。首夜按现场规则指定两名玩家成为情侣。",
      dream_catcher: "你是摄梦人。每晚选择一名玩家入梦；连续两晚选择同一人时，由法官按卡牌规则结算。",
      elder: "你是长老。首次夜间袭击可幸存；若被村民放逐，法官按卡牌规则处理好人能力。",
      fox: "你是狐狸。每晚查验相邻的三名玩家，获知其中是否有狼人。",
      gravedigger: "你是守墓人。每晚可得知上一位死者的身份。",
      guard: "你是守卫。每晚守护一名玩家，不能连续两晚守护同一人。",
      hunter: "你是猎人。出局时按现场规则带走一人。",
      hybrid: "你是混血儿。开局选择一名玩家，与其共享胜负；由法官按现场选择结算。",
      idiot: "你是白痴。被票出时按现场规则翻牌。",
      knight: "你是骑士。白天可按现场规则决斗一名玩家，判断错误则自己出局。",
      little_girl: "你是小女孩。夜晚可偷看狼人行动；被发现时按现场规则处理。",
      lovers: "你是情侣。任一情侣出局时，另一人按现场规则一同出局。",
      magician: "你是魔术师。每晚交换两名玩家的行动目标，由法官按卡牌规则结算。",
      mechanical_wolf: "你是机械狼。开局选择一个身份并获得其能力，由法官按现场规则主持。",
      nightmare_shadow: "你是噩梦之影。每晚使一名玩家无法使用能力，由法官按卡牌规则结算。",
      pied_piper: "你是吹笛者。每晚魅惑两名玩家；所有存活玩家被魅惑时达成独立胜利条件。",
      seer: "你是预言家。夜晚验人，白天把信息藏好。",
      silencing_elder: "你是禁言长老。每晚指定一名玩家，令其次日不能发言。",
      thief: "你是盗贼。若现场使用两张额外身份牌，开局查看并选择其中一张。",
      villager: "你是平民。没有夜晚技能，白天通过发言和投票找出狼人。",
      wild_child: "你是野孩子。开局选择一名榜样；若其死亡，你按卡牌规则转为狼人。",
      werewolf: "你是狼人。夜晚和同伴行动，白天别露馅。",
      white_wolf_king: "你是白狼王。按现场规则自爆后带走一名玩家。",
      witch: "你是女巫。夜晚用药，什么时候出手看你判断。",
      wolf_beauty: "你是狼美人。每晚魅惑一名玩家；你死亡时，该玩家按卡牌规则一同死亡。",
      wolf_king: "你是狼王。出局时按现场规则带走一名玩家。",
    },
    roleLabels: werewolfRoleLabels["zh-CN"],
  },
  en: {
    alignmentLabels: {
      good: "Good team",
      third_party: "Third-party team",
      werewolf: "Werewolf team",
    },
    roleDescriptions: {
      bear: "You are the Bear. At dawn, the judge signals whether a neighboring player is a werewolf.",
      big_bad_wolf: "You are the Big Bad Wolf. Hunt with the wolves; if no wolf has died, choose an extra target by card rules.",
      cupid:
        "You are Cupid. On the first night, link two players as lovers by table rules.",
      dream_catcher: "You are the Dream Catcher. Choose a sleeper each night; the judge resolves choosing the same player twice in a row.",
      elder: "You are the Elder. Survive the first night attack; if villagers eliminate you, the judge applies the card's penalty.",
      fox: "You are the Fox. Inspect three adjacent players and learn whether a werewolf is among them.",
      gravedigger: "You are the Gravedigger. Each night, learn the role of the most recently deceased player.",
      guard:
        "You are the guard. Protect one player each night, but not the same player twice in a row.",
      hunter:
        "You are the hunter. If you go out, take one player with you by table rules.",
      hybrid: "You are the Hybrid. Choose a player at the start and share their victory; the judge resolves the choice at the table.",
      idiot: "You are the idiot. Reveal on vote-out by table rules.",
      knight:
        "You are the knight. Once during the day, challenge a player; if wrong, you are eliminated.",
      little_girl: "You are the Little Girl. Secretly watch the wolves at night; follow table rules if caught.",
      lovers:
        "You are one of the lovers. If either lover goes out, the other follows by table rules.",
      magician: "You are the Magician. Swap two players' night targets; the judge resolves the redirected powers.",
      mechanical_wolf: "You are the Mechanical Wolf. Choose a role at the start and gain its power under the judge's direction.",
      nightmare_shadow: "You are the Nightmare Shadow. Block one player's ability each night; the judge resolves its effect.",
      pied_piper: "You are the Pied Piper. Charm two players each night; win independently when all living players are charmed.",
      seer: "You are the seer. Check one player at night and guard the truth by day.",
      silencing_elder: "You are the Silencing Elder. Silence one player each night so they cannot speak the next day.",
      thief: "You are the Thief. If the table uses two spare role cards, view them at the start and choose one.",
      villager:
        "You are a villager. You have no night ability; read the table by day.",
      wild_child: "You are the Wild Child. Choose a role model at the start; if they die, become a werewolf by card rules.",
      werewolf:
        "You are a werewolf. Move with the pack at night and stay clean by day.",
      white_wolf_king:
        "You are the White Wolf King. Reveal yourself and take one player with you by table rules.",
      witch:
        "You are the witch. Use your potions when the table gives you the moment.",
      wolf_beauty: "You are the Wolf Beauty. Charm one player each night; if you die, they die with you by card rules.",
      wolf_king:
        "You are the Wolf King. When eliminated, take one player with you by table rules.",
    },
    roleLabels: werewolfRoleLabels.en,
  },
  fr: {
    alignmentLabels: {
      good: "Camp du village",
      third_party: "Troisième camp",
      werewolf: "Camp des loups",
    },
    roleDescriptions: {
      bear: "Vous êtes l'ours. À l'aube, le maître signale si un loup est assis à côté de vous.",
      big_bad_wolf: "Vous êtes le grand méchant loup. Chassez avec les loups ; si aucun loup n'est mort, choisissez une cible de plus selon la carte.",
      cupid:
        "Vous êtes Cupidon. La première nuit, liez deux joueurs comme amoureux selon les règles de table.",
      dream_catcher: "Vous êtes l'attrape-rêves. Choisissez un dormeur chaque nuit ; le maître arbitre deux choix consécutifs identiques.",
      elder: "Vous êtes l'ancien. Survivez à la première attaque nocturne ; si le village vous élimine, le maître applique la pénalité de la carte.",
      fox: "Vous êtes le renard. Examinez trois joueurs voisins et apprenez si un loup est parmi eux.",
      gravedigger: "Vous êtes le fossoyeur. Chaque nuit, apprenez le rôle du dernier joueur mort.",
      guard:
        "Vous êtes garde. Protégez un joueur chaque nuit, sans choisir deux fois de suite la même personne.",
      hunter:
        "Vous êtes chasseur. Si vous sortez, emportez quelqu'un selon les règles de table.",
      hybrid: "Vous êtes hybride. Choisissez un joueur au début et partagez sa victoire ; le maître arbitre ce choix autour de la table.",
      idiot:
        "Vous êtes l'idiot. Révélez-vous au vote selon les règles de table.",
      knight:
        "Vous êtes chevalier. Une fois le jour, défiez un joueur ; si vous vous trompez, vous êtes éliminé.",
      little_girl: "Vous êtes la petite fille. Observez discrètement les loups la nuit ; si vous êtes repérée, suivez les règles de table.",
      lovers:
        "Vous êtes amoureux. Si l'un des amoureux sort, l'autre le suit selon les règles de table.",
      magician: "Vous êtes le magicien. Échangez les cibles de deux joueurs la nuit ; le maître arbitre les pouvoirs redirigés.",
      mechanical_wolf: "Vous êtes le loup mécanique. Choisissez un rôle au début et gagnez son pouvoir sous la direction du maître.",
      nightmare_shadow: "Vous êtes l'ombre du cauchemar. Bloquez le pouvoir d'un joueur chaque nuit ; le maître en arbitre l'effet.",
      pied_piper: "Vous êtes le joueur de flûte. Charmez deux joueurs chaque nuit ; gagnez seul quand tous les survivants sont charmés.",
      seer: "Vous êtes voyante. Vérifiez quelqu'un la nuit, gardez l'information le jour.",
      silencing_elder: "Vous êtes l'ancien du silence. Rendez un joueur muet chaque nuit pour la journée suivante.",
      thief: "Vous êtes le voleur. Si la table utilise deux rôles de réserve, regardez-les au début et choisissez-en un.",
      villager:
        "Vous êtes villageois. Pas de capacité de nuit, tout se joue à la parole.",
      wild_child: "Vous êtes l'enfant sauvage. Choisissez un modèle au début ; s'il meurt, devenez loup selon la carte.",
      werewolf:
        "Vous êtes loup-garou. Agissez avec la meute la nuit, restez crédible le jour.",
      white_wolf_king:
        "Vous êtes le roi loup blanc. Révélez-vous et emportez un joueur selon les règles de table.",
      witch: "Vous êtes sorcière. Utilisez vos potions au bon moment.",
      wolf_beauty: "Vous êtes la belle louve. Charmez un joueur chaque nuit ; si vous mourez, il meurt avec vous selon la carte.",
      wolf_king:
        "Vous êtes le roi loup. Si vous êtes éliminé, emportez un joueur selon les règles de table.",
    },
    roleLabels: werewolfRoleLabels.fr,
  },
};

export function getWerewolfRoleCopy(locale: string) {
  return roleCopy[locale as WerewolfRoleLocale] ?? roleCopy.en;
}

export function isWerewolfRoleKey(
  value: string | null | undefined,
): value is WerewolfRoleKey {
  return (
    typeof value === "string" &&
    (werewolfRoleKeys as readonly string[]).includes(value)
  );
}

export function getWerewolfRoleLabel(
  locale: string,
  roleKey: string | null | undefined,
) {
  if (!isWerewolfRoleKey(roleKey)) {
    return null;
  }

  return getWerewolfRoleCopy(locale).roleLabels[roleKey];
}

export function createWerewolfPrivatePayload({
  locale,
  roleKey,
  variant,
}: {
  locale: string;
  roleKey: WerewolfRoleKey;
  variant: WerewolfVariant;
}): WerewolfPrivatePayload {
  const copy = getWerewolfRoleCopy(locale);
  const alignment = werewolfRoleAlignments[roleKey];

  return {
    alignmentLabel: copy.alignmentLabels[alignment],
    roleDescription: copy.roleDescriptions[roleKey],
    roleKey,
    roleLabel: copy.roleLabels[roleKey],
    variantLabel: getWerewolfVariantLabel(locale, variant),
  };
}
