import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowLeft,
  BookOpenCheck,
  MonitorUp,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
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

type StorytellerToolPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const metadataCopy = {
  "zh-CN": {
    description: "Friemi 通用说书人工具规划：魔典、座位、夜晚流程和公共屏将复用桌游房间底座。",
    title: "说书人工具",
  },
  en: {
    description:
      "Friemi storyteller tool plan: grimoire, seats, night flow, and public screen on the shared table room layer.",
    title: "Storyteller Tool",
  },
  fr: {
    description:
      "Plan de l'outil conteur Friemi : grimoire, places, nuit et écran public sur la base commune.",
    title: "Outil conteur",
  },
};

function getStorytellerCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Tous les outils",
      eyebrow: "Storyteller v1.0",
      sections: [
        {
          body: "Le code court, les places, l'hôte et les liens privés viennent de la même base que Avalon.",
          icon: UsersRound,
          title: "Salle commune",
        },
        {
          body: "Les rôles, états et notes restent côté conteur. Rien de caché ne part vers l'écran public.",
          icon: ShieldCheck,
          title: "Grimoire privé",
        },
        {
          body: "L'écran public n'affichera que les informations ouvertes : sièges, morts, nominations et minuteur.",
          icon: MonitorUp,
          title: "Écran public",
        },
      ],
      subtitle:
        "La première étape consiste à partager l'architecture de salle. Le grimoire complet viendra ensuite.",
      title: "Un outil de conteur posé sur la même table.",
    };
  }

  if (locale === "en") {
    return {
      back: "All tools",
      eyebrow: "Storyteller v1.0",
      sections: [
        {
          body: "Short code, seats, host ownership, and private links reuse the same room base as Avalon.",
          icon: UsersRound,
          title: "Shared room",
        },
        {
          body: "Roles, states, and notes stay with the storyteller. Hidden information never leaks to public screens.",
          icon: ShieldCheck,
          title: "Private grimoire",
        },
        {
          body: "The public screen will only show open information: seats, deaths, nominations, and timers.",
          icon: MonitorUp,
          title: "Public screen",
        },
      ],
      subtitle:
        "The first step is sharing the room architecture. The full grimoire comes after the foundation is stable.",
      title: "A storyteller tool built on the same table layer.",
    };
  }

  return {
    back: "全部工具",
    eyebrow: "Storyteller v1.0",
    sections: [
      {
        body: "短房号、座位、房主和私密链接复用 Avalon 的同一套房间底座。",
        icon: UsersRound,
        title: "共用房间",
      },
      {
        body: "身份、状态、提醒物和备注只留在说书人侧，隐藏信息不进入公共屏。",
        icon: ShieldCheck,
        title: "私密魔典",
      },
      {
        body: "公共屏只展示公开信息，例如座位、生死、提名、票数和计时。",
        icon: MonitorUp,
        title: "公共屏",
      },
    ],
    subtitle:
      "第一步先共用房间架构，完整魔典、夜晚流程和投票记录会在底座稳定后继续接入。",
    title: "说书人工具，也从同一张桌开始。",
  };
}

export async function generateMetadata({
  params,
}: StorytellerToolPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools/storyteller"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function StorytellerToolPage({
  params,
}: StorytellerToolPageProps) {
  const { locale } = await params;
  const copy = getStorytellerCopy(locale);
  const hubCopy = getGameToolHubCopy(locale);
  const tool =
    gameToolDefinitions.find((definition) => definition.kind === "STORYTELLER") ??
    gameToolDefinitions[1];

  return (
    <PageContainer className="max-w-[88rem] space-y-5 pb-28 pt-4 sm:pb-14 sm:pt-7">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#8AB68E]/55 bg-white/82 px-4 text-sm font-bold text-[#156240] shadow-sm transition hover:bg-[#F1F2EC]"
        href={withLocale(locale, "/game-tools")}
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#8AB68E]/40 bg-[#FEFFF9] p-5 shadow-[0_24px_70px_rgba(21,98,64,0.12)] sm:p-7 lg:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#DEEBFF]/60 blur-3xl" />
        <div className="absolute -bottom-28 left-8 h-72 w-72 rounded-full bg-[#F09182]/16 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(20rem,0.58fr)] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/50 bg-white/82 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#156240]">
              <BookOpenCheck className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </span>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-normal text-[#0E2A5C] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[#156240]/76">
              {copy.subtitle}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#D6D5B2] bg-white/82 p-5 shadow-[0_18px_45px_rgba(21,98,64,0.1)]">
            <div className="grid place-items-center rounded-[1.35rem] bg-[#F1F2EC] py-8 ring-1 ring-[#8AB68E]/35">
              <Image
                alt=""
                className="h-24 w-24 drop-shadow-[0_16px_28px_rgba(21,98,64,0.16)]"
                height={112}
                src={tool.imageSrc}
                width={112}
              />
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#156240]/65">
                  {getGameToolLabel(tool.phase, locale)}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0E2A5C]">
                  {getGameToolLabel(tool.title, locale)}
                </h2>
              </div>
              <span className="rounded-full bg-[#156240] px-3 py-1.5 text-xs font-extrabold text-white">
                {tool.minPlayers}-{tool.maxPlayers} {hubCopy.range}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {copy.sections.map((section) => {
          const Icon = section.icon;

          return (
            <article
              className="rounded-[1.5rem] border border-[#D6D5B2] bg-white/84 p-5 shadow-sm"
              key={section.title}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]/45">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-extrabold text-[#0E2A5C]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#156240]/72">
                {section.body}
              </p>
            </article>
          );
        })}
      </section>
    </PageContainer>
  );
}
