import { NextResponse } from "next/server";
import { getWerewolfRoomById } from "@/features/game-tools/queries/getWerewolfRoom";
import { withApiRequestMetrics } from "@/lib/apiRequestMetrics";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildWerewolfDerivedSyncVersion,
  buildWerewolfRevisionSyncVersion,
  getWerewolfSyncVersion,
} from "@/features/game-tools/werewolfSyncVersion";
import {
  getPerformanceRolloutMode,
  logPerformanceShadow,
} from "@/lib/performanceRollouts";

export const dynamic = "force-dynamic";

async function getWerewolfRoomSync(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await context.params;
  const url = new URL(request.url);
  const includeRoom = url.searchParams.get("include") === "room";
  const locale = url.searchParams.get("locale") || "zh-CN";
  const memberToken = url.searchParams.get("memberToken");

  try {
    if (includeRoom) {
      const viewerProfileId = await getOptionalAuthenticatedProfileId();
      const room = await getWerewolfRoomById({
        locale,
        memberToken,
        roomId,
        viewerProfile: viewerProfileId ? { id: viewerProfileId } : null,
      });

      if (!room) {
        return NextResponse.json(
          { error: "ROOM_NOT_FOUND" },
          {
            headers: {
              "Cache-Control": "no-store",
            },
            status: 404,
          },
        );
      }

      const derivedVersion = buildWerewolfDerivedSyncVersion({
        finishedAt: room.finishedAt,
        latestEvent: room.events[0]
          ? {
              createdAt: room.events[0].createdAt,
              id: room.events[0].id,
            }
          : null,
        startedAt: room.startedAt,
        status: room.status,
        updatedAt: room.updatedAt,
      });
      const version = getWerewolfSyncVersion({
        derived: derivedVersion,
        revision: room.revision,
        roomId,
        status: room.status,
      });
      const syncVersion = version.value;

      if (version.mode === "shadow") {
        logPerformanceShadow("b4_werewolf_revision", {
          derivedVersion,
          revision: room.revision,
          roomId,
          status: room.status,
        });
      }

      return NextResponse.json(
        {
          status: room.status,
          syncVersion,
          room: {
            code: room.code,
            currentMember: room.currentMember
              ? {
                  avatarLabel: room.currentMember.avatarLabel,
                  avatarUrl: room.currentMember.avatarUrl,
                  displayName: room.currentMember.displayName,
                  id: room.currentMember.id,
                  isGuest: room.currentMember.isGuest,
                  memberToken: room.currentMember.memberToken,
                  profileId: room.currentMember.profileId,
                  readyAt: room.currentMember.readyAt?.toISOString() ?? null,
                  seatedPrivateToken: room.currentMember.seatedPrivateToken,
                  seatedSeatId: room.currentMember.seatedSeatId,
                  seatedSeatNumber: room.currentMember.seatedSeatNumber,
                }
              : null,
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
            members: room.members.map((member) => ({
              avatarLabel: member.avatarLabel,
              avatarUrl: member.avatarUrl,
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
              avatarUrl: seat.avatarUrl,
              displayName: seat.displayName,
              id: seat.id,
              isClaimed: seat.isClaimed,
              isDead: seat.isDead,
              isJudgeSeat: seat.isJudgeSeat,
              isPlayerSeat: seat.isPlayerSeat,
              isViewerSeat: seat.isViewerSeat,
              privateToken: seat.privateToken,
              profileId: seat.profileId,
              readyAt: seat.readyAt?.toISOString() ?? null,
              roleKey: seat.roleKey,
              roleLabel: seat.roleLabel,
              seatNumber: seat.seatNumber,
            })),
            state: room.state,
            status: room.status,
            syncVersion,
            title: room.title,
            variant: room.variant,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Friemi-Sync-Source": version.source,
          },
        },
      );
    }

    const mode = getPerformanceRolloutMode("werewolfRevision", roomId);

    if (mode === "canary") {
      const room = await prisma.gameToolRoom.findFirst({
        where: { id: roomId, kind: "WEREWOLF" },
        select: { revision: true, status: true },
      });

      if (!room) {
        return NextResponse.json(
          { error: "ROOM_NOT_FOUND" },
          { headers: { "Cache-Control": "no-store" }, status: 404 },
        );
      }

      return NextResponse.json(
        {
          status: room.status,
          syncVersion: buildWerewolfRevisionSyncVersion(room),
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Friemi-Sync-Source": "revision",
          },
        },
      );
    }

    const [room, latestEvent] = await Promise.all([
      prisma.gameToolRoom.findFirst({
        where: {
          id: roomId,
          kind: "WEREWOLF",
        },
        select: {
          finishedAt: true,
          revision: true,
          startedAt: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.gameToolEvent.findFirst({
        where: {
          roomId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          id: true,
        },
      }),
    ]);

    if (!room) {
      return NextResponse.json(
        { error: "ROOM_NOT_FOUND" },
        {
          headers: {
            "Cache-Control": "no-store",
          },
          status: 404,
        },
      );
    }

    const derivedVersion = buildWerewolfDerivedSyncVersion({
      finishedAt: room.finishedAt,
      latestEvent,
      startedAt: room.startedAt,
      status: room.status,
      updatedAt: room.updatedAt,
    });

    if (mode === "shadow") {
      logPerformanceShadow("b4_werewolf_revision", {
        derivedVersion,
        revision: room.revision,
        roomId,
        status: room.status,
      });
    }

    return NextResponse.json(
      {
        status: room.status,
        syncVersion: derivedVersion,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Friemi-Sync-Source": "derived",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load Werewolf room sync version", error);

    return NextResponse.json(
      { error: "SYNC_FAILED" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> },
) {
  return withApiRequestMetrics(
    request,
    "/api/game-tools/werewolf/rooms/[roomId]/sync",
    async () => getWerewolfRoomSync(request, context),
  );
}
