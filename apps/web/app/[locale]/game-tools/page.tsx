import type { Metadata } from "next";
import { headers } from "next/headers";
import { Layers3 } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { GameToolCard } from "@/features/game-tools/components/GameToolCard";
import { GameToolBackButton } from "@/features/game-tools/components/GameToolBackButton";
import { isDiceEnabled } from "@/features/game-tools/diceAvailability";
import { isUnoEnabled } from "@/features/game-tools/unoFlags";
import { isDrawGuessChainEnabled, isDrawGuessClassicEnabled } from "@/features/game-tools/drawGuessFlags";
import {
  gameToolDefinitions,
  getGameToolHubCopy,
} from "@/features/game-tools/gameToolCatalog";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type GameToolsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const metadataCopy = {
  "zh-CN": {
    description:
      "Friemi 在线桌游网页版：开房玩你画我猜和骰子吹牛，自由摇骰，使用狼人杀组局工具。与朋友在线玩，无需下载。",
    title: "在线桌游与游戏房间",
  },
  en: {
    description:
      "Play Draw & Guess and Liar’s Dice online with friends on Friemi. Roll dice in your browser or use Werewolf table tools. No download needed.",
    title: "Online Table Games & Rooms",
  },
  fr: {
    description:
      "Jouez à Dessine et devine et au bluff avec vos amis en ligne sur Friemi. Lancez les dés sur navigateur ou utilisez les outils Loups-garous, sans téléchargement.",
    title: "Jeux de table et salons en ligne",
  },
};

function getMobileGameToolsCopy(locale: string) {
  if (locale === "fr") {
    return {
      available: "Ouvrir",
      coming: "Bientôt",
      playerRange: "joueurs",
      singlePlayer: "joueur",
      title: "Jeux",
      intros: {
        AVALON: "Rôles, votes et quêtes.",
        BOTC: "Grimoire et rythme de nuit.",
        DRAW_GUESS: "Dessiner, deviner, transmettre.",
        DICE: "Lancer les dés ou jouer entre amis.",
        UNO: "Couleurs et chiffres.",
        OTHER: "Plus d'outils à venir.",
        STORYTELLER: "Grimoire et rythme de nuit.",
        WEREWOLF: "Rôles, morts et résultat.",
      },
    };
  }

  if (locale === "en") {
    return {
      available: "Open",
      coming: "Soon",
      playerRange: "players",
      singlePlayer: "player",
      title: "Games",
      intros: {
        AVALON: "Roles, votes, and quests.",
        BOTC: "Grimoire and night flow.",
        DRAW_GUESS: "Draw, guess, pass it on.",
        DICE: "Roll freely or play with friends.",
        UNO: "Match colors or numbers.",
        OTHER: "More tools later.",
        STORYTELLER: "Grimoire and night flow.",
        WEREWOLF: "Roles, deaths, and result.",
      },
    };
  }

  return {
    available: "开局",
    coming: "敬请期待",
    playerRange: "人",
    singlePlayer: "人",
    title: "桌游",
    intros: {
      AVALON: "发身份、投票、记任务。",
      BOTC: "魔典和夜晚流程。",
      DRAW_GUESS: "抢答或接龙，画出意想不到。",
      DICE: "自由摇骰 · 好友吹牛",
      UNO: "配颜色、接数字。",
      OTHER: "更多工具会继续接入。",
      STORYTELLER: "魔典和夜晚流程。",
      WEREWOLF: "发身份、记生死、看结算。",
    },
  };
}

export async function generateMetadata({
  params,
}: GameToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function GameToolsPage({ params }: GameToolsPageProps) {
  const { locale } = await params;
  const copy = getGameToolHubCopy(locale);
  const mobileCopy = getMobileGameToolsCopy(locale);
  const drawGuessAvailable = isDrawGuessChainEnabled() || isDrawGuessClassicEnabled();
  const diceAvailable = isDiceEnabled();
  const unoAvailable = isUnoEnabled();
  const tools = gameToolDefinitions;
  const renderCard = (tool: (typeof tools)[number], headingLevel: 2 | 3) => (
    <GameToolCard
      available={tool.kind === "UNO" ? unoAvailable : tool.kind === "DICE" ? diceAvailable : tool.kind === "DRAW_GUESS" ? drawGuessAvailable : tool.availability === "available"}
      description={mobileCopy.intros[tool.kind]}
      headingLevel={headingLevel}
      key={tool.kind}
      locale={locale}
      tool={tool}
    />
  );

  return (
    <>
      <main className="friemi-native-app-mobile-only mobile-v23-game-tools app-mobile-page-shell [--app-mobile-page-top-gap:1.55rem] [--app-mobile-page-bottom-gap:1.2rem] bg-white text-[#111210] md:hidden">
        <div className="mx-auto w-full max-w-[430px] px-5">
          <header className="space-y-4">
            <GameToolBackButton
              fallbackHref={withLocale(locale, "/activities/new")}
              locale={locale}
            />
            <h1 className="text-[31px] font-bold leading-none tracking-normal">
              {mobileCopy.title}
            </h1>
          </header>

          <section className="mt-5">
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool) => renderCard(tool, 3))}
            </div>
          </section>
        </div>
      </main>

      <PageContainer className="friemi-native-app-desktop-only hidden max-w-[94rem] space-y-6 pb-28 pt-4 md:block sm:pb-14 sm:pt-7">
        <section className="relative isolate overflow-hidden rounded-[2.1rem] border border-[#8AB68E]/40 bg-[#FEFFF9] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.12)] sm:p-7 lg:p-9">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F09182]/18 blur-3xl" />
          <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-[#DEEBFF]/55 blur-3xl" />
          <div className="absolute right-10 top-12 hidden h-36 w-36 rounded-full border border-[#8AB68E]/35 lg:block" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/50 bg-white/82 px-3 py-1.5 text-[11px] font-bold uppercase tracking-normal text-[#156240]">
                <Layers3 className="h-3.5 w-3.5" />
                {copy.eyebrow}
              </span>
              <div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-normal text-[#0E2A5C] sm:text-5xl lg:text-6xl">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#156240]/78 sm:text-lg">
                  {copy.hero}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {copy.traits.map((trait) => {
                  const Icon = trait.icon;

                  return (
                    <span
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-white/82 px-3 text-sm font-bold text-[#156240] shadow-sm"
                      key={trait.label}
                    >
                      <Icon className="h-4 w-4" />
                      {trait.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {tools.map((tool) => renderCard(tool, 2))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]/45">
            <Layers3 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#0E2A5C]">
              {copy.foundation}
            </h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-[#156240]/72">
              {copy.foundationBody}
            </p>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
