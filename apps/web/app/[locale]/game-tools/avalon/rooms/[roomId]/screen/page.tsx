import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonLiveRefresh } from "@/features/game-tools/components/AvalonLiveRefresh";
import { AvalonPublicScreen } from "@/features/game-tools/components/AvalonPublicScreen";
import { getAvalonRoomById } from "@/features/game-tools/queries/getAvalonRoom";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonPublicScreenPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: AvalonPublicScreenPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Avalon public table screen.",
    path: withLocale(locale, `/game-tools/avalon/rooms/${roomId}/screen`),
    title: `Avalon Screen · ${brand.name}`,
  });
}

export default async function AvalonPublicScreenPage({
  params,
}: AvalonPublicScreenPageProps) {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders).replace(/\/$/, "");
  const room = await getAvalonRoomById({
    locale,
    roomId,
    viewerProfile: null,
  });

  if (!room) {
    notFound();
  }

  const joinUrl = `${baseUrl}/${locale}/game-tools/avalon/join/${room.code}`;
  const roomForClient = {
    code: room.code,
    events: room.events.map((event) => ({
      createdAt: event.createdAt.toISOString(),
      id: event.id,
      payload: event.payload,
      type: event.type,
    })),
    playerCount: room.playerCount,
    progress: room.progress,
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isHostSeat: seat.isHostSeat,
      isOnProposedTeam: seat.isOnProposedTeam,
      seatNumber: seat.seatNumber,
    })),
    state: room.state,
    status: room.status,
    title: room.title,
  };

  return (
    <PageContainer className="max-w-[110rem] pb-6 pt-4 sm:pt-6">
      <AvalonLiveRefresh
        enabled={room.status !== "FINISHED"}
        intervalMs={3500}
        locale={locale}
      />
      <AvalonPublicScreen joinUrl={joinUrl} locale={locale} room={roomForClient} />
    </PageContainer>
  );
}
