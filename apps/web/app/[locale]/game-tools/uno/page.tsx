import type { Metadata } from "next";
import { UnoEntryClient } from "@/features/game-tools/components/UnoEntryClient";
import { UnoComingSoon } from "@/features/game-tools/components/UnoComingSoon";
import { isUnoEnabled } from "@/features/game-tools/unoFlags";

export const metadata: Metadata = { title: "UNO · Friemi" };

export default async function UnoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isUnoEnabled()) return <UnoComingSoon locale={locale}/>;
  return <UnoEntryClient locale={locale} preview={process.env.NODE_ENV !== "production"}/>;
}
