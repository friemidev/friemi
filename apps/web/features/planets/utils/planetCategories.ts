export const planetCategoryValues = [
  "FOOD",
  "BOARD_GAME",
  "ART",
  "SPORTS",
  "WANDER",
  "AUDIO_VISUAL",
  "GROWTH",
  "TRAVEL",
  "MUSIC",
] as const;

export type PlanetCategory = (typeof planetCategoryValues)[number];

const categoryLabels = {
  "zh-CN": {
    FOOD: "饭局",
    BOARD_GAME: "桌游",
    ART: "艺术",
    SPORTS: "运动",
    WANDER: "闲逛",
    AUDIO_VISUAL: "视听",
    GROWTH: "进步",
    TRAVEL: "旅行",
    MUSIC: "音乐",
  },
  en: {
    FOOD: "Dining",
    BOARD_GAME: "Board games",
    ART: "Arts",
    SPORTS: "Sports",
    WANDER: "Outings",
    AUDIO_VISUAL: "Film & media",
    GROWTH: "Growth",
    TRAVEL: "Travel",
    MUSIC: "Music",
  },
  fr: {
    FOOD: "Repas",
    BOARD_GAME: "Jeux de société",
    ART: "Art",
    SPORTS: "Sport",
    WANDER: "Sorties",
    AUDIO_VISUAL: "Cinéma & médias",
    GROWTH: "Progrès",
    TRAVEL: "Voyage",
    MUSIC: "Musique",
  },
} as const;

export function isPlanetCategory(value: string): value is PlanetCategory {
  return planetCategoryValues.includes(value as PlanetCategory);
}

export function getPlanetCategoryLabel(value: string, locale: string) {
  if (!isPlanetCategory(value)) return value;
  const labels =
    locale === "en" || locale === "fr"
      ? categoryLabels[locale]
      : categoryLabels["zh-CN"];
  return labels[value];
}
