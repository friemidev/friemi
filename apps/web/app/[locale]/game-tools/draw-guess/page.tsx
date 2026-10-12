import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessEntryClient } from "@/features/game-tools/components/DrawGuessEntryClient";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { isDrawGuessChainEnabled, isDrawGuessClassicEnabled } from "@/features/game-tools/drawGuessFlags";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { buildPageShareMetadata, getRequestBaseUrl } from "@/lib/share-metadata";

const metadataCopy = {
  "zh-CN": {
    title: "你画我猜网页版｜在线多人画画猜词",
    description: "和朋友在线玩你画我猜：创建房间，实时画画猜词。支持抢答模式、画画接龙和趣味词库，手机或电脑打开网页就能玩。",
    keywords: ["你画我猜", "你画我猜在线", "你画我猜网页版", "在线画画猜词", "多人画画游戏", "抢答模式", "画画接龙"],
  },
  en: {
    title: "Draw & Guess Online | Multiplayer Browser Game",
    description: "Play Draw & Guess online with friends in your browser. Create a room, draw and guess words in real time, or pass drawings along in relay mode on mobile or desktop.",
    keywords: ["draw and guess online", "browser drawing game", "multiplayer drawing game", "guess the drawing", "drawing relay"],
  },
  fr: {
    title: "Dessine et devine en ligne | Jeu multijoueur",
    description: "Jouez à Dessine et devine en ligne avec vos amis dans le navigateur. Créez un salon, dessinez, devinez et passez le dessin en chaîne sur mobile ou ordinateur.",
    keywords: ["dessine et devine en ligne", "jeu de dessin sur navigateur", "jeu de dessin multijoueur", "dessin en chaîne"],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = getRequestBaseUrl(await headers());
  const copy = metadataCopy[locale as keyof typeof metadataCopy] ?? metadataCopy.en;
  const shareMetadata = buildPageShareMetadata({
    baseUrl,
    description: copy.description,
    path: withLocale(locale, "/game-tools/draw-guess"),
    title: `${copy.title} · ${brand.name}`,
  });
  return {
    ...shareMetadata,
    description: copy.description,
    keywords: [...copy.keywords],
    openGraph: { ...shareMetadata.openGraph, description: copy.description },
    twitter: { ...shareMetadata.twitter, description: copy.description },
  };
}

export default async function DrawGuessToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const profileId = await getExistingDrawGuessProfileId();
  return (
    <PageContainer className="max-w-[45rem] pb-12 pt-5" mobileSafeBottom mobileSafeTop>
      <DrawGuessEntryClient chainEnabled={isDrawGuessChainEnabled()} classicEnabled={isDrawGuessClassicEnabled()} locale={locale} profileId={profileId} />
    </PageContainer>
  );
}
