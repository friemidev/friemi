export const werewolfRoleKeys = [
  "cupid",
  "guard",
  "hunter",
  "idiot",
  "knight",
  "lovers",
  "seer",
  "villager",
  "werewolf",
  "white_wolf_king",
  "witch",
  "wolf_king",
] as const;

export type WerewolfRoleKey = (typeof werewolfRoleKeys)[number];
export type WerewolfRoleLocale = "en" | "fr" | "zh-CN";

export type WerewolfAlignment = "good" | "werewolf";

export type WerewolfVariantKey =
  | "eight_player_basic"
  | "nine_player_basic"
  | "seven_player_basic"
  | "ten_player_seer_witch_hunter"
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
    judgeSeatNumber: 12,
    key: "twelve_player_idiot",
    labels: {
      "zh-CN": getWerewolfPlayerJudgeLabel("zh-CN", 11),
      en: getWerewolfPlayerJudgeLabel("en", 11),
      fr: getWerewolfPlayerJudgeLabel("fr", 11),
    },
    playerSeatCount: 11,
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
    ],
    totalSeats: 12,
  },
];

export const defaultWerewolfVariantKey: WerewolfVariantKey =
  "ten_player_seer_witch_hunter";

export function getWerewolfVariant(key: string | null | undefined) {
  return (
    werewolfVariants.find((variant) => variant.key === key) ??
    werewolfVariants.find((variant) => variant.key === defaultWerewolfVariantKey) ??
    werewolfVariants[0]
  );
}

export function getEnabledWerewolfVariant(key: string | null | undefined) {
  const variant = getWerewolfVariant(key);

  return variant.enabled ? variant : getWerewolfVariant(defaultWerewolfVariantKey);
}

export function getWerewolfVariantLabel(locale: string, variant: WerewolfVariant) {
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
  const hasGood = roles.some(
    (role) => werewolfRoleAlignments[role] === "good",
  );

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
  const customRoleDeck =
    variantKey === "custom" && configObject
      ? normalizeWerewolfRoleDeck(configObject.roleDeck)
      : null;

  if (customRoleDeck && configObject) {
    const playerSeatCount = customRoleDeck.length;
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
    const label =
      typeof configObject.variantName === "string" &&
      configObject.variantName.trim()
        ? configObject.variantName.trim()
        : getCustomWerewolfVariantLabel(locale);

    return {
      enabled: true,
      judgeSeatNumber,
      key: "custom",
      labels: {
        "zh-CN": label,
        en: label,
        fr: label,
      },
      playerSeatCount,
      roles: customRoleDeck,
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

export const werewolfRoleAlignments: Record<
  WerewolfRoleKey,
  WerewolfAlignment
> = {
  cupid: "good",
  guard: "good",
  hunter: "good",
  idiot: "good",
  knight: "good",
  lovers: "good",
  seer: "good",
  villager: "good",
  werewolf: "werewolf",
  white_wolf_king: "werewolf",
  witch: "good",
  wolf_king: "werewolf",
};

export const werewolfRoleLabels = {
  "zh-CN": {
    cupid: "丘比特",
    guard: "守卫",
    hunter: "猎人",
    idiot: "白痴",
    knight: "骑士",
    lovers: "情侣",
    seer: "预言家",
    villager: "平民",
    werewolf: "狼人",
    white_wolf_king: "白狼王",
    witch: "女巫",
    wolf_king: "狼王",
  },
  en: {
    cupid: "Cupid",
    guard: "Guard",
    hunter: "Hunter",
    idiot: "Idiot",
    knight: "Knight",
    lovers: "Lovers",
    seer: "Seer",
    villager: "Villager",
    werewolf: "Werewolf",
    white_wolf_king: "White Wolf King",
    witch: "Witch",
    wolf_king: "Wolf King",
  },
  fr: {
    cupid: "Cupidon",
    guard: "Garde",
    hunter: "Chasseur",
    idiot: "Idiot",
    knight: "Chevalier",
    lovers: "Amoureux",
    seer: "Voyante",
    villager: "Villageois",
    werewolf: "Loup-garou",
    white_wolf_king: "Roi loup blanc",
    witch: "Sorcière",
    wolf_king: "Roi loup",
  },
} satisfies Record<
  WerewolfRoleLocale,
  Record<WerewolfRoleKey, string>
>;

const roleCopy: Record<WerewolfRoleLocale, WerewolfRoleCopy> = {
  "zh-CN": {
    alignmentLabels: {
      good: "好人阵营",
      werewolf: "狼人阵营",
    },
    roleDescriptions: {
      cupid: "你是丘比特。首夜按现场规则指定两名玩家成为情侣。",
      guard: "你是守卫。每晚守护一名玩家，不能连续两晚守护同一人。",
      hunter: "你是猎人。出局时按现场规则带走一人。",
      idiot: "你是白痴。被票出时按现场规则翻牌。",
      knight: "你是骑士。白天可按现场规则决斗一名玩家，判断错误则自己出局。",
      lovers: "你是情侣。任一情侣出局时，另一人按现场规则一同出局。",
      seer: "你是预言家。夜晚验人，白天把信息藏好。",
      villager: "你是平民。没有夜晚技能，白天通过发言和投票找出狼人。",
      werewolf: "你是狼人。夜晚和同伴行动，白天别露馅。",
      white_wolf_king: "你是白狼王。按现场规则自爆后带走一名玩家。",
      witch: "你是女巫。夜晚用药，什么时候出手看你判断。",
      wolf_king: "你是狼王。出局时按现场规则带走一名玩家。",
    },
    roleLabels: werewolfRoleLabels["zh-CN"],
  },
  en: {
    alignmentLabels: {
      good: "Good team",
      werewolf: "Werewolf team",
    },
    roleDescriptions: {
      cupid: "You are Cupid. On the first night, link two players as lovers by table rules.",
      guard: "You are the guard. Protect one player each night, but not the same player twice in a row.",
      hunter: "You are the hunter. If you go out, take one player with you by table rules.",
      idiot: "You are the idiot. Reveal on vote-out by table rules.",
      knight: "You are the knight. Once during the day, challenge a player; if wrong, you are eliminated.",
      lovers: "You are one of the lovers. If either lover goes out, the other follows by table rules.",
      seer: "You are the seer. Check one player at night and guard the truth by day.",
      villager: "You are a villager. You have no night ability; read the table by day.",
      werewolf: "You are a werewolf. Move with the pack at night and stay clean by day.",
      white_wolf_king: "You are the White Wolf King. Reveal yourself and take one player with you by table rules.",
      witch: "You are the witch. Use your potions when the table gives you the moment.",
      wolf_king: "You are the Wolf King. When eliminated, take one player with you by table rules.",
    },
    roleLabels: werewolfRoleLabels.en,
  },
  fr: {
    alignmentLabels: {
      good: "Camp du village",
      werewolf: "Camp des loups",
    },
    roleDescriptions: {
      cupid:
        "Vous êtes Cupidon. La première nuit, liez deux joueurs comme amoureux selon les règles de table.",
      guard:
        "Vous êtes garde. Protégez un joueur chaque nuit, sans choisir deux fois de suite la même personne.",
      hunter:
        "Vous êtes chasseur. Si vous sortez, emportez quelqu'un selon les règles de table.",
      idiot:
        "Vous êtes l'idiot. Révélez-vous au vote selon les règles de table.",
      knight:
        "Vous êtes chevalier. Une fois le jour, défiez un joueur ; si vous vous trompez, vous êtes éliminé.",
      lovers:
        "Vous êtes amoureux. Si l'un des amoureux sort, l'autre le suit selon les règles de table.",
      seer:
        "Vous êtes voyante. Vérifiez quelqu'un la nuit, gardez l'information le jour.",
      villager:
        "Vous êtes villageois. Pas de capacité de nuit, tout se joue à la parole.",
      werewolf:
        "Vous êtes loup-garou. Agissez avec la meute la nuit, restez crédible le jour.",
      white_wolf_king:
        "Vous êtes le roi loup blanc. Révélez-vous et emportez un joueur selon les règles de table.",
      witch:
        "Vous êtes sorcière. Utilisez vos potions au bon moment.",
      wolf_king:
        "Vous êtes le roi loup. Si vous êtes éliminé, emportez un joueur selon les règles de table.",
    },
    roleLabels: werewolfRoleLabels.fr,
  },
};

export function getWerewolfRoleCopy(locale: string) {
  return roleCopy[locale as WerewolfRoleLocale] ?? roleCopy.en;
}

export function isWerewolfRoleKey(value: string | null | undefined): value is WerewolfRoleKey {
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
