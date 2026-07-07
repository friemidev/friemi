import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { WerewolfRoomOverview } from "@/features/game-tools/components/WerewolfRoomOverview";
import { getWerewolfRoomById } from "@/features/game-tools/queries/getWerewolfRoom";
import { isWerewolfTestBotFeatureEnabled } from "@/features/game-tools/werewolfTestBots";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type WerewolfRoomPageProps = {
  params: Promise<{
    locale: string;
    roomId: string;
  }>;
  searchParams?: Promise<{
    memberToken?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: WerewolfRoomPageProps): Promise<Metadata> {
  const { locale, roomId } = await params;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: "Friemi Werewolf offline helper room.",
    path: withLocale(locale, `/game-tools/werewolf/rooms/${roomId}`),
    title: `Werewolf Room · ${brand.name}`,
  });
}

export default async function WerewolfRoomPage({
  params,
  searchParams,
}: WerewolfRoomPageProps) {
  const { locale, roomId } = await params;
  const query = (await searchParams) ?? {};
  const memberToken = Array.isArray(query.memberToken)
    ? query.memberToken[0]
    : query.memberToken;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders).replace(/\/$/, "");
  const viewerProfile = await getOptionalCurrentUserProfile();
  const room = await getWerewolfRoomById({
    locale,
    memberToken,
    roomId,
    viewerProfile,
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
      type: event.type,
    })),
    host: {
      nickname: room.host.nickname,
    },
    id: room.id,
    isHost: room.isHost,
    currentMember: room.currentMember
      ? {
          avatarLabel: room.currentMember.avatarLabel,
          displayName: room.currentMember.displayName,
          id: room.currentMember.id,
          isGuest: room.currentMember.isGuest,
          memberToken: room.currentMember.memberToken,
          readyAt: room.currentMember.readyAt?.toISOString() ?? null,
          seatedPrivateToken: room.currentMember.seatedPrivateToken,
          seatedSeatId: room.currentMember.seatedSeatId,
          seatedSeatNumber: room.currentMember.seatedSeatNumber,
        }
      : null,
    members: room.members.map((member) => ({
      avatarLabel: member.avatarLabel,
      displayName: member.displayName,
      id: member.id,
      isCurrentMember: member.isCurrentMember,
      isGuest: member.isGuest,
      lastSeenAt: member.lastSeenAt.toISOString(),
      readyAt: member.readyAt?.toISOString() ?? null,
      seatedSeatId: member.seatedSeatId,
      seatedSeatNumber: member.seatedSeatNumber,
    })),
    seats: room.seats.map((seat) => ({
      avatarLabel: seat.avatarLabel,
      displayName: seat.displayName,
      id: seat.id,
      isClaimed: seat.isClaimed,
      isDead: seat.isDead,
      isJudgeSeat: seat.isJudgeSeat,
      isPlayerSeat: seat.isPlayerSeat,
      isViewerSeat: seat.isViewerSeat,
      privateToken: seat.privateToken,
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
    <PageContainer className="max-w-[94rem] pb-28 pt-4 sm:pb-12 sm:pt-7">
      <WerewolfRoomOverview
        baseUrl={baseUrl}
        locale={locale}
        room={roomForClient}
        testBotsEnabled={isWerewolfTestBotFeatureEnabled()}
      />
    </PageContainer>
  );
}
