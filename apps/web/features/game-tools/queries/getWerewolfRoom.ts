import { cache } from "react";
import {
  getWerewolfRoleLabel,
  getWerewolfVariantFromRoomConfig,
  getWerewolfVariantLabel,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
} from "@/features/game-tools/werewolfConfig";
import { normalizeWerewolfRoomState } from "@/features/game-tools/werewolfRoomState";
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
    memberToken,
    roomId,
    viewerProfile,
  }: {
    locale: string;
    memberToken?: string | null;
    roomId: string;
    viewerProfile: ViewerProfile;
  }) => {
    const room = await prisma.gameToolRoom.findUnique({
      where: { id: roomId },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 30,
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
    const viewerSeat =
      (currentMember?.seatedSeatId &&
        room.seats.find((seat) => seat.id === currentMember.seatedSeatId)) ||
      (viewerProfile &&
        room.seats.find((seat) => seat.profileId === viewerProfile.id)) ||
      null;
    const deadSeatSet = new Set(state.deadSeatNumbers);

    return {
      code: room.code,
      createdAt: room.createdAt,
      events: room.events,
      host: room.host,
      id: room.id,
      isHost,
      kind: room.kind,
      locale: room.locale,
      currentMember: currentMember
        ? {
            avatarLabel: getSeatAvatarLabel(
              getMemberDisplayName(currentMember),
              currentMember.seatedSeat?.seatNumber ?? 0,
            ),
            displayName: getMemberDisplayName(currentMember),
            id: currentMember.id,
            isGuest: !currentMember.profileId,
            memberToken: currentMember.profileId
              ? null
              : currentMember.memberToken,
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
      seats: room.seats.map((seat) => {
        const canViewPrivateSeat = viewerSeat?.id === seat.id;
        const canViewRole = canViewPrivateSeat || room.status === "FINISHED";
        const roleLabel = canViewRole
          ? getWerewolfRoleLabel(locale, seat.roleKey)
          : null;

        return {
          avatarLabel: getSeatAvatarLabel(seat.displayName, seat.seatNumber),
          displayName: seat.displayName,
          guestName: seat.guestName,
          id: seat.id,
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
      state,
      status: room.status,
      title: room.title,
      updatedAt: room.updatedAt,
      variant: {
        judgeSeatNumber: variant.judgeSeatNumber,
        key: variant.key,
        label: getWerewolfVariantLabel(locale, variant),
        playerSeatCount: variant.playerSeatCount,
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
                profileId: true,
                readyAt: true,
                roleAlignment: true,
                roleKey: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!seat || seat.room.kind !== "WEREWOLF") {
      return null;
    }

    return seat;
  },
);
