import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonRecapView } from "@/features/game-tools/components/AvalonRecapView";
import { getAvalonRoomById } from "@/features/game-tools/queries/getAvalonRoom";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonRecapPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: AvalonRecapPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Avalon game recap.",
    path: withLocale(locale, `/game-tools/avalon/rooms/${roomId}/recap`),
    title: `Avalon Recap · ${brand.name}`,
  });
}

export default async function AvalonRecapPage({ params }: AvalonRecapPageProps) {
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
    <PageContainer className="max-w-[96rem] pb-28 pt-4 sm:pb-12 sm:pt-7">
      <AvalonRecapView
        locale={locale}
        posterHref={withLocale(locale, `/game-tools/avalon/rooms/${room.id}/recap/poster`)}
        room={roomForClient}
        roomHref={withLocale(locale, `/game-tools/avalon/rooms/${room.id}`)}
        screenHref={withLocale(locale, `/game-tools/avalon/rooms/${room.id}/screen`)}
      />
    </PageContainer>
  );
}
