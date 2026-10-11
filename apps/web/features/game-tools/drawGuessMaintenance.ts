import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;

/** Finished games keep their score and artwork history, but no longer need live-room writes. */
export async function pruneEmptyFinishedDrawGuessRoom(roomId: string) {
  return prisma.$transaction(async (tx) => {
    // A rematch must not start between the eligibility check and live-data cleanup.
    await tx.$queryRaw`
      SELECT "id" FROM "GameToolRoom" WHERE "id" = ${roomId} FOR UPDATE
    `;
    const room = await tx.gameToolRoom.findFirst({
      where: {
        id: roomId,
        kind: "DRAW_GUESS",
        status: "FINISHED",
        members: { none: { leftAt: null } },
        drawGuessReports: { none: { status: "OPEN" } },
      },
      select: { id: true },
    });
    if (!room) return { commandsDeleted: 0, draftsDeleted: 0 };
    const commands = await tx.drawGuessCommand.deleteMany({ where: { roomId } });
    const drafts = await tx.drawGuessArtwork.deleteMany({ where: { roomId, submittedAt: null } });
    return { commandsDeleted: commands.count, draftsDeleted: drafts.count };
  });
}

export async function maintainDrawGuessData(now = Date.now()) {
  const commands = await prisma.drawGuessCommand.findMany({
    where: { createdAt: { lt: new Date(now - 30 * DAY) } },
    orderBy: { createdAt: "asc" }, select: { id: true }, take: 1000,
  });
  if (commands.length) await prisma.drawGuessCommand.deleteMany({ where: { id: { in: commands.map((command) => command.id) } } });

  const draftsDeleted = await prisma.$executeRaw`
    DELETE FROM "public"."DrawGuessArtwork"
    WHERE "id" IN (
      SELECT artwork."id" FROM "public"."DrawGuessArtwork" AS artwork
      WHERE artwork."submittedAt" IS NULL
        AND artwork."createdAt" < ${new Date(now - 7 * DAY)}
        AND EXISTS (
          SELECT 1 FROM "public"."DrawGuessRound" AS round
          WHERE round."roomId" = artwork."roomId"
            AND round."roundNumber" = artwork."roundNumber"
        )
      ORDER BY artwork."createdAt" ASC
      LIMIT 1000
    )
  `;

  // An unfinished room may reach FINISHED after everyone leaves. Keep a day for
  // reconnecting, then discard gameplay while retaining its small participant roster.
  const abandoned = await prisma.$queryRaw<{ id: string }[]>`
    SELECT room."id"
    FROM "public"."GameToolRoom" AS room
    WHERE room."kind" = 'DRAW_GUESS'
      AND room."status" IN ('IN_PROGRESS', 'FINISHED')
      AND room."config"->>'drawGuessAbandonedAt' < ${new Date(now - DAY).toISOString()}
      AND NOT EXISTS (
        SELECT 1 FROM "public"."GameToolRoomMember" AS active
        WHERE active."roomId" = room."id" AND active."leftAt" IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM "public"."DrawGuessReport" AS report
        WHERE report."roomId" = room."id" AND report."status" = 'OPEN'
      )
    ORDER BY room."config"->>'drawGuessAbandonedAt' ASC
    LIMIT 50
  `;
  let roomsCleared = 0;
  for (const room of abandoned) {
    const cleared = await prisma.$transaction(async (tx) => {
      const reserved = await tx.gameToolRoom.updateMany({
        where: {
          id: room.id,
          kind: "DRAW_GUESS",
          status: { in: ["IN_PROGRESS", "FINISHED"] },
          config: { path: ["drawGuessAbandonedAt"], lt: new Date(now - DAY).toISOString() },
          members: { none: { leftAt: null } },
          drawGuessReports: { none: { status: "OPEN" } },
        },
        data: {
          cancelledAt: new Date(now),
          drawGuessDeadlineAt: null,
          finishedAt: null,
          revision: { increment: 1 },
          state: Prisma.DbNull,
          status: "CANCELLED",
        },
      });
      if (!reserved.count) return false;
      await tx.drawGuessArtwork.deleteMany({ where: { roomId: room.id } });
      await tx.drawGuessCommand.deleteMany({ where: { roomId: room.id } });
      await tx.drawGuessRound.deleteMany({ where: { roomId: room.id } });
      await tx.gameToolEvent.deleteMany({ where: { roomId: room.id } });
      return true;
    });
    if (cleared) roomsCleared += 1;
  }

  const emptyFinished = await prisma.gameToolRoom.findMany({
    where: {
      kind: "DRAW_GUESS",
      status: "FINISHED",
      members: { none: { leftAt: null } },
      drawGuessReports: { none: { status: "OPEN" } },
      OR: [
        { drawGuessCommands: { some: {} } },
        { drawGuessArtworks: { some: { submittedAt: null } } },
      ],
    },
    orderBy: { updatedAt: "asc" }, select: { id: true }, take: 50,
  });
  for (const room of emptyFinished) await pruneEmptyFinishedDrawGuessRoom(room.id);

  const expiredRoomWhere: Prisma.GameToolRoomWhereInput = {
    kind: "DRAW_GUESS",
    drawGuessReports: { none: { status: "OPEN" } },
    OR: [
      { status: "FINISHED", finishedAt: { lt: new Date(now - 365 * DAY) } },
      { status: "CANCELLED", cancelledAt: { lt: new Date(now - 365 * DAY) } },
    ],
  };
  const oldRooms = await prisma.gameToolRoom.findMany({
    where: expiredRoomWhere,
    orderBy: { updatedAt: "asc" }, select: { id: true }, take: 50,
  });
  const deleted = oldRooms.length ? await prisma.gameToolRoom.deleteMany({
    where: { ...expiredRoomWhere, id: { in: oldRooms.map((room) => room.id) } },
  }) : { count: 0 };
  return { commandsDeleted: commands.length, draftsDeleted, roomsCleared, roomsDeleted: deleted.count };
}
