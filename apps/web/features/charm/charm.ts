export type CharmLocale = "zh-CN" | "en" | "fr" | string;

export type CharmGiftAvailability = "standard" | "seasonal" | "disabled";

export type CharmGiftCategory =
  | "classic"
  | "activity"
  | "seasonal"
  | "negative";

export type CharmGiftDefinition = {
  id: string;
  emoji: string;
  labels: {
    zh: string;
    en: string;
    fr: string;
  };
  charmValue: number;
  referenceRmb: number;
  coinCost: number | null;
  category: CharmGiftCategory;
  availability: CharmGiftAvailability;
  launchEnabled: boolean;
};

export type CharmLevelId =
  | "SOLITUDE"
  | "CHARM"
  | "SUPERSTAR"
  | "LEGEND"
  | "FRIEMI_IDOL";

export type CharmLevelDefinition = {
  id: CharmLevelId;
  icon: string;
  title: string;
  minScore: number;
};

export type CharmProgress = {
  current: CharmLevelDefinition;
  next: CharmLevelDefinition | null;
  score: number;
  scoreIntoLevel: number;
  scoreToNextLevel: number | null;
  progressRatio: number;
};

export const newUserFriemiCheckSourceKey = "welcome";
export const blindBoxFragmentExchangeCount = 10;
export const successfulActivityFragmentReward = 1;

export const charmGiftCatalog = [
  {
    id: "rose",
    emoji: "🌹",
    labels: { zh: "玫瑰", en: "Rose", fr: "Rose" },
    charmValue: 5,
    referenceRmb: 50,
    coinCost: null,
    category: "classic",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "bouquet",
    emoji: "💐",
    labels: { zh: "花束", en: "Bouquet", fr: "Bouquet" },
    charmValue: 10,
    referenceRmb: 100,
    coinCost: null,
    category: "classic",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "heart",
    emoji: "❤️",
    labels: { zh: "爱心", en: "Heart", fr: "Coeur" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "classic",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "diamond",
    emoji: "💎",
    labels: { zh: "钻石", en: "Diamond", fr: "Diamant" },
    charmValue: 100,
    referenceRmb: 1000,
    coinCost: null,
    category: "classic",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "meal",
    emoji: "🧋",
    labels: { zh: "干饭", en: "Meal", fr: "Repas" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "board_game",
    emoji: "👑",
    labels: { zh: "桌游", en: "Board game", fr: "Jeu de societe" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "werewolf_crystal",
    emoji: "🔮",
    labels: { zh: "狼人杀", en: "Werewolf crystal", fr: "Loup-garou" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "werewolf",
    emoji: "🐺",
    labels: { zh: "狼人杀", en: "Werewolf", fr: "Loup-garou" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "movie",
    emoji: "🍿",
    labels: { zh: "观影", en: "Movie", fr: "Cinema" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "music",
    emoji: "🎙️",
    labels: { zh: "音乐", en: "Music", fr: "Musique" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "growth",
    emoji: "📖",
    labels: { zh: "进步", en: "Growth", fr: "Progression" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "art",
    emoji: "🎨",
    labels: { zh: "艺术", en: "Art", fr: "Art" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "travel",
    emoji: "📷",
    labels: { zh: "旅行", en: "Travel", fr: "Voyage" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "sports",
    emoji: "🏅",
    labels: { zh: "运动", en: "Sports", fr: "Sport" },
    charmValue: 20,
    referenceRmb: 200,
    coinCost: null,
    category: "activity",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "birthday_cake",
    emoji: "🎂",
    labels: { zh: "生日蛋糕", en: "Birthday cake", fr: "Gateau" },
    charmValue: 50,
    referenceRmb: 500,
    coinCost: null,
    category: "classic",
    availability: "standard",
    launchEnabled: true,
  },
  {
    id: "halloween",
    emoji: "🎃",
    labels: { zh: "万圣节", en: "Halloween", fr: "Halloween" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "seasonal",
    availability: "seasonal",
    launchEnabled: true,
  },
  {
    id: "christmas",
    emoji: "🎄",
    labels: { zh: "圣诞", en: "Christmas", fr: "Noel" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "seasonal",
    availability: "seasonal",
    launchEnabled: true,
  },
  {
    id: "spring_festival",
    emoji: "🧧",
    labels: { zh: "春节", en: "Spring Festival", fr: "Nouvel An lunaire" },
    charmValue: 30,
    referenceRmb: 300,
    coinCost: null,
    category: "seasonal",
    availability: "seasonal",
    launchEnabled: true,
  },
  {
    id: "fireworks",
    emoji: "🎆",
    labels: { zh: "烟花", en: "Fireworks", fr: "Feu d'artifice" },
    charmValue: 50,
    referenceRmb: 500,
    coinCost: null,
    category: "seasonal",
    availability: "seasonal",
    launchEnabled: true,
  },
  {
    id: "egg",
    emoji: "🥚",
    labels: { zh: "鸡蛋", en: "Egg", fr: "Oeuf" },
    charmValue: -5,
    referenceRmb: -50,
    coinCost: null,
    category: "negative",
    availability: "disabled",
    launchEnabled: false,
  },
  {
    id: "bomb",
    emoji: "💣",
    labels: { zh: "炸弹", en: "Bomb", fr: "Bombe" },
    charmValue: -20,
    referenceRmb: -200,
    coinCost: null,
    category: "negative",
    availability: "disabled",
    launchEnabled: false,
  },
  {
    id: "police_car",
    emoji: "🚓",
    labels: { zh: "警车", en: "Police car", fr: "Police" },
    charmValue: -100,
    referenceRmb: -1000,
    coinCost: null,
    category: "negative",
    availability: "disabled",
    launchEnabled: false,
  },
] as const satisfies readonly CharmGiftDefinition[];

export const charmLevels = [
  {
    id: "SOLITUDE",
    icon: "✊",
    title: "Solitude",
    minScore: 0,
  },
  {
    id: "CHARM",
    icon: "💗",
    title: "Charm",
    minScore: 500,
  },
  {
    id: "SUPERSTAR",
    icon: "💎",
    title: "Superstar",
    minScore: 5000,
  },
  {
    id: "LEGEND",
    icon: "👑",
    title: "Legend",
    minScore: 10000,
  },
  {
    id: "FRIEMI_IDOL",
    icon: "🔥",
    title: "Friemi Idol",
    minScore: 100000,
  },
] as const satisfies readonly CharmLevelDefinition[];

export function normalizeCharmScore(score: number | null | undefined) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.floor(score ?? 0));
}

export function getCharmGiftDefinition(giftId: string) {
  return charmGiftCatalog.find((gift) => gift.id === giftId) ?? null;
}

export function getActiveCharmGifts(
  options: {
    includeSeasonal?: boolean;
  } = {},
) {
  return charmGiftCatalog.filter(
    (gift) =>
      gift.launchEnabled &&
      gift.charmValue > 0 &&
      (options.includeSeasonal || gift.availability === "standard"),
  );
}

export function getCharmGiftLabel(
  gift: CharmGiftDefinition,
  locale: CharmLocale,
) {
  if (locale === "fr") {
    return gift.labels.fr;
  }

  if (locale === "en") {
    return gift.labels.en;
  }

  return gift.labels.zh;
}

export function normalizeGiftQuantity(quantity: number | null | undefined) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(99, Math.floor(quantity ?? 1)));
}

export function canRedeemBlindBoxFragments(
  fragmentCount: number | null | undefined,
) {
  if (!Number.isFinite(fragmentCount)) {
    return false;
  }

  return Math.floor(fragmentCount ?? 0) >= blindBoxFragmentExchangeCount;
}

export function calculateCharmDeltaFromGift({
  allowDisabledGifts = false,
  giftId,
  quantity,
}: {
  allowDisabledGifts?: boolean;
  giftId: string;
  quantity?: number | null;
}) {
  const gift = getCharmGiftDefinition(giftId);

  if (!gift) {
    throw new Error(`Unknown charm gift: ${giftId}`);
  }

  if (!allowDisabledGifts && !gift.launchEnabled) {
    throw new Error(`Charm gift is disabled: ${giftId}`);
  }

  const normalizedQuantity = normalizeGiftQuantity(quantity);

  return {
    gift,
    quantity: normalizedQuantity,
    totalCharmDelta: gift.charmValue * normalizedQuantity,
  };
}

export function calculateCharmFromReceivedGifts(
  gifts: Array<{
    giftId: string;
    quantity?: number | null;
  }>,
) {
  return normalizeCharmScore(
    gifts.reduce((total, gift) => {
      const result = calculateCharmDeltaFromGift(gift);

      return total + result.totalCharmDelta;
    }, 0),
  );
}

export function getCharmLevel(score: number | null | undefined) {
  const normalizedScore = normalizeCharmScore(score);
  let current: CharmLevelDefinition = charmLevels[0];

  for (const level of charmLevels) {
    if (normalizedScore >= level.minScore) {
      current = level;
    }
  }

  return current;
}

export function getCharmLevelLabel(
  level: CharmLevelDefinition | CharmLevelId,
  locale: CharmLocale,
) {
  const levelId = typeof level === "string" ? level : level.id;

  if (locale === "fr") {
    return {
      SOLITUDE: "Solitude",
      CHARM: "Charm",
      SUPERSTAR: "Superstar",
      LEGEND: "Legend",
      FRIEMI_IDOL: "Friemi Idol",
    }[levelId];
  }

  if (locale === "en") {
    return {
      SOLITUDE: "Solitude",
      CHARM: "Charm",
      SUPERSTAR: "Superstar",
      LEGEND: "Legend",
      FRIEMI_IDOL: "Friemi Idol",
    }[levelId];
  }

  return {
    SOLITUDE: "Solitude",
    CHARM: "Charm",
    SUPERSTAR: "Superstar",
    LEGEND: "Legend",
    FRIEMI_IDOL: "Friemi Idol",
  }[levelId];
}

export function getCharmProgress(
  score: number | null | undefined,
): CharmProgress {
  const normalizedScore = normalizeCharmScore(score);
  const currentIndex = charmLevels.findIndex(
    (level) => level.id === getCharmLevel(normalizedScore).id,
  );
  const current = charmLevels[currentIndex] ?? charmLevels[0];
  const next = charmLevels[currentIndex + 1] ?? null;

  if (!next) {
    return {
      current,
      next,
      score: normalizedScore,
      scoreIntoLevel: normalizedScore - current.minScore,
      scoreToNextLevel: null,
      progressRatio: 1,
    };
  }

  const levelSpan = next.minScore - current.minScore;
  const scoreIntoLevel = normalizedScore - current.minScore;

  return {
    current,
    next,
    score: normalizedScore,
    scoreIntoLevel,
    scoreToNextLevel: Math.max(0, next.minScore - normalizedScore),
    progressRatio: Math.max(0, Math.min(1, scoreIntoLevel / levelSpan)),
  };
}
