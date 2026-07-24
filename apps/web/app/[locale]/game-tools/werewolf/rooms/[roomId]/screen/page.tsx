import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonLiveRefresh } from "@/features/game-tools/components/AvalonLiveRefresh";
import { WerewolfPublicScreen } from "@/features/game-tools/components/WerewolfPublicScreen";
import { getWerewolfRoomById } from "@/features/game-tools/queries/getWerewolfRoom";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type WerewolfPublicScreenPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: WerewolfPublicScreenPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Werewolf public table screen.",
    path: withLocale(locale, `/game-tools/werewolf/rooms/${roomId}/screen`),
    title: `Werewolf Screen · ${brand.name}`,
  });
}

export default async function WerewolfPublicScreenPage({
  params,
}: WerewolfPublicScreenPageProps) {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders).replace(/\/$/, "");
  const room = await getWerewolfRoomById({
    locale,
    roomId,
    viewerProfile: null,
  });

  if (!room) {
    notFound();
  }

  const joinUrl = `${baseUrl}${withLocale(
    locale,
    `/game-tools/werewolf/join/${room.code}`,
  )}`;
  const roomForClient = {
    code: room.code,
    events: room.events.map((event) => ({
      createdAt: event.createdAt.toISOString(),
      id: event.id,
      type: event.type,
    })),
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isDead: seat.isDead,
      isJudgeSeat: seat.isJudgeSeat,
      isPlayerSeat: seat.isPlayerSeat,
      readyAt: seat.readyAt?.toISOString() ?? null,
      roleKey: seat.roleKey,
      roleLabel: seat.roleLabel,
      seatNumber: seat.seatNumber,
    })),
    state: room.state,
    status: room.status,
    title: room.title,
    variant: room.variant,
  };

  return (
    <PageContainer
      className="max-w-[110rem] sm:pt-6"
      mobileSafeBottom
      mobileSafeTop
    >
      <AvalonLiveRefresh
        enabled={room.status !== "FINISHED"}
        intervalMs={3500}
        locale={locale}
      />
      <WerewolfPublicScreen
        joinUrl={joinUrl}
        locale={locale}
        room={roomForClient}
      />
    </PageContainer>
  );
}
