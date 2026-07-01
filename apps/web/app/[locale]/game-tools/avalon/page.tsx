import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonAssistantClient } from "@/features/game-tools/components/AvalonAssistantClient";
import { AvalonCreateRoomPanel } from "@/features/game-tools/components/AvalonCreateRoomPanel";
import { GameToolBackButton } from "@/features/game-tools/components/GameToolBackButton";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonToolPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const metadataCopy: Record<
  string,
  {
    description: string;
    title: string;
  }
> = {
  "zh-CN": {
    description:
      "阿瓦隆是一款 5-10 人隐藏身份桌游。Friemi 帮你开房、发身份、记投票和任务，让线下组局更顺。",
    title: "阿瓦隆",
  },
  en: {
    description:
      "Avalon is a 5-10 player hidden-role table game. Friemi helps with rooms, private roles, votes, quests, and recap.",
    title: "Avalon",
  },
  fr: {
    description:
      "Avalon est un jeu à rôles cachés pour 5 à 10 joueurs. Friemi aide à ouvrir une table, distribuer les rôles, suivre votes, quêtes et récap.",
    title: "Avalon",
  },
};

export async function generateMetadata({
  params,
}: AvalonToolPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = metadataCopy[locale] ?? metadataCopy.en;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools/avalon"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function AvalonToolPage({ params }: AvalonToolPageProps) {
  const { locale } = await params;

  return (
    <PageContainer className="max-w-[96rem] space-y-5 overflow-x-hidden pb-28 pt-4 sm:pb-12 sm:pt-7">
      <GameToolBackButton
        fallbackHref={withLocale(locale, "/game-tools")}
        locale={locale}
      />
      <AvalonCreateRoomPanel locale={locale} />
      <AvalonAssistantClient locale={locale} />
    </PageContainer>
  );
}
