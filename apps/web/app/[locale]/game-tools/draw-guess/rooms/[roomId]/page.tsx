import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessKickedNotice } from "@/features/game-tools/components/DrawGuessKickedNotice";
import { DrawGuessRoomClosedNotice } from "@/features/game-tools/components/DrawGuessRoomClosedNotice";
import { DrawGuessRoomClient, type DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { DrawGuessSpectator } from "@/features/game-tools/components/DrawGuessSpectator";
import { getDrawGuessRoomRejoinCode, getDrawGuessRoomView } from "@/features/game-tools/drawGuessRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const metadata: Metadata = { title: "你画我猜 · Friemi" };

export default async function DrawGuessRoomPage({ params }: { params: Promise<{ locale: string; roomId: string }> }) {
  const { locale, roomId } = await params;
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) redirect(withLocale(locale, "/game-tools/draw-guess"));
  const result = await getDrawGuessRoomView(roomId, profile.id);
  if ("error" in result && result.error === "ROOM_NOT_FOUND") return <PageContainer className="max-w-[35rem] pb-24 pt-10" mobileSafeBottom mobileSafeTop><DrawGuessRoomClosedNotice locale={locale} roomId={roomId} profileId={profile.id} /></PageContainer>;
  if ("error" in result && result.error === "KICKED") return <PageContainer className="max-w-[35rem] pb-24 pt-10" mobileSafeBottom mobileSafeTop><DrawGuessKickedNotice locale={locale} roomId={roomId} profileId={profile.id} /></PageContainer>;
  if ("error" in result && result.error === "NOT_A_PLAYER") {
    const code = await getDrawGuessRoomRejoinCode(roomId, profile.id);
    redirect(withLocale(locale, code ? `/game-tools/draw-guess/join/${code}?roomId=${encodeURIComponent(roomId)}` : "/game-tools/draw-guess"));
  }
  if ("error" in result) notFound();
  const room = result.room as DrawGuessRoomView;
  return <PageContainer className="max-w-[1100px] pb-24 pt-5" mobileSafeBottom mobileSafeTop>{room.viewerSeat < 0 ? <DrawGuessSpectator key={`${room.id}:${profile.id}`} initialRoom={room} locale={locale} /> : <DrawGuessRoomClient key={`${room.id}:${profile.id}`} initialRoom={room} locale={locale} />}</PageContainer>;
}
