import "server-only";

import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;

export async function maintainDrawGuessData(now = Date.now()) {
  const commands = await prisma.drawGuessCommand.findMany({
    where: { createdAt: { lt: new Date(now - 30 * DAY) } },
    orderBy: { createdAt: "asc" }, select: { id: true }, take: 1000,
  });
  if (commands.length) await prisma.drawGuessCommand.deleteMany({ where: { id: { in: commands.map((command) => command.id) } } });

  const drafts = await prisma.drawGuessArtwork.findMany({
    where: {
      submittedAt: null,
      createdAt: { lt: new Date(now - 7 * DAY) },
      room: { status: "FINISHED" },
    },
    orderBy: { createdAt: "asc" }, select: { id: true }, take: 1000,
  });
  if (drafts.length) await prisma.drawGuessArtwork.deleteMany({ where: { id: { in: drafts.map((draft) => draft.id) } } });

  const oldRooms = await prisma.gameToolRoom.findMany({
    where: {
      kind: "DRAW_GUESS",
      status: "FINISHED",
      finishedAt: { lt: new Date(now - 365 * DAY) },
      drawGuessReports: { none: { status: "OPEN" } },
    },
    orderBy: { finishedAt: "asc" }, select: { id: true }, take: 50,
  });
  if (oldRooms.length) await prisma.gameToolRoom.deleteMany({ where: { id: { in: oldRooms.map((room) => room.id) } } });
  return { commandsDeleted: commands.length, draftsDeleted: drafts.length, roomsDeleted: oldRooms.length };
}
