import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { GameToolBackButton } from "@/features/game-tools/components/GameToolBackButton";
import { WerewolfCreateRoomPanel } from "@/features/game-tools/components/WerewolfCreateRoomPanel";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type WerewolfToolPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const metadataCopy = {
  "zh-CN": {
    description: "开狼人杀、扫码入座、私密发身份，现场照常推理。",
    title: "狼人杀",
  },
  en: {
    description: "Open a Werewolf table, seat players by QR, and deal private roles.",
    title: "Werewolf",
  },
  fr: {
    description:
      "Ouvrez une table Loups-garous, faites scanner les places et distribuez les rôles.",
    title: "Loups-garous",
  },
};

export async function generateMetadata({
  params,
}: WerewolfToolPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools/werewolf"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function WerewolfToolPage({
  params,
}: WerewolfToolPageProps) {
  const { locale } = await params;

  return (
    <PageContainer className="max-w-[94rem] space-y-5 overflow-x-hidden pb-28 pt-4 sm:pb-12 sm:pt-7">
      <GameToolBackButton
        fallbackHref={withLocale(locale, "/game-tools")}
        locale={locale}
      />
      <WerewolfCreateRoomPanel locale={locale} />
    </PageContainer>
  );
}
