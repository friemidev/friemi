import { notFound } from "next/navigation";
import { UnoEntryClient } from "@/features/game-tools/components/UnoEntryClient";
import { UnoComingSoon } from "@/features/game-tools/components/UnoComingSoon";
import { isUnoEnabled } from "@/features/game-tools/unoFlags";

export default async function UnoJoinPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  if (!isUnoEnabled()) return <UnoComingSoon locale={locale}/>;
  if (!/^[A-Z0-9]{4,8}$/i.test(code)) notFound();
  return <UnoEntryClient locale={locale} initialCode={code.toUpperCase()}/>;
}
