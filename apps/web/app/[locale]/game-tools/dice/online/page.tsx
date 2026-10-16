import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DiceOnlineEntry } from "@/features/game-tools/components/DiceOnlineEntry";
import { isDiceEnabled } from "@/features/game-tools/diceAvailability";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { buildPageShareMetadata } from "@/lib/share-metadata";
import { getCanonicalSiteUrl } from "@/lib/site-url";

const metadataCopy = {
  "zh-CN": {
    title: "在线吹牛骰子游戏",
    description:
      "与朋友在浏览器中玩吹牛骰子：支持 2–6 人，每人 5 颗骰子，自己的点数只有自己可见。登录后创建房间或输入房间号加入。",
  },
  en: {
    title: "Play Liar's Dice Online",
    description:
      "Play Liar's Dice online with friends: 2–6 players, five private dice each. Sign in to create a room or join with a room code.",
  },
  fr: {
    title: "Dés menteurs en ligne",
    description:
      "Jouez aux dés menteurs entre amis sur navigateur : 2 à 6 joueurs, cinq dés privés chacun. Connectez-vous pour créer ou rejoindre une salle.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;

  // Override the online layout's noindex only for this public entry page.
  // Room pages keep the layout's private, non-indexable defaults.
  return buildPageShareMetadata({
    baseUrl: getCanonicalSiteUrl(),
    description: copy.description,
    path: withLocale(locale, "/game-tools/dice/online"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function DiceOnlinePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string }> }) {
  if (!isDiceEnabled()) notFound();
  const { locale } = await params;
  const { code } = await searchParams;
  const profileId = await getExistingDrawGuessProfileId();
  return <PageContainer className="max-w-[46rem] dice-online-page pb-4 pt-5" mobileSafeTop><DiceOnlineEntry locale={locale} profileId={profileId} initialCode={code ?? ""} /></PageContainer>;
}
