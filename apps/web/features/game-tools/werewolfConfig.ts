export type WerewolfRoleKey =
  | "hunter"
  | "idiot"
  | "seer"
  | "villager"
  | "werewolf"
  | "witch";

export type WerewolfAlignment = "good" | "werewolf";

export type WerewolfVariantKey =
  | "eight_player_basic"
  | "nine_player_basic"
  | "seven_player_basic"
  | "ten_player_seer_witch_hunter"
  | "twelve_player_idiot";

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
  roleLabel: string;
  variantLabel: string;
};

type WerewolfRoleCopy = {
  alignmentLabels: Record<WerewolfAlignment, string>;
  roleDescriptions: Record<WerewolfRoleKey, string>;
  roleLabels: Record<WerewolfRoleKey, string>;
};

export const werewolfToolPath = "/game-tools/werewolf";

export const werewolfVariants: WerewolfVariant[] = [
  {
    enabled: true,
    judgeSeatNumber: 7,
    key: "seven_player_basic",
    labels: {
      "zh-CN": "7 人局",
      en: "7-player table",
      fr: "Table à 7",
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
      "zh-CN": "8 人局",
      en: "8-player table",
      fr: "Table à 8",
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
      "zh-CN": "9 人局",
      en: "9-player table",
      fr: "Table à 9",
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
      "zh-CN": "10 人预女猎局",
      en: "10-player seer / witch / hunter",
      fr: "10 joueurs voyante / sorcière / chasseur",
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
      "zh-CN": "12 人预女猎白痴局",
      en: "12-player table with idiot",
      fr: "Table à 12 avec idiot",
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

export function getWerewolfDefaultRoomTitle(locale: string) {
  if (locale === "fr") {
    return "Table Loups-garous Friemi";
  }

  if (locale === "en") {
    return "Friemi Werewolf table";
  }

  return "Friemi 狼人杀小局";
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
  hunter: "good",
  idiot: "good",
  seer: "good",
  villager: "good",
  werewolf: "werewolf",
  witch: "good",
};

const roleCopy: Record<string, WerewolfRoleCopy> = {
  "zh-CN": {
    alignmentLabels: {
      good: "好人阵营",
      werewolf: "狼人阵营",
    },
    roleDescriptions: {
      hunter: "你是猎人。线下法官会按现场规则处理你的技能。",
      idiot: "你是白痴。技能是否翻牌由线下法官按现场规则裁定。",
      seer: "你是预言家。夜晚行动由线下法官主持。",
      villager: "你是平民。没有夜晚技能，白天通过发言和投票找出狼人。",
      werewolf: "你是狼人。夜晚行动由线下法官主持。",
      witch: "你是女巫。解药和毒药由线下法官按现场规则处理。",
    },
    roleLabels: {
      hunter: "猎人",
      idiot: "白痴",
      seer: "预言家",
      villager: "平民",
      werewolf: "狼人",
      witch: "女巫",
    },
  },
  en: {
    alignmentLabels: {
      good: "Good team",
      werewolf: "Werewolf team",
    },
    roleDescriptions: {
      hunter: "You are the hunter. The judge handles your ability at the table.",
      idiot: "You are the idiot. The judge handles reveal timing at the table.",
      seer: "You are the seer. Night actions are hosted offline by the judge.",
      villager: "You are a villager. You have no night ability; read the table by day.",
      werewolf: "You are a werewolf. Night actions are hosted offline by the judge.",
      witch: "You are the witch. Potion choices are handled offline by the judge.",
    },
    roleLabels: {
      hunter: "Hunter",
      idiot: "Idiot",
      seer: "Seer",
      villager: "Villager",
      werewolf: "Werewolf",
      witch: "Witch",
    },
  },
  fr: {
    alignmentLabels: {
      good: "Camp du village",
      werewolf: "Camp des loups",
    },
    roleDescriptions: {
      hunter:
        "Vous êtes chasseur. Le maître du jeu gère votre capacité à la table.",
      idiot:
        "Vous êtes l'idiot. Le maître du jeu décide du moment de révélation.",
      seer:
        "Vous êtes voyante. Les actions de nuit sont menées hors ligne par le maître du jeu.",
      villager:
        "Vous êtes villageois. Pas de capacité de nuit, tout se joue à la parole.",
      werewolf:
        "Vous êtes loup-garou. Les actions de nuit sont menées hors ligne par le maître du jeu.",
      witch:
        "Vous êtes sorcière. Les potions sont gérées hors ligne par le maître du jeu.",
    },
    roleLabels: {
      hunter: "Chasseur",
      idiot: "Idiot",
      seer: "Voyante",
      villager: "Villageois",
      werewolf: "Loup-garou",
      witch: "Sorcière",
    },
  },
};

export function getWerewolfRoleCopy(locale: string) {
  return roleCopy[locale] ?? roleCopy.en;
}

export function isWerewolfRoleKey(value: string | null | undefined): value is WerewolfRoleKey {
  return (
    value === "hunter" ||
    value === "seer" ||
    value === "villager" ||
    value === "werewolf" ||
    value === "witch"
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
    roleLabel: copy.roleLabels[roleKey],
    variantLabel: getWerewolfVariantLabel(locale, variant),
  };
}
