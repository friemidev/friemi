"use server";

import { randomBytes, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAvalonPrivatePayload,
  getAvalonRoleDeck,
  isAvalonPlayerCount,
  normalizeAvalonMode,
  type AvalonAssignedSeat,
  type AvalonPlayerCount,
  type AvalonRoleKey,
} from "@/features/game-tools/avalonConfig";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfile,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export type AvalonRoomActionState = {
  fieldErrors?: Record<string, string[]>;
  formError?: string;
};

const roomTitleMaxLength = 80;

const createRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  mode: z.enum(["public", "identity", "full"]).default("identity"),
  playerCount: z.coerce.number().int().min(5).max(10),
  title: z.string().trim().max(roomTitleMaxLength).optional(),
});

const joinRoomSchema = z.object({
  displayName: z.string().trim().max(40).optional(),
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
  seatNumber: z.coerce.number().int().min(1).max(10),
});

const startRoomSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  roomId: z.string().min(1),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function createPrivateToken() {
  return randomBytes(16).toString("hex");
}

function createCandidateRoomCode() {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createCandidateRoomCode();
    const existing = await prisma.gameToolRoom.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  return randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
}

function getDefaultRoomTitle(locale: string) {
  if (locale === "fr") {
    return "Table Avalon Friemi";
  }

  if (locale === "en") {
    return "Friemi Avalon table";
  }

  return "Friemi 阿瓦隆小局";
}

function getDefaultSeatName(locale: string, seatNumber: number) {
  if (locale === "fr") {
    return `Place ${seatNumber}`;
  }

  if (locale === "en") {
    return `Seat ${seatNumber}`;
  }

  return `座位 ${seatNumber}`;
}

function getActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      createFailed: "Impossible de créer la table. Réessaie dans un instant.",
      invalidRequest: "La demande n'est pas valide.",
      joinFailed: "Impossible de rejoindre cette place.",
      noSeat: "Cette place n'est plus disponible.",
      roomFull: "La table est complète.",
      roomNotLobby: "La partie a déjà commencé.",
      startFailed: "Impossible de démarrer cette partie.",
      startHostOnly: "Seul l'hôte peut démarrer la partie.",
      startNotLobby: "Cette partie ne peut plus être démarrée.",
    };
  }

  if (locale === "en") {
    return {
      createFailed: "Could not create the table. Try again in a moment.",
      invalidRequest: "The request is not valid.",
      joinFailed: "Could not claim this seat.",
      noSeat: "This seat is no longer available.",
      roomFull: "The table is full.",
      roomNotLobby: "The game has already started.",
      startFailed: "Could not start this game.",
      startHostOnly: "Only the host can start the game.",
      startNotLobby: "This game can no longer be started.",
    };
  }

  return {
    createFailed: "无法创建房间，请稍后再试。",
    invalidRequest: "请求内容无效。",
    joinFailed: "无法认领这个座位。",
    noSeat: "这个座位已经不可认领。",
    roomFull: "房间已经满员。",
    roomNotLobby: "本局已经开始。",
    startFailed: "无法开始本局，请稍后再试。",
    startHostOnly: "只有房主可以开始本局。",
    startNotLobby: "本局已经不能开始。",
  };
}

function shuffleRoles(roleDeck: AvalonRoleKey[]) {
  const roles = [...roleDeck];

  for (let index = roles.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [roles[index], roles[swapIndex]] = [roles[swapIndex], roles[index]];
  }

  return roles;
}

function getClaimedDisplayName({
  displayName,
  fallback,
}: {
  displayName?: string | null;
  fallback: string;
}) {
  const trimmed = displayName?.trim();

  return trimmed || fallback;
}

function revalidateAvalonRoom(locale: string, roomId: string) {
  revalidatePath(withLocale(locale, "/game-tools/avalon"));
  revalidatePath(withLocale(locale, `/game-tools/avalon/rooms/${roomId}`));
}

export async function createAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    mode: normalizeAvalonMode(getString(formData, "mode")),
    playerCount: getString(formData, "playerCount"),
    title: getString(formData, "title"),
  };
  const result = createRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  if (!isAvalonPlayerCount(result.data.playerCount)) {
    return {
      formError: t.invalidRequest,
    };
  }

  const host = await ensureCurrentUserProfile(
    result.data.locale,
    "/game-tools/avalon",
  );
  const roomTitle =
    result.data.title?.trim() || getDefaultRoomTitle(result.data.locale);
  let roomId: string;

  try {
    const room = await prisma.gameToolRoom.create({
      data: {
        code: await createUniqueRoomCode(),
        config: {
          roleDeck: getAvalonRoleDeck(result.data.playerCount),
        },
        events: {
          create: {
            actorId: host.id,
            type: "room_created",
            payload: {
              mode: result.data.mode,
              playerCount: result.data.playerCount,
            },
          },
        },
        hostId: host.id,
        locale: result.data.locale,
        mode: result.data.mode,
        playerCount: result.data.playerCount,
        seats: {
          create: Array.from(
            { length: result.data.playerCount },
            (_, index) => {
              const seatNumber = index + 1;
              const isHostSeat = seatNumber === 1;

              return {
                displayName: isHostSeat
                  ? host.nickname
                  : getDefaultSeatName(result.data.locale, seatNumber),
                privateToken: createPrivateToken(),
                profileId: isHostSeat ? host.id : undefined,
                readyAt: isHostSeat ? new Date() : undefined,
                seatNumber,
              };
            },
          ),
        },
        title: roomTitle,
      },
      select: { id: true },
    });

    roomId = room.id;
  } catch (error) {
    console.error("Failed to create Avalon room", error);

    return {
      formError: t.createFailed,
    };
  }

  revalidateAvalonRoom(result.data.locale, roomId);
  redirect(withLocale(result.data.locale, `/game-tools/avalon/rooms/${roomId}`));
}

export async function joinAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    displayName: getString(formData, "displayName"),
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
    seatNumber: getString(formData, "seatNumber"),
  };
  const result = joinRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await getOptionalCurrentUserProfile();
  let shouldRedirectToRoom = false;

  try {
    const room = await prisma.gameToolRoom.findUnique({
      where: { id: result.data.roomId },
      include: {
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            guestName: true,
            id: true,
            profileId: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.joinFailed };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.roomNotLobby };
    }

    if (
      profile &&
      room.seats.some((seat) => seat.profileId && seat.profileId === profile.id)
    ) {
      revalidateAvalonRoom(result.data.locale, room.id);
      shouldRedirectToRoom = true;
    } else {
      const targetSeat = room.seats.find(
        (seat) => seat.seatNumber === result.data.seatNumber,
      );

      if (!targetSeat) {
        return { formError: t.noSeat };
      }

      if (targetSeat.profileId || targetSeat.guestName) {
        return { formError: t.noSeat };
      }

      const displayName = getClaimedDisplayName({
        displayName: profile?.nickname ?? result.data.displayName,
        fallback: getDefaultSeatName(room.locale, result.data.seatNumber),
      });

      await prisma.gameToolSeat.update({
        where: { id: targetSeat.id },
        data: {
          displayName,
          guestName: profile ? null : displayName,
          profileId: profile?.id ?? null,
          readyAt: new Date(),
        },
      });
      await prisma.gameToolEvent.create({
        data: {
          actorId: profile?.id ?? null,
          payload: {
            displayName,
            seatNumber: result.data.seatNumber,
          },
          roomId: room.id,
          type: "seat_claimed",
        },
      });
    }

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to join Avalon room", error);

    return {
      formError: t.joinFailed,
    };
  }

  if (shouldRedirectToRoom) {
    redirect(
      withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`),
    );
  }

  redirect(
    withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`),
  );
}

export async function startAvalonRoomAction(
  _previousState: AvalonRoomActionState,
  formData: FormData,
): Promise<AvalonRoomActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    roomId: getString(formData, "roomId"),
  };
  const result = startRoomSchema.safeParse(rawInput);
  const t = getActionCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  const profile = await ensureCurrentUserProfile(
    result.data.locale,
    `/game-tools/avalon/rooms/${result.data.roomId}`,
  );

  try {
    const room = await prisma.gameToolRoom.findUnique({
      where: { id: result.data.roomId },
      include: {
        seats: {
          orderBy: { seatNumber: "asc" },
          select: {
            displayName: true,
            id: true,
            seatNumber: true,
          },
        },
      },
    });

    if (!room) {
      return { formError: t.startFailed };
    }

    if (room.hostId !== profile.id) {
      return { formError: t.startHostOnly };
    }

    if (room.status !== "LOBBY") {
      return { formError: t.startNotLobby };
    }

    if (!isAvalonPlayerCount(room.playerCount)) {
      return { formError: t.startFailed };
    }

    if (room.seats.length < room.playerCount) {
      return { formError: t.roomFull };
    }

    const shuffledRoles = shuffleRoles(getAvalonRoleDeck(room.playerCount));
    const assignedSeats: AvalonAssignedSeat[] = room.seats.map((seat, index) => {
      const roleKey = shuffledRoles[index];

      return {
        displayName: seat.displayName,
        roleAlignment:
          roleKey === "assassin" ||
          roleKey === "minion" ||
          roleKey === "mordred" ||
          roleKey === "morgana" ||
          roleKey === "oberon"
            ? "evil"
            : "good",
        roleKey,
        seatNumber: seat.seatNumber,
      };
    });

    await prisma.$transaction([
      ...room.seats.map((seat) => {
        const assignedSeat = assignedSeats.find(
          (candidate) => candidate.seatNumber === seat.seatNumber,
        );

        if (!assignedSeat) {
          throw new Error("Missing assigned Avalon seat");
        }

        return prisma.gameToolSeat.update({
          where: { id: seat.id },
          data: {
            privatePayload: createAvalonPrivatePayload({
              assignedSeats,
              locale: room.locale,
              seat: assignedSeat,
            }),
            roleAlignment: assignedSeat.roleAlignment,
            roleKey: assignedSeat.roleKey,
          },
        });
      }),
      prisma.gameToolRoom.update({
        where: { id: room.id },
        data: {
          startedAt: new Date(),
          state: {
            currentLeaderSeatNumber: 1,
            missionResults: [null, null, null, null, null],
            roundIndex: 0,
            teamVoteRejectCount: 0,
          },
          status: "IN_PROGRESS",
        },
      }),
      prisma.gameToolEvent.create({
        data: {
          actorId: profile.id,
          payload: {
            mode: room.mode,
            playerCount: room.playerCount,
          },
          roomId: room.id,
          type: "room_started",
        },
      }),
    ]);

    revalidateAvalonRoom(result.data.locale, room.id);
  } catch (error) {
    console.error("Failed to start Avalon room", error);

    return {
      formError: t.startFailed,
    };
  }

  redirect(withLocale(result.data.locale, `/game-tools/avalon/rooms/${result.data.roomId}`));
}
