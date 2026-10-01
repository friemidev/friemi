import { NextResponse } from "next/server";
import { z } from "zod";
import { reportDrawGuessContent } from "@/features/game-tools/drawGuessReports";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

const bodySchema = z.object({
  ownerSeat: z.number().int().min(0).max(9),
  reason: z.enum(["INAPPROPRIATE", "PERSONAL_INFO", "HARASSMENT", "OTHER"]),
  roundNumber: z.number().int().min(1),
  stage: z.number().int().min(0).max(8),
  targetKind: z.enum(["WORD", "DRAWING"]),
});

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { roomId } = await context.params;
  const result = await reportDrawGuessContent({ ...body.data, profileId: profile.id, roomId });
  return NextResponse.json(result, { status: "error" in result ? 409 : 201 });
}
