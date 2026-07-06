import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { WerewolfRecapView } from "@/features/game-tools/components/WerewolfRecapView";
import { getWerewolfRoomById } from "@/features/game-tools/queries/getWerewolfRoom";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type WerewolfRecapPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: WerewolfRecapPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Werewolf game recap.",
    path: withLocale(locale, `/game-tools/werewolf/rooms/${roomId}/recap`),
    title: `Werewolf Recap · ${brand.name}`,
  });
}

export default async function WerewolfRecapPage({
  params,
}: WerewolfRecapPageProps) {
  const { locale, roomId } = await params;
  const room = await getWerewolfRoomById({
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
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isDead: seat.isDead,
      isJudgeSeat: seat.isJudgeSeat,
      isPlayerSeat: seat.isPlayerSeat,
      roleAlignment: seat.roleAlignment,
      roleLabel: seat.roleLabel,
      seatNumber: seat.seatNumber,
    })),
    state: room.state,
    status: room.status,
    title: room.title,
    variant: room.variant,
  };

  return (
    <PageContainer className="max-w-[96rem] pb-28 pt-4 sm:pb-12 sm:pt-7">
      <WerewolfRecapView
        locale={locale}
        room={roomForClient}
        roomHref={withLocale(locale, `/game-tools/werewolf/rooms/${room.id}`)}
        screenHref={withLocale(
          locale,
          `/game-tools/werewolf/rooms/${room.id}/screen`,
        )}
      />
    </PageContainer>
  );
}
