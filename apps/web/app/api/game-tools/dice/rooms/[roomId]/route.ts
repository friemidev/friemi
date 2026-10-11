import { NextResponse } from "next/server";
import { z } from "zod";
import { isDicePreviewEnabled } from "@/features/game-tools/diceAvailability";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { guardDiceWrite } from "@/features/game-tools/diceRoomWriteGuard";
import { commandDiceRoom, getDiceRoomView } from "@/features/game-tools/diceRoomServer";

export async function GET(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  if (!isDicePreviewEnabled()) return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await params;
  const match = /^W\/"dice-(\d+)-(\d+)"$/.exec(request.headers.get("if-none-match") ?? "");
  const result = await getDiceRoomView(roomId, profileId, match ? { viewerSeat: Number(match[1]), revision: Number(match[2]) } : undefined);
  if ("notModified" in result) return new Response(null, { status: 304, headers: { "cache-control": "private, no-store" } });
  return NextResponse.json(result, {
    status: "error" in result ? result.error === "NOT_A_PLAYER" ? 403 : 404 : 200,
    headers: { "cache-control": "private, no-store", ...("room" in result && result.room ? { etag: `W/"dice-${result.room.viewerSeat}-${result.room.revision}"` } : {}) },
  });
}
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("READY"), ready: z.boolean() }),
  z.object({ type: z.literal("START") }),
  z.object({ type: z.literal("BID"), count: z.number().int().min(2).max(30), face: z.number().int().min(2).max(6) }),
  z.object({ type: z.literal("CHALLENGE") }),
  z.object({ type: z.literal("NEXT_ROUND") }),
  z.object({ type: z.literal("REMATCH") }),
  z.object({ type: z.literal("CLOSE") }),
  z.object({ type: z.literal("LEAVE") }),
]);
const command = z.object({ commandId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/), expectedRound: z.number().int().min(0), action });
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  if (!isDicePreviewEnabled()) return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  const originGuard = await guardDiceWrite(request, "origin");
  if (originGuard) return originGuard;
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const limited = await guardDiceWrite(request, "command", profileId, 90);
  if (limited) return limited;
  const parsed = command.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { roomId } = await params;
  const result = await commandDiceRoom({ ...parsed.data, roomId, profileId });
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
