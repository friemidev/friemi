import { NextResponse } from "next/server";
import { z } from "zod";
import { getDrawGuessRoomView, updateDrawGuessRoomSettings } from "@/features/game-tools/drawGuessRoomServer";
import { isDrawGuessTiming, type DrawGuessTiming } from "@/features/game-tools/drawGuessEngine";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await context.params;
  const revisionMatch = /^W\/"draw-guess-(\d+)"$/.exec(request.headers.get("if-none-match") ?? "");
  const knownRevision = revisionMatch ? Number(revisionMatch[1]) : undefined;
  const result = await getDrawGuessRoomView(roomId, profileId, knownRevision);
  if ("notModified" in result) return new Response(null, { status: 304, headers: { "cache-control": "private, no-store" } });
  return NextResponse.json(result, {
    headers: {
      "cache-control": "private, no-store",
      ...("room" in result && result.room ? { etag: `W/"draw-guess-${result.room.revision}"` } : {}),
    },
    status: "error" in result ? 404 : 200,
  });
}

const settingsSchema = z.object({
  timing: z.custom<DrawGuessTiming>(isDrawGuessTiming).optional(),
  wordBankId: z.string().min(1).max(64).optional(),
}).refine((value) => Boolean(value.timing || value.wordBankId));

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const { roomId } = await context.params;
  const result = await updateDrawGuessRoomSettings(roomId, profileId, parsed.data);
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
