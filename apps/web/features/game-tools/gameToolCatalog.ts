import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, Crown, Dice5, Sparkles, UsersRound } from "lucide-react";

export type GameToolKind = "AVALON" | "STORYTELLER";

export type GameToolDefinition = {
  accent: string;
  availability: "available" | "planned";
  description: Record<string, string>;
  href: string;
  icon: LucideIcon;
  imageSrc: string;
  kind: GameToolKind;
  maxPlayers: number;
  minPlayers: number;
  phase: Record<string, string>;
  title: Record<string, string>;
};

export const gameToolDefinitions: GameToolDefinition[] = [
  {
    accent: "#F09182",
    availability: "available",
    description: {
      "zh-CN": "扫码入座、私密身份、任务投票、公共屏和主持人修正，适合线下快速开局。",
      en: "Seats, private roles, quest votes, public screen, and host corrections for in-person play.",
      fr: "Places, rôles privés, votes de quête, écran public et corrections pour jouer autour de la table.",
    },
    href: "/game-tools/avalon",
    icon: Dice5,
    imageSrc: "/game-tools/avalon/avalon-tool-icon.svg",
    kind: "AVALON",
    maxPlayers: 10,
    minPlayers: 5,
    phase: {
      "zh-CN": "已可试玩",
      en: "Playable",
      fr: "Jouable",
    },
    title: {
      "zh-CN": "Avalon 阿瓦隆",
      en: "Avalon",
      fr: "Avalon",
    },
  },
  {
    accent: "#156240",
    availability: "planned",
    description: {
      "zh-CN": "面向说书人的魔典、座位、状态、夜晚流程和公共屏底座，后续复用同一套房间能力。",
      en: "A shared room foundation for storytellers: grimoire, seats, states, night flow, and public screen.",
      fr: "Une base commune pour conteurs : grimoire, places, états, nuit et écran public.",
    },
    href: "/game-tools/storyteller",
    icon: BookOpenCheck,
    imageSrc: "/game-tools/avalon/states/public-screen-token.svg",
    kind: "STORYTELLER",
    maxPlayers: 20,
    minPlayers: 5,
    phase: {
      "zh-CN": "规划中",
      en: "Planned",
      fr: "Prévu",
    },
    title: {
      "zh-CN": "说书人工具",
      en: "Storyteller",
      fr: "Conteur",
    },
  },
];

export function getGameToolDefinition(kind: GameToolKind) {
  return gameToolDefinitions.find((tool) => tool.kind === kind) ?? null;
}

export function getGameToolLabel(
  value: Record<string, string>,
  locale: string,
) {
  return value[locale] ?? value.en ?? value["zh-CN"] ?? "";
}

export function getGameToolHubCopy(locale: string) {
  if (locale === "fr") {
    return {
      available: "Disponible",
      eyebrow: "Friemi Table Tools",
      foundation: "Une seule base de salle",
      foundationBody:
        "Code court, places, hôte, événements, écran public et liens privés restent communs. Chaque jeu ajoute seulement ses règles et son interface.",
      hero:
        "Ouvre une table, fais entrer les joueurs, puis laisse l'outil suivre ce qui doit rester discret.",
      planned: "À venir",
      primary: "Ouvrir",
      range: "joueurs",
      secondary: "Voir le plan",
      title: "Des outils de table pour jouer sans casser le rythme.",
      traits: [
        { icon: UsersRound, label: "Places" },
        { icon: Crown, label: "Hôte" },
        { icon: Sparkles, label: "Écran" },
      ],
    };
  }

  if (locale === "en") {
    return {
      available: "Available",
      eyebrow: "Friemi Table Tools",
      foundation: "One shared room layer",
      foundationBody:
        "Short codes, seats, host control, events, public screens, and private links stay shared. Each game only adds its rules and interface.",
      hero:
        "Open a table, bring players in, and let the tool track what should stay private.",
      planned: "Coming",
      primary: "Open",
      range: "players",
      secondary: "Preview",
      title: "Table tools that help the game without stealing the table.",
      traits: [
        { icon: UsersRound, label: "Seats" },
        { icon: Crown, label: "Host" },
        { icon: Sparkles, label: "Screen" },
      ],
    };
  }

  return {
    available: "可使用",
    eyebrow: "Friemi Table Tools",
    foundation: "统一房间底座",
    foundationBody:
      "短房号、座位、房主、事件、公共屏和私密链接保持共用。每个游戏只接自己的规则和界面。",
    hero: "开一张桌，让玩家入座，把隐私和流程交给工具，现场还是留给大家聊天和推理。",
    planned: "规划中",
    primary: "打开",
    range: "人",
    secondary: "查看规划",
    title: "桌游工具，帮你开局，不抢走线下的热闹。",
    traits: [
      { icon: UsersRound, label: "入座" },
      { icon: Crown, label: "房主" },
      { icon: Sparkles, label: "公共屏" },
    ],
  };
}
