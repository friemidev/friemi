import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { isValidStroke } from "@/features/game-tools/drawGuessEngine";
import { broadcastDrawGuessInk, getAuthorizedDrawGuessInkArtist, reserveDrawGuessInkSequence } from "@/features/game-tools/drawGuessInkServer";
import { hasClerkKeys } from "@/lib/clerk";

const batchSchema = z.object({
  gameNumber: z.number().int().min(1),
  stroke: z.unknown(),
  strokeIndex: z.number().int().min(0).max(119),
  turnIndex: z.number().int().min(0).max(9),
});

export async function HEAD() {
  const userId = hasClerkKeys() ? (await auth()).userId : "local-dev-user";
  return new Response(null, {
    status: userId ? 204 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}

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
  const profileId = await getAuthorizedDrawGuessInkArtist({
    clerkUserId: userId,
    gameNumber: parsed.data.gameNumber,
    roomId,
    turnIndex: parsed.data.turnIndex,
  });
  const roomMs = performance.now() - startedAt - authMs;
  if (!profileId) {
    return NextResponse.json({ error: "INK_NOT_ALLOWED" }, { status: 403 });
  }
  const reserved = await reserveDrawGuessInkSequence(roomId, parsed.data.gameNumber, parsed.data.turnIndex, profileId);
  if ("error" in reserved) return NextResponse.json(reserved, { status: reserved.error === "INK_RATE_LIMITED" ? 429 : 503 });
  const redisMs = performance.now() - startedAt - authMs - roomMs;
  const ok = await broadcastDrawGuessInk({
    gameNumber: parsed.data.gameNumber,
    roomId,
    seq: reserved.seq,
    stroke,
    strokeIndex: parsed.data.strokeIndex,
    turnIndex: parsed.data.turnIndex,
  });
  const broadcastMs = performance.now() - startedAt - authMs - roomMs - redisMs;
  return NextResponse.json(ok ? { ok: true, seq: reserved.seq } : { error: "INK_UNAVAILABLE" }, {
    status: ok ? 200 : 503,
    headers: {
      "Server-Timing": `auth;dur=${authMs.toFixed(1)}, room;dur=${roomMs.toFixed(1)}, redis;dur=${redisMs.toFixed(1)}, broadcast;dur=${broadcastMs.toFixed(1)}`,
      ...(process.env.VERCEL_REGION ? { "X-Draw-Guess-Region": process.env.VERCEL_REGION } : {}),
    },
  });
}
