import { NextResponse } from "next/server";
import { z } from "zod";
import { broadcastDrawGuessRoomChange } from "@/features/game-tools/drawGuessRealtimeServer";
import { joinDrawGuessRoom } from "@/features/game-tools/drawGuessRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

const schema = z.object({ code: z.string().trim().min(6).max(8) });

export async function POST(request: Request) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await joinDrawGuessRoom({
    code: parsed.data.code,
    displayName: profile.nickname,
    profileId: profile.id,
  });
  if (typeof result.roomId === "string") await broadcastDrawGuessRoomChange(result.roomId);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
}
