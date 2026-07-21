import { randomBytes } from "node:crypto";
import type { GameToolKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

export function createGameToolPrivateToken() {
  return randomBytes(16).toString("hex");
}

function createCandidateRoomCode() {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export async function createUniqueGameToolRoomCode() {
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

export type ActiveGameToolRoomSummary = {
  code: string;
  id: string;
  kind: GameToolKind;
  privateSeatToken: string | null;
  seatNumber: number | null;
  startedAt: Date | null;
  title: string;
};

export function getGameToolRoomPath({
  kind,
  roomId,
}: {
  kind: GameToolKind;
  roomId: string;
}) {
  if (kind === "AVALON") {
    return `/game-tools/avalon/rooms/${roomId}`;
  }

  if (kind === "WEREWOLF") {
    return `/game-tools/werewolf/rooms/${roomId}`;
  }

  return "/game-tools/storyteller";
}

export function getGameToolPrivateSeatPath({
  kind,
  privateSeatToken,
}: {
  kind: GameToolKind;
  privateSeatToken: string;
}) {
  if (kind === "AVALON") {
    return `/game-tools/avalon/seats/${privateSeatToken}`;
  }

  if (kind === "WEREWOLF") {
    return `/game-tools/werewolf/seats/${privateSeatToken}`;
  }

  return null;
}

export async function getActiveGameToolRoomForProfile({
  exceptRoomId,
  profileId,
}: {
  exceptRoomId?: string;
  profileId: string;
}): Promise<ActiveGameToolRoomSummary | null> {
  const room = await prisma.gameToolRoom.findFirst({
    where: {
      id: exceptRoomId ? { not: exceptRoomId } : undefined,
      seats: {
        some: {
          leftAt: null,
          profileId,
        },
      },
      status: "IN_PROGRESS",
    },
    orderBy: [{ startedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      code: true,
      id: true,
      kind: true,
      seats: {
        where: {
          leftAt: null,
          profileId,
        },
        orderBy: { seatNumber: "asc" },
        select: {
          privateToken: true,
          seatNumber: true,
        },
        take: 1,
      },
      startedAt: true,
      title: true,
    },
  });

  if (!room) {
    return null;
  }

  const seat = room.seats[0] ?? null;

  return {
    code: room.code,
    id: room.id,
    kind: room.kind,
    privateSeatToken: seat?.privateToken ?? null,
    seatNumber: seat?.seatNumber ?? null,
    startedAt: room.startedAt,
    title: room.title,
  };
}

export function getDefaultGameToolSeatName(locale: string, seatNumber: number) {
  if (locale === "fr") {
    return `Place ${seatNumber}`;
  }

  if (locale === "en") {
    return `Seat ${seatNumber}`;
  }

  return `座位 ${seatNumber}`;
}

export function revalidateGameToolRoom({
  locale,
  roomId,
  toolPath,
}: {
  locale: string;
  roomId: string;
  toolPath: string;
}) {
  revalidatePath(withLocale(locale, "/game-tools"));
  revalidatePath(withLocale(locale, toolPath));
  revalidatePath(withLocale(locale, `${toolPath}/rooms/${roomId}`));
  revalidatePath(withLocale(locale, `${toolPath}/rooms/${roomId}/screen`));
  revalidatePath(withLocale(locale, `${toolPath}/rooms/${roomId}/recap`));
  revalidatePath(
    withLocale(locale, `${toolPath}/rooms/${roomId}/recap/poster`),
  );
}
