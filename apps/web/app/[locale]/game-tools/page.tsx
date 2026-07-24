import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, ChevronRight, Layers3, LockKeyhole } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { GameToolBackButton } from "@/features/game-tools/components/GameToolBackButton";
import {
  gameToolDefinitions,
  getGameToolHubCopy,
  getGameToolLabel,
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
      "Friemi 桌游工具大厅：从 Avalon 到说书人工具，共用同一套线下房间能力。",
    title: "桌游工具大厅",
  },
  en: {
    description:
      "Friemi table tools hub: shared offline room capabilities from Avalon to storyteller tools.",
    title: "Table Tools",
  },
  fr: {
    description:
      "Hub d'outils de table Friemi : une base commune d'Avalon aux outils de conteur.",
    title: "Outils de table",
  },
};

function getMobileGameToolsCopy(locale: string) {
  if (locale === "fr") {
    return {
      available: "Ouvrir",
      coming: "Bientôt",
      playerRange: "joueurs",
      title: "Jeux",
      toolList: "Tous les outils",
      intros: {
        AVALON: "Rôles, votes et quêtes.",
        BOTC: "Grimoire et rythme de nuit.",
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
      title: "Games",
      toolList: "All tools",
      intros: {
        AVALON: "Roles, votes, and quests.",
        BOTC: "Grimoire and night flow.",
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
    title: "桌游",
    toolList: "全部工具",
    intros: {
      AVALON: "发身份、投票、记任务。",
      BOTC: "魔典和夜晚流程。",
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

  return (
    <>
      <main className="mobile-v23-game-tools app-mobile-page-shell [--app-mobile-page-top-gap:1.55rem] [--app-mobile-page-bottom-gap:1.2rem] bg-[#FEFFF9] text-[#111210] md:hidden">
        <div className="mx-auto w-full max-w-[430px] px-5">
          <header className="space-y-6">
            <GameToolBackButton
              fallbackHref={withLocale(locale, "/activities/new")}
              locale={locale}
            />
            <h1 className="text-[31px] font-black leading-none tracking-normal">
              {mobileCopy.title}
            </h1>
          </header>

          <section className="mt-7">
            <h2 className="text-[18px] font-black leading-none tracking-normal text-[#0D5A3C]">
              {mobileCopy.toolList}
            </h2>
            <div className="mt-4 space-y-3">
              {gameToolDefinitions.map((tool) => {
                const Icon = tool.icon;
                const isAvailable = tool.availability === "available";
                const cardClassName =
                  "group grid min-h-[7.35rem] grid-cols-[6.6rem_minmax(0,1fr)_2.1rem] items-center gap-3 rounded-[1.45rem] border border-[#D6D5B2]/72 bg-white p-2.5 shadow-[0_12px_28px_rgba(29,29,27,0.075)] transition focus:outline-none focus-visible:border-[#8AB68E]";
                const cardContent = (
                  <>
                    <div className="relative h-[6.85rem] overflow-hidden rounded-[1.15rem] bg-[#F1F2EC]">
                      <Image
                        alt=""
                        className={
                          tool.kind === "OTHER"
                            ? "object-contain p-8"
                            : "object-cover"
                        }
                        fill
                        priority={tool.kind === "WEREWOLF"}
                        sizes="(max-width: 768px) 390px"
                        src={tool.imageSrc}
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#F1F2EC] px-2 text-[10.5px] font-extrabold text-[#0D5A3C]">
                        <Icon className="h-3.5 w-3.5" />
                        {isAvailable ? mobileCopy.available : mobileCopy.coming}
                      </span>
                      <h3 className="mt-2 truncate text-[18px] font-black leading-tight tracking-normal text-[#111210]">
                        {getGameToolLabel(tool.title, locale)}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-[12.5px] font-semibold leading-5 text-[#123D31]/62">
                        {mobileCopy.intros[tool.kind]}
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-[#D6D5B2]/70 bg-[#FEFFF9] px-2 py-0.5 text-[11px] font-extrabold text-[#0D5A3C]">
                        {tool.minPlayers === tool.maxPlayers
                          ? tool.minPlayers
                          : `${tool.minPlayers}-${tool.maxPlayers}`}{" "}
                        {mobileCopy.playerRange}
                      </span>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6D5B2]/75 bg-[#F1F2EC] text-[#0D5A3C] transition group-active:translate-x-0.5">
                      {isAvailable ? (
                        <ChevronRight className="h-[16px] w-[16px]" />
                      ) : (
                        <LockKeyhole className="h-[14px] w-[14px]" />
                      )}
                    </span>
                  </>
                );

                return isAvailable ? (
                  <Link
                    className={`${cardClassName} active:scale-[0.985]`}
                    href={withLocale(locale, tool.href)}
                    key={tool.kind}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className={`${cardClassName} opacity-90`}
                    key={tool.kind}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <PageContainer className="hidden max-w-[94rem] space-y-6 pb-28 pt-4 md:block sm:pb-14 sm:pt-7">
        <section className="relative isolate overflow-hidden rounded-[2.1rem] border border-[#8AB68E]/40 bg-[#FEFFF9] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.12)] sm:p-7 lg:p-9">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F09182]/18 blur-3xl" />
          <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-[#DEEBFF]/55 blur-3xl" />
          <div className="absolute right-10 top-12 hidden h-36 w-36 rounded-full border border-[#8AB68E]/35 lg:block" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-end">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/50 bg-white/82 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#156240]">
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

            <div className="grid gap-3 sm:grid-cols-2">
              {gameToolDefinitions.map((tool) => {
                const Icon = tool.icon;
                const isAvailable = tool.availability === "available";
                const cardClassName =
                  "group relative min-h-[20rem] overflow-hidden rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-4 shadow-[0_18px_45px_rgba(21,98,64,0.1)] transition duration-300";
                const cardContent = (
                  <>
                    <div
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ backgroundColor: tool.accent }}
                    />
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#F1F2EC] blur-2xl transition group-hover:bg-[#DEEBFF]" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#8AB68E]/45 bg-[#FEFFF9]/90 px-2.5 text-xs font-extrabold text-[#156240]">
                          <Icon className="h-3.5 w-3.5" />
                          {getGameToolLabel(tool.phase, locale)}
                        </span>
                        <span className="rounded-full bg-[#1D1D1B] px-2.5 py-1 text-[11px] font-bold text-white">
                          {tool.minPlayers === tool.maxPlayers
                            ? tool.minPlayers
                            : `${tool.minPlayers}-${tool.maxPlayers}`}{" "}
                          {copy.range}
                        </span>
                      </div>

                      <div className="my-6 grid place-items-center">
                        <span className="grid h-28 w-28 place-items-center overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] shadow-[0_18px_38px_rgba(21,98,64,0.12)]">
                          <Image
                            alt=""
                            className={
                              tool.kind === "OTHER"
                                ? "h-20 w-20 object-contain p-2"
                                : "h-full w-full object-cover"
                            }
                            height={112}
                            src={tool.imageSrc}
                            width={112}
                          />
                        </span>
                      </div>

                      <div className="mt-auto">
                        <h2 className="text-2xl font-extrabold tracking-normal text-[#0E2A5C]">
                          {getGameToolLabel(tool.title, locale)}
                        </h2>
                        <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#156240]/70">
                          {getGameToolLabel(tool.description, locale)}
                        </p>
                        <span
                          className={
                            isAvailable
                              ? "mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] transition group-hover:bg-[#369758]"
                              : "mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#F1F2EC] px-4 text-sm font-extrabold text-[#156240]"
                          }
                        >
                          {isAvailable ? copy.primary : copy.planned}
                          {isAvailable ? (
                            <ArrowRight className="h-4 w-4" />
                          ) : (
                            <LockKeyhole className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                );

                return isAvailable ? (
                  <Link
                    className={`${cardClassName} hover:-translate-y-1 hover:border-[#8AB68E] hover:shadow-[0_24px_70px_rgba(21,98,64,0.16)]`}
                    href={withLocale(locale, tool.href)}
                    key={tool.kind}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div
                    aria-disabled="true"
                    className={`${cardClassName} opacity-90`}
                    key={tool.kind}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]/45">
            <Layers3 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-[#0E2A5C]">
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
