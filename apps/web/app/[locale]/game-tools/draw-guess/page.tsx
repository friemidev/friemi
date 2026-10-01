import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessEntryClient } from "@/features/game-tools/components/DrawGuessEntryClient";
import { isDrawGuessChainEnabled, isDrawGuessClassicEnabled } from "@/features/game-tools/drawGuessFlags";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import { buildPageShareMetadata, getRequestBaseUrl } from "@/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = getRequestBaseUrl(await headers());
  return buildPageShareMetadata({
    baseUrl,
    description: locale === "zh-CN" ? "和朋友一起玩抢答模式或画画接龙。" : "Draw, guess, and pass the picture along with friends.",
    path: withLocale(locale, "/game-tools/draw-guess"),
    title: `${locale === "zh-CN" ? "你画我猜" : "Draw & Guess"} · ${brand.name}`,
  });
}

export default async function DrawGuessToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <PageContainer className="max-w-[45rem] pb-12 pt-5" mobileSafeBottom mobileSafeTop>
      <DrawGuessEntryClient chainEnabled={isDrawGuessChainEnabled()} classicEnabled={isDrawGuessClassicEnabled()} locale={locale} />
    </PageContainer>
  );
}
