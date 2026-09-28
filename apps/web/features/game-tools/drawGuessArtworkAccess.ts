import "server-only";

import { prisma } from "@/lib/prisma";

export async function getFinishedDrawGuessArtworkForMember(input: { artworkId: string; profileId: string; roomId: string }) {
  const room = await prisma.gameToolRoom.findUnique({
    where: { id: input.roomId },
    select: { kind: true, seats: { where: { leftAt: null, profileId: input.profileId }, select: { id: true } } },
  });
  if (room?.kind !== "DRAW_GUESS" || !room.seats.length) return null;
  const artwork = await prisma.drawGuessArtwork.findUnique({ where: { id: input.artworkId } });
  if (!artwork || artwork.roomId !== input.roomId || !artwork.submittedAt || !artwork.previewPng) return null;
  const finished = await prisma.drawGuessRound.findUnique({
    where: { roomId_roundNumber: { roomId: input.roomId, roundNumber: artwork.roundNumber } },
    select: { id: true },
  });
  return finished ? artwork.previewPng : null;
}
