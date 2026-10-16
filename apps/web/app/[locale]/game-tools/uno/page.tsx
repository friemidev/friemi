import type { Metadata } from "next";
import { UnoEntryClient } from "@/features/game-tools/components/UnoEntryClient";
import { UnoComingSoon } from "@/features/game-tools/components/UnoComingSoon";
import { isUnoEnabled } from "@/features/game-tools/unoFlags";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { buildPageShareMetadata } from "@/lib/share-metadata";
import { getCanonicalSiteUrl } from "@/lib/site-url";

const metadataCopy = {
  "zh-CN": {
    title: "UNO 在线卡牌游戏网页版",
    description: "UNO 多人在线网页版卡牌游戏：与朋友创建 2–10 人房间，按颜色或数字出牌，点击 UNO，争夺回合胜利。",
    comingTitle: "UNO 在线网页版即将上线",
    comingDescription: "Friemi UNO 多人在线网页版卡牌游戏即将上线，之后可和朋友开房组局。",
  },
  en: {
    title: "Play UNO Online in Your Browser",
    description: "Play UNO online with friends in your browser: a 2–10 player card game.",
    comingTitle: "UNO Online Browser Game Coming Soon",
    comingDescription: "Friemi's online UNO browser card game for friends is coming soon.",
  },
  fr: {
    title: "Jeu de cartes UNO en ligne sur navigateur",
    description: "Jeu de cartes UNO en ligne sur navigateur pour 2 à 10 joueurs.",
    comingTitle: "UNO en ligne sur navigateur arrive bientôt",
    comingDescription: "Le jeu de cartes UNO en ligne sur navigateur arrive bientôt chez Friemi.",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const copy = metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const enabled = isUnoEnabled();

  return buildPageShareMetadata({
    baseUrl: getCanonicalSiteUrl(),
    description: enabled ? copy.description : copy.comingDescription,
    path: withLocale(locale, "/game-tools/uno"),
    title: `${enabled ? copy.title : copy.comingTitle} · ${brand.name}`,
  });
}

export default async function UnoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isUnoEnabled()) return <UnoComingSoon locale={locale}/>;
  return <UnoEntryClient locale={locale} preview={process.env.NODE_ENV !== "production"}/>;
}
