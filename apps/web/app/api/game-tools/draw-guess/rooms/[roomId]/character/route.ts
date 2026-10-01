import { NextResponse } from "next/server";
import { z } from "zod";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
import { isDrawGuessCatId } from "@/features/game-tools/drawGuessCats";
import { setDrawGuessCharacter } from "@/features/game-tools/drawGuessRoomServer";

const characterSchema = z.object({ catId: z.string().refine(isDrawGuessCatId) });

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = characterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CHARACTER" }, { status: 400 });
  const { roomId } = await context.params;
  const result = await setDrawGuessCharacter(roomId, profileId, parsed.data.catId);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
