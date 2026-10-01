import { NextResponse } from "next/server";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { leaveDrawGuessRoom } from "@/features/game-tools/drawGuessRoomServer";

export async function POST(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await context.params;
  const result = await leaveDrawGuessRoom(roomId, profileId);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
