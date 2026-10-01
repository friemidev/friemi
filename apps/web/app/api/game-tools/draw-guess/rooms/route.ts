import { NextResponse } from "next/server";
import { z } from "zod";
import { createDrawGuessRoom } from "@/features/game-tools/drawGuessRoomServer";
import { isDrawGuessTiming, type DrawGuessTiming } from "@/features/game-tools/drawGuessEngine";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

const schema = z.object({
  locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN"),
  mode: z.enum(["CLASSIC", "CHAIN"]),
  playerCount: z.number().int().min(2).max(10).optional(),
  timing: z.custom<DrawGuessTiming>(isDrawGuessTiming).optional(),
  wordBankId: z.string().min(1).max(64).optional(),
});

export async function POST(request: Request) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await createDrawGuessRoom({
    ...parsed.data,
    hostId: profile.id,
    hostName: profile.nickname,
  });
  return NextResponse.json(result, { status: "error" in result ? 400 : 201 });
}
