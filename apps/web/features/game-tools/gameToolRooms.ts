import { randomBytes } from "node:crypto";
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
  revalidatePath(withLocale(locale, `${toolPath}/rooms/${roomId}/recap/poster`));
}
