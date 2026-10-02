import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessResultPreviewClient } from "@/features/game-tools/components/DrawGuessResultPreviewClient";

export const metadata: Metadata = { title: "结算页预览 · 你画我猜", robots: { index: false, follow: false } };

export default async function DrawGuessResultPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  return <PageContainer className="max-w-[1100px] pb-24 pt-5" mobileSafeBottom mobileSafeTop><DrawGuessResultPreviewClient locale={locale} /></PageContainer>;
}
