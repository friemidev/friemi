import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonRecapPosterView } from "@/features/game-tools/components/AvalonRecapPosterView";
import { getAvalonRoomById } from "@/features/game-tools/queries/getAvalonRoom";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonRecapPosterPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: AvalonRecapPosterPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Avalon recap poster.",
    path: withLocale(locale, `/game-tools/avalon/rooms/${roomId}/recap/poster`),
    title: `Avalon Recap Poster · ${brand.name}`,
  });
}

export default async function AvalonRecapPosterPage({
  params,
}: AvalonRecapPosterPageProps) {
  const { locale, roomId } = await params;
  const room = await getAvalonRoomById({
    locale,
    roomId,
    viewerProfile: null,
  });

  if (!room) {
    notFound();
  }

  const roomForClient = {
    code: room.code,
    events: room.events.map((event) => ({
      actorName: event.actor?.nickname ?? null,
      createdAt: event.createdAt.toISOString(),
      id: event.id,
      payload: event.payload,
      type: event.type,
    })),
    playerCount: room.playerCount,
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isHostSeat: seat.isHostSeat,
      seatNumber: seat.seatNumber,
    })),
    state: room.state,
    status: room.status,
    title: room.title,
  };

  return (
    <PageContainer
      className="max-w-[44rem] sm:pb-12 sm:pt-7 print:max-w-none print:p-0"
      mobileSafeBottom
      mobileSafeTop
    >
      <AvalonRecapPosterView
        locale={locale}
        room={roomForClient}
        roomHref={withLocale(locale, `/game-tools/avalon/rooms/${room.id}`)}
      />
    </PageContainer>
  );
}
