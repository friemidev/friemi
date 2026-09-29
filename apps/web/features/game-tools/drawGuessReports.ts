import "server-only";

import { Prisma } from "@prisma/client";
import type { DrawGuessState } from "@/features/game-tools/drawGuessEngine";
import { prisma } from "@/lib/prisma";

export type DrawGuessReportReason = "INAPPROPRIATE" | "PERSONAL_INFO" | "HARASSMENT" | "OTHER";

export async function reportDrawGuessContent(input: {
  ownerSeat: number;
  profileId: string;
  reason: DrawGuessReportReason;
  roomId: string;
  roundNumber: number;
  stage: number;
  targetKind: "WORD" | "DRAWING";
}) {
  const room = await prisma.gameToolRoom.findUnique({
    where: { id: input.roomId },
    select: { kind: true, playerCount: true, state: true, seats: { where: { leftAt: null }, select: { profileId: true } } },
  });
  if (room?.kind !== "DRAW_GUESS" || !room.seats.some((seat) => seat.profileId === input.profileId)) return { error: "NOT_A_PLAYER" } as const;
  if (!Number.isInteger(input.ownerSeat) || input.ownerSeat < 0 || input.ownerSeat >= room.playerCount || !Number.isInteger(input.stage) || input.stage < 0 || input.stage > 8) {
    return { error: "INVALID_TARGET" } as const;
  }
  const current = room.state as unknown as DrawGuessState | null;
  let state: DrawGuessState | null = null;
  if (current?.gameNumber === input.roundNumber && ["REVEAL_VOTE", "AUTHOR_PICK", "FINISHED"].includes(current.phase)) {
    state = current;
  } else {
    const archived = await prisma.drawGuessRound.findUnique({
      where: { roomId_roundNumber: { roomId: input.roomId, roundNumber: input.roundNumber } },
      select: { state: true },
    });
    state = archived?.state as unknown as DrawGuessState | null;
  }
  if (!state || state.mode !== "CHAIN") return { error: "NOT_REVEALED" } as const;
  const step = state.chains[input.ownerSeat]?.[input.stage];
  if (!step || step.kind !== input.targetKind || step.system) return { error: "INVALID_TARGET" } as const;
  const artwork = step.kind === "DRAWING" ? await prisma.drawGuessArtwork.findUnique({
    where: { roomId_roundNumber_ownerSeat_stage: { roomId: input.roomId, roundNumber: input.roundNumber, ownerSeat: input.ownerSeat, stage: input.stage } },
    select: { id: true },
  }) : null;
  const snapshot: Prisma.InputJsonValue = step.kind === "WORD"
    ? { text: step.value, authorSeat: step.seat }
    : { artworkId: artwork?.id ?? null, authorSeat: step.seat };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const recent = await tx.drawGuessReport.count({
          where: { reporterProfileId: input.profileId, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
        });
        if (recent >= 10) return { error: "RATE_LIMITED" } as const;
        const report = await tx.drawGuessReport.create({
          data: {
            ownerSeat: input.ownerSeat,
            reason: input.reason,
            reporterProfileId: input.profileId,
            roomId: input.roomId,
            roundNumber: input.roundNumber,
            snapshot,
            stage: input.stage,
            targetKind: input.targetKind,
          },
          select: { id: true },
        });
        return { ok: true, reportId: report.id } as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "ALREADY_REPORTED" } as const;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
  return { error: "TRY_AGAIN" } as const;
}

export async function listOpenDrawGuessReports() {
  return prisma.drawGuessReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      createdAt: true, id: true, ownerSeat: true, reason: true, reporterProfileId: true, roomId: true,
      roundNumber: true, snapshot: true, stage: true, targetKind: true,
    },
  });
}

export async function reviewDrawGuessReport(input: { id: string; reviewerProfileId: string; status: "REVIEWED" | "DISMISSED"; note: string }) {
  const result = await prisma.drawGuessReport.updateMany({
    where: { id: input.id, status: "OPEN" },
    data: {
      reviewedAt: new Date(), reviewerProfileId: input.reviewerProfileId,
      reviewNote: input.note.slice(0, 500), status: input.status,
    },
  });
  return result.count ? { ok: true } as const : { error: "NOT_OPEN" } as const;
}
