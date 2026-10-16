import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DoudizhuRoomClient } from "@/features/game-tools/components/DoudizhuRoomClient";
import { isDoudizhuEnabled } from "@/features/game-tools/doudizhuFlags";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dou Dizhu · Friemi",
  robots: { index: false, follow: false },
};
export default async function RoomPage({
  params,
}: {
  params: Promise<{ locale: string; roomId: string }>;
}) {
  const { locale, roomId } = await params;
  if (!isDoudizhuEnabled()) notFound();
  const { getDdzProfile } = await import("@/features/game-tools/doudizhuAuth");
  const { getDdzRoomView } =
    await import("@/features/game-tools/doudizhuRoomServer");
  const profile = await getDdzProfile();
  if (!profile)
    redirect(
      `/${locale}/sign-in?redirect_url=${encodeURIComponent(`/${locale}/game-tools/doudizhu/rooms/${roomId}`)}`,
    );
  const result = await getDdzRoomView(roomId, profile.id);
  if ("error" in result && result.error === "NOT_A_MEMBER")
    redirect(`/${locale}/game-tools/doudizhu`);
  if ("error" in result || !("room" in result) || !result.room) notFound();
  return (
    <DoudizhuRoomClient
      initialRoom={result.room}
      locale={locale}
      initialClerkUserId={profile.clerkUserId}
      initialProfileId={profile.id}
    />
  );
}
