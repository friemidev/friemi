import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessPreviewClient } from "@/features/game-tools/components/DrawGuessPreviewClient";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "zh-CN" ? "猫咪角色预览 · 你画我猜" : locale === "fr" ? "Aperçu des chats · Dessine et devine" : "Cat preview · Draw & Guess",
    robots: { index: false, follow: false },
  };
}

export default async function DrawGuessPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PageContainer className="max-w-7xl pb-16 pt-5" mobileSafeBottom mobileSafeTop><DrawGuessPreviewClient locale={locale} /></PageContainer>;
}
