import { NextResponse } from "next/server";
import { getFinishedDrawGuessArtworkForMember } from "@/features/game-tools/drawGuessArtworkAccess";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

export async function GET(_request: Request, context: { params: Promise<{ roomId: string; artworkId: string }> }) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { artworkId, roomId } = await context.params;
  const png = await getFinishedDrawGuessArtworkForMember({ artworkId, profileId: profile.id, roomId });
  if (!png) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(new Uint8Array(png), {
    headers: { "cache-control": "private, no-store", "content-type": "image/png", "x-content-type-options": "nosniff" },
  });
}
