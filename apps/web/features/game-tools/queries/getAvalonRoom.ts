import { cache } from "react";
import {
  getAvalonMissionFailureThresholdFromState,
  getAvalonQuestTeamSize,
  normalizeAvalonRoomState,
} from "@/features/game-tools/avalonRoomState";
import { prisma } from "@/lib/prisma";

type ViewerProfile = {
  id: string;
} | null;

function isSeatClaimed(seat: {
  guestName: string | null;
  profileId: string | null;
  seatNumber: number;
}) {
  return seat.seatNumber === 1 || Boolean(seat.profileId || seat.guestName);
}

function getSeatAvatarLabel(displayName: string, seatNumber: number) {
  const trimmed = displayName.trim();

  return trimmed ? trimmed.slice(0, 1).toUpperCase() : String(seatNumber);
}

export const getAvalonRoomById = cache(
  async ({
    locale: _locale,
    roomId,
    viewerProfile,
  }: {
    locale: string;
    roomId: string;
    viewerProfile: ViewerProfile;
  }) => {
    const room = await prisma.gameToolRoom.findUnique({
      where: { id: roomId },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            actor: {
              select: {
                nickname: true,
              },
            },
            createdAt: true,
            id: true,
            payload: true,
            type: true,
          },
        },
        host: {
          select: {
            avatarUrl: true,
            id: true,
            nickname: true,
          },
        },
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            displayName: true,
            guestName: true,
            id: true,
            joinedAt: true,
            privateToken: true,
            profile: {
              select: {
                avatarUrl: true,
                id: true,
                nickname: true,
              },
            },
            profileId: true,
            readyAt: true,
            roleAlignment: true,
            roleKey: true,
            seatNumber: true,
          },
        },
        submissions: {
          orderBy: { submittedAt: "asc" },
          select: {
            id: true,
            kind: true,
            roundIndex: true,
            seat: {
              select: {
                seatNumber: true,
              },
            },
            seatId: true,
            value: true,
          },
        },
      },
    });

    if (!room || room.kind !== "AVALON") {
      return null;
    }

    const isHost = viewerProfile?.id === room.hostId;
    const viewerSeat =
      viewerProfile && room.seats.find((seat) => seat.profileId === viewerProfile.id);
    const gameState = normalizeAvalonRoomState(room.state);
    const currentRoundSubmissions = room.submissions.filter(
      (submission) => submission.roundIndex === gameState.roundIndex,
    );
    const teamVoteSubmissions = currentRoundSubmissions.filter(
      (submission) => submission.kind === "TEAM_VOTE",
    );
    const missionCardSubmissions = currentRoundSubmissions.filter(
      (submission) => submission.kind === "MISSION_CARD",
    );
    const proposedTeamSet = new Set(gameState.proposedTeamSeatNumbers);

    return {
      code: room.code,
      createdAt: room.createdAt,
      events: room.events,
      host: room.host,
      id: room.id,
      isHost,
      kind: room.kind,
      locale: room.locale,
      mode: room.mode,
      playerCount: room.playerCount,
      progress: {
        failureThreshold: getAvalonMissionFailureThresholdFromState({
          playerCount: room.playerCount,
          roundIndex: gameState.roundIndex,
        }),
        missionCardSubmissionCount: missionCardSubmissions.length,
        requiredTeamSize: getAvalonQuestTeamSize({
          playerCount: room.playerCount,
          roundIndex: gameState.roundIndex,
        }),
        teamVoteSubmissionCount: teamVoteSubmissions.length,
      },
      seats: room.seats.map((seat) => {
        const canReadPrivateLink =
          viewerSeat?.id === seat.id || (isHost && room.status === "LOBBY");

        return {
          avatarLabel: getSeatAvatarLabel(seat.displayName, seat.seatNumber),
          displayName: seat.displayName,
          guestName: seat.guestName,
          id: seat.id,
          isClaimed: isSeatClaimed(seat),
          isHostSeat: seat.profileId === room.hostId,
          isOnProposedTeam: proposedTeamSet.has(seat.seatNumber),
          isViewerSeat: viewerSeat?.id === seat.id,
          joinedAt: seat.joinedAt,
          privateToken: canReadPrivateLink ? seat.privateToken : null,
          profile: seat.profile,
          profileId: seat.profileId,
          readyAt: seat.readyAt,
          roleAlignment: null,
          roleKey: null,
          roleLabel: null,
          seatNumber: seat.seatNumber,
        };
      }),
      startedAt: room.startedAt,
      state: gameState,
      status: room.status,
      title: room.title,
      updatedAt: room.updatedAt,
      viewerSeatId: viewerSeat?.id ?? null,
    };
  },
);

export const getAvalonRoomByCode = cache(
  async ({
    code,
    locale,
    viewerProfile,
  }: {
    code: string;
    locale: string;
    viewerProfile: ViewerProfile;
  }) => {
    const room = await prisma.gameToolRoom.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: { id: true, kind: true },
    });

    if (!room || room.kind !== "AVALON") {
      return null;
    }

    return getAvalonRoomById({
      locale,
      roomId: room.id,
      viewerProfile,
    });
  },
);

export const getAvalonSeatByToken = cache(
  async ({ token }: { token: string }) => {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: token },
      include: {
        room: {
          include: {
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                id: true,
                displayName: true,
                roleAlignment: true,
                roleKey: true,
                seatNumber: true,
              },
            },
            submissions: {
              orderBy: { submittedAt: "asc" },
              select: {
                kind: true,
                roundIndex: true,
                seatId: true,
                value: true,
              },
            },
          },
        },
      },
    });

    if (!seat || seat.room.kind !== "AVALON") {
      return null;
    }

    return seat;
  },
);
