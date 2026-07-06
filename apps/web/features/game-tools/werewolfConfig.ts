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
      hunter: "你是猎人。出局时按现场规则带走一人。",
      idiot: "你是白痴。被票出时按现场规则翻牌。",
      seer: "你是预言家。夜晚验人，白天把信息藏好。",
      villager: "你是平民。没有夜晚技能，白天通过发言和投票找出狼人。",
      werewolf: "你是狼人。夜晚和同伴行动，白天别露馅。",
      witch: "你是女巫。夜晚用药，什么时候出手看你判断。",
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
      hunter: "You are the hunter. If you go out, take one player with you by table rules.",
      idiot: "You are the idiot. Reveal on vote-out by table rules.",
      seer: "You are the seer. Check one player at night and guard the truth by day.",
      villager: "You are a villager. You have no night ability; read the table by day.",
      werewolf: "You are a werewolf. Move with the pack at night and stay clean by day.",
      witch: "You are the witch. Use your potions when the table gives you the moment.",
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
        "Vous êtes chasseur. Si vous sortez, emportez quelqu'un selon les règles de table.",
      idiot:
        "Vous êtes l'idiot. Révélez-vous au vote selon les règles de table.",
      seer:
        "Vous êtes voyante. Vérifiez quelqu'un la nuit, gardez l'information le jour.",
      villager:
        "Vous êtes villageois. Pas de capacité de nuit, tout se joue à la parole.",
      werewolf:
        "Vous êtes loup-garou. Agissez avec la meute la nuit, restez crédible le jour.",
      witch:
        "Vous êtes sorcière. Utilisez vos potions au bon moment.",
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
    value === "idiot" ||
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
