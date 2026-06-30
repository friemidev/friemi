import { cache } from "react";
import { getAvalonRoleLabel } from "@/features/game-tools/avalonConfig";
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
    locale,
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
          take: 8,
          select: {
            createdAt: true,
            id: true,
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
      },
    });

    if (!room) {
      return null;
    }

    const isHost = viewerProfile?.id === room.hostId;
    const viewerSeat =
      viewerProfile && room.seats.find((seat) => seat.profileId === viewerProfile.id);

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
      seats: room.seats.map((seat) => {
        const roleLabel =
          room.status === "IN_PROGRESS" && (isHost || viewerSeat?.id === seat.id)
            ? getAvalonRoleLabel(locale, seat.roleKey)
            : null;

        return {
          avatarLabel: getSeatAvatarLabel(seat.displayName, seat.seatNumber),
          displayName: seat.displayName,
          guestName: seat.guestName,
          id: seat.id,
          isClaimed: isSeatClaimed(seat),
          isHostSeat: seat.profileId === room.hostId,
          isViewerSeat: viewerSeat?.id === seat.id,
          joinedAt: seat.joinedAt,
          privateToken: isHost || viewerSeat?.id === seat.id ? seat.privateToken : null,
          profile: seat.profile,
          profileId: seat.profileId,
          readyAt: seat.readyAt,
          roleAlignment: seat.roleAlignment,
          roleKey: seat.roleKey,
          roleLabel,
          seatNumber: seat.seatNumber,
        };
      }),
      startedAt: room.startedAt,
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
      select: { id: true },
    });

    if (!room) {
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
                displayName: true,
                roleAlignment: true,
                roleKey: true,
                seatNumber: true,
              },
            },
          },
        },
      },
    });

    if (!seat) {
      return null;
    }

    return seat;
  },
);
