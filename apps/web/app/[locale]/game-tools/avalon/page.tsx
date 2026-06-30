import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonAssistantClient } from "@/features/game-tools/components/AvalonAssistantClient";
import { AvalonCreateRoomPanel } from "@/features/game-tools/components/AvalonCreateRoomPanel";
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
      "Friemi 阿瓦隆线下辅助工具，支持快速配置人数、预览身份、记录任务与复盘时间线。",
    title: "阿瓦隆线下助手",
  },
  en: {
    description:
      "A Friemi offline Avalon-style assistant for quick setup, role preview, quest tracking, and table recap.",
    title: "Avalon Offline Assistant",
  },
  fr: {
    description:
      "Un assistant Friemi hors ligne pour configurer une partie Avalon, prévisualiser les rôles, suivre les quêtes et revoir la partie.",
    title: "Assistant Avalon hors ligne",
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
    <PageContainer className="max-w-[96rem] space-y-5 pb-28 pt-4 sm:pb-12 sm:pt-7">
      <AvalonCreateRoomPanel locale={locale} />
      <AvalonAssistantClient locale={locale} />
    </PageContainer>
  );
}
