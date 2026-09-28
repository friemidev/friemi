import { NextResponse } from "next/server";
import { getDrawGuessRoomView } from "@/features/game-tools/drawGuessRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await context.params;
  const revisionMatch = /^W\/"draw-guess-(\d+)"$/.exec(request.headers.get("if-none-match") ?? "");
  const knownRevision = revisionMatch ? Number(revisionMatch[1]) : undefined;
  const result = await getDrawGuessRoomView(roomId, profile.id, knownRevision);
  if ("notModified" in result) return new Response(null, { status: 304, headers: { "cache-control": "private, no-store" } });
  return NextResponse.json(result, {
    headers: {
      "cache-control": "private, no-store",
      ...("room" in result && result.room ? { etag: `W/"draw-guess-${result.room.revision}"` } : {}),
    },
    status: "error" in result ? 404 : 200,
  });
}
