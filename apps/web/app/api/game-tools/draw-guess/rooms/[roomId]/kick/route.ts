import { NextResponse } from "next/server";
import { z } from "zod";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { kickDrawGuessRoomPlayer } from "@/features/game-tools/drawGuessRoomServer";

const schema = z.object({ seatId: z.string().min(1).max(64) });

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { roomId } = await context.params;
  const result = await kickDrawGuessRoomPlayer(roomId, profileId, parsed.data.seatId);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
