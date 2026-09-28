import { NextResponse } from "next/server";
import { getDrawGuessRoomView } from "@/features/game-tools/drawGuessRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await context.params;
  const result = await getDrawGuessRoomView(roomId, profile.id);
  return NextResponse.json(result, { headers: { "cache-control": "no-store" }, status: "error" in result ? 404 : 200 });
}
