import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UnoRoomClient } from "@/features/game-tools/components/UnoRoomClient";
import { UnoComingSoon } from "@/features/game-tools/components/UnoComingSoon";
import { isUnoEnabled } from "@/features/game-tools/unoFlags";

export const metadata: Metadata = { title: "UNO · Friemi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function UnoRoomPage({ params }: { params: Promise<{ locale: string; roomId: string }> }) {
  const { locale, roomId } = await params;
  if (!isUnoEnabled()) return <UnoComingSoon locale={locale}/>;
  const { getUnoProfile } = await import("@/features/game-tools/unoAuth");
  const { getUnoRoomView } = await import("@/features/game-tools/unoRoomServer");
  const profile = await getUnoProfile();
  if (!profile) redirect(`/${locale}/game-tools/uno`);
  const result = await getUnoRoomView(roomId, profile.id);
  if ("error" in result) notFound();
  return <UnoRoomClient initialRoom={result.room} locale={locale}/>;
}
