import { cache } from "react";
import {
  getWerewolfRoleLabel,
  getWerewolfVariantFromRoomConfig,
  getWerewolfVariantLabel,
  isActiveWerewolfSeatOccupant,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
} from "@/features/game-tools/werewolfConfig";
import {
  getWerewolfRoomStateForViewer,
  isWerewolfEventVisibleToViewer,
  normalizeWerewolfRoomState,
} from "@/features/game-tools/werewolfRoomState";
import { getWerewolfAtmosphereIdFromRoomConfig } from "@/features/game-tools/werewolfCardAssets";
import { prisma } from "@/lib/prisma";

type ViewerProfile = {
  id: string;
} | null;

function getSeatAvatarLabel(displayName: string, seatNumber: number) {
  const trimmed = displayName.trim();

  return trimmed ? trimmed.slice(0, 1).toUpperCase() : String(seatNumber);
}

function getMemberDisplayName(member: {
  guestName: string | null;
  profile: {
    nickname: string;
  } | null;
}) {
  return member.profile?.nickname ?? member.guestName ?? "玩家";
}

export const getWerewolfRoomById = cache(
  async ({
    locale,
    historyMode = "full",
    memberToken,
    roomId,
    viewerProfile,
  }: {
    locale: string;
    historyMode?: "full" | "sync";
    memberToken?: string | null;
    roomId: string;
    viewerProfile: ViewerProfile;
  }) => {
    const room = await prisma.gameToolRoom.findUnique({
      where: { id: roomId },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: historyMode === "sync" ? 120 : undefined,
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
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: historyMode === "sync" ? 120 : undefined,
          select: {
            id: true,
            kind: true,
            metadata: true,
            roundIndex: true,
            seat: { select: { seatNumber: true } },
            submittedAt: true,
            value: true,
          },
        },
        host: {
          select: {
            avatarUrl: true,
            id: true,
            nickname: true,
          },
        },
        members: {
          where: {
            leftAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
            guestName: true,
            id: true,
            lastSeenAt: true,
            memberToken: true,
            profile: {
              select: {
                avatarUrl: true,
                id: true,
                nickname: true,
              },
            },
            profileId: true,
            readyAt: true,
            seatedSeat: {
              select: {
                privateToken: true,
                seatNumber: true,
              },
            },
            seatedSeatId: true,
          },
        },
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            displayName: true,
            guestName: true,
            id: true,
            joinedAt: true,
            leftAt: true,
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
      },
    });

    if (!room || room.kind !== "WEREWOLF") {
      return null;
    }

    const state = normalizeWerewolfRoomState(room.state);
    const variant = getWerewolfVariantFromRoomConfig(room.config, locale);
    const isHost = viewerProfile?.id === room.hostId;
    const currentMember =
      (viewerProfile &&
        room.members.find((member) => member.profileId === viewerProfile.id)) ||
      (memberToken
        ? room.members.find((member) => member.memberToken === memberToken)
        : null) ||
      null;
    const viewerSeatCandidate =
      (currentMember?.seatedSeatId &&
        room.seats.find((seat) => seat.id === currentMember.seatedSeatId)) ||
      (viewerProfile &&
        room.seats.find((seat) => seat.profileId === viewerProfile.id)) ||
      null;
    const viewerSeat =
      viewerSeatCandidate && isActiveWerewolfSeatOccupant(viewerSeatCandidate)
        ? viewerSeatCandidate
        : null;
    const viewerIsJudge = viewerSeat
      ? isWerewolfJudgeSeat(viewerSeat.seatNumber, variant)
      : false;
    const deadSeatSet = new Set(state.deadSeatNumbers);
    const viewerState = getWerewolfRoomStateForViewer({
      isFinished: room.status === "FINISHED",
      isJudge: viewerIsJudge,
      roleKey: viewerSeat?.roleKey,
      seatNumber: viewerSeat?.seatNumber,
      state,
    });

    return {
      atmosphereId: getWerewolfAtmosphereIdFromRoomConfig(room.config, room.id),
      code: room.code,
      createdAt: room.createdAt,
      events: room.events.filter((event) =>
        isWerewolfEventVisibleToViewer({
          isFinished: room.status === "FINISHED",
          isJudge: viewerIsJudge,
          type: event.type,
        }),
      ),
      flowSubmissions: room.submissions.flatMap((submission) => {
        const isVote =
          submission.kind === "WEREWOLF_SHERIFF_VOTE" ||
          submission.kind === "WEREWOLF_EXILE_VOTE";
        const metadata =
          submission.metadata && typeof submission.metadata === "object"
            ? (submission.metadata as Record<string, unknown>)
            : null;
        const isWitchKillContext =
          viewerSeat?.roleKey === "witch" &&
          submission.kind === "WEREWOLF_NIGHT_ACTION" &&
          metadata?.actionKind === "WOLF_KILL";
        const isWolfPackKillContext =
          viewerSeat?.roleAlignment === "werewolf" &&
          submission.kind === "WEREWOLF_NIGHT_ACTION" &&
          metadata?.actionKind === "WOLF_KILL";
        const isCurrentFlowSession =
          submission.roundIndex === state.flow.sessionIndex;
        const canViewNightAction =
          submission.kind === "WEREWOLF_NIGHT_ACTION" &&
          (viewerIsJudge ||
            (isCurrentFlowSession &&
              (submission.seat?.seatNumber === viewerSeat?.seatNumber ||
                isWitchKillContext ||
                isWolfPackKillContext)));

        if (!isVote && !canViewNightAction) {
          return [];
        }

        return [
          {
            actionKind:
              typeof metadata?.actionKind === "string"
                ? metadata.actionKind
                : null,
            id: submission.id,
            kind: submission.kind,
            roundIndex: submission.roundIndex,
            secondaryTargetSeatNumber:
              typeof metadata?.secondaryTargetSeatNumber === "number"
                ? metadata.secondaryTargetSeatNumber
                : null,
            submittedAt: submission.submittedAt,
            seerResult:
              typeof metadata?.seerResult === "string"
                ? metadata.seerResult
                : null,
            targetSeatNumber: isVote
              ? submission.value === "ABSTAIN"
                ? null
                : Number(submission.value)
              : typeof metadata?.targetSeatNumber === "number"
                ? metadata.targetSeatNumber
                : null,
            voterSeatNumber:
              isWitchKillContext || isWolfPackKillContext
                ? null
                : (submission.seat?.seatNumber ?? null),
          },
        ];
      }),
      host: room.host,
      id: room.id,
      isHost,
      kind: room.kind,
      locale: room.locale,
      finishedAt: room.finishedAt,
      currentMember: currentMember
        ? {
            avatarLabel: getSeatAvatarLabel(
              getMemberDisplayName(currentMember),
              currentMember.seatedSeat?.seatNumber ?? 0,
            ),
            avatarUrl: currentMember.profile?.avatarUrl ?? null,
            displayName: getMemberDisplayName(currentMember),
            id: currentMember.id,
            isGuest: !currentMember.profileId,
            memberToken: currentMember.profileId
              ? null
              : currentMember.memberToken,
            profileId: currentMember.profileId,
            readyAt: currentMember.readyAt,
            seatedPrivateToken: currentMember.seatedSeat?.privateToken ?? null,
            seatedSeatId: currentMember.seatedSeatId,
            seatedSeatNumber: currentMember.seatedSeat?.seatNumber ?? null,
          }
        : null,
      members: room.members.map((member) => {
        const displayName = getMemberDisplayName(member);

        return {
          avatarLabel: getSeatAvatarLabel(
            displayName,
            member.seatedSeat?.seatNumber ?? 0,
          ),
          avatarUrl: member.profile?.avatarUrl ?? null,
          displayName,
          id: member.id,
          isCurrentMember: currentMember?.id === member.id,
          isGuest: !member.profileId,
          lastSeenAt: member.lastSeenAt,
          readyAt: member.readyAt,
          seatedSeatId: member.seatedSeatId,
          seatedSeatNumber: member.seatedSeat?.seatNumber ?? null,
        };
      }),
      playerCount: room.playerCount,
      revision: room.revision,
      seats: room.seats.map((seat) => {
        const canViewPrivateSeat = viewerSeat?.id === seat.id;
        const canViewRole =
          viewerIsJudge || canViewPrivateSeat || room.status === "FINISHED";
        const roleLabel = canViewRole
          ? getWerewolfRoleLabel(locale, seat.roleKey)
          : null;

        return {
          avatarLabel: getSeatAvatarLabel(seat.displayName, seat.seatNumber),
          avatarUrl: seat.profile?.avatarUrl ?? null,
          displayName: seat.displayName,
          guestName: seat.guestName,
          id: seat.id,
          isActive: isActiveWerewolfSeatOccupant(seat),
          isClaimed: Boolean(seat.profileId || seat.guestName),
          isDead: deadSeatSet.has(seat.seatNumber),
          isJudgeSeat: isWerewolfJudgeSeat(seat.seatNumber, variant),
          isPlayerSeat: isWerewolfPlayerSeat(seat.seatNumber, variant),
          isViewerSeat: viewerSeat?.id === seat.id,
          joinedAt: seat.joinedAt,
          privateToken: canViewPrivateSeat ? seat.privateToken : null,
          profile: seat.profile,
          profileId: seat.profileId,
          readyAt: seat.readyAt,
          roleAlignment: canViewRole ? seat.roleAlignment : null,
          roleKey: canViewRole ? seat.roleKey : null,
          roleLabel,
          seatNumber: seat.seatNumber,
        };
      }),
      startedAt: room.startedAt,
      state: viewerState,
      status: room.status,
      title: room.title,
      updatedAt: room.updatedAt,
      variant: {
        judgeSeatNumber: variant.judgeSeatNumber,
        key: variant.key,
        label: getWerewolfVariantLabel(locale, variant),
        playerSeatCount: variant.playerSeatCount,
        roles: variant.roles,
        totalSeats: variant.totalSeats,
      },
      viewerSeatId: viewerSeat?.id ?? null,
    };
  },
);

export const getWerewolfRoomByCode = cache(
  async ({
    code,
    locale,
    memberToken,
    viewerProfile,
  }: {
    code: string;
    locale: string;
    memberToken?: string | null;
    viewerProfile: ViewerProfile;
  }) => {
    const room = await prisma.gameToolRoom.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: { id: true, kind: true },
    });

    if (!room || room.kind !== "WEREWOLF") {
      return null;
    }

    return getWerewolfRoomById({
      locale,
      memberToken,
      roomId: room.id,
      viewerProfile,
    });
  },
);

export const getWerewolfSeatByToken = cache(
  async ({ token }: { token: string }) => {
    const seat = await prisma.gameToolSeat.findUnique({
      where: { privateToken: token },
      include: {
        room: {
          include: {
            events: {
              orderBy: { createdAt: "desc" },
              select: {
                createdAt: true,
                id: true,
                payload: true,
                type: true,
              },
            },
            members: {
              where: {
                leftAt: null,
              },
              select: {
                memberToken: true,
                profileId: true,
                seatedSeatId: true,
              },
            },
            seats: {
              orderBy: { seatNumber: "asc" },
              select: {
                displayName: true,
                guestName: true,
                id: true,
                leftAt: true,
                profileId: true,
                readyAt: true,
                roleAlignment: true,
                roleKey: true,
                seatNumber: true,
              },
            },
            submissions: {
              orderBy: { submittedAt: "desc" },
              select: {
                id: true,
                kind: true,
                metadata: true,
                roundIndex: true,
                seat: { select: { seatNumber: true } },
                submittedAt: true,
                value: true,
              },
            },
          },
        },
      },
    });

    if (
      !seat ||
      seat.room.kind !== "WEREWOLF" ||
      !isActiveWerewolfSeatOccupant(seat)
    ) {
      return null;
    }

    return seat;
  },
);
