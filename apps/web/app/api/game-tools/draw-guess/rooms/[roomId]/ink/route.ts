import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { isValidStroke, type DrawGuessState } from "@/features/game-tools/drawGuessEngine";
import { broadcastDrawGuessInk, reserveDrawGuessInkSequence } from "@/features/game-tools/drawGuessInkServer";
import { hasClerkKeys } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

const batchSchema = z.object({
  gameNumber: z.number().int().min(1),
  stroke: z.unknown(),
  strokeIndex: z.number().int().min(0).max(119),
  turnIndex: z.number().int().min(0).max(9),
});

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const startedAt = performance.now();
  const userId = hasClerkKeys() ? (await auth()).userId : "local-dev-user";
  if (!userId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const authMs = performance.now() - startedAt;
  const { roomId } = await context.params;
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success || JSON.stringify(body).length > 20_000) {
    return NextResponse.json({ error: "INVALID_INK_BATCH" }, { status: 400 });
  }
  const stroke = parsed.data.stroke;
  if (!isValidStroke(stroke)) return NextResponse.json({ error: "INVALID_INK_BATCH" }, { status: 400 });
  const room = await prisma.gameToolRoom.findUnique({
    where: { id: roomId },
    select: {
      drawGuessDeadlineAt: true, kind: true,
      members: { where: { leftAt: null, profile: { is: { clerkUserId: userId, status: "ACTIVE" } } }, select: { id: true, profileId: true } },
      seats: { where: { leftAt: null, profile: { is: { clerkUserId: userId, status: "ACTIVE" } } }, select: { seatNumber: true } },
      state: true, status: true,
    },
  });
  const roomMs = performance.now() - startedAt - authMs;
  const state = room?.state as DrawGuessState | null;
  if (!room || room.kind !== "DRAW_GUESS" || room.status !== "IN_PROGRESS" || room.members.length !== 1 || room.seats.length !== 1 ||
      !state || state.mode !== "CLASSIC" || state.phase !== "DRAW_GUESS" ||
      state.gameNumber !== parsed.data.gameNumber || state.turnIndex !== parsed.data.turnIndex ||
      room.seats[0].seatNumber !== state.turnIndex + 1 ||
      !room.drawGuessDeadlineAt || room.drawGuessDeadlineAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "INK_NOT_ALLOWED" }, { status: 403 });
  }
  const reserved = await reserveDrawGuessInkSequence(roomId, state.gameNumber, state.turnIndex, room.members[0].profileId!);
  if ("error" in reserved) return NextResponse.json(reserved, { status: reserved.error === "INK_RATE_LIMITED" ? 429 : 503 });
  const redisMs = performance.now() - startedAt - authMs - roomMs;
  const ok = await broadcastDrawGuessInk({
    gameNumber: state.gameNumber,
    roomId,
    seq: reserved.seq,
    stroke,
    strokeIndex: parsed.data.strokeIndex,
    turnIndex: state.turnIndex,
  });
  const broadcastMs = performance.now() - startedAt - authMs - roomMs - redisMs;
  return NextResponse.json(ok ? { ok: true, seq: reserved.seq } : { error: "INK_UNAVAILABLE" }, {
    status: ok ? 200 : 503,
    headers: { "Server-Timing": `auth;dur=${authMs.toFixed(1)}, room;dur=${roomMs.toFixed(1)}, redis;dur=${redisMs.toFixed(1)}, broadcast;dur=${broadcastMs.toFixed(1)}` },
  });
}
