import { NextResponse } from "next/server";
import { z } from "zod";
import { setDrawGuessRoomReady } from "@/features/game-tools/drawGuessRoomServer";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = z.object({ ready: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { roomId } = await context.params;
  const result = await setDrawGuessRoomReady(roomId, profileId, parsed.data.ready);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
