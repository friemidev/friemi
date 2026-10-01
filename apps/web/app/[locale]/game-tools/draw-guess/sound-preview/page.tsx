import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessSoundPreviewClient } from "@/features/game-tools/components/DrawGuessSoundPreviewClient";

export const metadata: Metadata = { title: "音效试听 · 你画我猜", robots: { index: false, follow: false } };

export default async function DrawGuessSoundPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <PageContainer className="max-w-5xl pb-16 pt-5" mobileSafeBottom mobileSafeTop><DrawGuessSoundPreviewClient locale={locale} /></PageContainer>;
}
