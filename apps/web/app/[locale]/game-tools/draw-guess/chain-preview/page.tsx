import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessChainPreviewClient } from "@/features/game-tools/components/DrawGuessChainPreviewClient";

export const metadata: Metadata = { title: "接龙模式预览 · 你画我猜", robots: { index: false, follow: false } };

export default async function DrawGuessChainPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  return <PageContainer className="max-w-[1100px] pb-24 pt-5" mobileSafeBottom mobileSafeTop><DrawGuessChainPreviewClient locale={locale} /></PageContainer>;
}
