import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessLobbyPreviewClient } from "@/features/game-tools/components/DrawGuessLobbyPreviewClient";

export const metadata: Metadata = { title: "房间准备页预览 · 你画我猜", robots: { index: false, follow: false } };

export default async function DrawGuessLobbyPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PageContainer className="max-w-[1100px] pb-24 pt-5" mobileSafeBottom mobileSafeTop><DrawGuessLobbyPreviewClient locale={locale} /></PageContainer>;
}
