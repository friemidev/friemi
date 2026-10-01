import { NextResponse } from "next/server";
import { sweepDueDrawGuessRooms } from "@/features/game-tools/drawGuessRoomServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await sweepDueDrawGuessRooms();
  if (result.errors || result.scanned >= 100) {
    console.warn("[draw-guess] deadline sweep needs attention", result);
  }
  return NextResponse.json(result, { headers: { "cache-control": "no-store" }, status: result.errors ? 500 : 200 });
}
