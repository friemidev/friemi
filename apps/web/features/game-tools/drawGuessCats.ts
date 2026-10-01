export const DRAW_GUESS_CATS = [
  { id: "scholar", zh: "学者喵", en: "Scholar", fr: "Savant", fur: "#EAD5A2", patch: "#A8875B", outfit: "#99AD72", hat: "cap", glasses: "square" },
  { id: "baker", zh: "面包喵", en: "Baker", fr: "Boulanger", fur: "#FFF2D6", patch: "#D99064", outfit: "#D97973", hat: "beret", glasses: "none" },
  { id: "explorer", zh: "探险喵", en: "Explorer", fr: "Explorateur", fur: "#F2B759", patch: "#C77D4C", outfit: "#E3A148", hat: "cap", glasses: "none" },
  { id: "cocoa", zh: "可可喵", en: "Cocoa", fr: "Cacao", fur: "#A77C69", patch: "#7D584E", outfit: "#E8C46D", hat: "none", glasses: "none" },
  { id: "cloud", zh: "云朵喵", en: "Cloud", fr: "Nuage", fur: "#FFF3DB", patch: "#EBA770", outfit: "#FFF3DB", hat: "none", glasses: "none" },
  { id: "artist", zh: "画家喵", en: "Artist", fr: "Artiste", fur: "#F7DEB2", patch: "#D88A57", outfit: "#6E8EC1", hat: "none", glasses: "none" },
  { id: "captain", zh: "船长喵", en: "Captain", fr: "Capitaine", fur: "#F0B761", patch: "#C57950", outfit: "#57A7BD", hat: "crown", glasses: "none" },
  { id: "dreamer", zh: "睡帽喵", en: "Dreamer", fr: "Rêveur", fur: "#FFF1D9", patch: "#D89E91", outfit: "#DA9DA9", hat: "beanie", glasses: "none" },
  { id: "disco", zh: "迪斯科喵", en: "Disco", fr: "Disco", fur: "#D7B39B", patch: "#A67D70", outfit: "#D7B39B", hat: "none", glasses: "shades" },
  { id: "sunny", zh: "阳光喵", en: "Sunny", fr: "Soleil", fur: "#FFF0D2", patch: "#E8A16F", outfit: "#FFF0D2", hat: "visor", glasses: "none" },
  { id: "calico", zh: "三花喵", en: "Calico", fr: "Calico", fur: "#FFF3DE", patch: "#C87D61", outfit: "#FFF3DE", hat: "none", glasses: "none" },
  { id: "mocha", zh: "摩卡喵", en: "Mocha", fr: "Moka", fur: "#B88B72", patch: "#8B6357", outfit: "#B88B72", hat: "none", glasses: "none" },
  { id: "mango", zh: "芒果喵", en: "Mango", fr: "Mangue", fur: "#F6CE57", patch: "#E18A58", outfit: "#F6CE57", hat: "none", glasses: "none" },
  { id: "peach", zh: "桃桃喵", en: "Peach", fr: "Pêche", fur: "#FFE7CF", patch: "#E8B1A0", outfit: "#FFE7CF", hat: "none", glasses: "none" },
  { id: "inventor", zh: "发明喵", en: "Inventor", fr: "Inventeur", fur: "#F5E4BA", patch: "#D49A69", outfit: "#F5E4BA", hat: "none", glasses: "goggles" },
] as const;

export type DrawGuessCatId = (typeof DRAW_GUESS_CATS)[number]["id"];
export type DrawGuessCatDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type DrawGuessCatMood = "idle" | "happy" | "sad";

const CAT_IDS = new Set<string>(DRAW_GUESS_CATS.map((cat) => cat.id));

export function isDrawGuessCatId(value: unknown): value is DrawGuessCatId {
  return typeof value === "string" && CAT_IDS.has(value);
}

export function getDrawGuessCat(id: string | null | undefined) {
  return DRAW_GUESS_CATS.find((cat) => cat.id === id) ?? DRAW_GUESS_CATS[0];
}

export function getDrawGuessCatName(id: string | null | undefined, locale: string) {
  const cat = getDrawGuessCat(id);
  return locale === "zh-CN" ? cat.zh : locale === "fr" ? cat.fr : cat.en;
}

export function fallbackDrawGuessCatId(seed: string): DrawGuessCatId {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  return DRAW_GUESS_CATS[(hash >>> 0) % DRAW_GUESS_CATS.length].id;
}
