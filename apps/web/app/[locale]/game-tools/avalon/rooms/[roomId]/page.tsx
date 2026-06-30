import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonRoomLobby } from "@/features/game-tools/components/AvalonRoomLobby";
import { getAvalonRoomById } from "@/features/game-tools/queries/getAvalonRoom";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type AvalonRoomPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
};

export async function generateMetadata({
  params,
}: AvalonRoomPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Avalon table room.",
    path: withLocale(locale, `/game-tools/avalon/rooms/${roomId}`),
    title: `Avalon Room · ${brand.name}`,
  });
}

export default async function AvalonRoomPage({ params }: AvalonRoomPageProps) {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders).replace(/\/$/, "");
  const viewerProfile = await getOptionalCurrentUserProfile();
  const room = await getAvalonRoomById({
    locale,
    roomId,
    viewerProfile,
  });

  if (!room) {
    notFound();
  }

  const roomForClient = {
    code: room.code,
    id: room.id,
    isHost: room.isHost,
    mode: room.mode,
    playerCount: room.playerCount,
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      guestName: seat.guestName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isHostSeat: seat.isHostSeat,
      isViewerSeat: seat.isViewerSeat,
      privateToken: seat.privateToken,
      profileId: seat.profileId,
      roleAlignment: seat.roleAlignment,
      roleKey: seat.roleKey,
      roleLabel: seat.roleLabel,
      seatNumber: seat.seatNumber,
    })),
    status: room.status,
    title: room.title,
    viewerSeatId: room.viewerSeatId,
  };

  return (
    <PageContainer className="max-w-[92rem] pb-28 pt-4 sm:pb-12 sm:pt-7">
      <AvalonRoomLobby baseUrl={baseUrl} locale={locale} room={roomForClient} />
    </PageContainer>
  );
}
